import React from 'react';
import { Text as RNText, TextStyle, StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

type TextVariant = 'hero' | 'title' | 'heading' | 'subheading' | 'subtitle' | 'body' | 'small' | 'tiny';
type TextColor = 'primary' | 'secondary' | 'tertiary' | 'body';

interface TextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  color?: TextColor;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  style?: TextStyle;
  numberOfLines?: number;
}

export function Text({
  children,
  variant = 'body',
  color = 'primary',
  weight = 'regular',
  align = 'left',
  style,
  numberOfLines,
}: TextProps) {
  const textStyles: TextStyle[] = [
    styles.base,
    styles[variant],
    styles[`${color}Color`],
    { fontWeight: theme.typography.weights[weight] },
    { textAlign: align },
    style,
  ].filter(Boolean) as TextStyle[];

  return (
    <RNText style={textStyles} numberOfLines={numberOfLines}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    lineHeight: theme.typography.lineHeights.normal * theme.typography.sizes.body,
  },
  hero: {
    fontSize: theme.typography.sizes.hero,
    fontWeight: theme.typography.weights.bold,
    lineHeight: theme.typography.lineHeights.tight * theme.typography.sizes.hero,
  },
  title: {
    fontSize: theme.typography.sizes.title,
    fontWeight: theme.typography.weights.bold,
  },
  heading: {
    fontSize: theme.typography.sizes.heading,
    fontWeight: theme.typography.weights.bold,
  },
  subheading: {
    fontSize: theme.typography.sizes.subheading,
    fontWeight: theme.typography.weights.semibold,
  },
  subtitle: {
    fontSize: theme.typography.sizes.subtitle,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.subtitle,
  },
  body: {
    fontSize: theme.typography.sizes.body,
    lineHeight: theme.typography.lineHeights.relaxed * theme.typography.sizes.body,
  },
  small: {
    fontSize: theme.typography.sizes.small,
  },
  tiny: {
    fontSize: theme.typography.sizes.tiny,
  },
  primaryColor: {
    color: theme.colors.text.primary,
  },
  secondaryColor: {
    color: theme.colors.text.secondary,
  },
  tertiaryColor: {
    color: theme.colors.text.tertiary,
  },
  bodyColor: {
    color: theme.colors.text.body,
  },
});
