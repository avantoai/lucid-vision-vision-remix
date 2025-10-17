import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList } from '../types';
import LibraryScreen from '../screens/Library/LibraryScreen';
import VisionScreen from '../screens/Vision/VisionScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator<TabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 12,
          paddingBottom: 8,
          height: 70,
        },
      }}
    >
      <Tab.Screen 
        name="Library" 
        component={LibraryScreen}
        options={{ 
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Vision" 
        component={VisionScreen}
        options={{ 
          tabBarLabel: 'Vision',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flower" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
