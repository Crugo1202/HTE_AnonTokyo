export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  ANALYZE: `${API_BASE_URL}/api/v1/analyze-teaching`,
} as const;

// Design system — Swiss: flat, grid, Inter, primary #D94030, accent #206cdf on #111110
export const COLORS = {
  // Background & surfaces
  BACKGROUND: '#111110',
  SURFACE_1: '#1a1a19',
  SURFACE_2: '#4f4f47',
  SURFACE_3: '#8d8d81',
  BORDER: 'rgba(255,255,255,0.12)',
  BORDER_DIVIDER: 'rgba(255,255,255,0.06)',
  BORDER_HOVER: 'rgba(255,255,255,0.18)',
  BORDER_FOCUS: 'rgba(255,255,255,0.24)',

  // Text
  TEXT: '#eeeee8',
  TEXT_SECONDARY: '#bbbbb4',
  TEXT_TERTIARY: '#88887e',
  TEXT_DISABLED: '#55554e',

  // Primary (red)
  PRIMARY: '#D94030',
  PRIMARY_HOVER: '#be3223',
  PRIMARY_ACTIVE: '#9f2a1d',
  TEXT_ON_PRIMARY: '#110504',

  // Accent (blue) — focus, links
  ACCENT: '#206cdf',

  // Semantic
  SUCCESS: '#22C55E',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',

  // Legacy aliases (map to design system)
  PLACEHOLDER: '#88887e',
} as const;

export const FONTS = {
  INTER: 'Inter',
} as const;

// Spacing scale (multiples of 4px)
export const SPACING = {
  '4xs': 3,
  '3xs': 5,
  '2xs': 8,
  xs: 10,
  sm: 15,
  md: 20,
  lg: 30,
  xl: 40,
  '2xl': 60,
  '3xl': 80,
  '4xl': 120,
} as const;

// Typography (approximate — RN uses numeric fontWeight)
export const TYPE = {
  overline: { fontSize: 10, fontWeight: '500' as const, letterSpacing: 0.1 },
  caption: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0.02 },
  body: { fontSize: 18, fontWeight: '400' as const, lineHeight: 32 },
  lead: { fontSize: 22, fontWeight: '400' as const, lineHeight: 36 },
  title: { fontSize: 36, fontWeight: '600' as const, lineHeight: 44 },
  headline: { fontSize: 52, fontWeight: '700' as const, lineHeight: 64 },
  display: { fontSize: 80, fontWeight: '700' as const, lineHeight: 96 },
} as const;

// Motion (for reference; RN uses Animated or layout props)
export const MOTION = {
  micro: 60,
  base: 120,
  medium: 180,
  large: 300,
} as const;
