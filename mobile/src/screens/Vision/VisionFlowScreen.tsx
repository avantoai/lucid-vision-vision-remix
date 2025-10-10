import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import api from '../../services/api';

type VisionFlowRouteProp = RouteProp<RootStackParamList, 'VisionFlow'>;
type VisionFlowNavigationProp = StackNavigationProp<RootStackParamList, 'VisionFlow'>;

export default function VisionFlowScreen() {
  const navigation = useNavigation<VisionFlowNavigationProp>();
  const route = useRoute<VisionFlowRouteProp>();
  const [responses, setResponses] = useState<Array<{ question: string; answer: string }>>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    loadNextPrompt();
  }, []);

  const loadNextPrompt = async () => {
    setIsLoading(true);
    try {
      const prompt = await api.getNextPrompt(route.params.category, responses);
      setCurrentPrompt(prompt);
    } catch (error) {
      Alert.alert('Error', 'Failed to load prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAnother = async () => {
    if (!currentAnswer.trim()) {
      Alert.alert('Error', 'Please provide an answer');
      return;
    }

    const newResponses = [...responses, { question: currentPrompt, answer: currentAnswer }];
    setResponses(newResponses);
    setCurrentAnswer('');

    setIsLoading(true);
    try {
      const prompt = await api.getNextPrompt(route.params.category, newResponses);
      setCurrentPrompt(prompt);
    } catch (error) {
      Alert.alert('Error', 'Failed to load next prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!currentAnswer.trim()) {
      Alert.alert('Error', 'Please provide an answer for the current prompt');
      return;
    }

    const finalResponses = [...responses, { question: currentPrompt, answer: currentAnswer }];

    setIsLoading(true);
    try {
      await api.submitVisionFlow(route.params.category, finalResponses);
      Alert.alert('Success', 'Vision statement created! Ready to generate meditation?', [
        { text: 'Not Now', onPress: () => navigation.goBack() },
        { 
          text: 'Generate', 
          onPress: () => navigation.navigate('MeditationSetup', { 
            category: route.params.category, 
            responses: finalResponses 
          }) 
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create vision statement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.category}>{route.params.category}</Text>
        <Text style={styles.prompt}>{currentPrompt}</Text>

        <TextInput
          style={styles.input}
          placeholder="Type your response..."
          value={currentAnswer}
          onChangeText={setCurrentAnswer}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          editable={!isLoading}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.continueButton, isLoading && styles.buttonDisabled]}
            onPress={handleAddAnother}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {isLoading ? 'Loading...' : 'Continue Deepening'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton, isLoading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>

        {responses.length > 0 && (
          <View style={styles.responsesContainer}>
            <Text style={styles.responsesTitle}>Previous Responses ({responses.length}):</Text>
            {responses.map((r, index) => (
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
    minHeight: 150,
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
  continueButton: {
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
