import { buildLevel } from '../data/levelBuilder';
import { createStarsForLevel, SPEED_VARIATION_RATIO } from './levelSetup';

function speedRange(baseSpeed: number): { min: number; max: number } {
  return {
    min: baseSpeed * (1 - SPEED_VARIATION_RATIO),
    max: baseSpeed * (1 + SPEED_VARIATION_RATIO),
  };
}

describe('createStarsForLevel', () => {
  it('gives stationary stars zero velocity when the level has no movement', () => {
    const level = buildLevel({
      id: 'l',
      worldId: 'world-1',
      name: 'L',
      requirements: [{ type: 'CAPTURE' }],
      starCount: 3,
      starTypes: ['NORMAL', 'GOLD'],
      rewardCoins: 0,
    });

    const stars = createStarsForLevel(level, 400, 800);
    for (const star of stars) {
      expect(star.vx).toBe(0);
      expect(star.vy).toBe(0);
    }
  });

  it('gives every star velocity within the per-star variation range of the level speed', () => {
    const level = buildLevel({
      id: 'l',
      worldId: 'world-1',
      name: 'L',
      requirements: [{ type: 'CAPTURE' }],
      starCount: 3,
      starTypes: ['NORMAL'],
      movementSpeed: 30,
      rewardCoins: 0,
    });

    const { min, max } = speedRange(30);
    const stars = createStarsForLevel(level, 400, 800);
    for (const star of stars) {
      const speed = Math.hypot(star.vx, star.vy);
      expect(speed).toBeGreaterThanOrEqual(min);
      expect(speed).toBeLessThanOrEqual(max);
    }
  });

  it('does not move every star together - directions and speeds vary per star', () => {
    const level = buildLevel({
      id: 'l',
      worldId: 'world-1',
      name: 'L',
      requirements: [{ type: 'CAPTURE' }],
      starCount: 6,
      starTypes: ['NORMAL'],
      movementSpeed: 20,
      rewardCoins: 0,
    });

    const stars = createStarsForLevel(level, 400, 800);
    const velocityPairs = stars.map((star) => `${star.vx.toFixed(3)},${star.vy.toFixed(3)}`);
    expect(new Set(velocityPairs).size).toBeGreaterThan(1);
  });

  it('is deterministic - the same level always produces the same per-star motion', () => {
    const level = buildLevel({
      id: 'l',
      worldId: 'world-1',
      name: 'L',
      requirements: [{ type: 'CAPTURE' }],
      starCount: 5,
      starTypes: ['NORMAL', 'GOLD'],
      movementSpeed: 25,
      rewardCoins: 0,
    });

    const first = createStarsForLevel(level, 400, 800);
    const second = createStarsForLevel(level, 400, 800);
    expect(second.map((s) => [s.vx, s.vy])).toEqual(first.map((s) => [s.vx, s.vy]));
  });

  it('moves SPEED stars even when the level itself has movementSpeed 0', () => {
    const level = buildLevel({
      id: 'l',
      worldId: 'world-1',
      name: 'L',
      requirements: [{ type: 'CAPTURE' }],
      starCount: 2,
      starTypes: ['NORMAL', 'SPEED'],
      rewardCoins: 0,
    });

    const stars = createStarsForLevel(level, 400, 800);
    const normalStar = stars.find((s) => s.type === 'NORMAL')!;
    const speedStar = stars.find((s) => s.type === 'SPEED')!;

    expect(Math.hypot(normalStar.vx, normalStar.vy)).toBe(0);
    expect(Math.hypot(speedStar.vx, speedStar.vy)).toBeGreaterThan(0);
  });

  it('lets a level movementSpeed faster than the SPEED default win out', () => {
    const level = buildLevel({
      id: 'l',
      worldId: 'world-1',
      name: 'L',
      requirements: [{ type: 'CAPTURE' }],
      starCount: 1,
      starTypes: ['SPEED'],
      movementSpeed: 999,
      rewardCoins: 0,
    });

    const { min, max } = speedRange(999);
    const [star] = createStarsForLevel(level, 400, 800);
    const speed = Math.hypot(star.vx, star.vy);
    expect(speed).toBeGreaterThanOrEqual(min);
    expect(speed).toBeLessThanOrEqual(max);
  });

  it('places stars proportionally regardless of canvas size (different screen dimensions)', () => {
    const level = buildLevel({
      id: 'l',
      worldId: 'world-1',
      name: 'L',
      requirements: [{ type: 'CAPTURE' }],
      starCount: 4,
      starTypes: ['NORMAL'],
      rewardCoins: 0,
    });

    const small = createStarsForLevel(level, 320, 568); // small phone
    const large = createStarsForLevel(level, 430, 932); // large phone

    for (let i = 0; i < level.stars.length; i++) {
      const ratio = level.stars[i];
      expect(small[i].x).toBeCloseTo(ratio.xRatio * 320, 5);
      expect(small[i].y).toBeCloseTo(ratio.yRatio * 568, 5);
      expect(large[i].x).toBeCloseTo(ratio.xRatio * 430, 5);
      expect(large[i].y).toBeCloseTo(ratio.yRatio * 932, 5);
      // Every star stays within the canvas bounds on both sizes.
      expect(small[i].x).toBeGreaterThanOrEqual(0);
      expect(small[i].x).toBeLessThanOrEqual(320);
      expect(large[i].x).toBeGreaterThanOrEqual(0);
      expect(large[i].x).toBeLessThanOrEqual(430);
    }
  });
});
