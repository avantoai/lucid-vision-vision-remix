import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Meditation } from '../../types';
import api from '../../services/api';

type MeditationPlayerRouteProp = RouteProp<RootStackParamList, 'MeditationPlayer'>;
type MeditationPlayerNavigationProp = StackNavigationProp<RootStackParamList, 'MeditationPlayer'>;

export default function MeditationPlayerScreen() {
  const navigation = useNavigation<MeditationPlayerNavigationProp>();
  const route = useRoute<MeditationPlayerRouteProp>();
  const [meditation, setMeditation] = useState<Meditation | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const player = useAudioPlayer(audioUrl || '');

  useEffect(() => {
    loadMeditation();
  }, []);

  const loadMeditation = async () => {
    try {
      const meditations = await api.getMeditations();
      const med = meditations.find(m => m.id === route.params.meditationId);
      if (med) {
        setMeditation(med);
        const url = await api.getMeditationAudioUrl(med.id);
        setAudioUrl(url);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load meditation');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleFavorite = async () => {
    if (!meditation) return;
    try {
      await api.toggleFavorite(meditation.id);
      setMeditation({ ...meditation, is_favorite: !meditation.is_favorite });
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const handlePin = async () => {
    if (!meditation) return;
    try {
      await api.pinMeditation(meditation.id);
      setMeditation({ ...meditation, is_pinned: !meditation.is_pinned });
    } catch (error) {
      Alert.alert('Error', 'Failed to pin meditation');
    }
  };

  if (isLoading || !meditation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>{meditation.title}</Text>
        <Text style={styles.category}>{meditation.category}</Text>
        <Text style={styles.duration}>{meditation.duration} minutes</Text>

        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <Text style={styles.playButtonText}>{player.playing ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleFavorite}>
            <Text style={styles.actionText}>{meditation.is_favorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handlePin}>
            <Text style={styles.actionText}>{meditation.is_pinned ? '📌' : '📍'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 18,
    color: '#6366F1',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  duration: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 40,
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  playButtonText: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    padding: 12,
  },
  actionText: {
    fontSize: 32,
  },
});
