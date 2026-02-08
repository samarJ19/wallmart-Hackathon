import axios from 'axios';
import { useAuth } from '@clerk/clerk-react';

// 1. Simple Axios instance with base configuration
export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Response interceptor for error handling (optional)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('Unauthorized access');
      // Handle logout/redirect
    }
    
    return Promise.reject(error);
  }
);

// 3. Hook to automatically add auth token to requests
export const useAuthenticatedAPI = () => {
  const { getToken } = useAuth();

  // Create an axios instance with automatic token injection
  const authenticatedAPI = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add token to every request automatically
  authenticatedAPI.interceptors.request.use(async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    return config;
  });

  // Same error handling
  authenticatedAPI.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('API Error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        console.error('Unauthorized access');
      }
      return Promise.reject(error);
    }
  );

  return authenticatedAPI;
};

// Types (keep these)
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  imageUrl: string;
  images: string[];
  features: Record<string, unknown>;
  inventory: number;
  isActive: boolean;
  has3DModel: boolean;
  modelUrl?: string;
  arEnabled: boolean;
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  avatar?: string;
  preferences?: Record<string, unknown>;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface Order {
  id: string;
  userId: string;
  status: string;
  total: number;
  createdAt: string;
  orderItems: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product: Product;
}

// Optional: Specific API functions (but much simpler)
export const createUserAPI = (authAPI: ReturnType<typeof useAuthenticatedAPI>) => ({
  syncUser: () => authAPI.post('/api/users/sync'),
  getProfile: () => authAPI.get('/api/users/profile'),
  updateProfile: (data: Partial<User>) => authAPI.put('/api/users/profile', data),
});

export const createProductAPI = (api: ReturnType<typeof useAuthenticatedAPI>) => ({
  getAll: () => api.get('/api/products'),
  getById: (id: string) => api.get(`/api/products/${id}`),
  getByCategory: (category: string) => api.get(`/api/products/category/${category}`),
});