import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
// @ts-ignore - Slider types are incompatible with newer React Native versions
import Slider from '@react-native-community/slider';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Meditation } from '../../types';
import api from '../../services/api';
import { colors } from '../../theme';

type MeditationPlayerRouteProp = RouteProp<RootStackParamList, 'MeditationPlayer'>;
type MeditationPlayerNavigationProp = StackNavigationProp<RootStackParamList, 'MeditationPlayer'>;

export default function MeditationPlayerScreen() {
  const navigation = useNavigation<MeditationPlayerNavigationProp>();
  const route = useRoute<MeditationPlayerRouteProp>();
  const insets = useSafeAreaInsets();
  const [meditation, setMeditation] = useState<Meditation | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEditTitle, setShowEditTitle] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
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

  const handleRewind = async () => {
    if (!soundRef.current) return;
    
    try {
      const newPosition = Math.max(0, position - 15000); // Rewind 15 seconds (15000ms)
      await soundRef.current.setPositionAsync(newPosition);
    } catch (error) {
      console.error('Rewind error:', error);
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

  const handleEditTitle = () => {
    if (!meditation) return;
    setEditedTitle(meditation.title);
    setShowOptionsMenu(false);
    setShowEditTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!meditation || !editedTitle.trim() || isSavingTitle) return;
    
    setIsSavingTitle(true);
    try {
      await api.updateMeditationTitle(meditation.id, editedTitle.trim());
      setMeditation({ ...meditation, title: editedTitle.trim() });
      setShowEditTitle(false);
      Alert.alert('Success', 'Title updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update title');
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleViewTranscript = () => {
    setShowOptionsMenu(false);
    setShowTranscript(true);
  };

  const cleanTranscript = (script: string): string => {
    // Remove ElevenLabs break tags like <break time="2.5s" />
    return script.replace(/<break time="[^"]*"\s*\/>/g, '');
  };

  if (isLoading || !meditation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.backButton, { top: insets.top + 10 }]} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.optionsButton, { top: insets.top + 10 }]} onPress={() => setShowOptionsMenu(true)}>
        <Text style={styles.optionsText}>•••</Text>
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
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handleRewind}
            disabled={!audioReady}
          >
            <View style={styles.rewindIconContainer}>
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Ionicons 
                  name="refresh-outline" 
                  size={32} 
                  color={!audioReady ? colors.textTertiary : colors.primary}
                />
              </View>
              <Text style={[styles.rewindLabel, !audioReady && styles.controlTextDisabled]}>15</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.playButton, 
              !audioReady && styles.playButtonDisabled
            ]} 
            onPress={handlePlayPause}
            disabled={!audioReady}
          >
            {!audioReady ? (
              <ActivityIndicator size="large" color={colors.white} />
            ) : (
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={40} color={colors.white} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.controlButton}
            onPress={handleFavorite}
          >
            <Ionicons 
              name={meditation.is_favorite ? 'heart' : 'heart-outline'} 
              size={32} 
              color={meditation.is_favorite ? '#EF4444' : colors.primary} 
            />
          </TouchableOpacity>
        </View>

        {!audioReady && (
          <Text style={styles.loadingText}>Loading audio...</Text>
        )}
      </View>

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.optionsOverlay} 
          activeOpacity={1} 
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={[styles.optionsMenu, { top: insets.top + 50 }]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEditTitle}>
              <Text style={styles.menuItemText}>Edit Title</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleViewTranscript}>
              <Text style={styles.menuItemText}>View Transcript</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Title Modal */}
      <Modal
        visible={showEditTitle}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditTitle(false)}
      >
        <View style={styles.centeredModalOverlay}>
          <View style={styles.editTitleModal}>
            <Text style={styles.modalTitle}>Edit Title</Text>
            <TextInput
              style={styles.titleInput}
              value={editedTitle}
              onChangeText={setEditedTitle}
              placeholder="Enter meditation title"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowEditTitle(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, isSavingTitle && styles.saveButtonDisabled]} 
                onPress={handleSaveTitle}
                disabled={isSavingTitle}
              >
                {isSavingTitle ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Transcript Modal */}
      <Modal
        visible={showTranscript}
        animationType="slide"
        onRequestClose={() => setShowTranscript(false)}
      >
        <View style={styles.transcriptModal}>
          <View style={styles.transcriptHeader}>
            <Text style={styles.transcriptTitle}>Transcript</Text>
            <TouchableOpacity onPress={() => setShowTranscript(false)}>
              <Ionicons name="close" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.transcriptScroll}>
            <Text style={styles.transcriptText}>{cleanTranscript(meditation.script)}</Text>
          </ScrollView>
        </View>
      </Modal>
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
    color: colors.primary,
    fontWeight: '600',
  },
  optionsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  optionsText: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 2,
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
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 18,
    color: colors.primary,
    textTransform: 'capitalize',
    marginBottom: 40,
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
    color: colors.textSecondary,
    minWidth: 45,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: {
    fontSize: 28,
    color: colors.primary,
  },
  controlTextDisabled: {
    opacity: 0.3,
  },
  rewindIconContainer: {
    alignItems: 'center',
    gap: 2,
  },
  rewindLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonDisabled: {
    backgroundColor: colors.textTertiary,
    opacity: 0.6,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -32,
    marginBottom: 32,
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsMenu: {
    position: 'absolute',
    top: 80,
    right: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    padding: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  editTitleModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  titleInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surfaceLight,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: colors.textTertiary,
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  transcriptModal: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingTop: 50,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transcriptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textSecondary,
    padding: 20,
  },
});
