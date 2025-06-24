import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import {  useAuthenticatedAPI, type User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refreshUserProfile: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isSignedIn, userId, isLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authAPI = useAuthenticatedAPI();

  // Sync user data when Clerk user changes
  useEffect(() => {
    const syncUserData = async () => {
      if (!isLoaded) {
        setIsLoading(true);
        return;
      }

      if (!isSignedIn || !userId || !clerkUser) {
        setUser(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Try to get existing user profile from backend
        const userProfile = await authAPI.get('/api/users/profile');
        setUser(userProfile.data.user);
      } catch (error: any) {
        if (error.response?.status === 404) {
          // User doesn't exist in backend, create new user
          try {
            
            const createdUser = await authAPI.post('/api/users/sync');  //sync route call hona chaiye
            setUser(createdUser.data.user);
          } catch (createError) {
            console.error('Error creating user:', createError);
            setError('Failed to create user profile');
          }
        } else {
          console.error('Error fetching user profile:', error);
          setError('Failed to load user profile');
        }
      } finally {
        setIsLoading(false);
      }
    };

    syncUserData();
  }, [isSignedIn, userId, clerkUser, isLoaded, authAPI]);

  const refreshUserProfile = async () => {
    if (!isSignedIn || !userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const userProfile = await authAPI.get('/api/users/profile');
      setUser(userProfile.data.user);
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      setError('Failed to refresh user profile');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!isSignedIn || !userId || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      //This route does not exist on the backend
      const updatedUser = await authAPI.put('/api/users/profile', data);
      setUser(updatedUser.data.user);
    } catch (error) {
      console.error('Error updating user profile:', error);
      setError('Failed to update user profile');
      throw error; // Re-throw so the calling component can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: isSignedIn as boolean && !!user,
    error,
    refreshUserProfile,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use extended auth context
export const useAppAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAppAuth must be used within an AuthProvider');
  }
  return context;
};

// Combined hook that gives you both Clerk auth and app user data
export const useAuthWithUser = () => {
  const clerkAuth = useAuth();
  const appAuth = useAppAuth();
  
  return {
    // Clerk auth methods
    ...clerkAuth,
    // App-specific user data and methods
    user: appAuth.user,
    userLoading: appAuth.isLoading,
    userError: appAuth.error,
    isAuthenticated: appAuth.isAuthenticated,
    refreshUserProfile: appAuth.refreshUserProfile,
    updateUserProfile: appAuth.updateUserProfile,
  };
};

export default AuthProvider;