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

export default function VisionEditScreen() {
  const navigation = useNavigation<VisionEditNavigationProp>();
  const route = useRoute<VisionEditRouteProp>();
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

  const handleNextPrompt = async () => {
    if (!currentAnswer.trim()) {
      Alert.alert('Error', 'Please provide an answer');
      return;
    }

    const newResponses = [...route.params.responses, { 
      question: route.params.prompt, 
      answer: currentAnswer 
    }];

    setIsLoading(true);
    try {
      const prompt = await api.getNextPrompt(route.params.category, newResponses);
      
      navigation.replace('VisionRecord', {
        category: route.params.category,
        prompt: prompt,
        responses: newResponses,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load next prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMeditation = async () => {
    if (!currentAnswer.trim()) {
      Alert.alert('Error', 'Please provide an answer for the current prompt');
      return;
    }

    const finalResponses = [...route.params.responses, { 
      question: route.params.prompt, 
      answer: currentAnswer 
    }];

    setIsLoading(true);
    try {
      const result = await api.submitVisionFlow(route.params.category, finalResponses);
      
      navigation.navigate('MeditationSetup', { 
        category: route.params.category, 
        responses: finalResponses,
        visionId: result.visionId
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to start vision processing');
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
        <Text style={styles.category}>{route.params.category}</Text>
        <Text style={styles.prompt}>{route.params.prompt}</Text>

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

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.nextButton, isLoading && styles.buttonDisabled]}
            onPress={handleNextPrompt}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {isLoading ? 'Loading...' : 'Next Prompt'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton, isLoading && styles.buttonDisabled]}
            onPress={handleCreateMeditation}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>Create Meditation</Text>
          </TouchableOpacity>
        </View>

        {route.params.responses.length > 0 && (
          <View style={styles.responsesContainer}>
            <Text style={styles.responsesTitle}>Previous Responses ({route.params.responses.length}):</Text>
            {route.params.responses.map((r, index) => (
              <View key={index} style={styles.responseCard}>
                <Text style={styles.responseQuestion}>{r.question}</Text>
                <Text style={styles.responseAnswer}>{r.answer}</Text>
              </View>
            ))}
          </View>
        )}
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
  category: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    textTransform: 'capitalize',
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  completeButton: {
    backgroundColor: colors.success,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  responsesContainer: {
    marginTop: 32,
  },
  responsesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  responseCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  responseQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  responseAnswer: {
    fontSize: 14,
    color: colors.text,
  },
});
