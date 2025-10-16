import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import api from '../../services/api';

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
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Transcribing your response...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.category}>{route.params.category}</Text>
        <Text style={styles.prompt}>{route.params.prompt}</Text>

        <TextInput
          style={styles.input}
          placeholder="Type or edit your response..."
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
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
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
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#6B7280',
  },
  content: {
    padding: 20,
    paddingTop: 100,
  },
  category: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    textTransform: 'capitalize',
    marginBottom: 16,
  },
  prompt: {
    fontSize: 20,
    color: '#111827',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 180,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#6366F1',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  responsesContainer: {
    marginTop: 32,
  },
  responsesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  responseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  responseQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  responseAnswer: {
    fontSize: 14,
    color: '#111827',
  },
});
