import { buildLevel } from '../data/levelBuilder';
import type { Level } from '../types/level';
import type { Star } from '../types/star';
import type { Point } from '../utils/geometry';
import { resolveLoopCapture } from './starEffects';

const SQUARE: Point[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];
const OUTSIDE: Point = { x: 500, y: 500 };
const INSIDE: Point = { x: 50, y: 50 };

function makeStar(overrides: Partial<Star> = {}): Star {
  return {
    id: 's1',
    x: INSIDE.x,
    y: INSIDE.y,
    size: 16,
    type: 'NORMAL',
    value: 10,
    active: true,
    vx: 0,
    vy: 0,
    ...overrides,
  };
}

function makeLevel(overrides: Partial<Parameters<typeof buildLevel>[0]> = {}): Level {
  return buildLevel({
    id: 'test-level',
    worldId: 'world-1',
    name: 'Test Level',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 1,
    starTypes: ['NORMAL'],
    rewardCoins: 10,
    ...overrides,
  });
}

describe('resolveLoopCapture', () => {
  it('captures collectibles normally when no bomb is in the loop', () => {
    const stars = [makeStar({ id: 'a' }), makeStar({ id: 'b', type: 'GOLD', value: 25 })];
    const result = resolveLoopCapture(stars, SQUARE, makeLevel());

    expect(result.capturedStars.map((s) => s.id).sort()).toEqual(['a', 'b']);
    expect(result.triggeredBombs).toHaveLength(0);
    expect(result.scorePenalty).toBe(0);
    expect(result.shouldFailLevel).toBe(false);
  });

  it('ignores stars outside the loop', () => {
    const stars = [makeStar({ id: 'a' }), makeStar({ id: 'b', ...OUTSIDE })];
    const result = resolveLoopCapture(stars, SQUARE, makeLevel());
    expect(result.capturedStars.map((s) => s.id)).toEqual(['a']);
  });

  it('a loop containing only a bomb captures nothing and applies the penalty', () => {
    const stars = [makeStar({ id: 'bomb', type: 'BOMB', value: 0 })];
    const level = makeLevel({ bombPenalty: 'FAIL_LEVEL' });

    const result = resolveLoopCapture(stars, SQUARE, level);
    expect(result.capturedStars).toHaveLength(0);
    expect(result.triggeredBombs.map((s) => s.id)).toEqual(['bomb']);
    expect(result.shouldFailLevel).toBe(true);
  });

  it('collectibles + a bomb in the same loop capture nothing (the bomb poisons the loop)', () => {
    const stars = [
      makeStar({ id: 'a' }),
      makeStar({ id: 'b', type: 'GOLD', value: 25 }),
      makeStar({ id: 'bomb', type: 'BOMB', value: 0 }),
    ];
    const level = makeLevel({ bombPenalty: 'SCORE_PENALTY' });

    const result = resolveLoopCapture(stars, SQUARE, level);
    expect(result.capturedStars).toHaveLength(0);
    expect(result.triggeredBombs.map((s) => s.id)).toEqual(['bomb']);
    expect(result.scorePenalty).toBeGreaterThan(0);
    expect(result.shouldFailLevel).toBe(false);
  });

  it('multiple overlapping bombs still apply the penalty exactly once', () => {
    const stars = [
      makeStar({ id: 'bomb1', type: 'BOMB', value: 0 }),
      makeStar({ id: 'bomb2', type: 'BOMB', value: 0, x: INSIDE.x + 1, y: INSIDE.y + 1 }),
      makeStar({ id: 'c', type: 'GOLD', value: 25 }),
    ];
    const level = makeLevel({ bombPenalty: 'SCORE_PENALTY' });

    const result = resolveLoopCapture(stars, SQUARE, level);
    expect(result.triggeredBombs).toHaveLength(2);
    expect(result.scorePenalty).toBe(30);
  });

  it('defaults to FAIL_LEVEL when a level with bombs has no explicit bombPenalty', () => {
    const stars = [makeStar({ id: 'bomb', type: 'BOMB', value: 0 })];
    const result = resolveLoopCapture(stars, SQUARE, makeLevel());
    expect(result.shouldFailLevel).toBe(true);
  });

  it('grants bonus time for captured TIME stars', () => {
    const stars = [makeStar({ id: 'time-star', type: 'TIME' })];
    const result = resolveLoopCapture(stars, SQUARE, makeLevel());
    expect(result.bonusTimeSeconds).toBeGreaterThan(0);
  });

  it('does not capture inactive (already-captured) stars', () => {
    const stars = [makeStar({ id: 'a', active: false })];
    const result = resolveLoopCapture(stars, SQUARE, makeLevel());
    expect(result.capturedStars).toHaveLength(0);
  });

  it('captures every overlapping collectible star at the same position', () => {
    const stars = [
      makeStar({ id: 'a' }),
      makeStar({ id: 'b', type: 'GOLD', value: 25 }),
      makeStar({ id: 'c' }),
    ];
    const result = resolveLoopCapture(stars, SQUARE, makeLevel());
    expect(result.capturedStars.map((s) => s.id).sort()).toEqual(['a', 'b', 'c']);
  });
});
