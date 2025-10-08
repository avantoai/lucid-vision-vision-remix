import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Clipboard from 'expo-clipboard';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { VOICE_OPTIONS } from '../../constants/config';

type CreateGiftNavigationProp = StackNavigationProp<RootStackParamList, 'CreateGift'>;

export default function CreateGiftScreen() {
  const navigation = useNavigation<CreateGiftNavigationProp>();
  const [responses, setResponses] = useState<Array<{ question: string; answer: string }>>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS.basic[0].id);
  const [duration, setDuration] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddResponse = () => {
    if (!currentQuestion.trim() || !currentAnswer.trim()) {
      Alert.alert('Error', 'Please fill in both question and answer');
      return;
    }

    setResponses([...responses, { question: currentQuestion, answer: currentAnswer }]);
    setCurrentQuestion('');
    setCurrentAnswer('');
  };

  const handleCreateGift = async () => {
    if (responses.length === 0) {
      Alert.alert('Error', 'Please add at least one response');
      return;
    }

    setIsLoading(true);
    try {
      const gift = await api.createGift({
        duration,
        voiceId: selectedVoice,
        background: 'ocean-waves',
        responses,
      });

      await Clipboard.setStringAsync(gift.share_url);
      Alert.alert('Success!', 'Gift meditation created! Link copied to clipboard.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create gift meditation');
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
        <Text style={styles.title}>Create Gift Meditation</Text>
        <Text style={styles.subtitle}>Share a personalized meditation with someone special</Text>

        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput
          style={styles.input}
          value={String(duration)}
          onChangeText={(text) => setDuration(parseInt(text) || 5)}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Question</Text>
        <TextInput
          style={styles.input}
          placeholder="What would you like them to reflect on?"
          value={currentQuestion}
          onChangeText={setCurrentQuestion}
        />

        <Text style={styles.label}>Your Message</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Your heartfelt message..."
          value={currentAnswer}
          onChangeText={setCurrentAnswer}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.addButton} onPress={handleAddResponse}>
          <Text style={styles.addButtonText}>Add Response</Text>
        </TouchableOpacity>

        {responses.length > 0 && (
          <View style={styles.responsesContainer}>
            <Text style={styles.responsesTitle}>Responses ({responses.length})</Text>
            {responses.map((r, index) => (
              <View key={index} style={styles.responseCard}>
                <Text style={styles.responseQuestion}>{r.question}</Text>
                <Text style={styles.responseAnswer}>{r.answer}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.createButton, isLoading && styles.buttonDisabled]}
          onPress={handleCreateGift}
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>
            {isLoading ? 'Creating...' : 'Create Gift'}
          </Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
  },
  addButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  responsesContainer: {
    marginBottom: 24,
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
  createButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
