import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Audio } from 'expo-av';
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
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.category}>{route.params.category}</Text>
        <Text style={styles.prompt}>{route.params.prompt}</Text>

        {isRecording && (
          <Text style={styles.timer}>{formatTime(recordingTime)}</Text>
        )}

        {!isRecording && !isLoading && (
          <Text style={styles.helpText}>Tap to Record</Text>
        )}

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
            <Text style={styles.micIcon}>🎙️</Text>
          )}
        </TouchableOpacity>

        {!isRecording && !isLoading && (
          <TouchableOpacity style={styles.writeButton} onPress={handleWriteMode}>
            <Text style={styles.writeButtonText}>Write ✏️</Text>
          </TouchableOpacity>
        )}

        {route.params.responses.length > 0 && (
          <View style={styles.responsesIndicator}>
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
  closeText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    textTransform: 'capitalize',
    marginBottom: 16,
  },
  prompt: {
    fontSize: 20,
    color: colors.text,
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  helpText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  timer: {
    fontSize: 32,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 24,
  },
  micButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  micButtonRecording: {
    backgroundColor: '#EF4444',
  },
  micIcon: {
    fontSize: 64,
  },
  stopIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.white,
    borderRadius: 4,
  },
  writeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
  },
  writeButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  responsesIndicator: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  responsesCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
