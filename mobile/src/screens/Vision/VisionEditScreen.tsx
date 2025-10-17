import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { Text, Button, Input, Card, IconButton } from '../../components/ui';
import { theme } from '../../theme/theme';
import { Ionicons } from '@expo/vector-icons';

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
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="body" color="secondary" style={styles.loadingText}>
          Transcribing your response...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <IconButton
          icon={<Ionicons name="close" size={24} color={theme.colors.text.primary} />}
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        />

        <View style={styles.content}>
          <Text variant="heading" color="primary" weight="bold" align="center" style={styles.category}>
            {route.params.category}
          </Text>
          
          <Text variant="subheading" color="body" align="center" style={styles.prompt}>
            {route.params.prompt}
          </Text>

          <Input
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
            <Button
              title={isLoading ? 'Loading...' : 'Next Prompt'}
              onPress={handleNextPrompt}
              variant="secondary"
              disabled={isLoading}
              loading={isLoading}
              style={styles.button}
            />

            <Button
              title="Create Meditation"
              onPress={handleCreateMeditation}
              variant="primary"
              disabled={isLoading}
              loading={isLoading}
              style={styles.button}
            />
          </View>

          {route.params.responses.length > 0 && (
            <View style={styles.responsesContainer}>
              <Text variant="subheading" weight="semibold" style={styles.responsesTitle}>
                Previous Responses ({route.params.responses.length}):
              </Text>
              {route.params.responses.map((r, index) => (
                <Card key={index} style={styles.responseCard}>
                  <Text variant="small" color="secondary" weight="semibold" numberOfLines={1}>
                    {r.question}
                  </Text>
                  <Text variant="body" color="body" style={styles.responseAnswer}>
                    {r.answer}
                  </Text>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  content: {
    padding: theme.spacing.xl,
    paddingTop: 100,
  },
  category: {
    textTransform: 'capitalize',
    marginBottom: theme.spacing.lg,
  },
  prompt: {
    marginBottom: theme.spacing.xxxl,
  },
  input: {
    minHeight: 160,
    marginBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxxl,
  },
  button: {
    flex: 1,
  },
  responsesContainer: {
    marginTop: theme.spacing.xl,
  },
  responsesTitle: {
    marginBottom: theme.spacing.lg,
  },
  responseCard: {
    marginBottom: theme.spacing.md,
  },
  responseAnswer: {
    marginTop: theme.spacing.sm,
  },
});
