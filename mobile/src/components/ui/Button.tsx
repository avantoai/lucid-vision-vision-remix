import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { theme } from '../../theme/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const buttonStyles: ViewStyle[] = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
  ].filter(Boolean) as TextStyle[];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.text.primary : theme.colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={textStyles}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  icon: {
    width: theme.components.icon.small,
    height: theme.components.icon.small,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  smallSize: {
    paddingHorizontal: theme.components.button.padding.small.horizontal,
    paddingVertical: theme.components.button.padding.small.vertical,
    height: theme.components.button.height.small,
  },
  mediumSize: {
    paddingHorizontal: theme.components.button.padding.medium.horizontal,
    paddingVertical: theme.components.button.padding.medium.vertical,
    height: theme.components.button.height.medium,
  },
  largeSize: {
    paddingHorizontal: theme.components.button.padding.large.horizontal,
    paddingVertical: theme.components.button.padding.large.vertical,
    height: theme.components.button.height.large,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: theme.typography.weights.semibold,
  },
  primaryText: {
    color: theme.colors.text.primary,
  },
  secondaryText: {
    color: theme.colors.text.primary,
  },
  ghostText: {
    color: theme.colors.text.primary,
  },
  smallText: {
    fontSize: theme.typography.sizes.small,
  },
  mediumText: {
    fontSize: theme.typography.sizes.body,
  },
  largeText: {
    fontSize: theme.typography.sizes.subtitle,
  },
});
