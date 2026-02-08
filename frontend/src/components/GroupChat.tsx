import { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  Users,
  Send,
  X,
  Hash,
  UserPlus,
  ChevronLeft,
  MoreVertical,
  ShoppingCart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useChat } from "@/context/ChatContext";
import { useAuthenticatedAPI } from "@/services/api";
import { useAuth } from "@clerk/clerk-react";
import webSocketService from "@/services/webSocket";
import type { CartItem } from "@/types";
import CartSharingSidebar from "./CartSidebar";

interface Group {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
  messages: Message[];
  _count: {
    members: number;
    messages: number;
  };
  currentUserRole?: string;
  currentUserJoinedAt?: string;
  currentUserLastRead?: string;
}

interface User {
  id: string;
  name: string;
  avatar?: string;
  status?: boolean;
  lastSeen?: string;
}

interface Message {
  id: string;
  content: string;
  messageType: string;
  createdAt: string;
  user: User;
  groupChatId: string;
  metadata?: Record<string, unknown>;
  isDeleted?: boolean;
}

interface GroupMember {
  id: string;
  userId: string;
  role: "admin" | "member";
  joinedAt: string;
  lastRead?: string;
  isActive: boolean;
  user: User;
}

interface SharedCart {
  username: string;
  cartItems: CartItem[];
}

const GroupChat = () => {
  const { isChatOpen, closeChat } = useChat();
  const { getToken } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const authAPI = useAuthenticatedAPI();
  const [userIdBE, setUserIdBE] = useState("");
  const [sharedCarts, setSharedCarts] = useState<{
    [userId: string]: SharedCart;
  }>({});
  const [isMyCartShared, setIsMyCartShared] = useState(false);
  const [myCartItems, setMyCartItems] = useState<CartItem[]>([]);
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);

  useEffect(() => {
    if (isChatOpen) {
      fetchGroups();
    }
  }, [isChatOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // WebSocket connection effect
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const token = (await getToken()) as string;
        await webSocketService.connect(token);
        setIsConnected(true);
      } catch (error) {
        console.error("Error initializing socket:", error);
        setIsConnected(false);
      }
    };

    if (isChatOpen) {
      initializeSocket();
    }

    return () => {
      setIsConnected(false);
    };
  }, [isChatOpen, getToken]);

  // WebSocket effect for selected group - messages
  useEffect(() => {
    if (!selectedGroup || !isConnected) return;

    console.log("Setting up WebSocket for group:", selectedGroup.id);

    webSocketService.joinGroup(selectedGroup.id);

    // Set up message listener
    const unsubscribeMessage = webSocketService.onNewMessage(
      ({ message }: { message: Message }) => {
        console.log("Received new message:", message);
        const formattedMessage: Message = {
          ...message,
          isDeleted: message.isDeleted || false,
        };
        setMessages((prev) => [...prev, formattedMessage]);
      }
    );

    // Cleanup on unmount
    return () => {
      unsubscribeMessage();
    };
  }, [selectedGroup, isConnected]);

  // WebSocket cart sharing listeners - FIXED
  useEffect(() => {
    console.log("=== CART SHARING DEBUG ===");
    console.log("isConnected:", isConnected);
    console.log("selectedGroup:", selectedGroup?.id);
    console.log("========================");
  }, [isConnected, selectedGroup]);

  // Modify your cart sharing listeners useEffect to include more debugging
  useEffect(() => {
    if (!isConnected || !selectedGroup) {
      console.log("❌ WebSocket not connected or no group selected", {
        isConnected,
        selectedGroup: selectedGroup?.id,
      });
      return;
    }

    console.log(
      "✅ Setting up cart sharing listeners for group:",
      selectedGroup.id
    );

    // Listen for cart sharing events
    const unsubscribeCartStarted = webSocketService.onCartShareStarted(
      ({
        userId,
        username,
        cartItems,
      }: {
        userId: string;
        username: string;
        cartItems: CartItem[];
      }) => {
        console.log("🎯 Cart sharing started received in component:", {
          userId,
          username,
          cartItems,
        });
        console.log("🎯 Current sharedCarts before update:", sharedCarts);

        setSharedCarts((prev) => {
          const updated = {
            ...prev,
            [userId]: {
              username,
              cartItems,
            },
          };
          console.log("🎯 Updated shared carts:", updated);
          return updated;
        });
      }
    );

    const unsubscribeCartUpdated = webSocketService.onCartShareUpdated(
      (data) => {
        console.log("🔄 Cart sharing updated received in component:", data);
        setSharedCarts((prev) => {
          const updated = {
            ...prev,
            [data.userId]: {
              ...prev[data.userId],
              cartItems: data.cartItems,
            },
          };
          console.log("🔄 Updated shared carts:", updated);
          return updated;
        });
      }
    );

    const unsubscribeCartStopped = webSocketService.onCartShareStopped(
      (data) => {
        console.log("⏹️ Cart sharing stopped received in component:", data);
        setSharedCarts((prev) => {
          const newCarts = { ...prev };
          delete newCarts[data.userId];
          console.log("⏹️ Updated shared carts after removal:", newCarts);
          return newCarts;
        });
      }
    );

    // Cleanup function
    return () => {
      console.log(
        "🧹 Cleaning up cart sharing listeners for group:",
        selectedGroup.id
      );
      unsubscribeCartStarted();
      unsubscribeCartUpdated();
      unsubscribeCartStopped();
    };
  }, [isConnected, selectedGroup]);

  // Also add this to your handleStartCartSharing function
  const handleStartCartSharing = async () => {
    console.log("🚀 Starting cart sharing process");
    console.log("🚀 Selected group:", selectedGroup?.id);
    console.log("🚀 IsConnected:", isConnected);

    if (!selectedGroup) {
      console.error("❌ No group selected");
      return;
    }

    if (!isConnected) {
      console.error("❌ WebSocket not connected");
      return;
    }

    try {
      console.log("📡 Fetching cart items...");

      // Fetch current user's cart
      const cartResponse = await authAPI.get("/api/cart/cartproducts");
      const cartItems = cartResponse.data.cartData;

      console.log("📦 Fetched cart items:", cartItems);
      console.log("📦 Cart items count:", cartItems.length);

      // Check WebSocket connection status
      console.log(
        "🔗 WebSocket connection status:",
        webSocketService.getConnectionStatus()
      );
      console.log("🔗 Socket instance:", webSocketService.getsocket());

      // Emit to WebSocket using the service
      console.log("📤 Emitting cart sharing event...");
      webSocketService.startCartSharing(selectedGroup.id, cartItems);

      setIsMyCartShared(true);
      setMyCartItems(cartItems);
      setIsCartSidebarOpen(true); // Open the sidebar when cart sharing starts

      console.log("✅ Cart sharing started successfully");
    } catch (error) {
      console.error("❌ Error sharing cart:", error);
    }
  };

  // Debug effect to monitor sharedCarts changes
  useEffect(() => {
    console.log("SharedCarts state changed:", sharedCarts);
  }, [sharedCarts]);

  const handleStopCartSharing = () => {
    if (!selectedGroup) {
      console.error("No group selected");
      return;
    }

    if (!isConnected) {
      console.error("WebSocket not connected");
      return;
    }

    console.log("Stopping cart sharing for group:", selectedGroup.id);
    webSocketService.stopCartSharing(selectedGroup.id);
    setSharedCarts({});
    setIsMyCartShared(false);
  };

  const handleUpdateSharedCart = async () => {
    if (!selectedGroup || !isMyCartShared) {
      console.error("No group selected or cart not shared");
      return;
    }

    if (!isConnected) {
      console.error("WebSocket not connected");
      return;
    }

    try {
      console.log("Updating shared cart for group:", selectedGroup.id);

      // Fetch updated cart
      const cartResponse = await authAPI.get("/api/cart/cartproducts");
      const cartItems = cartResponse.data.cartData;

      console.log("Fetched updated cart items:", cartItems);

      // Emit update to WebSocket
      webSocketService.updateSharedCart(selectedGroup.id, cartItems);

      setMyCartItems(cartItems);

      console.log("Cart sharing updated successfully");
    } catch (error) {
      console.error("Error updating shared cart:", error);
    }
  };

  // Helper function to get total items in a cart
  const getTotalItems = (cartItems: CartItem[]) => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await authAPI.get("/api/groups/my-groups");
      setGroups(response.data.groups);
      setUserIdBE(response.data.userId);
    } catch (err) {
      console.error("Error fetching groups:", err);
    } finally {
      setLoading(false);
      console.log("User database Id: ", userIdBE);
    }
  };

  const handleGroupSelect = async (group: Group) => {
    console.log("Selecting group:", group.id);
    setSelectedGroup(group);
    setShowMembers(false);
    setMessagesLoading(true);

    // Reset cart sharing state when switching groups
    setSharedCarts({});
    setIsMyCartShared(false);
    setMyCartItems([]);

    try {
      // Fetch messages for the selected group
      const messagesBE = await authAPI.get(`/api/groups/${group.id}/messages`);
      // Reverse messages to show oldest first (newest at bottom)
      setMessages(messagesBE.data.messages.reverse());
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessagesLoading(false);
      console.log("Messages: ", messages);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    const messageData = {
      content: newMessage,
      groupChatId: selectedGroup.id,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    try {
      webSocketService.sendMessage(
        messageData.groupChatId,
        messageData.content,
        "text"
      );
      setNewMessage(""); // Clear input after sending
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleShowMembers = async () => {
    if (!selectedGroup) return;

    setShowMembers(true);
    try {
      const membersRes = await authAPI.get(`/api/groups/${selectedGroup.id}`);
      setGroupMembers(membersRes.data.groupChat.members);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const getLastMessage = (group: Group) => {
    if (group.messages && group.messages.length > 0) {
      return group.messages[0].content;
    }
    return "No messages yet";
  };

  const getLastMessageTime = (group: Group) => {
    if (group.messages && group.messages.length > 0) {
      return new Date(group.messages[0].createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return "";
  };

  const getUnreadCount = (group: Group) => {
    if (!group.currentUserLastRead || !group.messages.length) return 0;

    const lastReadTime = new Date(group.currentUserLastRead);
    return group.messages.filter(
      (message) => new Date(message.createdAt) > lastReadTime
    ).length;
  };

  const handleAddToCart = async (productId: string, quantity: number) => {
  try {
    // Replace with your actual API call to add items to cart
    await authAPI.post("/api/cart/add", {
      productId,
      quantity
    });
    
    console.log(`Added ${quantity} of product ${productId} to cart`);
    // You might want to show a toast notification here
  } catch (error) {
    console.error("Error adding to cart:", error);
  }
};

  if (!isChatOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-100 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h2 className="font-semibold">
            {selectedGroup ? selectedGroup.name : "Group Chat"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection status indicator */}
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-400" : "bg-red-400"
            }`}
          />
          <button
            onClick={closeChat}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Group List */}
      {!selectedGroup && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Your Groups</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => {
                  const unreadCount = getUnreadCount(group);
                  return (
                    <div
                      key={group.id}
                      onClick={() => handleGroupSelect(group)}
                      className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-sm">
                            {group.name}
                          </span>
                        </div>
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {unreadCount}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600 truncate flex-1">
                          {getLastMessage(group)}
                        </p>
                        <span className="text-xs text-gray-500 ml-2">
                          {getLastMessageTime(group)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {group._count.members} members
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      {selectedGroup && !showMembers && (
        <>
          {/* Chat Header */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="font-medium text-sm">{selectedGroup.name}</h3>
                  <p className="text-xs text-gray-500">
                    {selectedGroup._count.members} members
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShowMembers}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Users className="w-4 h-4" />
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : Array.isArray(messages) && messages.length > 0 ? (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.user.id === userIdBE
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.user.id === userIdBE
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    {message.user.id !== userIdBE && (
                      <p className="text-xs font-medium mb-1">
                        {message.user.name}
                      </p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.user.id === userIdBE
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">No messages</p>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Cart Sharing Section */}
          <div className="p-4 border-t border-gray-200 space-y-2 bg-gray-50">
            <h4 className="font-medium text-sm mb-3">Cart Sharing</h4>
            <button
              onClick={() => setIsCartSidebarOpen(true)}
              className="p-2 bg-blue-600 w-full flex justify-center  text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={Object.keys(sharedCarts).length === 0}
            >
              <ShoppingCart className="w-4 mx-2 mt-1 h-4" />
              View Shared Carts ({Object.keys(sharedCarts).length})
            </button>
            {/* My Cart Controls */}
            <div className="mb-4">
              {!isMyCartShared ? (
                <button
                  onClick={handleStartCartSharing}
                  disabled={!isConnected}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Share My Cart
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">
                    Your cart is being shared ({getTotalItems(myCartItems)}{" "}
                    items)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateSharedCart}
                      disabled={!isConnected}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                    >
                      Update
                    </button>
                    <button
                      onClick={handleStopCartSharing}
                      disabled={!isConnected}
                      className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Shared Carts Display */}
            <div className="space-y-2">
              <h5 className="font-medium text-xs text-gray-700">
                Shared Carts
              </h5>
              <CartSharingSidebar
                isOpen={isCartSidebarOpen}
                onClose={() => setIsCartSidebarOpen(false)}
                sharedCarts={sharedCarts}
                onAddToCart={handleAddToCart}

              />
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !isConnected}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      )}

      {/* Members List */}
      {selectedGroup && showMembers && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowMembers(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="font-medium text-gray-900">Members</h3>
              <button className="text-blue-600 hover:text-blue-700">
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {groupMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {member.user.name[0]}
                        </span>
                      </div>
                      {member.user.status && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.user.name}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                  {member.role === "admin" && (
                    <Badge variant="secondary" className="text-xs">
                      Admin
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChat;