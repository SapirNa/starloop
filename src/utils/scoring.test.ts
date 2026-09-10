import { buildLevel } from '../data/levelBuilder';
import type { Star } from '../types/star';
import {
  calculateCaptureScore,
  calculateRating,
  getComboFeedbackText,
  getComboMultiplier,
} from './scoring';

function makeStar(overrides: Partial<Star> = {}): Star {
  return {
    id: 's1',
    x: 0,
    y: 0,
    size: 16,
    type: 'NORMAL',
    value: 10,
    active: true,
    vx: 0,
    vy: 0,
    ...overrides,
  };
}

describe('getComboMultiplier', () => {
  it.each([
    [1, 1],
    [2, 1.5],
    [3, 2],
    [4, 2.5],
    [5, 3],
    [8, 3],
  ])('captureCount=%i -> x%s', (count, expected) => {
    expect(getComboMultiplier(count)).toBe(expected);
  });
});

describe('getComboFeedbackText', () => {
  it('returns null for a lone capture', () => {
    expect(getComboFeedbackText(1)).toBeNull();
    expect(getComboFeedbackText(0)).toBeNull();
  });

  it.each([
    [2, 'NICE LOOP!'],
    [3, 'STAR COMBO!'],
    [4, 'PERFECT!'],
    [5, 'SUPER LOOP!'],
    [6, 'COSMIC LOOP!'],
    [9, 'COSMIC LOOP!'],
  ])('captureCount=%i -> %s', (count, expected) => {
    expect(getComboFeedbackText(count)).toBe(expected);
  });
});

describe('calculateCaptureScore', () => {
  it('applies no multiplier to a single capture', () => {
    const score = calculateCaptureScore([makeStar({ value: 10 })]);
    expect(score).toBe(10);
  });

  it('applies the combo multiplier to multi-star captures', () => {
    const stars = [makeStar({ value: 10 }), makeStar({ id: 's2', value: 10 })];
    // base 20 * x1.5 = 30
    expect(calculateCaptureScore(stars)).toBe(30);
  });

  it('returns 0 for an empty capture list', () => {
    expect(calculateCaptureScore([])).toBe(0);
  });
});

describe('calculateRating', () => {
  const level = buildLevel({
    id: 'rating-test-level',
    worldId: 'world-1',
    name: 'Rating Test',
    requirements: [{ type: 'CAPTURE' }],
    starCount: 1,
    starTypes: ['NORMAL'],
    rewardCoins: 0,
  });
  // buildLevel derives thresholds from starCount/starTypes; override with
  // fixed, easy-to-reason-about numbers for this test instead.
  const fixedLevel = { ...level, oneStarScore: 10, twoStarScore: 20, threeStarScore: 30 };

  it('returns 0 below the one-star threshold', () => {
    expect(calculateRating(fixedLevel, 0)).toBe(0);
    expect(calculateRating(fixedLevel, 9)).toBe(0);
  });

  it('returns 1 at and above the one-star threshold, below two-star', () => {
    expect(calculateRating(fixedLevel, 10)).toBe(1);
    expect(calculateRating(fixedLevel, 19)).toBe(1);
  });

  it('returns 2 at and above the two-star threshold, below three-star', () => {
    expect(calculateRating(fixedLevel, 20)).toBe(2);
    expect(calculateRating(fixedLevel, 29)).toBe(2);
  });

  it('returns 3 at and above the three-star threshold, even when score overshoots it', () => {
    expect(calculateRating(fixedLevel, 30)).toBe(3);
    expect(calculateRating(fixedLevel, 999)).toBe(3);
  });
});
