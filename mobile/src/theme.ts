// Dark Mode Theme
export const colors = {
  // Primary accent
  primary: '#7c3aed',        // Purple accent
  primaryLight: '#a78bfa',   // Lighter purple
  primaryDark: '#6d28d9',    // Darker purple
  secondary: '#a78bfa',      // Secondary highlight/accent (lighter purple)
  
  // Backgrounds
  background: '#0f0f0f',     // Very dark background
  surface: '#1a1a1a',        // Card/surface background
  surfaceLight: '#262626',   // Lighter surface
  
  // Text
  text: '#f5f5f5',           // Primary text (light)
  textSecondary: '#a3a3a3',  // Secondary text (medium gray)
  textTertiary: '#737373',   // Tertiary text (darker gray)
  
  // Borders
  border: '#404040',         // Border color
  borderLight: '#2a2a2a',    // Lighter border
  
  // Status colors
  success: '#10b981',        // Green
  successLight: '#d1fae5',   // Light green bg
  successDark: '#047857',    // Dark green text
  error: '#ef4444',          // Red
  errorLight: '#fee2e2',     // Light red bg
  errorDark: '#dc2626',      // Dark red text
  warning: '#f59e0b',        // Amber/Orange
  
  // Special
  white: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const theme = {
  colors,
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
};
