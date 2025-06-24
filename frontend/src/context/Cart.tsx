import React, { createContext, useContext, useReducer, useEffect, type ReactNode, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import {  useAuthenticatedAPI, type CartItem, type Product } from '../services/api';
import { websocketService } from '../services/websocket';

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
  totalItems: number;
  totalPrice: number;
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ITEMS'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity: number } }
  | { type: 'UPDATE_ITEM'; payload: { productId: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_ITEMS':
      const items = action.payload;
      return {
        ...state,
        items,
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
        isLoading: false,
        error: null,
      };
    
    case 'ADD_ITEM':
      const existingItemIndex = state.items.findIndex(
        item => item.productId === action.payload.product.id
      );
      
      let newItems: CartItem[];
      if (existingItemIndex >= 0) {
        // Update existing item
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      } else {
        // Add new item
        const newItem: CartItem = {
          id: `temp-${Date.now()}`, // Temporary ID until synced with backend
          userId: state.items[0]?.userId || '', // Will be set properly in the API call
          productId: action.payload.product.id,
          quantity: action.payload.quantity,
          product: action.payload.product,
        };
        newItems = [...state.items, newItem];
      }
      
      return {
        ...state,
        items: newItems,
        totalItems: newItems.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: newItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
      };
    
    case 'UPDATE_ITEM':
      const updatedItems = state.items.map(item =>
        item.productId === action.payload.productId
          ? { ...item, quantity: action.payload.quantity }
          : item
      ).filter(item => item.quantity > 0); // Remove items with 0 quantity
      
      return {
        ...state,
        items: updatedItems,
        totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: updatedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
      };
    
    case 'REMOVE_ITEM':
      const filteredItems = state.items.filter(item => item.productId !== action.payload);
      
      return {
        ...state,
        items: filteredItems,
        totalItems: filteredItems.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: filteredItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
      };
    
    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        totalItems: 0,
        totalPrice: 0,
      };
    
    default:
      return state;
  }
};

const initialState: CartState = {
  items: [],
  isLoading: false,
  error: null,
  totalItems: 0,
  totalPrice: 0,
};

interface CartContextType extends CartState {
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { userId, isSignedIn } = useAuth();
  const api = useAuthenticatedAPI();

  // Load cart when user signs in
  useEffect(() => {
    if (isSignedIn && userId) {
      refreshCart();
    } else {
      dispatch({ type: 'CLEAR_CART' });
    }
  }, [isSignedIn, userId]);

  const refreshCart = useCallback(async () => {
    if (!userId) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      //no route to get data of cart for a user, add it
      const cartData = await api.get<CartItem[]>('/api/cart');
      dispatch({ type: 'SET_ITEMS', payload: cartData.data });
    } catch (error) {
      console.error('Error fetching cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load cart' });
    }
  }, [userId, api]);

  const addToCart = useCallback(async (product: Product, quantity: number = 1) => {
    if (!userId) {
      dispatch({ type: 'SET_ERROR', payload: 'Please sign in to add items to cart' });
      return;
    }

    // Optimistic update
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });

    try {
      ////no route to get data of cart for a user, add it
      const response = await api.post<CartItem>('/api/cart', {
        productId: product.id,
        quantity,
      });

      // Update WebSocket for real-time cart sync
      websocketService.updateCart({
        userId,
        cartCount: state.totalItems + quantity,
      });

      // Refresh cart to get the actual data from server
      await refreshCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add item to cart' });
      // Revert optimistic update
      await refreshCart();
    }
  }, [userId, api, state.totalItems, refreshCart]);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (!userId) return;

    // Optimistic update
    dispatch({ type: 'UPDATE_ITEM', payload: { productId, quantity } });

    try {
      if (quantity === 0) {
        await api.delete(`/api/cart/${productId}`);
      } else {
        await api.put(`/api/cart/${productId}`, { quantity });
      }

      // Update WebSocket
      const newTotalItems = state.items.reduce((sum, item) => {
        if (item.productId === productId) {
          return sum + (quantity - item.quantity);
        }
        return sum + item.quantity;
      }, 0);

      websocketService.updateCart({
        userId,
        cartCount: newTotalItems,
      });

      // Refresh cart to sync with server
      await refreshCart();
    } catch (error) {
      console.error('Error updating cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update cart' });
      // Revert optimistic update
      await refreshCart();
    }
  }, [userId, api, state.items, refreshCart]);

  const removeFromCart = useCallback(async (productId: string) => {
    await updateQuantity(productId, 0);
  }, [updateQuantity]);

  const clearCart = useCallback(async () => {
    if (!userId) return;

    dispatch({ type: 'CLEAR_CART' });

    try {
      await api.delete('/api/cart');

      // Update WebSocket
      websocketService.updateCart({
        userId,
        cartCount: 0,
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to clear cart' });
      // Revert by refreshing cart
      await refreshCart();
    }
  }, [userId, api, refreshCart]);

  const getItemQuantity = useCallback((productId: string): number => {
    const item = state.items.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  }, [state.items]);

  const contextValue: CartContextType = {
    ...state,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
    getItemQuantity,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Helper hook for cart operations with interaction tracking
export const useCartWithTracking = () => {
  const cart = useCart();
  const { userId } = useAuth();

  const addToCartWithTracking = useCallback(async (product: Product, quantity: number = 1) => {
    await cart.addToCart(product, quantity);
    
    // Track the interaction via WebSocket
    if (userId) {
      websocketService.logUserInteraction({
        userId,
        productId: product.id,
        action: 'cart_add',
        context: {
          quantity,
          price: product.price,
          category: product.category,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [cart, userId]);

  return {
    ...cart,
    addToCartWithTracking,
  };
};

export default CartProvider;