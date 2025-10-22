import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import AuthScreen from '../screens/Auth/AuthScreen';
import EmailInputScreen from '../screens/Auth/EmailInputScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';
import MainTabNavigator from './MainTabNavigator';
import CategorySelectionScreen from '../screens/Category/CategorySelectionScreen';
import VisionFlowScreen from '../screens/Vision/VisionFlowScreen';
import VisionDetailNewScreen from '../screens/Vision/VisionDetailNewScreen';
import VisionRecordScreen from '../screens/Vision/VisionRecordScreen';
import VisionEditScreen from '../screens/Vision/VisionEditScreen';
import MeditationSetupScreen from '../screens/Meditation/MeditationSetupScreen';
import MeditationPlayerScreen from '../screens/Player/MeditationPlayerScreen';
import CreateGiftScreen from '../screens/Gift/CreateGiftScreen';
import GiftPlayerScreen from '../screens/Gift/GiftPlayerScreen';
import { colors } from '../theme';

const Stack = createStackNavigator<RootStackParamList>();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

export default function RootNavigator() {
  const authContext = useAuth();
  const { isAuthenticated, needsOnboarding, isLoading } = authContext;

  // DIAGNOSTIC: Log the actual values and types
  console.log('🔍 Auth values:', {
    isAuthenticated,
    needsOnboarding,
    isLoading,
    isAuthenticatedType: typeof isAuthenticated,
    needsOnboardingType: typeof needsOnboarding,
    isLoadingType: typeof isLoading,
  });

  if (isLoading) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <NavigationContainer theme={DarkTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="EmailInput" component={EmailInputScreen} />
          </>
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} initialParams={{ isNewUser: true }} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen 
              name="CategorySelection" 
              component={CategorySelectionScreen}
            />
            <Stack.Screen 
              name="VisionFlow" 
              component={VisionFlowScreen}
            />
            <Stack.Screen 
              name="VisionDetail" 
              component={VisionDetailNewScreen}
            />
            <Stack.Screen 
              name="VisionRecord" 
              component={VisionRecordScreen}
            />
            <Stack.Screen 
              name="VisionEdit" 
              component={VisionEditScreen}
            />
            <Stack.Screen 
              name="MeditationSetup" 
              component={MeditationSetupScreen}
            />
            <Stack.Screen 
              name="MeditationPlayer" 
              component={MeditationPlayerScreen}
            />
            <Stack.Screen 
              name="CreateGift" 
              component={CreateGiftScreen}
            />
          </>
        )}
        <Stack.Screen 
          name="GiftPlayer" 
          component={GiftPlayerScreen}
          options={{ presentation: 'modal' }}
        />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
