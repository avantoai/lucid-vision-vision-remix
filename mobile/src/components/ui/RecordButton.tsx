import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { theme } from '../../theme/theme';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  disabled?: boolean;
}

export function RecordButton({
  isRecording,
  onPress,
  icon,
  disabled = false,
}: RecordButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isRecording && styles.recording,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        {icon}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.glow,
  },
  recording: {
    backgroundColor: theme.colors.primaryDark,
  },
  disabled: {
    opacity: 0.5,
    ...theme.shadows.small,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
