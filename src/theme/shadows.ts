import { colors } from './colors';

/**
 * PREconomy shadow definitions for React Native.
 * Uses both iOS (shadow*) and Android (elevation) properties.
 */
export const shadows = {
  brand: {
    shadowColor:   colors.brand,
    shadowOpacity: 0.20,
    shadowRadius:  24,
    shadowOffset:  { width: 0, height: 8 },
    elevation:     8,
  },
  card: {
    shadowColor:   '#000000',
    shadowOpacity: 0.24,
    shadowRadius:  12,
    shadowOffset:  { width: 0, height: 4 },
    elevation:     4,
  },
  subtle: {
    shadowColor:   '#000000',
    shadowOpacity: 0.12,
    shadowRadius:  6,
    shadowOffset:  { width: 0, height: 2 },
    elevation:     2,
  },
} as const;

export type Shadows = typeof shadows;
