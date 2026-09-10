import { BOMB_SCORE_PENALTY, TIME_STAR_BONUS_SECONDS } from '../config/starTypes';
import type { Level } from '../types/level';
import type { Star } from '../types/star';
import { isPointInsidePolygon, type Point } from '../utils/geometry';

export interface LoopCaptureResult {
  // Collectibles actually captured. Empty whenever the loop contains a bomb
  // - a bomb "poisons" the whole loop, it doesn't just cancel itself out.
  capturedStars: Star[];
  triggeredBombs: Star[];
  scorePenalty: number;
  shouldFailLevel: boolean;
  bonusTimeSeconds: number;
}

const NO_BOMB_HIT: Pick<LoopCaptureResult, 'triggeredBombs' | 'scorePenalty' | 'shouldFailLevel'> = {
  triggeredBombs: [],
  scorePenalty: 0,
  shouldFailLevel: false,
};

// Star-type-specific effects of drawing a loop, kept as one pure function so
// bomb/time behavior lives in a single, testable place instead of being
// re-implemented (or partially implemented) in the store or the UI.
export function resolveLoopCapture(stars: Star[], polygon: Point[], level: Level): LoopCaptureResult {
  const starsInLoop = stars.filter(
    (star) => star.active && isPointInsidePolygon({ x: star.x, y: star.y }, polygon)
  );
  const bombs = starsInLoop.filter((star) => star.type === 'BOMB');

  if (bombs.length > 0) {
    // Any number of bombs (alone, mixed with collectibles, or several
    // overlapping bombs) triggers the penalty exactly once - the loop as a
    // whole is invalid, it isn't "penalty per bomb".
    const penalty = level.bombPenalty ?? 'FAIL_LEVEL';
    return {
      capturedStars: [],
      triggeredBombs: bombs,
      scorePenalty: penalty === 'SCORE_PENALTY' ? BOMB_SCORE_PENALTY : 0,
      shouldFailLevel: penalty === 'FAIL_LEVEL',
      bonusTimeSeconds: 0,
    };
  }

  const capturedStars = starsInLoop;
  const bonusTimeSeconds =
    capturedStars.filter((star) => star.type === 'TIME').length * TIME_STAR_BONUS_SECONDS;

  return { capturedStars, bonusTimeSeconds, ...NO_BOMB_HIT };
}
