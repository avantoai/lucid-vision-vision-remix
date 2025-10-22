import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { colors, layout } from '../../theme';

type VisionRecordRouteProp = RouteProp<RootStackParamList, 'VisionRecord'>;
type VisionRecordNavigationProp = StackNavigationProp<RootStackParamList, 'VisionRecord'>;

const STAGE_NAMES = ['Vision', 'Belief', 'Identity', 'Embodiment', 'Action'];

export default function VisionRecordScreen() {
  const navigation = useNavigation<VisionRecordNavigationProp>();
  const route = useRoute<VisionRecordRouteProp>();
  const { visionId, question, stage, stageIndex } = route.params;
  const { height } = useWindowDimensions();
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
        visionId,
        question,
        stage,
        stageIndex,
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
      visionId,
      question,
      stage,
      stageIndex,
      audioUri: null,
      recordingDuration: 0
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const centerY = height / 2;
  const micButtonTop = centerY - 70;
  const textTop = centerY - 130;
  const writeButtonTop = centerY + 94;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.topContent}>
          <Text style={styles.prompt}>{question}</Text>
        </View>

        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonRecording, { top: micButtonTop }]}
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

        {isRecording && (
          <Text style={[styles.timer, { top: textTop }]}>{formatTime(recordingTime)}</Text>
        )}

        {!isRecording && !isLoading && (
          <Text style={[styles.helpText, { top: textTop }]}>Tap to Record</Text>
        )}

        {!isRecording && !isLoading && (
          <TouchableOpacity style={[styles.writeButton, { top: writeButtonTop }]} onPress={handleWriteMode}>
            <Ionicons name="create-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={styles.writeButtonText}>Write</Text>
          </TouchableOpacity>
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
    flex: 1,
  },
  topContent: {
    position: 'absolute',
    top: layout.screenTopBase + layout.headerButtonSize,
    left: 0,
    right: 0,
    paddingHorizontal: layout.screenHorizontal,
    alignItems: 'center',
  },
  prompt: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  micButton: {
    position: 'absolute',
    left: '50%',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [
      { translateX: -70 },
    ],
  },
  helpText: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  timer: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 32,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
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
    left: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.surfaceLight,
    transform: [
      { translateX: -60 },
    ],
  },
  writeButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
});
