import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';

type MeditationGeneratingRouteProp = RouteProp<RootStackParamList, 'MeditationGenerating'>;
type MeditationGeneratingNavigationProp = StackNavigationProp<RootStackParamList, 'MeditationGenerating'>;

export default function MeditationGeneratingScreen() {
  const navigation = useNavigation<MeditationGeneratingNavigationProp>();
  const route = useRoute<MeditationGeneratingRouteProp>();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#6366F1" style={styles.spinner} />
        
        <Text style={styles.title}>Creating Your Meditation</Text>
        <Text style={styles.subtitle}>Category: {route.params.category}</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ✨ Your personalized meditation is being crafted with AI
          </Text>
          <Text style={styles.infoText}>
            🎵 Generating voice narration and mixing with background audio
          </Text>
          <Text style={styles.infoText}>
            ⏱️ This typically takes 2-3 minutes
          </Text>
        </View>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>You can safely navigate away</Text>
          <Text style={styles.noticeText}>
            Feel free to explore the app. You'll receive a notification when your meditation is ready to play.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.libraryButton}
          onPress={() => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              })
            );
          }}
        >
          <Text style={styles.libraryButtonText}>Go to Library</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 24,
  },
  noticeBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    width: '100%',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#6366F1',
    lineHeight: 20,
  },
  libraryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  libraryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
