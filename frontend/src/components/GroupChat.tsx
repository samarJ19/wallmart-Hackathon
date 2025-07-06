import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Users, 
  Send, 
  X, 
  Hash,
  UserPlus,
  ChevronLeft,
  MoreVertical
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useChat } from '@/context/ChatContext';
import { useAuthenticatedAPI } from '@/services/api';

interface Group {
  id: string;
  name: string;
  memberCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  groupId: string;
}

interface GroupMember {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  role: 'admin' | 'member';
}

const GroupChat = () => {
  const { isChatOpen, closeChat } = useChat();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const authAPI = useAuthenticatedAPI();

  // Mock data for demonstration
  useEffect(() => {
    if (isChatOpen) {
      // Replace with actual API calls
      setGroups([
        {
          id: '1',
          name: 'General Discussion',
          memberCount: 24,
          lastMessage: 'Hey everyone! Check out this new product...',
          lastMessageTime: '2 min ago',
          unreadCount: 3
        },
        {
          id: '2',
          name: 'Electronics Lovers',
          memberCount: 156,
          lastMessage: 'Anyone tried the new iPhone?',
          lastMessageTime: '1 hour ago',
          unreadCount: 12
        },
        {
          id: '3',
          name: 'Fashion & Style',
          memberCount: 89,
          lastMessage: 'Summer collection is amazing!',
          lastMessageTime: '3 hours ago',
          unreadCount: 0
        }
      ]);
    }
  }, [isChatOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleGroupSelect = async (group: Group) => {
    setSelectedGroup(group);
    setShowMembers(false);
    setLoading(true);
    
    try {
      // Replace with actual API call
      // const messagesRes = await authAPI.get(`/api/groups/${group.id}/messages`);
      // setMessages(messagesRes.data);
      
      // Mock messages
      setTimeout(() => {
        setMessages([
          {
            id: '1',
            content: 'Hey everyone! Welcome to our group chat!',
            sender: { id: '1', name: 'Alice Johnson' },
            timestamp: '10:30 AM',
            groupId: group.id
          },
          {
            id: '2',
            content: 'Thanks for creating this group. This will be really helpful for discussing products.',
            sender: { id: '2', name: 'Bob Smith' },
            timestamp: '10:32 AM',
            groupId: group.id
          },
          {
            id: '3',
            content: 'Absolutely! Has anyone tried the new wireless headphones?',
            sender: { id: '3', name: 'Carol Davis' },
            timestamp: '10:35 AM',
            groupId: group.id
          }
        ]);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    const messageData = {
      content: newMessage,
      groupId: selectedGroup.id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      // Replace with actual API call and WebSocket emission
      // await authAPI.post('/api/messages', messageData);
      
      // Mock adding message
      const newMsg: Message = {
        id: Date.now().toString(),
        content: newMessage,
        sender: { id: 'current-user', name: 'You' },
        timestamp: messageData.timestamp,
        groupId: selectedGroup.id
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleShowMembers = async () => {
    if (!selectedGroup) return;
    
    setShowMembers(true);
    try {
      // Replace with actual API call
      // const membersRes = await authAPI.get(`/api/groups/${selectedGroup.id}/members`);
      // setGroupMembers(membersRes.data);
      
      // Mock members
      setGroupMembers([
        { id: '1', name: 'Alice Johnson', isOnline: true, role: 'admin' },
        { id: '2', name: 'Bob Smith', isOnline: true, role: 'member' },
        { id: '3', name: 'Carol Davis', isOnline: false, role: 'member' },
        { id: '4', name: 'David Wilson', isOnline: true, role: 'member' }
      ]);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  if (!isChatOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h2 className="font-semibold">
            {selectedGroup ? selectedGroup.name : 'Group Chat'}
          </h2>
        </div>
        <button
          onClick={closeChat}
          className="text-white hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Group List */}
      {!selectedGroup && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Your Groups</h3>
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => handleGroupSelect(group)}
                  className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-sm">{group.name}</span>
                    </div>
                    {group.unreadCount && group.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {group.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600 truncate flex-1">
                      {group.lastMessage}
                    </p>
                    <span className="text-xs text-gray-500 ml-2">
                      {group.lastMessageTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Users className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {group.memberCount} members
                    </span>
                  </div>
                </div>
              ))}
            </div>
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
                  <p className="text-xs text-gray-500">{selectedGroup.memberCount} members</p>
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
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender.id === 'current-user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.sender.id === 'current-user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    {message.sender.id !== 'current-user' && (
                      <p className="text-xs font-medium mb-1">{message.sender.name}</p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender.id === 'current-user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
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
                disabled={!newMessage.trim()}
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
                          {member.name[0]}
                        </span>
                      </div>
                      {member.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                    </div>
                  </div>
                  {member.role === 'admin' && (
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