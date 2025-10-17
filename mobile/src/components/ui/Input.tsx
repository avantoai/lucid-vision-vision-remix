import React from 'react';
import { TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { theme } from '../../theme/theme';

interface InputProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export function Input({ style, containerStyle, ...props }: InputProps) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor={theme.colors.text.tertiary}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.components.input.padding.horizontal,
    paddingVertical: theme.components.input.padding.vertical,
    color: theme.colors.text.primary,
    fontSize: theme.typography.sizes.body,
    height: theme.components.input.height,
  },
});
