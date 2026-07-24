import { useApp } from '../state/AppProvider';

export type Theme = {
  isDark: boolean;
  bg: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  inputBg: string;
  primary: string;
  primaryText: string;
  secondary: string;
  secondaryText: string;
  errorBg: string;
  errorBorder: string;
  errorText: string;
  mediaBg: string;
  sep: string;
};

export const lightTheme: Theme = {
  isDark: false,
  bg: '#FFFFFF',
  card: '#F9FAFB',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  border: '#D1D5DB',
  inputBg: '#FFFFFF',
  primary: '#111827',
  primaryText: '#FFFFFF',
  secondary: '#E5E7EB',
  secondaryText: '#111827',
  errorBg: '#FEF2F2',
  errorBorder: '#FCA5A5',
  errorText: '#991B1B',
  mediaBg: '#0F172A',
  sep: '#F3F4F6',
};

export const darkTheme: Theme = {
  isDark: true,
  bg: '#0B1120',
  card: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#E5E7EB',
  textMuted: '#9CA3AF',
  border: '#374151',
  inputBg: '#111827',
  primary: '#F9FAFB',
  primaryText: '#111827',
  secondary: '#374151',
  secondaryText: '#F9FAFB',
  errorBg: '#450A0A',
  errorBorder: '#B91C1C',
  errorText: '#FCA5A5',
  mediaBg: '#020617',
  sep: '#1F2937',
};

export function useTheme(): Theme {
  const { settings } = useApp();
  return settings.theme === 'dark' ? darkTheme : lightTheme;
}
