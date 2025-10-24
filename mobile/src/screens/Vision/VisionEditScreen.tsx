import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { colors, layout } from '../../theme';

type VisionEditRouteProp = RouteProp<RootStackParamList, 'VisionEdit'>;
type VisionEditNavigationProp = StackNavigationProp<RootStackParamList, 'VisionEdit'>;

export default function VisionEditScreen() {
  const navigation = useNavigation<VisionEditNavigationProp>();
  const route = useRoute<VisionEditRouteProp>();
  const { visionId, question, category } = route.params;
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    if (route.params.audioUri) {
      transcribeAudio();
    }
  }, [route.params.audioUri]);

  const transcribeAudio = async () => {
    if (!route.params.audioUri) return;

    setIsTranscribing(true);
    try {
      const transcript = await api.transcribeAudio(route.params.audioUri);
      setCurrentAnswer(transcript);
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert('Error', 'Failed to transcribe audio. Please type your response.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleContinue = async () => {
    if (!currentAnswer.trim()) {
      Alert.alert('Error', 'Please provide an answer');
      return;
    }

    setIsLoading(true);
    try {
      const { overall_completeness } = await api.submitVisionResponse(visionId, category, question, currentAnswer);
      
      try {
        const { question: nextQuestion, category: nextCategory } = await api.generateNextQuestion(visionId);
        
        navigation.replace('VisionRecord', {
          visionId,
          question: nextQuestion,
          category: nextCategory,
        });
      } catch (error: any) {
        // If question generation fails, vision is likely complete
        await api.processVisionSummary(visionId);
        Alert.alert(
          'Vision Updated!',
          `Your vision is ${overall_completeness}% complete. You can continue deepening or create a meditation.`,
          [
            { text: 'View Vision', onPress: () => navigation.navigate('VisionDetail', { visionId }) },
          ]
        );
      }
    } catch (error: any) {
      console.error('Failed to submit response:', error);
      Alert.alert('Error', error.message || 'Failed to submit response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      
      // Check if this vision has any responses
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/vision/visions/${visionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        // If vision doesn't exist or error, go back to My Vision
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
        return;
      }
      
      const data = await response.json();
      const hasResponses = data.vision?.responses?.length > 0;
      
      if (!hasResponses) {
        // No responses yet - show confirmation dialog
        Alert.alert(
          'Discard Vision?',
          'This will permanently delete this vision. This action cannot be undone.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: async () => {
                // Delete the vision
                const deleteResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/vision/visions/${visionId}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                
                if (!deleteResponse.ok) {
                  console.error('Failed to delete vision:', deleteResponse.status);
                }
                
                // Navigate back to My Vision
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' }],
                });
              },
            },
          ]
        );
      } else {
        // Has responses - go to vision detail
        navigation.navigate('VisionDetail', { visionId });
      }
    } catch (error) {
      console.error('Error in handleClose:', error);
      // On error, go back to My Vision
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  };


  if (isTranscribing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Transcribing your response...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.prompt}>{question}</Text>

        <TextInput
          style={styles.input}
          placeholder="Type or edit your response..."
          placeholderTextColor={colors.textTertiary}
          value={currentAnswer}
          onChangeText={setCurrentAnswer}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.continueButton, isLoading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  closeButton: {
    position: 'absolute',
    top: layout.headerTop,
    right: layout.headerSide,
    zIndex: 10,
    width: layout.headerButtonSize,
    height: layout.headerButtonSize,
    borderRadius: layout.headerButtonSize / 2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: layout.screenHorizontal,
    paddingTop: layout.screenTopBase + layout.headerButtonSize,
  },
  prompt: {
    fontSize: 20,
    color: colors.text,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 180,
    marginBottom: 20,
    color: colors.text,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
