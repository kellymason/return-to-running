export const Colors = {
  // Phase colors
  walk: '#4CAF50',      // calm green
  jog: '#2196F3',       // energetic blue
  cooldown: '#8BC34A',  // lighter green

  // Recommendation colors
  progress: '#4CAF50',
  maintain: '#FF9800',
  pull_back: '#FF5722',
  rest: '#F44336',

  // Base palette
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2F5',
  border: '#DDE3E8',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#5A6370',
  textMuted: '#9AA3AF',
  textOnColor: '#FFFFFF',

  // UI
  primary: '#4CAF50',
  primaryDark: '#388E3C',
  danger: '#F44336',
  warning: '#FF9800',
  success: '#4CAF50',

  // Timer display
  timerBackground: '#1A1A2E',
  timerText: '#FFFFFF',
} as const;

export const Typography = {
  timerDisplay: 80,    // large countdown (glanceable)
  intervalLabel: 32,   // WALK / JOG / COOLDOWN
  heading1: 28,
  heading2: 22,
  heading3: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;
