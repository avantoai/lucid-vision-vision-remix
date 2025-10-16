import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { User } from '../types';
import api from '../services/api';
import { parseAuthCallback, saveAuthTokens, clearAuthTokens } from '../services/deepLinkHandler';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  login: (email: string, token: string) => Promise<{ isNewUser: boolean; user: User }>;
  handleDeepLink: (url: string) => Promise<{ success: boolean; isNewUser?: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isProcessingDeepLink = useRef(false);

  useEffect(() => {
    const initAuth = async () => {
      const initialUrl = await Linking.getInitialURL();
      
      // Check if we have an auth callback URL
      if (initialUrl) {
        const tokens = parseAuthCallback(initialUrl);
        if (tokens) {
          // We have a fresh login via deep link, skip checkAuth
          isProcessingDeepLink.current = true;
          await checkInitialURL();
          isProcessingDeepLink.current = false;
          return;
        }
      }
      
      // No auth callback, do normal auth check
      await checkAuth();
    };

    initAuth();
    const subscription = setupDeepLinkListener();
    
    return () => {
      subscription?.remove();
    };
  }, []);

  const checkInitialURL = async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('📱 Initial URL on app launch:', initialUrl);
        
        // Try to parse tokens first to determine if this is an auth callback
        const tokens = parseAuthCallback(initialUrl);
        
        if (tokens) {
          // This is an auth callback URL, process it
          console.log('🔐 Initial URL contains auth tokens, processing...');
          const result = await handleDeepLink(initialUrl);
          
          if (!result.success && result.error) {
            Alert.alert(
              'Sign In Error',
              result.error,
              [{ text: 'OK' }]
            );
          }
        } else {
          // Normal app launch (Expo Go, etc.), not an auth callback
          console.log('ℹ️ Initial URL is not an auth callback, ignoring');
        }
      }
    } catch (error) {
      console.error('❌ Error checking initial URL:', error);
    }
  };

  const setupDeepLinkListener = () => {
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      console.log('📱 Deep link received while app running:', url);
      const result = await handleDeepLink(url);
      
      if (!result.success && result.error) {
        Alert.alert(
          'Sign In Error',
          result.error,
          [{ text: 'OK' }]
        );
      }
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

  const handleDeepLink = async (url: string): Promise<{ success: boolean; isNewUser?: boolean; user?: User; error?: string }> => {
    try {
      console.log('🔗 Parsing auth callback from deep link:', url);
      const tokens = parseAuthCallback(url);
      
      if (!tokens) {
        console.log('❌ No valid tokens found in deep link');
        return { success: false, error: 'Invalid authentication link' };
      }

      console.log('✅ Tokens parsed successfully, saving to storage...');
      await saveAuthTokens(tokens);

      console.log('📡 Fetching user info from backend...');
      const { user: userData, isNewUser } = await api.getUserInfo();
      
      console.log('✅ Authentication successful:', { id: userData.id, isNewUser });
      setUser(userData);

      return { success: true, isNewUser, user: userData };
    } catch (error: any) {
      console.error('❌ Error handling deep link:', error);
      
      const errorMessage = error.message || 'Unknown error occurred';
      
      // Clear invalid tokens
      await clearAuthTokens();
      
      return { 
        success: false, 
        error: errorMessage.includes('timed out') 
          ? 'Connection timed out. Please check your internet and try again.'
          : errorMessage
      };
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
