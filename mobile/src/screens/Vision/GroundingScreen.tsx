import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout } from '../../theme';

interface GroundingScreenProps {
  onContinue: () => void;
  onClose?: () => void;
}

export default function GroundingScreen({ onContinue, onClose }: GroundingScreenProps) {
  return (
    <View style={styles.container}>
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        <Text style={styles.title}>Take a moment</Text>
        <Text style={styles.subtitle}>
          Let's create space for clarity and intention.
        </Text>
        <Text style={styles.body}>
          Find a comfortable position. Take a deep breath. When you're ready, we'll begin exploring what you truly want to bring into your life.
        </Text>
      </View>

      <TouchableOpacity onPress={onContinue} style={styles.button}>
        <Text style={styles.buttonText}>Let's Begin</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenHorizontal,
    paddingTop: layout.screenTopBase + 40,
    paddingBottom: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 28,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
