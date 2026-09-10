import { LEVELS } from './levels';

// Levels 1-50 are hand-authored data (see levels.ts) - these checks catch
// authoring mistakes (a GOLD_HUNT/CAPTURE count the level's own star layout
// can't actually satisfy, a bomb-avoidance level with no bombs, etc.)
// programmatically rather than relying on manually counting a cyclic
// star-type pattern by hand for 50 levels.
describe('LEVELS (1-50) data integrity', () => {
  it('has exactly 50 levels, sequentially and uniquely IDed', () => {
    expect(LEVELS).toHaveLength(50);
    const ids = LEVELS.map((level) => level.id);
    expect(ids).toEqual(Array.from({ length: 50 }, (_, i) => `level-${i + 1}`));
    expect(new Set(ids).size).toBe(50);
  });

  it('every level moves - never a fully stationary default', () => {
    for (const level of LEVELS) {
      expect(level.movementSpeed).toBeGreaterThan(0);
    }
  });

  it('every level has at least one requirement', () => {
    for (const level of LEVELS) {
      expect(level.requirements.length).toBeGreaterThan(0);
    }
  });

  it('every GOLD_HUNT requirement is satisfiable by the level\'s own star layout', () => {
    for (const level of LEVELS) {
      const goldCount = level.stars.filter((star) => star.type === 'GOLD').length;
      for (const requirement of level.requirements) {
        if (requirement.type === 'GOLD_HUNT') {
          expect(goldCount).toBeGreaterThanOrEqual(requirement.count);
        }
      }
    }
  });

  it('every CAPTURE requirement count does not exceed the collectible (non-bomb) star count', () => {
    for (const level of LEVELS) {
      const collectibleCount = level.stars.filter((star) => star.type !== 'BOMB').length;
      for (const requirement of level.requirements) {
        if (requirement.type === 'CAPTURE') {
          expect(requirement.count).toBeLessThanOrEqual(collectibleCount);
          expect(requirement.count).toBeGreaterThan(0);
        }
      }
    }
  });

  it('every BIG_LOOP requirement is achievable in a single loop (does not exceed the collectible count)', () => {
    for (const level of LEVELS) {
      const collectibleCount = level.stars.filter((star) => star.type !== 'BOMB').length;
      for (const requirement of level.requirements) {
        if (requirement.type === 'BIG_LOOP') {
          expect(requirement.minStars).toBeLessThanOrEqual(collectibleCount);
        }
      }
    }
  });

  it('a level with bombPenalty set actually has at least one BOMB star', () => {
    for (const level of LEVELS) {
      if (level.bombPenalty !== null) {
        const bombCount = level.stars.filter((star) => star.type === 'BOMB').length;
        expect(bombCount).toBeGreaterThan(0);
      }
    }
  });

  it('a level with bombs set always has a bombPenalty (never an undefined-behavior bomb)', () => {
    for (const level of LEVELS) {
      const bombCount = level.stars.filter((star) => star.type === 'BOMB').length;
      if (bombCount > 0) {
        expect(level.bombPenalty).not.toBeNull();
      }
    }
  });

  it('every SCORE target is achievable from the level\'s own maximum possible score', () => {
    for (const level of LEVELS) {
      for (const requirement of level.requirements) {
        if (requirement.type === 'SCORE') {
          expect(requirement.target).toBeLessThanOrEqual(level.threeStarScore);
        }
      }
    }
  });

  it('rewardCoins is positive for every level', () => {
    for (const level of LEVELS) {
      expect(level.rewardCoins).toBeGreaterThan(0);
    }
  });

  it('Level 50 is meaningfully harder than Level 1 by every core lever', () => {
    const first = LEVELS[0];
    const last = LEVELS[49];
    expect(last.movementSpeed).toBeGreaterThan(first.movementSpeed);
    expect(last.starCount).toBeGreaterThan(first.starCount);
    expect(last.requirements.length).toBeGreaterThan(first.requirements.length);
    expect(last.bombPenalty).not.toBeNull();
    expect(first.bombPenalty).toBeNull();
  });
});
