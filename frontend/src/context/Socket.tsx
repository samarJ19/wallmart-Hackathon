import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// Types
export interface UserInteraction {
  userId: string;
  productId: string;
  action: 'view' | 'tick' | 'cross' | 'cart_add' | 'purchase' | 'ar_view';
  context?: Record<string, any>;
}

export interface CartUpdateData {
  userId: string;
  cartCount: number;
}

// Context type
interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendUserInteraction: (interaction: UserInteraction) => void;
  sendCartUpdate: (data: CartUpdateData) => void;
  // Convenience tracking methods
  trackProductView: (productId: string, context?: Record<string, any>) => void;
  trackProductLike: (productId: string) => void;
  trackProductDislike: (productId: string) => void;
  trackAddToCart: (productId: string, quantity?: number) => void;
}

// Create context
const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Provider props
interface WebSocketProviderProps {
  children: ReactNode;
  userId?: string; // Pass userId from your auth context
}

// Provider component
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  userId 
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) {
      // Don't connect if no user is logged in
      return;
    }

    // Create connection
    const serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    // Set up event listeners
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
      setIsConnected(true);
      
      // Join user-specific room
      newSocket.emit('join-user-room', userId);
      console.log(`📡 Joined room for user: ${userId}`);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚫 WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Listen for server events (you can add more as needed)
    newSocket.on('cart-updated', (data) => {
      console.log('🛒 Cart updated:', data);
      // You can dispatch events here or use a callback prop
    });

    newSocket.on('new-interaction', (data) => {
      console.log('📊 New interaction logged:', data);
    });

    setSocket(newSocket);

    // Cleanup on unmount or userId change
    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [userId]); // Reconnect when userId changes

  // Helper functions
  const sendUserInteraction = (interaction: UserInteraction) => {
    if (socket?.connected) {
      socket.emit('user-interaction', interaction);
      console.log('📊 Interaction sent:', interaction);
    } else {
      console.warn('⚠️ Socket not connected - cannot send interaction');
    }
  };

  const sendCartUpdate = (data: CartUpdateData) => {
    if (socket?.connected) {
      socket.emit('cart-update', data);
      console.log('🛒 Cart update sent:', data);
    } else {
      console.warn('⚠️ Socket not connected - cannot send cart update');
    }
  };

  // Convenience tracking methods that automatically include userId
  const trackProductView = (productId: string, context?: Record<string, any>) => {
    if (!userId) return;
    
    sendUserInteraction({
      userId,
      productId,
      action: 'view',
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
      }
    });
  };

  const trackProductLike = (productId: string) => {
    if (!userId) return;
    sendUserInteraction({ userId, productId, action: 'tick' });
  };

  const trackProductDislike = (productId: string) => {
    if (!userId) return;
    sendUserInteraction({ userId, productId, action: 'cross' });
  };

  const trackAddToCart = (productId: string, quantity = 1) => {
    if (!userId) return;
    sendUserInteraction({ 
      userId, 
      productId, 
      action: 'cart_add',
      context: { quantity }
    });
  };

  const contextValue: WebSocketContextType = {
    socket,
    isConnected,
    sendUserInteraction,
    sendCartUpdate,
    trackProductView,
    trackProductLike,
    trackProductDislike,
    trackAddToCart,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use the WebSocket context
export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
};
