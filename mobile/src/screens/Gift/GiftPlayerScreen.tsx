import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

type GiftPlayerRouteProp = RouteProp<RootStackParamList, 'GiftPlayer'>;
type GiftPlayerNavigationProp = StackNavigationProp<RootStackParamList, 'GiftPlayer'>;

export default function GiftPlayerScreen() {
  const navigation = useNavigation<GiftPlayerNavigationProp>();
  const route = useRoute<GiftPlayerRouteProp>();
  const { isAuthenticated } = useAuth();
  const [gift, setGift] = useState<any>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGift();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadGift = async () => {
    try {
      const giftData = await api.getGift(route.params.giftId);
      setGift(giftData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load gift meditation');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (!gift) return;

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          await sound.playAsync();
        }
        setIsPlaying(!isPlaying);
      } else {
        const audioUrl = await api.getMeditationAudioUrl(gift.meditation.id);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to play meditation');
    }
  };

  const handleSaveToLibrary = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to save this meditation to your library', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Auth') },
      ]);
      return;
    }

    try {
      await api.saveGift(route.params.giftId);
      Alert.alert('Success', 'Meditation saved to your library!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save meditation');
    }
  };

  if (isLoading || !gift) {
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
        <Text style={styles.subtitle}>A gift from</Text>
        <Text style={styles.senderName}>{gift.senderName}</Text>
        
        <Text style={styles.title}>{gift.meditation.title}</Text>
        <Text style={styles.duration}>{gift.meditation.duration} minutes</Text>

        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <Text style={styles.playButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveToLibrary}>
          <Text style={styles.saveButtonText}>Save to My Library</Text>
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
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  senderName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
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
  saveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
