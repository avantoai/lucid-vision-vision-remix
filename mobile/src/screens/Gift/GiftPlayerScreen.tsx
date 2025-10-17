import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { colors } from '../../theme';

type GiftPlayerRouteProp = RouteProp<RootStackParamList, 'GiftPlayer'>;
type GiftPlayerNavigationProp = StackNavigationProp<RootStackParamList, 'GiftPlayer'>;

export default function GiftPlayerScreen() {
  const navigation = useNavigation<GiftPlayerNavigationProp>();
  const route = useRoute<GiftPlayerRouteProp>();
  const { isAuthenticated } = useAuth();
  const [gift, setGift] = useState<any>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const player = useAudioPlayer(audioUrl || '');

  useEffect(() => {
    loadGift();
  }, []);

  const loadGift = async () => {
    try {
      const giftData = await api.getGift(route.params.giftId);
      setGift(giftData);
      const url = await api.getMeditationAudioUrl(giftData.meditation.id);
      setAudioUrl(url);
    } catch (error) {
      Alert.alert('Error', 'Failed to load gift meditation');
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
        <ActivityIndicator size="large" color={colors.primary} />
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
          <Text style={styles.playButtonText}>{player.playing ? '⏸' : '▶'}</Text>
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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  senderName: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  duration: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 40,
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  playButtonText: {
    fontSize: 40,
    color: colors.white,
  },
  saveButton: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
