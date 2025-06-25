import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useAuthenticatedAPI, type CartItem, type Product } from '../services/api';
import { useWebSocket } from './Socket';

// Simple cart state - no complex reducer needed
interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
}

interface CartContextType extends CartState {
  // Core actions
  addToCart: (product: Product, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // Helper methods
  getItemQuantity: (productId: string) => number;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | null>(null);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { userId, isSignedIn } = useAuth();
  const api = useAuthenticatedAPI();
  const { sendCartUpdate, trackAddToCart } = useWebSocket();

  // Load cart when user signs in
  useEffect(() => {
    if (isSignedIn && userId) {
      loadCart();
    } else {
      setItems([]);
    }
  }, [isSignedIn, userId]);

  // Simple function to load cart from server
  const loadCart = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      //no route for cart !
      const cartData = await api.get('/api/cart') as CartItem[];
      setItems(cartData || []);
    } catch (err) {
      console.error('Failed to load cart:', err);
      setError('Failed to load cart');
    } finally {
      setIsLoading(false);
    }
  };

  // Add item to cart
  const addToCart = async (product: Product, quantity = 1) => {
    if (!userId) {
      setError('Please sign in to add items to cart');
      return;
    }

    setError(null);

    try {
      // Call API to add item
      await api.post('/api/cart', {
        productId: product.id,
        quantity,
      });

      // Reload cart to get updated data
      await loadCart();

      // Track interaction and send cart update
      trackAddToCart(product.id, quantity);
      sendCartUpdate({
        userId,
        cartCount: getTotalItems() + quantity,
      });

    } catch (err) {
      console.error('Failed to add to cart:', err);
      setError('Failed to add item to cart');
    }
  };

  // Update item quantity
  const updateQuantity = async (productId: string, quantity: number) => {
    if (!userId) return;

    setError(null);

    try {
      if (quantity === 0) {
        await removeFromCart(productId);
        return;
      }

      await api.put(`/api/cart/${productId}`, { quantity });
      await loadCart();

      sendCartUpdate({
        userId,
        cartCount: getTotalItems(),
      });

    } catch (err) {
      console.error('Failed to update quantity:', err);
      setError('Failed to update item');
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId: string) => {
    if (!userId) return;

    setError(null);

    try {
      await api.delete(`/api/cart/${productId}`);
      await loadCart();

      sendCartUpdate({
        userId,
        cartCount: getTotalItems(),
      });

    } catch (err) {
      console.error('Failed to remove from cart:', err);
      setError('Failed to remove item');
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    if (!userId) return;

    setError(null);

    try {
      await api.delete('/api/cart');
      setItems([]);

      sendCartUpdate({
        userId,
        cartCount: 0,
      });

    } catch (err) {
      console.error('Failed to clear cart:', err);
      setError('Failed to clear cart');
    }
  };

  // Helper methods (computed values)
  const getItemQuantity = (productId: string): number => {
    const item = items.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const getTotalItems = (): number => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = (): number => {
    return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const contextValue: CartContextType = {
    items,
    isLoading,
    error,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getItemQuantity,
    getTotalItems,
    getTotalPrice,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  
  return context;
};
