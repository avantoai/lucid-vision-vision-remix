import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList } from '../types';
import LibraryScreen from '../screens/Library/LibraryScreen';
import VisionScreen from '../screens/Vision/VisionScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { theme } from '../theme/theme';

const Tab = createBottomTabNavigator<TabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          height: theme.components.bottomNav.height,
          paddingBottom: 20,
          paddingTop: 20,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.sizes.tiny,
          fontWeight: theme.typography.weights.medium,
        },
        tabBarIconStyle: {
          marginBottom: -4,
        },
      }}
    >
      <Tab.Screen 
        name="Library" 
        component={LibraryScreen}
        options={{ 
          tabBarLabel: 'Library',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={theme.components.bottomNav.iconSize} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Vision" 
        component={VisionScreen}
        options={{ 
          tabBarLabel: 'Vision',
          tabBarIcon: ({ color }) => (
            <Ionicons name="flower" size={theme.components.bottomNav.iconSize} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={theme.components.bottomNav.iconSize} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
