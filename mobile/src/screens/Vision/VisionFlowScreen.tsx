import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import api from '../../services/api';

type VisionFlowRouteProp = RouteProp<RootStackParamList, 'VisionFlow'>;
type VisionFlowNavigationProp = StackNavigationProp<RootStackParamList, 'VisionFlow'>;

export default function VisionFlowScreen() {
  const navigation = useNavigation<VisionFlowNavigationProp>();
  const route = useRoute<VisionFlowRouteProp>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInitialPrompt();
  }, []);

  const loadInitialPrompt = async () => {
    try {
      const prompt = await api.getNextPrompt(route.params.category, []);
      
      navigation.replace('VisionRecord', {
        category: route.params.category,
        prompt: prompt,
        responses: [],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load prompt');
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.loadingText}>Loading your vision prompt...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});
