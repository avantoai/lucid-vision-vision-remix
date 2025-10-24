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
    // On the edit screen, the user has typed/recorded something but hasn't submitted yet
    // Always show confirmation if they have unsaved content
    console.log('VisionEdit - Close button clicked, checking if user has content');
    
    if (currentAnswer.trim()) {
      // User has typed/recorded something - show confirmation
      console.log('VisionEdit - User has unsaved content, showing discard warning');
      Alert.alert(
        'Discard Your Response?',
        'Your answer hasn\'t been saved yet. Are you sure you want to discard it?',
        [
          {
            text: 'Keep Editing',
            style: 'cancel',
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              // Check if there are any saved responses
              try {
                const token = await AsyncStorage.getItem('session_token');
                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/vision/visions/${visionId}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                
                if (!response.ok) {
                  navigation.navigate('MainTabs', { screen: 'Vision' });
                  return;
                }
                
                const data = await response.json();
                const hasResponses = data.vision?.responses?.length > 0;
                
                if (hasResponses) {
                  // Go to vision detail
                  navigation.navigate('VisionDetail', { visionId });
                } else {
                  // No saved responses - delete vision and go to My Vision
                  await fetch(`${process.env.EXPO_PUBLIC_API_URL}/vision/visions/${visionId}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  });
                  navigation.navigate('MainTabs', { screen: 'Vision' });
                }
              } catch (error) {
                console.error('Error in handleClose:', error);
                navigation.navigate('MainTabs', { screen: 'Vision' });
              }
            },
          },
        ]
      );
    } else {
      // No unsaved content - check if there are saved responses
      try {
        const token = await AsyncStorage.getItem('session_token');
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/vision/visions/${visionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          navigation.navigate('MainTabs', { screen: 'Vision' });
          return;
        }
        
        const data = await response.json();
        const hasResponses = data.vision?.responses?.length > 0;
        
        if (hasResponses) {
          // Go to vision detail (no confirmation needed since no unsaved content)
          navigation.navigate('VisionDetail', { visionId });
        } else {
          // No saved responses and no unsaved content - delete silently
          await fetch(`${process.env.EXPO_PUBLIC_API_URL}/vision/visions/${visionId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          navigation.navigate('MainTabs', { screen: 'Vision' });
        }
      } catch (error) {
        console.error('Error in handleClose:', error);
        navigation.navigate('MainTabs', { screen: 'Vision' });
      }
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
