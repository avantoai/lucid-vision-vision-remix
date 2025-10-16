import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Meditation } from '../../types';
import api from '../../services/api';

type MeditationPlayerRouteProp = RouteProp<RootStackParamList, 'MeditationPlayer'>;
type MeditationPlayerNavigationProp = StackNavigationProp<RootStackParamList, 'MeditationPlayer'>;

export default function MeditationPlayerScreen() {
  const navigation = useNavigation<MeditationPlayerNavigationProp>();
  const route = useRoute<MeditationPlayerRouteProp>();
  const [meditation, setMeditation] = useState<Meditation>(route.params.meditation);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadAudioUrl();
    
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (audioUrl && !audioReady) {
      loadAudio();
    }
  }, [audioUrl]);

  const loadAudio = async () => {
    try {
      console.log('Loading audio from URL...');
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false }
      );
      
      soundRef.current = sound;
      setAudioReady(true);
      console.log('Audio loaded successfully');
    } catch (error) {
      console.error('Failed to load audio:', error);
      Alert.alert('Error', 'Failed to load audio file');
    }
  };

  const loadAudioUrl = async () => {
    try {
      console.log('🔊 Loading audio URL for:', meditation.title);
      const url = await api.getMeditationAudioUrl(meditation.id);
      console.log('✅ Audio URL received:', url ? 'yes' : 'no');
      setAudioUrl(url);
    } catch (error: any) {
      console.error('❌ Audio URL error:', error);
      const errorMessage = error?.message || 'Failed to load audio';
      const isAudioMissing = errorMessage.includes('Audio file not found') || errorMessage.includes('404');
      
      if (isAudioMissing) {
        Alert.alert(
          'Audio File Missing',
          'This meditation audio file is missing. Please try creating a new meditation.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const handlePlayPause = async () => {
    if (!audioReady || !soundRef.current) {
      return;
    }
    
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const handleFavorite = async () => {
    try {
      await api.toggleFavorite(meditation.id);
      setMeditation({ ...meditation, is_favorite: !meditation.is_favorite });
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const handlePin = async () => {
    try {
      await api.pinMeditation(meditation.id);
      setMeditation({ ...meditation, is_pinned: !meditation.is_pinned });
    } catch (error) {
      Alert.alert('Error', 'Failed to pin meditation');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>{meditation.title}</Text>
        <Text style={styles.category}>{meditation.category}</Text>
        <Text style={styles.duration}>{meditation.duration} minutes</Text>

        <TouchableOpacity 
          style={[
            styles.playButton, 
            !audioReady && styles.playButtonDisabled
          ]} 
          onPress={handlePlayPause}
          disabled={!audioReady}
          activeOpacity={audioReady ? 0.7 : 1}
        >
          <Text style={[
            styles.playButtonText,
            !audioReady && styles.playButtonTextDisabled
          ]}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
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
  playButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  playButtonText: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  playButtonTextDisabled: {
    opacity: 0.5,
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
