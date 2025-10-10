import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import AuthScreen from '../screens/Auth/AuthScreen';
import EmailInputScreen from '../screens/Auth/EmailInputScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';
import MainTabNavigator from './MainTabNavigator';
import VisionFlowScreen from '../screens/Vision/VisionFlowScreen';
import MeditationSetupScreen from '../screens/Meditation/MeditationSetupScreen';
import MeditationPlayerScreen from '../screens/Player/MeditationPlayerScreen';
import CreateGiftScreen from '../screens/Gift/CreateGiftScreen';
import GiftPlayerScreen from '../screens/Gift/GiftPlayerScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="EmailInput" component={EmailInputScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen 
              name="VisionFlow" 
              component={VisionFlowScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen 
              name="MeditationSetup" 
              component={MeditationSetupScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen 
              name="MeditationPlayer" 
              component={MeditationPlayerScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen 
              name="CreateGift" 
              component={CreateGiftScreen}
              options={{ presentation: 'modal' }}
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
  );
}
