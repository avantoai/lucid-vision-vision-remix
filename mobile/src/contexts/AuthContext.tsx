import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';
import { User } from '../types';
import api from '../services/api';
import { parseAuthCallback, saveAuthTokens, clearAuthTokens } from '../services/deepLinkHandler';
import { DEV_MODE } from '../constants/config';

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
      let token = await AsyncStorage.getItem('auth_token');
      let userId = await AsyncStorage.getItem('user_id');
      
      // DEV MODE: Restore session from backup if missing
      if (DEV_MODE && (!token || !userId)) {
        console.log('🛠️ DEV MODE: No session found, checking for backup...');
        const backupToken = await AsyncStorage.getItem('dev_backup_token');
        const backupUserId = await AsyncStorage.getItem('dev_backup_user_id');
        
        if (backupToken && backupUserId) {
          console.log('🛠️ DEV MODE: Restoring session from backup');
          await AsyncStorage.setItem('auth_token', backupToken);
          await AsyncStorage.setItem('user_id', backupUserId);
          token = backupToken;
          userId = backupUserId;
        } else {
          console.log('🛠️ DEV MODE: No backup found - please log in once');
          console.log('🛠️ Your session will persist across reloads after login');
        }
      }
      
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

      // DEV MODE: Save backup of session for persistence across reloads
      if (DEV_MODE) {
        const authToken = await AsyncStorage.getItem('auth_token');
        const userId = await AsyncStorage.getItem('user_id');
        if (authToken && userId) {
          console.log('🛠️ DEV MODE: Backing up session for persistence');
          await AsyncStorage.setItem('dev_backup_token', authToken);
          await AsyncStorage.setItem('dev_backup_user_id', userId);
        }
      }

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
    if (DEV_MODE) {
      console.log('🛠️ DEV MODE: Logging out (session will auto-restore on reload)');
    }
    
    await clearAuthTokens();
    setUser(null);
    
    // DEV MODE: Session backup remains, will restore on next checkAuth
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
