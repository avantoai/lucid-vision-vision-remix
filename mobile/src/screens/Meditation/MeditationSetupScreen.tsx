import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { RootStackParamList } from '../../types';
import { VOICE_OPTIONS, BACKGROUND_OPTIONS } from '../../constants/config';
import api from '../../services/api';
import { colors, layout } from '../../theme';

type MeditationSetupRouteProp = RouteProp<RootStackParamList, 'MeditationSetup'>;
type MeditationSetupNavigationProp = StackNavigationProp<RootStackParamList, 'MeditationSetup'>;

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

export default function MeditationSetupScreen() {
  const navigation = useNavigation<MeditationSetupNavigationProp>();
  const route = useRoute<MeditationSetupRouteProp>();
  const { category, responses, visionId } = route.params;

  const [duration, setDuration] = useState(10);
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS.basic[0].id);
  const [selectedBackground, setSelectedBackground] = useState(BACKGROUND_OPTIONS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);

  // Configure audio mode on component mount
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        console.log('✅ Audio mode configured');
      } catch (error) {
        console.error('Failed to configure audio mode:', error);
      }
    };
    
    configureAudio();
  }, []);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (previewSound) {
        previewSound.unloadAsync();
      }
    };
  }, [previewSound]);

  const stopCurrentPreview = async () => {
    if (previewSound) {
      await previewSound.stopAsync();
      await previewSound.unloadAsync();
      setPreviewSound(null);
      setPlayingPreview(null);
    }
  };

  const playVoicePreview = async (voiceId: string, previewId: string) => {
    try {
      console.log('🎤 Playing voice preview:', previewId);
      
      // Stop any currently playing preview
      await stopCurrentPreview();

      // Don't play if clicking the same voice that's playing
      if (playingPreview === voiceId) {
        console.log('Already playing this voice, skipping');
        return;
      }

      setPlayingPreview(voiceId);

      // Fetch the signed URL from the API
      console.log('Fetching signed URL from API...');
      const response = await api.getVoicePreview(previewId);
      console.log('Got signed URL:', response.url.substring(0, 100) + '...');
      
      console.log('Creating audio sound...');
      const { sound } = await Audio.Sound.createAsync(
        { uri: response.url },
        { shouldPlay: true }
      );
      console.log('Audio sound created and playing');

      setPreviewSound(sound);

      // Auto-stop when finished
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('Audio finished playing');
          stopCurrentPreview();
        }
      });
    } catch (error) {
      console.error('❌ Error playing voice preview:', error);
      setPlayingPreview(null);
    }
  };

  const playBackgroundPreview = async (backgroundId: string, previewFileName: string) => {
    try {
      console.log('🎵 Playing background preview:', previewFileName);
      
      // Stop any currently playing preview
      await stopCurrentPreview();

      // Don't play if clicking the same background that's playing
      if (playingPreview === backgroundId) {
        console.log('Already playing this background, skipping');
        return;
      }

      setPlayingPreview(backgroundId);

      // Fetch the signed URL from the API
      console.log('Fetching signed URL from API...');
      const response = await api.getBackgroundPreview(previewFileName);
      console.log('Got signed URL:', response.url.substring(0, 100) + '...');
      
      console.log('Creating audio sound...');
      const { sound } = await Audio.Sound.createAsync(
        { uri: response.url },
        { shouldPlay: true }
      );
      console.log('Audio sound created and playing');

      setPreviewSound(sound);

      // Auto-stop when finished
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('Audio finished playing');
          stopCurrentPreview();
        }
      });
    } catch (error) {
      console.error('❌ Error playing background preview:', error);
      setPlayingPreview(null);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const meditation = await api.generateMeditation({
        category,
        duration,
        voiceId: selectedVoice,
        background: selectedBackground,
        responses,
        isGift: false,
      });

      // Navigate to Library with notification flag
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            { 
              name: 'MainTabs',
              state: {
                routes: [
                  {
                    name: 'Library',
                    params: { showGeneratingNotification: true }
                  }
                ]
              }
            }
          ],
        })
      );
    } catch (error: any) {
      if (error.message === 'QUOTA_EXCEEDED') {
        Alert.alert('Quota Exceeded', 'You\'ve reached your weekly meditation limit. Upgrade to Advanced for unlimited meditations.');
      } else {
        Alert.alert('Error', error.message || 'Failed to generate meditation');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const allVoices = [...VOICE_OPTIONS.basic, ...VOICE_OPTIONS.advanced];

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Create Meditation</Text>
        <Text style={styles.subtitle}>Customize your {category} meditation</Text>

        <Text style={styles.label}>Duration</Text>
        <View style={styles.optionsGrid}>
          {DURATION_OPTIONS.map((dur) => (
            <TouchableOpacity
              key={dur}
              style={[
                styles.optionButton,
                duration === dur && styles.optionButtonSelected,
              ]}
              onPress={() => setDuration(dur)}
            >
              <Text
                style={[
                  styles.optionText,
                  duration === dur && styles.optionTextSelected,
                ]}
              >
                {dur} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Voice</Text>
        <View style={styles.optionsGrid}>
          {allVoices.map((voice) => (
            <TouchableOpacity
              key={voice.id}
              style={[
                styles.optionButton,
                selectedVoice === voice.id && styles.optionButtonSelected,
                playingPreview === voice.id && styles.optionButtonPlaying,
              ]}
              onPress={() => {
                setSelectedVoice(voice.id);
                playVoicePreview(voice.id, voice.previewId);
              }}
            >
              {playingPreview === voice.id && (
                <Ionicons name="volume-high" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              )}
              <Text
                style={[
                  styles.optionText,
                  selectedVoice === voice.id && styles.optionTextSelected,
                ]}
              >
                {voice.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Background</Text>
        <View style={styles.optionsGrid}>
          {BACKGROUND_OPTIONS.map((bg) => (
            <TouchableOpacity
              key={bg.id}
              style={[
                styles.optionButton,
                selectedBackground === bg.id && styles.optionButtonSelected,
                playingPreview === bg.id && styles.optionButtonPlaying,
              ]}
              onPress={() => {
                setSelectedBackground(bg.id);
                playBackgroundPreview(bg.id, bg.previewFileName);
              }}
            >
              {playingPreview === bg.id && (
                <Ionicons name="volume-high" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              )}
              <Text
                style={[
                  styles.optionText,
                  selectedBackground === bg.id && styles.optionTextSelected,
                ]}
              >
                {bg.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.generateButton, isLoading && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.generateButtonText}>Generate Meditation</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: layout.headerTop,
    right: layout.headerSide,
    zIndex: 10,
    width: layout.headerButtonSize,
    height: layout.headerButtonSize,
    borderRadius: layout.headerButtonSize / 2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: layout.screenHorizontal,
    paddingTop: layout.screenTopBase + layout.headerButtonSize,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
    textTransform: 'capitalize',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: layout.screenHorizontal,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  optionButtonPlaying: {
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
