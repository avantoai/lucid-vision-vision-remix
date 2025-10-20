import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { colors, layout } from '../../theme';

type VisionEditRouteProp = RouteProp<RootStackParamList, 'VisionEdit'>;
type VisionEditNavigationProp = StackNavigationProp<RootStackParamList, 'VisionEdit'>;

const STAGE_NAMES = ['Vision', 'Belief', 'Identity', 'Embodiment', 'Action'];

export default function VisionEditScreen() {
  const navigation = useNavigation<VisionEditNavigationProp>();
  const route = useRoute<VisionEditRouteProp>();
  const { visionId, question, stage, stageIndex } = route.params;
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
      const { stage_progress } = await api.submitVisionResponse(visionId, stage, question, currentAnswer);
      
      try {
        const { question: nextQuestion, stage: nextStage, stageIndex: nextStageIndex } = await api.generateNextQuestion(visionId);
        
        navigation.replace('VisionRecord', {
          visionId,
          question: nextQuestion,
          stage: nextStage,
          stageIndex: nextStageIndex,
        });
      } catch (error: any) {
        if (error.message?.includes('all stages complete')) {
          await api.processVisionSummary(visionId);
          Alert.alert(
            'Vision Complete!',
            'Your vision has been fully explored across all 5 stages. You can now create a meditation or continue deepening.',
            [
              { text: 'View Vision', onPress: () => navigation.navigate('VisionDetail', { visionId }) },
            ]
          );
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('Failed to submit response:', error);
      Alert.alert('Error', error.message || 'Failed to submit response');
    } finally {
      setIsLoading(false);
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
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.stageIndicator}>
          {STAGE_NAMES[stageIndex]} ({stageIndex + 1}/5)
        </Text>
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
  stageIndicator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
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
