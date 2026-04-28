/**
 * PREconomy typography scale for React Native.
 *
 * NOTE: Font registration (expo-font / useFonts) is deferred to a future SDD.
 * These constants publish the intent; actual font loading is a separate concern.
 */
export const typography = {
  fontFamily: {
    sans: 'Inter',
    mono: 'JetBrainsMono',
  },
  fontSize: {
    xs:   11,
    sm:   13,
    md:   14,
    lg:   16,
    xl:   20,
    '2xl': 26,
    '3xl': 32,
    '4xl': 40,
  },
  fontWeight: {
    regular:   '400',
    medium:    '500',
    semibold:  '600',
    bold:      '700',
    extrabold: '800',
  },
  lineHeight: {
    tight:  1.2,
    normal: 1.5,
    loose:  1.75,
  },
} as const;

export type Typography = typeof typography;
