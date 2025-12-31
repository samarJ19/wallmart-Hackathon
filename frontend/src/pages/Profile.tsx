
import React, { useState } from 'react';
import {  MapPin, Package,  Users, ShoppingCart, Heart, Edit3, Mail, Phone, Calendar } from 'lucide-react';

// Updated profile page:
// Type definitions
interface Order {
  id: string;
  status: 'delivered' | 'shipped' | 'processing' | 'pending';
  total: number;
  date: string;
  items: string;
}

interface Address {
  id: number;
  type: string;
  address: string;
  isDefault: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  status: string;
  lastSeen: string;
  joinedDate: string;
  phone: string;
}

interface TabButtonProps {
  id: string;
  label: string;
  isActive: boolean;
  onClick: (id: string) => void;
}

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Mock user data based on your schema
  const user: UserProfile = {
    name: "Samar Joshi",
    email: "23bcs060@ietdavv.edu.in",
    avatar: "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18yejE5YzdPSGJFbHNpWXpwTVRObUhFU2lCUTMifQ",
    status: "online",
    lastSeen: "2 hours ago",
    joinedDate: "January 2024",
    phone: "+91 98765 43210"
  };

  const recentOrders: Order[] = [
    { id: "ORD-001", status: "delivered", total: 1299, date: "Dec 10, 2024", items: "Apple MacBook Air M2" },
    { id: "ORD-002", status: "shipped", total: 349, date: "Dec 8, 2024", items: "Sony WH-1000XM5 Headphones" },
    { id: "ORD-003", status: "processing", total: 899, date: "Dec 5, 2024", items: "Samsung Galaxy S24 Ultra" }
  ];

  const addresses: Address[] = [
    { id: 1, type: "Home", address: "123 Main Street, Andheri West, Mumbai, Maharashtra 400058", isDefault: true },
    { id: 2, type: "Office", address: "456 Business Park, Bandra Kurla Complex, Mumbai, Maharashtra 400051", isDefault: false }
  ];

  const getStatusColor = (status: Order['status']): string => {
    switch(status) {
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'shipped': return 'text-blue-600 bg-blue-50';
      case 'processing': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const TabButton: React.FC<TabButtonProps> = ({ id, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
        isActive 
          ? 'text-blue-600 border-b-2 border-blue-600' 
          : 'text-gray-600 hover:text-blue-600'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {user.email}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Joined {user.joinedDate}
                  </span>
                </div>
              </div>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cart Items</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Wishlisted</p>
                <p className="text-2xl font-bold text-gray-900">8</p>
              </div>
              <Heart className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Groups</p>
                <p className="text-2xl font-bold text-gray-900">2</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              <TabButton 
                id="overview" 
                label="Overview" 
                isActive={activeTab === 'overview'} 
                onClick={setActiveTab} 
              />
              <TabButton 
                id="orders" 
                label="Orders" 
                isActive={activeTab === 'orders'} 
                onClick={setActiveTab} 
              />
              <TabButton 
                id="addresses" 
                label="Addresses" 
                isActive={activeTab === 'addresses'} 
                onClick={setActiveTab} 
              />
              <TabButton 
                id="settings" 
                label="Settings" 
                isActive={activeTab === 'settings'} 
                onClick={setActiveTab} 
              />
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Recent Orders */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
                  <div className="space-y-3">
                    {recentOrders.slice(0, 3).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{order.items}</p>
                            <p className="text-sm text-gray-600">{order.date} • Order #{order.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">₹{order.total}</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium text-gray-900">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Phone className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium text-gray-900">{user.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order History</h3>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">Order #{order.id}</span>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">{order.date}</span>
                      </div>
                      <p className="text-gray-700 mb-2">{order.items}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">₹{order.total}</span>
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Saved Addresses</h3>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Add New Address
                  </button>
                </div>
                <div className="space-y-4">
                  {addresses.map((address) => (
                    <div key={address.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <MapPin className="w-5 h-5 text-gray-600 mt-1" />
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-medium text-gray-900">{address.type}</span>
                              {address.isDefault && (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Default</span>
                              )}
                            </div>
                            <p className="text-gray-700">{address.address}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                          <button className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
                <div className="space-y-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Notifications</h4>
                        <p className="text-sm text-gray-600">Manage your notification preferences</p>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Configure
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Privacy</h4>
                        <p className="text-sm text-gray-600">Control your privacy settings</p>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Manage
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Security</h4>
                        <p className="text-sm text-gray-600">Update password and security settings</p>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;