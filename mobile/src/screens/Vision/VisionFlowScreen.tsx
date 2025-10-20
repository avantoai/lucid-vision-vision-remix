import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { colors } from '../../theme';
import GroundingScreen from './GroundingScreen';

type VisionFlowRouteProp = RouteProp<RootStackParamList, 'VisionFlow'>;
type VisionFlowNavigationProp = StackNavigationProp<RootStackParamList, 'VisionFlow'>;

export default function VisionFlowScreen() {
  const navigation = useNavigation<VisionFlowNavigationProp>();
  const route = useRoute<VisionFlowRouteProp>();
  const { visionId, isNewVision } = route.params;
  
  const [showGrounding, setShowGrounding] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setShowGrounding(false);
    setIsLoading(true);
    
    try {
      const { question, stage, stageIndex } = await api.generateNextQuestion(visionId);
      
      navigation.replace('VisionRecord', {
        visionId,
        question,
        stage,
        stageIndex,
      });
    } catch (error: any) {
      console.error('Failed to generate question:', error);
      Alert.alert('Error', error.message || 'Failed to load question');
      navigation.goBack();
    }
  };

  if (showGrounding) {
    return <GroundingScreen onContinue={handleContinue} />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
