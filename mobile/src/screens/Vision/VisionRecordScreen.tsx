import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, useWindowDimensions, Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { colors, layout } from '../../theme';

type VisionRecordRouteProp = RouteProp<RootStackParamList, 'VisionRecord'>;
type VisionRecordNavigationProp = StackNavigationProp<RootStackParamList, 'VisionRecord'>;

export default function VisionRecordScreen() {
  const navigation = useNavigation<VisionRecordNavigationProp>();
  const route = useRoute<VisionRecordRouteProp>();
  const { visionId, question, category } = route.params;
  const { height } = useWindowDimensions();
  const recordingRef = useRef<Audio.Recording | null>(null);
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
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording && status.metering !== undefined) {
              // Normalize metering value (-160 to 0) to scale (1.0 to 2.2)
              const normalized = Math.max(0, (status.metering + 160) / 160);
              const scale = 1.0 + (normalized * 1.2);
              const opacity = normalized * 0.8;
              
              Animated.parallel([
                Animated.spring(pulseAnim, {
                  toValue: scale,
                  useNativeDriver: true,
                  friction: 4,
                  tension: 50,
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
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Clean up any existing recording first
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

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

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setIsLoading(true);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      if (!uri) {
        throw new Error('No recording URI');
      }

      navigation.navigate('VisionEdit', {
        visionId,
        question,
        category,
        audioUri: uri,
        recordingDuration: recordingTime
      });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to process recording');
    } finally {
      recordingRef.current = null;
      setIsRecording(false);
      setIsLoading(false);
    }
  };

  const handleWriteMode = () => {
    navigation.navigate('VisionEdit', {
      visionId,
      question,
      category,
      audioUri: null,
      recordingDuration: 0
    });
  };

  const handleClose = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      
      // Check if this vision has any responses
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/vision/visions/${visionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        console.error('Failed to fetch vision:', response.status);
        // If vision doesn't exist or error, go back to My Vision
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
        return;
      }
      
      const data = await response.json();
      const hasResponses = data.vision?.responses?.length > 0;
      
      console.log('Vision check:', { visionId, hasResponses, responseCount: data.vision?.responses?.length });
      
      if (!hasResponses) {
        // No responses yet - delete the vision and go back to My Vision
        console.log('Deleting empty vision:', visionId);
        const deleteResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/vision/visions/${visionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!deleteResponse.ok) {
          console.error('Failed to delete vision:', deleteResponse.status);
        }
        
        // Always navigate back to My Vision, even if delete fails
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else {
        // Has responses - go to vision detail
        console.log('Vision has responses, navigating to detail');
        navigation.navigate('VisionDetail', { visionId });
      }
    } catch (error) {
      console.error('Error in handleClose:', error);
      // On error, go back to My Vision (safer than showing empty detail)
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate vertical positions
  const centerY = height / 2;
  const micButtonTop = centerY - 70; // Center the 140px button
  const helpTextTop = micButtonTop - 40;
  const writeButtonTop = micButtonTop + 164;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Top spacer for close button area */}
        <View style={styles.headerSpacer} />

        {/* Centered question area - flex to center in space above mic button */}
        <View style={[styles.questionArea, { height: micButtonTop - (layout.screenTopBase + layout.headerButtonSize) }]}>
          <Text style={styles.prompt}>{question}</Text>
        </View>
      </View>

      {/* Microphone controls - absolutely positioned at screen center */}
      {!isRecording && !isLoading && (
        <Text style={[styles.helpText, { top: helpTextTop }]}>Tap to Record</Text>
      )}

      <View style={[styles.micContainer, { top: micButtonTop }]}>
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

      {!isRecording && !isLoading && (
        <TouchableOpacity style={[styles.writeButton, { top: writeButtonTop }]} onPress={handleWriteMode}>
          <Ionicons name="create-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={styles.writeButtonText}>Write</Text>
        </TouchableOpacity>
      )}
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
  headerSpacer: {
    height: layout.screenTopBase + layout.headerButtonSize,
  },
  questionArea: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenHorizontal,
  },
  prompt: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  micContainer: {
    position: 'absolute',
    width: 140,
    height: 140,
    left: '50%',
    transform: [{ translateX: -70 }],
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
    width: 85,
    height: 85,
    borderRadius: 42.5,
    borderWidth: 3,
    borderColor: '#EF4444',
    zIndex: 1,
    top: 27.5,
    left: 27.5,
  },
  pulseRingOuter: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    borderWidth: 2,
    top: 27.5,
    left: 27.5,
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
    transform: [{ translateX: -60 }],
  },
  writeButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
});
