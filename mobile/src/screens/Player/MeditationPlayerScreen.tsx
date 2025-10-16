import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
// @ts-ignore - Slider types are incompatible with newer React Native versions
import Slider from '@react-native-community/slider';
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
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadMeditation();
    
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
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      
      soundRef.current = sound;
      
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis);
      }
      
      setAudioReady(true);
      console.log('Audio loaded successfully');
    } catch (error) {
      console.error('Failed to load audio:', error);
      Alert.alert('Error', 'Failed to load audio file');
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setIsPlaying(status.isPlaying);
      
      if (status.durationMillis) {
        setDuration(status.durationMillis);
      }
    }
  };

  const loadMeditation = async () => {
    try {
      console.log('🎵 Loading meditation:', route.params.meditationId);
      const meditations = await api.getMeditations();
      console.log('📚 Fetched meditations count:', meditations.length);
      const med = meditations.find(m => m.id === route.params.meditationId);
      
      if (med) {
        console.log('✅ Found meditation:', med.title);
        setMeditation(med);
        const url = await api.getMeditationAudioUrl(med.id);
        console.log('🔊 Audio URL received:', url ? 'yes' : 'no');
        setAudioUrl(url);
      } else {
        console.log('❌ Meditation not found in list');
        Alert.alert('Error', 'Meditation not found');
      }
    } catch (error: any) {
      console.error('❌ Player error:', error);
      const errorMessage = error?.message || 'Failed to load meditation';
      const isAudioMissing = errorMessage.includes('Audio file not found') || errorMessage.includes('404');
      
      if (isAudioMissing) {
        Alert.alert(
          'Audio File Missing',
          'This meditation was created during testing and the audio file is missing. Please create a new meditation to listen.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (!soundRef.current || !audioReady) {
      return; // Button is disabled, so this shouldn't be called
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

  const handleSeek = async (value: number) => {
    if (!soundRef.current) return;
    
    try {
      await soundRef.current.setPositionAsync(value);
    } catch (error) {
      console.error('Seek error:', error);
    }
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>{meditation.title}</Text>
        <Text style={styles.category}>{meditation.category}</Text>

        {audioReady && (
          <View style={styles.seekContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            {/* @ts-ignore - Slider component works correctly despite type mismatch */}
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={duration}
              value={position}
              onSlidingComplete={handleSeek}
              minimumTrackTintColor="#6366F1"
              maximumTrackTintColor="#D1D5DB"
              thumbTintColor="#6366F1"
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={[
            styles.playButton, 
            !audioReady && styles.playButtonDisabled
          ]} 
          onPress={handlePlayPause}
          disabled={!audioReady}
        >
          {!audioReady ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <Text style={styles.playButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
          )}
        </TouchableOpacity>

        {!audioReady && (
          <Text style={styles.loadingText}>Loading audio...</Text>
        )}

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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backText: {
    fontSize: 18,
    color: '#6366F1',
    fontWeight: '600',
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
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: -32,
    marginBottom: 32,
  },
  seekContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
    minWidth: 45,
    textAlign: 'center',
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
