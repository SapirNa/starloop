// Dark cosmic base + purple/blue tones + gold/white highlights, shared by
// every screen. World-specific accents (see data/worlds.ts) layer on top of
// this, they don't replace it - keeps the whole app feeling like one
// product.
export const COLORS = {
  background: '#0B0F1A',
  backgroundDeep: '#050710',
  surface: '#161B29',
  surfaceElevated: '#1E2436',
  border: '#2A3148',
  primary: '#5B8CFF',
  secondary: '#9B6BFF',
  text: '#FFFFFF',
  textMuted: '#8A93A6',
  gold: '#FFD84A',
  danger: '#FF6B6B',
  success: '#5BFFB0',
  // Modal/sheet backdrop - one shared value so every overlay dims the scene
  // behind it by the same amount.
  overlay: 'rgba(5, 7, 16, 0.85)',
} as const;
