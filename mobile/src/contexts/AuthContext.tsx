import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { User } from '../types';
import api from '../services/api';
import { parseAuthCallback, saveAuthTokens, clearAuthTokens } from '../services/deepLinkHandler';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  login: (email: string, token: string) => Promise<{ isNewUser: boolean; user: User }>;
  handleDeepLink: (url: string) => Promise<{ success: boolean; isNewUser?: boolean; user?: User }>;
  logout: () => Promise<void>;
  updateUser: (fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    checkInitialURL();
    const subscription = setupDeepLinkListener();
    
    return () => {
      subscription?.remove();
    };
  }, []);

  const checkInitialURL = async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('Initial URL on app launch:', initialUrl);
        await handleDeepLink(initialUrl);
      }
    } catch (error) {
      console.error('Error checking initial URL:', error);
    }
  };

  const setupDeepLinkListener = () => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link received while app running:', url);
      handleDeepLink(url);
    });

    return subscription;
  };

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userId = await AsyncStorage.getItem('user_id');
      
      if (token && userId) {
        console.log('🔍 Checking auth, fetching user info...');
        const { user: userData } = await api.getUserInfo();
        console.log('✅ User info loaded:', { id: userData.id, full_name: userData.full_name });
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepLink = async (url: string): Promise<{ success: boolean; isNewUser?: boolean; user?: User }> => {
    try {
      console.log('Parsing auth callback from deep link');
      const tokens = parseAuthCallback(url);
      
      if (!tokens) {
        console.log('No valid tokens found in deep link');
        return { success: false };
      }

      console.log('Tokens parsed successfully, saving...');
      await saveAuthTokens(tokens);

      const { user: userData, isNewUser } = await api.getUserInfo();
      setUser(userData);

      return { success: true, isNewUser, user: userData };
    } catch (error) {
      console.error('Error handling deep link:', error);
      return { success: false };
    }
  };

  const login = async (email: string, token: string) => {
    const response = await api.verifyOTP(email, token);
    setUser(response.user);
    return { isNewUser: response.isNewUser, user: response.user };
  };

  const logout = async () => {
    await clearAuthTokens();
    setUser(null);
  };

  const updateUser = async (fullName: string) => {
    if (!user) return;
    const updatedUser = await api.updateProfile(user.id, fullName);
    setUser(updatedUser);
  };

  const needsOnboarding = !!user && !user.full_name;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        needsOnboarding,
        login,
        handleDeepLink,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
