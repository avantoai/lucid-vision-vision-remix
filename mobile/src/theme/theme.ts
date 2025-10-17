export const colors = {
  background: '#0a0a0a',
  surface: '#1a1a1a',
  card: '#2a2a2a',
  cardSecondary: '#3a3a3a',
  border: '#4a4a4a',
  borderLight: '#3a3a3a',
  
  primary: '#7c3aed',
  primaryDark: '#6d28d9',
  primaryLight: '#8b5cf6',
  primaryLighter: '#a78bfa',
  
  text: {
    primary: '#ffffff',
    secondary: '#9ca3af',
    tertiary: '#6b7280',
    body: '#d1d5db',
  },
  
  gradient: {
    primary: ['#8b5cf6', '#a78bfa'],
    card: ['#06b6d4', '#3b82f6'],
  },
  
  status: {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  },
};

export const typography = {
  sizes: {
    hero: 36,
    title: 32,
    heading: 24,
    subheading: 20,
    subtitle: 18,
    body: 16,
    small: 14,
    tiny: 12,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 60,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 100,
  circle: 999,
};

export const shadows = {
  small: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 5,
  },
  large: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 10,
  },
};

export const components = {
  button: {
    height: {
      small: 40,
      medium: 48,
      large: 56,
    },
    padding: {
      small: { horizontal: spacing.xl, vertical: spacing.md },
      medium: { horizontal: spacing.xxxl, vertical: spacing.lg },
      large: { horizontal: spacing.huge, vertical: spacing.xl },
    },
  },
  input: {
    height: 56,
    padding: { horizontal: spacing.xl, vertical: spacing.lg },
  },
  card: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  icon: {
    small: 20,
    medium: 24,
    large: 28,
    xlarge: 32,
    huge: 48,
    massive: 64,
  },
  bottomNav: {
    height: 80,
    iconSize: 28,
  },
};

export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  components,
};

export type Theme = typeof theme;
