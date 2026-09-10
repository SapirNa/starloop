import type { TextStyle } from 'react-native';

import { COLORS } from './colors';

// Named text styles so screens stop re-deriving the same
// fontSize/fontWeight/color combination by hand. Spread/append into a
// component's own StyleSheet where further per-screen tweaks (margins,
// alignment) are still needed - these only own type scale + weight + color.
export const TYPOGRAPHY = {
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  body: {
    fontSize: 14,
    color: COLORS.text,
  },
  bodyMuted: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  label: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  caption: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
} as const satisfies Record<string, TextStyle>;
