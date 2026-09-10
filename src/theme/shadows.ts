import { Platform } from 'react-native';

import { COLORS } from './colors';

// Restrained by design - the direction calls for "premium rounded UI" with
// glow reserved for a few deliberate moments (gold ready-to-claim borders,
// the reward tile highlight), not drop shadows on every card. `card` gives
// elevated surfaces (modals, the profile header) just enough lift to read
// as "above" the starfield behind them.
export const SHADOWS = {
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
    default: {},
  }),
  glow: Platform.select({
    ios: {
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

// A `glow` shadow in a caller-chosen color (e.g. a power-up's own accent) -
// Android's `elevation` can't be tinted, so it falls back to the same
// neutral lift as SHADOWS.glow there; the colored glow only renders on iOS.
export function glowShadow(color: string) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 14,
    },
    android: { elevation: 8 },
    default: {},
  });
}
