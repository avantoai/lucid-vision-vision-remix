import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { colors } from '../../theme';

type VisionRecordRouteProp = RouteProp<RootStackParamList, 'VisionRecord'>;
type VisionRecordNavigationProp = StackNavigationProp<RootStackParamList, 'VisionRecord'>;

export default function VisionRecordScreen() {
  const navigation = useNavigation<VisionRecordNavigationProp>();
  const route = useRoute<VisionRecordRouteProp>();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow microphone access to record your response');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsLoading(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (!uri) {
        throw new Error('No recording URI');
      }

      navigation.navigate('VisionEdit', {
        category: route.params.category,
        prompt: route.params.prompt,
        responses: route.params.responses,
        audioUri: uri,
        recordingDuration: recordingTime
      });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording');
    } finally {
      setRecording(null);
      setIsRecording(false);
      setIsLoading(false);
    }
  };

  const handleWriteMode = () => {
    navigation.navigate('VisionEdit', {
      category: route.params.category,
      prompt: route.params.prompt,
      responses: route.params.responses,
      audioUri: null,
      recordingDuration: 0
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.topContent}>
          <Text style={styles.category}>{route.params.category}</Text>
          <Text style={styles.prompt}>{route.params.prompt}</Text>
        </View>

        {/* Mic button - absolutely centered at 50% screen height */}
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonRecording]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.white} />
          ) : isRecording ? (
            <View style={styles.stopIcon} />
          ) : (
            <Ionicons name="mic" size={64} color={colors.white} />
          )}
        </TouchableOpacity>

        {/* Timer - fixed position above mic button */}
        {isRecording && (
          <Text style={styles.timer}>{formatTime(recordingTime)}</Text>
        )}

        {/* Help text - fixed position above mic button */}
        {!isRecording && !isLoading && (
          <Text style={styles.helpText}>Tap to Record</Text>
        )}

        {/* Write button - fixed position below mic button */}
        {!isRecording && !isLoading && (
          <TouchableOpacity style={styles.writeButton} onPress={handleWriteMode}>
            <Ionicons name="create-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={styles.writeButtonText}>Write</Text>
          </TouchableOpacity>
        )}

        {route.params.responses.length > 0 && (
          <View style={styles.bottomSection}>
            <Text style={styles.responsesCount}>{route.params.responses.length} previous responses</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  content: {
    flex: 1,
  },
  topContent: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  category: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.primary,
    textTransform: 'capitalize',
    marginBottom: 20,
  },
  prompt: {
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
  },
  micButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [
      { translateX: -70 },  // Half of width to center horizontally
      { translateY: -70 },  // Half of height to center vertically
    ],
  },
  helpText: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    transform: [
      { translateY: -130 }, // Position above button: 70 (half button) + 24 (spacing) + 36 (clearance)
    ],
  },
  timer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    fontSize: 32,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
    transform: [
      { translateY: -130 }, // Same as helpText - no shift!
    ],
  },
  micButtonRecording: {
    backgroundColor: '#EF4444',
  },
  stopIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: 4,
  },
  writeButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    transform: [
      { translateX: -60 },  // Approximate half of button width to center
      { translateY: 94 },   // 70 (half button) + 24 (spacing)
    ],
  },
  writeButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  responsesCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
