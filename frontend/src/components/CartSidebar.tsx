import React from 'react';
import { ShoppingCart, X, Plus, User } from 'lucide-react';

// Types (you already have these)
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  imageUrl: string;
}

interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  product: Product;
}

interface SharedCart {
  username: string;
  cartItems: CartItem[];
}

interface CartSharingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sharedCarts: { [userId: string]: SharedCart };
  onAddToCart?: (productId: string, quantity: number) => void;
}

const CartSharingSidebar: React.FC<CartSharingSidebarProps> = ({
  isOpen,
  onClose,
  sharedCarts,
  onAddToCart
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const handleAddToCart = (productId: string, quantity: number) => {
    if (onAddToCart) {
      onAddToCart(productId, quantity);
    }
  };

  

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Shared Carts</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {Object.keys(sharedCarts).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ShoppingCart className="w-12 h-12 mb-2 text-gray-300" />
            <p className="text-sm">No carts are being shared</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {Object.entries(sharedCarts).map(([userId, sharedCart]) => (
              <div key={userId} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* User Header */}
                <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <h3 className="font-medium text-gray-800">{sharedCart.username}</h3>
                    <span className="text-xs text-gray-500">
                      ({sharedCart.cartItems.length} items)
                    </span>
                  </div>
                </div>

                {/* Cart Items */}
                <div className="max-h-80 overflow-y-auto">
                  {sharedCart.cartItems.map((item) => (
                    <div key={item.id} className="p-4 border-b border-gray-100 last:border-b-0">
                      <div className="flex gap-3">
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNMjQgMjRIMzJWMzJIMjRWMjRaIiBmaWxsPSIjOUNBM0FGIi8+PC9zdmc+';
                            }}
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-800 truncate">
                            {item.product.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {item.product.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-green-600">
                                {formatPrice(item.product.price)}
                              </span>
                              <span className="text-xs text-gray-500">
                                × {item.quantity}
                              </span>
                            </div>
                            <button
                              onClick={() => handleAddToCart(item.product.id, item.quantity)}
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Total */}
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatPrice(
                        sharedCart.cartItems.reduce(
                          (total, item) => total + (item.product.price * item.quantity),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CartSharingSidebar;