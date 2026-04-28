/**
 * PREconomy design tokens — color constants for React Native.
 * Values are numerically aligned with the Next.js CSS custom properties
 * defined in app/globals.css.
 */
export const colors = {
  // Brand
  brand:     '#00F7C5',
  brandSoft: 'rgba(0, 247, 197, 0.13)',
  brandGlow: 'rgba(0, 247, 197, 0.20)',

  // Surfaces
  bg:       '#0F172A',
  bgSoft:   '#0B1220',
  card:     '#151F33',
  cardSoft: '#1A2540',

  // Lines
  line:  'rgba(255, 255, 255, 0.08)',
  line2: 'rgba(255, 255, 255, 0.14)',

  // Text
  text:  '#F6F4EF',
  mute:  '#94A3B8',
  mute2: '#64748B',

  // Status
  warn:    '#FFB547',
  danger:  '#EF5A6B',
  success: '#22D39B',
} as const;

export type Colors = typeof colors;
