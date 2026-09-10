import { DEFAULT_SPEED_STAR_SPEED } from '../config/starTypes';
import type { Level } from '../types/level';
import type { Star } from '../types/star';
import { hashStringToSeed, seededRandom } from '../utils/random';
import { getStarValue } from '../utils/scoring';

// How far an individual star's speed can drift from the level's base speed
// (level.movementSpeed) in either direction - keeps the level's overall
// pace/difficulty intact (still centered on the configured speed) while no
// two stars move at exactly the same rate. Exported so tests can assert
// against it directly instead of duplicating the constant.
export const SPEED_VARIATION_RATIO = 0.35;

// A unique, reproducible direction + speed for one star, derived from its
// own id (not array index) - deterministic, so a level's motion is the same
// every time it's played, but no longer a fixed 4-way pattern shared by
// every star in it (every star gets its own velocityX/velocityY).
function motionFor(starId: string, baseSpeed: number): { dx: number; dy: number; speed: number } {
  const random = seededRandom(hashStringToSeed(starId));
  const angle = random() * Math.PI * 2;
  const variation = 1 + (random() * 2 - 1) * SPEED_VARIATION_RATIO;
  return { dx: Math.cos(angle), dy: Math.sin(angle), speed: baseSpeed * variation };
}

export function createStarsForLevel(level: Level, width: number, height: number): Star[] {
  return level.stars.map((layout) => {
    // SPEED stars always move, even in a level with movementSpeed 0; every
    // other type only moves when the level itself sets a movementSpeed -
    // and from Level 1 onward, every level does (see data/levels.ts).
    const baseSpeed =
      layout.type === 'SPEED'
        ? Math.max(level.movementSpeed, DEFAULT_SPEED_STAR_SPEED)
        : level.movementSpeed;
    const { dx, dy, speed } =
      baseSpeed > 0 ? motionFor(layout.id, baseSpeed) : { dx: 0, dy: 0, speed: 0 };

    return {
      id: layout.id,
      x: layout.xRatio * width,
      y: layout.yRatio * height,
      size: layout.size,
      type: layout.type,
      value: getStarValue(layout.type),
      active: true,
      vx: dx * speed,
      vy: dy * speed,
    };
  });
}
