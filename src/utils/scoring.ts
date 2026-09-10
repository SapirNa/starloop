import type { Level, StarRating } from '../types/level';
import type { Star, StarType } from '../types/star';

// BOMB is intentionally 0: it must never contribute to score or to a
// level's max-possible-score threshold math (see data/levelBuilder.ts).
// RAINBOW/MAGNET are unimplemented and fall back to NORMAL's value.
export const STAR_VALUES: Record<StarType, number> = {
  NORMAL: 10,
  GOLD: 25,
  RAINBOW: 10,
  SPEED: 10,
  TINY: 15,
  BOMB: 0,
  TIME: 10,
  MAGNET: 10,
};

export function getStarValue(type: StarType): number {
  return STAR_VALUES[type];
}

// Stars captured together in a single loop score a multiplier on top of
// their base value - see gameplay design "Combo System".
export function getComboMultiplier(captureCount: number): number {
  if (captureCount >= 5) return 3;
  if (captureCount === 4) return 2.5;
  if (captureCount === 3) return 2;
  if (captureCount === 2) return 1.5;
  return 1;
}

// Short on-screen feedback for a single-loop combo. null for a lone capture
// (1 star), which isn't a "combo" worth calling out.
export function getComboFeedbackText(captureCount: number): string | null {
  if (captureCount >= 6) return 'COSMIC LOOP!';
  if (captureCount === 5) return 'SUPER LOOP!';
  if (captureCount === 4) return 'PERFECT!';
  if (captureCount === 3) return 'STAR COMBO!';
  if (captureCount === 2) return 'NICE LOOP!';
  return null;
}

export function calculateCaptureScore(capturedStars: Star[]): number {
  if (capturedStars.length === 0) return 0;
  const base = capturedStars.reduce((total, star) => total + star.value, 0);
  return Math.round(base * getComboMultiplier(capturedStars.length));
}

export function calculateRating(level: Level, score: number): StarRating {
  if (score >= level.threeStarScore) return 3;
  if (score >= level.twoStarScore) return 2;
  if (score >= level.oneStarScore) return 1;
  return 0;
}
