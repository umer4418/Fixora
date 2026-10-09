import '@/global.css';
import { Platform } from 'react-native';

export const Palette = {
  primary: '#2563EB',       // Fixora Royal Blue
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  primarySoft: '#EFF6FF',
  
  secondary: '#0F172A',     // Slate dark
  accent: '#10B981',        // Emerald green
  accentSoft: '#ECFDF5',
  
  warning: '#F59E0B',       // Amber
  warningSoft: '#FEF3C7',
  
  danger: '#EF4444',        // Rose / Red
  dangerSoft: '#FEE2E2',
  
  purple: '#8B5CF6',
  purpleSoft: '#F5F3FF',

  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',
  
  white: '#FFFFFF',
  black: '#000000',
  
  star: '#FBBF24',
};

export const Colors = {
  light: {
    primary: Palette.primary,
    primarySoft: Palette.primarySoft,
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    backgroundElement: '#F1F5F9',
    backgroundSelected: '#E2E8F0',
    border: '#E2E8F0',
    success: Palette.accent,
    warning: Palette.warning,
    danger: Palette.danger,
    tint: Palette.primary,
  },
  dark: {
    primary: Palette.primaryLight,
    primarySoft: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    background: '#0B0F19',
    card: '#161F30',
    cardBorder: '#1E293B',
    backgroundElement: '#1A2333',
    backgroundSelected: '#243046',
    border: '#1E293B',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    tint: Palette.primaryLight,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: Platform.select({
    web: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
  }),
  md: Platform.select({
    web: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
  }),
  lg: Platform.select({
    web: { boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.12)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 8,
    },
  }),
};

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1000;
