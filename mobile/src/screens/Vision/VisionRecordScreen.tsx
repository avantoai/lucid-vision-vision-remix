import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, useWindowDimensions, Animated } from 'react-native';
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
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let meteringInterval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      // Audio-responsive pulsing animation
      meteringInterval = setInterval(async () => {
        if (recording) {
          try {
            const status = await recording.getStatusAsync();
            if (status.isRecording && status.metering !== undefined) {
              // Normalize metering value (-160 to 0) to scale (1.0 to 1.6)
              const normalized = Math.max(0, (status.metering + 160) / 160);
              const scale = 1.0 + (normalized * 0.6);
              const opacity = normalized * 0.8;
              
              Animated.parallel([
                Animated.spring(pulseAnim, {
                  toValue: scale,
                  useNativeDriver: true,
                  friction: 3,
                  tension: 40,
                }),
                Animated.timing(opacityAnim, {
                  toValue: opacity,
                  duration: 100,
                  useNativeDriver: true,
                }),
              ]).start();
            }
          } catch (error) {
            // Ignore metering errors
          }
        }
      }, 100);
    } else {
      // Reset animation when not recording
      pulseAnim.setValue(1);
      opacityAnim.setValue(0);
    }
    
    return () => {
      clearInterval(interval);
      clearInterval(meteringInterval);
    };
  }, [isRecording, recording]);

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

      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

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

        <View style={{ position: 'absolute', top: micButtonTop, left: '50%', transform: [{ translateX: -70 }] }}>
          {isRecording && (
            <>
              <Animated.View 
                style={[
                  styles.pulseRing,
                  {
                    opacity: opacityAnim,
                    transform: [{ scale: pulseAnim }]
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.pulseRing,
                  styles.pulseRingOuter,
                  {
                    opacity: Animated.multiply(opacityAnim, 0.6),
                    transform: [{ scale: Animated.multiply(pulseAnim, 1.15) }]
                  }
                ]} 
              />
            </>
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
              <Ionicons name="mic" size={64} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>

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
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#EF4444',
    zIndex: 1,
    top: 20,
    left: 20,
  },
  pulseRingOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    top: 20,
    left: 20,
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
    fontSize: 22,
    fontWeight: '400',
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
