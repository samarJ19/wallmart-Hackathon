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
  metadata?: any;
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

type MessageHandler = (data: { message: Message; groupChatId: string }) => void;
type MessagesHandler = (data: { groupChatId: string; messages: Message[] }) => void;
type UserStatusHandler = (data: UserStatus) => void;
type TypingHandler = (data: TypingStatus) => void;
type ErrorHandler = (data: { message: string }) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private isConnected = false;

  // Event handlers
  private messageHandlers: MessageHandler[] = [];
  private recentMessagesHandlers: MessagesHandler[] = [];
  private userStatusHandlers: UserStatusHandler[] = [];
  private typingHandlers: TypingHandler[] = [];
  private stopTypingHandlers: TypingHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];

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

      this.token = authToken;
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
  sendMessage(groupChatId: string, content: string, messageType: string = 'text', metadata?: any) {
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

  // Connection status
  getConnectionStatus() {
    return this.isConnected;
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;