/**
 * PREconomy spacing scale for React Native.
 */
export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  '2xl': 32,

  // Layout constants
  sidebar:  232,
  topbar:   56,
  cardPad:  18,
  pagePad:  32,
} as const;

export type Spacing = typeof spacing;
