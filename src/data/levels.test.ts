import { LEVELS } from './levels';

// Levels 1-70 are hand-authored data (see levels.ts) - these checks catch
// authoring mistakes (a GOLD_HUNT/CAPTURE count the level's own star layout
// can't actually satisfy, a bomb-avoidance level with no bombs, etc.)
// programmatically rather than relying on manually counting a cyclic
// star-type pattern by hand for 70 levels across two worlds (Star Garden:
// 1-50, Moonlight Sky: 51-70).
describe('LEVELS (1-70) data integrity', () => {
  it('has exactly 70 levels, sequentially and uniquely IDed', () => {
    expect(LEVELS).toHaveLength(70);
    const ids = LEVELS.map((level) => level.id);
    expect(ids).toEqual(Array.from({ length: 70 }, (_, i) => `level-${i + 1}`));
    expect(new Set(ids).size).toBe(70);
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

  it('every COMBO requirement is achievable (comboCount loops of minComboSize each fit within the collectible count)', () => {
    for (const level of LEVELS) {
      const collectibleCount = level.stars.filter((star) => star.type !== 'BOMB').length;
      for (const requirement of level.requirements) {
        if (requirement.type === 'COMBO') {
          expect(requirement.comboCount * requirement.minComboSize).toBeLessThanOrEqual(
            collectibleCount
          );
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

describe('MOONLIGHT SKY (levels 51-70)', () => {
  const moonlightLevels = LEVELS.filter((level) => level.worldId === 'world-2');

  it('has exactly 20 levels, all belonging to world-2', () => {
    expect(moonlightLevels).toHaveLength(20);
  });

  it('starts meaningfully harder than Star Garden ends - Level 51 vs Level 1', () => {
    const starGardenFirst = LEVELS[0];
    const moonlightFirst = moonlightLevels[0];
    expect(moonlightFirst.movementSpeed).toBeGreaterThan(starGardenFirst.movementSpeed);
    expect(moonlightFirst.starCount).toBeGreaterThan(starGardenFirst.starCount);
  });

  it('the world finale (Level 70) is meaningfully harder than the world opener (Level 51)', () => {
    const first = moonlightLevels[0];
    const last = moonlightLevels[moonlightLevels.length - 1];
    expect(last.movementSpeed).toBeGreaterThan(first.movementSpeed);
    expect(last.starCount).toBeGreaterThan(first.starCount);
    expect(last.requirements.length).toBeGreaterThan(first.requirements.length);
    expect(last.bombPenalty).not.toBeNull();
    expect(first.bombPenalty).toBeNull();
  });

  it('does not simply increase movement speed every single level (occasional lighter beats)', () => {
    const speeds = moonlightLevels.map((level) => level.movementSpeed);
    const monotonicIncreases = speeds.slice(1).filter((speed, i) => speed > speeds[i]).length;
    expect(monotonicIncreases).toBeLessThan(speeds.length - 1);
  });
});
