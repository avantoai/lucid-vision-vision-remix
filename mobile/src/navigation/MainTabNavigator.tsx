import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList } from '../types';
import LibraryScreen from '../screens/Library/LibraryScreen';
import VisionScreen from '../screens/Vision/VisionScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const ThreeStarsIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={{ flexDirection: 'row', gap: -4 }}>
    <Ionicons name="star" size={size * 0.7} color={color} />
    <Ionicons name="star" size={size * 0.7} color={color} />
    <Ionicons name="star" size={size * 0.7} color={color} />
  </View>
);

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#9CA3AF',
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
            <ThreeStarsIcon color={color} size={size} />
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
