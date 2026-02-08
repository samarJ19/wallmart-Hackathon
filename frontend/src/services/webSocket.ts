import type { CartItem } from '@/types';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface Message {
  id: string;
  content: string;
  messageType: string;
  createdAt: string;
  user: User;
  groupChatId: string;
  metadata?: Record<string, unknown>;
}

interface UserStatus {
  userId: string;
  status: 'online' | 'offline';
  name: string;
}

interface TypingStatus {
  userId: string;
  name: string;
  groupChatId: string;
}

interface CartShareStarted {
  userId: string;
  username: string;
  cartItems: CartItem[];
}

interface CartShareStopped {
  userId: string;
}

interface CartShareUpdated {
  userId: string;
  cartItems: CartItem[];
}

type MessageHandler = (data: { message: Message; groupChatId: string }) => void;
type MessagesHandler = (data: { groupChatId: string; messages: Message[] }) => void;
type UserStatusHandler = (data: UserStatus) => void;
type TypingHandler = (data: TypingStatus) => void;
type ErrorHandler = (data: { message: string }) => void;
type CartShareStartedHandler = (data: CartShareStarted) => void;
type CartShareStoppedHandler = (data: CartShareStopped) => void;
type CartShareUpdatedHandler = (data: CartShareUpdated) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private cartListenersSetup = false; // Add this flag

  // Event handlers
  private messageHandlers: MessageHandler[] = [];
  private recentMessagesHandlers: MessagesHandler[] = [];
  private userStatusHandlers: UserStatusHandler[] = [];
  private typingHandlers: TypingHandler[] = [];
  private stopTypingHandlers: TypingHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private cartShareStartedHandlers: CartShareStartedHandler[] = [];
  private cartShareStoppedHandlers: CartShareStoppedHandler[] = [];
  private cartShareUpdatedHandlers: CartShareUpdatedHandler[] = [];

  constructor(serverUrl: string = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
  }

  private serverUrl: string;

  // Initialize connection with auth token
  connect(authToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      this.socket = io(this.serverUrl, {
        auth: {
          token: authToken
        }
      });

      this.socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        this.isConnected = true;
        this.setupEventListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection failed:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
        this.isConnected = false;
        this.cartListenersSetup = false; // Reset flag on disconnect
      });
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('new_message', (data) => {
      this.messageHandlers.forEach(handler => handler(data));
    });

    this.socket.on('recent_messages', (data) => {
      this.recentMessagesHandlers.forEach(handler => handler(data));
    });

    this.socket.on('user_status_changed', (data) => {
      this.userStatusHandlers.forEach(handler => handler(data));
    });

    this.socket.on('user_typing', (data) => {
      this.typingHandlers.forEach(handler => handler(data));
    });

    this.socket.on('user_stopped_typing', (data) => {
      this.stopTypingHandlers.forEach(handler => handler(data));
    });

    this.socket.on('error', (data) => {
      this.errorHandlers.forEach(handler => handler(data));
    });

    // Set up cart sharing event listeners immediately
    this.setupCartSharingListeners();
  }

  private setupCartSharingListeners() {
    if (!this.socket || this.cartListenersSetup) return;

    console.log('Setting up cart sharing listeners');

    // Cart sharing event listeners - DO NOT remove existing listeners
    this.socket.on('cart-share-started', (data) => {
      console.log('WebSocket service received cart-share-started:', data);
      this.cartShareStartedHandlers.forEach(handler => handler(data));
    });

    this.socket.on('cart-share-stopped', (data) => {
      console.log('WebSocket service received cart-share-stopped:', data);
      this.cartShareStoppedHandlers.forEach(handler => handler(data));
    });

    this.socket.on('cart-share-updated', (data) => {
      console.log('WebSocket service received cart-share-updated:', data);
      this.cartShareUpdatedHandlers.forEach(handler => handler(data));
    });

    this.cartListenersSetup = true; // Mark as set up
  }

  // Join a group chat
  joinGroup(groupChatId: string) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('join_group', { groupChatId });
  }

  // Send message to group
  sendMessage(groupChatId: string, content: string, messageType: string = 'text', metadata?: Record<string, unknown>) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket not connected');
      return;
    }
    this.socket.emit('send_message', {
      groupChatId,
      content,
      messageType,
      metadata
    });
  }

  // Typing indicators
  startTyping(groupChatId: string) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('typing_start', { groupChatId });
  }

  stopTyping(groupChatId: string) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('typing_stop', { groupChatId });
  }

  // Cart sharing methods
  startCartSharing(groupId: string, cartItems: CartItem[]) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket not connected');
      return;
    }
    console.log('Emitting start-cart-sharing event:', { groupId, cartItems });
    this.socket.emit('start-cart-sharing', { groupId, cartItems });
  }

  stopCartSharing(groupId: string) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket not connected');
      return;
    }
    console.log('Emitting stop-cart-sharing event:', { groupId });
    this.socket.emit('stop-cart-sharing', { groupId });
  }

  updateSharedCart(groupId: string, cartItems: CartItem[]) {
    if (!this.socket || !this.isConnected) {
      console.error('Socket not connected');
      return;
    }
    console.log('Emitting update-shared-cart event:', { groupId, cartItems });
    this.socket.emit('update-shared-cart', { groupId, cartItems });
  }

  // Event handler registration
  onNewMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onRecentMessages(handler: MessagesHandler) {
    this.recentMessagesHandlers.push(handler);
    return () => {
      this.recentMessagesHandlers = this.recentMessagesHandlers.filter(h => h !== handler);
    };
  }

  onUserStatusChange(handler: UserStatusHandler) {
    this.userStatusHandlers.push(handler);
    return () => {
      this.userStatusHandlers = this.userStatusHandlers.filter(h => h !== handler);
    };
  }

  onUserTyping(handler: TypingHandler) {
    this.typingHandlers.push(handler);
    return () => {
      this.typingHandlers = this.typingHandlers.filter(h => h !== handler);
    };
  }

  onUserStoppedTyping(handler: TypingHandler) {
    this.stopTypingHandlers.push(handler);
    return () => {
      this.stopTypingHandlers = this.stopTypingHandlers.filter(h => h !== handler);
    };
  }

  onError(handler: ErrorHandler) {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
    };
  }

  // Cart sharing event handlers - SIMPLIFIED
  onCartShareStarted(handler: CartShareStartedHandler) {
    this.cartShareStartedHandlers.push(handler);
    
    // Ensure cart sharing listeners are set up
    if (this.socket && !this.cartListenersSetup) {
      this.setupCartSharingListeners();
    }
    
    return () => {
      this.cartShareStartedHandlers = this.cartShareStartedHandlers.filter(h => h !== handler);
    };
  }

  onCartShareStopped(handler: CartShareStoppedHandler) {
    this.cartShareStoppedHandlers.push(handler);
    
    // Ensure cart sharing listeners are set up
    if (this.socket && !this.cartListenersSetup) {
      this.setupCartSharingListeners();
    }
    
    return () => {
      this.cartShareStoppedHandlers = this.cartShareStoppedHandlers.filter(h => h !== handler);
    };
  }

  onCartShareUpdated(handler: CartShareUpdatedHandler) {
    this.cartShareUpdatedHandlers.push(handler);
    
    // Ensure cart sharing listeners are set up
    if (this.socket && !this.cartListenersSetup) {
      this.setupCartSharingListeners();
    }
    
    return () => {
      this.cartShareUpdatedHandlers = this.cartShareUpdatedHandlers.filter(h => h !== handler);
    };
  }

  // Connection status
  getConnectionStatus() {
    return this.isConnected;
  }

  // Get socket instance (for debugging)
  getsocket() {
    return this.socket;
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.cartListenersSetup = false;
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;