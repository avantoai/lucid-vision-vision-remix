import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
}

export const parseAuthCallback = (url: string): AuthTokens | null => {
  try {
    const parsed = Linking.parse(url);
    
    let params: Record<string, any> = {};
    
    if (parsed.queryParams) {
      params = { ...parsed.queryParams };
    }
    
    if (url.includes('#')) {
      const hashPart = url.split('#')[1];
      const hashParams = new URLSearchParams(hashPart);
      hashParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    const accessToken = params.access_token as string;
    const refreshToken = params.refresh_token as string;
    const expiresAt = params.expires_at as string;
    const expiresIn = params.expires_in as string;

    if (accessToken && refreshToken) {
      console.log('Successfully parsed auth tokens from URL');
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: parseInt(expiresAt || '0'),
        expires_in: parseInt(expiresIn || '3600'),
      };
    }

    console.log('No valid tokens found in URL');
    return null;
  } catch (error) {
    console.error('Error parsing auth callback:', error);
    return null;
  }
};

export const saveAuthTokens = async (tokens: AuthTokens) => {
  try {
    await AsyncStorage.setItem('auth_token', tokens.access_token);
    await AsyncStorage.setItem('refresh_token', tokens.refresh_token);
    await AsyncStorage.setItem('token_expires_at', tokens.expires_at.toString());
  } catch (error) {
    console.error('Error saving auth tokens:', error);
    throw error;
  }
};

export const getAuthTokens = async (): Promise<AuthTokens | null> => {
  try {
    const accessToken = await AsyncStorage.getItem('auth_token');
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    const expiresAt = await AsyncStorage.getItem('token_expires_at');

    if (accessToken && refreshToken) {
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: parseInt(expiresAt || '0'),
        expires_in: 3600,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting auth tokens:', error);
    return null;
  }
};

export const clearAuthTokens = async () => {
  try {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('refresh_token');
    await AsyncStorage.removeItem('token_expires_at');
    await AsyncStorage.removeItem('user_id');
  } catch (error) {
    console.error('Error clearing auth tokens:', error);
  }
};
