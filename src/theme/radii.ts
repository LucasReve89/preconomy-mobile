/**
 * PREconomy border-radius scale for React Native.
 */
export const radii = {
  sm:     8,
  md:     10,
  lg:     12,
  xl:     14,
  avatar: 20,
  full:   9999,
} as const;

export type Radii = typeof radii;
