import type { StarType } from '../types/star';

// Render/hitbox radius per type. TINY is deliberately small (harder to
// enclose); GOLD/TIME are slightly larger to read as "special".
export const STAR_SIZE_BY_TYPE: Record<StarType, number> = {
  NORMAL: 16,
  GOLD: 18,
  RAINBOW: 18,
  SPEED: 16,
  TINY: 10,
  BOMB: 17,
  TIME: 16,
  MAGNET: 18,
};

// SPEED stars always move at least this fast (px/sec), even in a level with
// movementSpeed 0, so the type has a distinct identity wherever it appears.
export const DEFAULT_SPEED_STAR_SPEED = 55;

// Capturing a TIME star, or using the EXTRA_TIME power-up, subtracts this
// many seconds from the elapsed-time clock (see useGameStore.addBonusTime).
export const TIME_STAR_BONUS_SECONDS = 5;
export const EXTRA_TIME_BONUS_SECONDS = 8;

// How long FREEZE_TIME stops the clock from advancing, in seconds.
export const FREEZE_TIME_DURATION_SECONDS = 5;

// Flat score penalty applied when a loop containing a bomb uses the
// SCORE_PENALTY rule (see types/level.ts BombPenaltyType).
export const BOMB_SCORE_PENALTY = 30;
