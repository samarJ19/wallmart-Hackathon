import { io, Socket } from 'socket.io-client';

// Types for the data we'll send/receive
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

// Simple WebSocket connection - just one instance, no singleton complexity
let socket: Socket | null = null;

// 1. Connect to WebSocket server
export const connectWebSocket = (userId?: string): Socket => {
  // If already connected, return existing socket
  if (socket?.connected) {
    console.log('Socket already connected');
    return socket;
  }

  const serverUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  
  // Create connection
  socket = io(serverUrl, {
    transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
    timeout: 20000,
  });

  // 2. Set up basic event listeners
  socket.on('connect', () => {
    console.log('✅ Connected to server:', socket?.id);
    
    // Join user-specific room for personalized updates
    if (userId) {
      socket?.emit('join-user-room', userId);
      console.log(`📡 Joined room for user: ${userId}`);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('🚫 Connection failed:', error);
  });

  return socket;
};

// 3. Get the current socket (for direct use)
export const getSocket = (): Socket | null => {
  return socket;
};

// 4. Check if connected
export const isConnected = (): boolean => {
  return socket?.connected === true;
};

// 5. Disconnect
export const disconnectWebSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Disconnected from server');
  }
};

// 6. Helper functions for common actions (optional - you can use socket directly)
export const sendUserInteraction = (interaction: UserInteraction): void => {
  if (socket?.connected) {
    socket.emit('user-interaction', interaction);
    console.log('📊 Interaction sent:', interaction);
  } else {
    console.warn('⚠️ Socket not connected - cannot send interaction');
  }
};

export const sendCartUpdate = (data: CartUpdateData): void => {
  if (socket?.connected) {
    socket.emit('cart-update', data);
    console.log('🛒 Cart update sent:', data);
  } else {
    console.warn('⚠️ Socket not connected - cannot send cart update');
  }
};

// 7. Simple tracking helpers (these are just convenience functions)
export const trackProductView = (userId: string, productId: string): void => {
  sendUserInteraction({
    userId,
    productId,
    action: 'view',
    context: {
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
    }
  });
};

export const trackProductLike = (userId: string, productId: string): void => {
  sendUserInteraction({ userId, productId, action: 'tick' });
};

export const trackProductDislike = (userId: string, productId: string): void => {
  sendUserInteraction({ userId, productId, action: 'cross' });
};

export const trackAddToCart = (userId: string, productId: string, quantity = 1): void => {
  sendUserInteraction({ 
    userId, 
    productId, 
    action: 'cart_add',
    context: { quantity }
  });
};
