export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  ANALYZE: `${API_BASE_URL}/api/v1/analyze-teaching`,
} as const;

export const COLORS = {
  BACKGROUND: '#FFFFFF',
  TEXT: '#000000',
  BORDER: '#E5E5E5',
  PLACEHOLDER: '#999999',
} as const;

export const FONTS = {
  INTER: 'Inter',
} as const;
