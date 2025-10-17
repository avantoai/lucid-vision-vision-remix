import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Audio } from 'expo-av';
import { RootStackParamList } from '../../types';
import { Text, Button, RecordButton, IconButton } from '../../components/ui';
import { theme } from '../../theme/theme';
import { Ionicons } from '@expo/vector-icons';

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
    <SafeAreaView style={styles.container}>
      <IconButton
        icon={<Ionicons name="close" size={24} color={theme.colors.text.primary} />}
        onPress={() => navigation.goBack()}
        style={styles.closeButton}
      />

      <View style={styles.content}>
        <Text variant="heading" color="primary" weight="bold" align="center" style={styles.category}>
          {route.params.category}
        </Text>
        
        <Text variant="subheading" color="body" align="center" style={styles.prompt}>
          {route.params.prompt}
        </Text>

        {isRecording && (
          <Text variant="title" weight="semibold" style={styles.timer}>
            {formatTime(recordingTime)}
          </Text>
        )}

        {!isRecording && !isLoading && (
          <Text variant="body" color="secondary" style={styles.helpText}>
            Tap to Record
          </Text>
        )}

        <View style={styles.recordContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : (
            <RecordButton
              isRecording={isRecording}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              icon={
                isRecording ? (
                  <View style={styles.stopIcon} />
                ) : (
                  <Text style={styles.micIcon}>🎙️</Text>
                )
              }
            />
          )}
        </View>

        {!isRecording && !isLoading && (
          <Button
            title="Write ✏️"
            onPress={handleWriteMode}
            variant="secondary"
            size="medium"
            style={styles.writeButton}
          />
        )}

        {route.params.responses.length > 0 && (
          <Text variant="small" color="secondary" style={styles.responsesCount}>
            {route.params.responses.length} previous responses
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    paddingTop: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: {
    textTransform: 'capitalize',
    marginBottom: theme.spacing.lg,
  },
  prompt: {
    marginBottom: theme.spacing.huge,
    paddingHorizontal: theme.spacing.xl,
  },
  helpText: {
    marginBottom: theme.spacing.xxl,
  },
  timer: {
    color: theme.colors.status.error,
    marginBottom: theme.spacing.xxl,
  },
  recordContainer: {
    marginBottom: theme.spacing.xxl,
  },
  loadingContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    fontSize: 64,
  },
  stopIcon: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.text.primary,
    borderRadius: theme.borderRadius.sm,
  },
  writeButton: {
    marginTop: theme.spacing.md,
  },
  responsesCount: {
    position: 'absolute',
    bottom: 40,
  },
});
