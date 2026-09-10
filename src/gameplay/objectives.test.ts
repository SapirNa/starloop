import { buildLevel } from '../data/levelBuilder';
import type { LevelDefinition } from '../data/levelBuilder';
import type { Level } from '../types/level';
import type { RequirementDefinition } from '../types/objective';
import type { Star } from '../types/star';
import { describeObjective, evaluateObjective, type ObjectiveContext } from './objectives';

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

function makeContext(overrides: Partial<ObjectiveContext> = {}): ObjectiveContext {
  return {
    stars: [],
    score: 0,
    loopsUsed: 0,
    elapsedSeconds: 0,
    bestCombo: 0,
    goldCaptured: 0,
    loopCaptureCounts: [],
    ...overrides,
  };
}

function makeLevel(
  requirements: RequirementDefinition[],
  overrides: Partial<Omit<LevelDefinition, 'requirements'>> = {}
): Level {
  return buildLevel({
    id: 'test-level',
    worldId: 'world-1',
    name: 'Test Level',
    requirements,
    starCount: 3,
    starTypes: ['NORMAL'],
    rewardCoins: 10,
    ...overrides,
  });
}

describe('evaluateObjective', () => {
  describe('CAPTURE', () => {
    it('with no count, completes once every collectible star is inactive', () => {
      // starCount: 2 so the "capture all" count buildLevel resolves matches
      // the 2-star fixtures below.
      const level = makeLevel([{ type: 'CAPTURE' }], { starCount: 2 });
      const allInactive = [makeStar({ active: false }), makeStar({ id: 's2', active: false })];
      const someActive = [makeStar({ active: false }), makeStar({ id: 's2', active: true })];

      expect(evaluateObjective(level, makeContext({ stars: allInactive })).isComplete).toBe(true);
      expect(evaluateObjective(level, makeContext({ stars: someActive })).isComplete).toBe(false);
    });

    it('with an explicit count, completes once that many are captured (not all of them)', () => {
      const level = makeLevel([{ type: 'CAPTURE', count: 2 }], { starCount: 5 });
      const oneCaptured = [makeStar({ active: false }), makeStar({ id: 's2', active: true })];
      const twoCaptured = [makeStar({ active: false }), makeStar({ id: 's2', active: false })];

      expect(evaluateObjective(level, makeContext({ stars: oneCaptured })).isComplete).toBe(false);
      expect(evaluateObjective(level, makeContext({ stars: twoCaptured })).isComplete).toBe(true);
    });

    it('excludes bombs - a bomb never needs to be "captured"', () => {
      // 1 collectible + 1 bomb, so the resolved "capture all" count is 1,
      // matching the single non-bomb star below.
      const level = makeLevel([{ type: 'CAPTURE' }], { starCount: 2, starTypes: ['NORMAL', 'BOMB'] });
      const stars = [
        makeStar({ id: 'a', active: false }),
        makeStar({ id: 'bomb', type: 'BOMB', active: true }),
      ];
      expect(evaluateObjective(level, makeContext({ stars })).isComplete).toBe(true);
    });
  });

  describe('SCORE', () => {
    it('completes once score reaches the target', () => {
      const level = makeLevel([{ type: 'SCORE', target: 50 }]);
      expect(evaluateObjective(level, makeContext({ score: 49 })).isComplete).toBe(false);
      expect(evaluateObjective(level, makeContext({ score: 50 })).isComplete).toBe(true);
    });
  });

  describe('COMBO', () => {
    it('completes once enough separate loops each reached the minimum combo size', () => {
      const level = makeLevel([{ type: 'COMBO', comboCount: 3, minComboSize: 4 }]);

      // Two qualifying loops (4, 5) and one that doesn't count (2) - not enough yet.
      const notEnough = makeContext({ loopCaptureCounts: [4, 2, 5] });
      expect(evaluateObjective(level, notEnough).isComplete).toBe(false);

      // A third loop of at least 4 completes it.
      const enough = makeContext({ loopCaptureCounts: [4, 2, 5, 4] });
      expect(evaluateObjective(level, enough).isComplete).toBe(true);
    });

    it('does not count loops below the minimum combo size, however many there are', () => {
      const level = makeLevel([{ type: 'COMBO', comboCount: 1, minComboSize: 4 }]);
      const onlySmallLoops = makeContext({ loopCaptureCounts: [1, 2, 3, 3, 1] });
      expect(evaluateObjective(level, onlySmallLoops).isComplete).toBe(false);
    });
  });

  describe('GOLD_HUNT', () => {
    it('completes once enough Gold Stars have been captured', () => {
      const level = makeLevel([{ type: 'GOLD_HUNT', count: 5 }]);
      expect(evaluateObjective(level, makeContext({ goldCaptured: 4 })).isComplete).toBe(false);
      expect(evaluateObjective(level, makeContext({ goldCaptured: 5 })).isComplete).toBe(true);
    });
  });

  describe('BIG_LOOP', () => {
    it('completes once the best single-loop capture reaches the minimum', () => {
      const level = makeLevel([{ type: 'BIG_LOOP', minStars: 3 }]);
      expect(evaluateObjective(level, makeContext({ bestCombo: 2 })).isComplete).toBe(false);
      expect(evaluateObjective(level, makeContext({ bestCombo: 3 })).isComplete).toBe(true);
    });
  });

  describe('MIXED (multiple requirements)', () => {
    it('is only complete once every requirement is satisfied, not just one', () => {
      const level = makeLevel([
        { type: 'CAPTURE', count: 15 },
        { type: 'SCORE', target: 5000 },
        { type: 'BIG_LOOP', minStars: 5 },
      ]);

      const stars = Array.from({ length: 15 }, (_, i) => makeStar({ id: `s${i}`, active: false }));

      // Capture and score satisfied, but the big-loop requirement isn't.
      const twoOfThree = makeContext({ stars, score: 5000, bestCombo: 4 });
      expect(evaluateObjective(level, twoOfThree).isComplete).toBe(false);

      const allThree = makeContext({ stars, score: 5000, bestCombo: 5 });
      expect(evaluateObjective(level, allThree).isComplete).toBe(true);
    });
  });

  describe('universal constraints (timeLimit / maxLoops)', () => {
    it('TIME_ATTACK: fails once time runs out without the requirement met', () => {
      const level = makeLevel([{ type: 'CAPTURE' }], { timeLimit: 30 });
      const stillActive = [makeStar({ active: true })];

      const inTime = evaluateObjective(level, makeContext({ stars: stillActive, elapsedSeconds: 29 }));
      expect(inTime.isFailed).toBe(false);

      const timedOut = evaluateObjective(
        level,
        makeContext({ stars: stillActive, elapsedSeconds: 30 })
      );
      expect(timedOut.isFailed).toBe(true);
      expect(timedOut.failureReason).toBe('Out of time');
    });

    it('TIME_ATTACK: still completes if the requirement is met before time runs out', () => {
      const level = makeLevel([{ type: 'CAPTURE' }], { starCount: 1, timeLimit: 30 });
      const allCaptured = [makeStar({ active: false })];

      const result = evaluateObjective(
        level,
        makeContext({ stars: allCaptured, elapsedSeconds: 30 })
      );
      expect(result.isComplete).toBe(true);
      expect(result.isFailed).toBe(false);
    });

    it('LIMITED_LOOPS: fails once loops run out without the requirement met', () => {
      const level = makeLevel([{ type: 'CAPTURE' }], { maxLoops: 3 });
      const stillActive = [makeStar({ active: true })];

      expect(
        evaluateObjective(level, makeContext({ stars: stillActive, loopsUsed: 2 })).isFailed
      ).toBe(false);

      const result = evaluateObjective(level, makeContext({ stars: stillActive, loopsUsed: 3 }));
      expect(result.isFailed).toBe(true);
      expect(result.failureReason).toBe('Out of loops');
    });

    it('are universal - apply no matter which requirement type the level uses', () => {
      const level = makeLevel([{ type: 'BIG_LOOP', minStars: 5 }], { timeLimit: 10, maxLoops: 2 });

      const timedOut = evaluateObjective(level, makeContext({ elapsedSeconds: 10, bestCombo: 1 }));
      expect(timedOut.isFailed).toBe(true);
      expect(timedOut.failureReason).toBe('Out of time');

      const outOfLoops = evaluateObjective(level, makeContext({ loopsUsed: 2, bestCombo: 1 }));
      expect(outOfLoops.isFailed).toBe(true);
      expect(outOfLoops.failureReason).toBe('Out of loops');

      // Reaching the requirement still wins even at the constraint edge.
      const madeItInTime = evaluateObjective(
        level,
        makeContext({ elapsedSeconds: 10, loopsUsed: 2, bestCombo: 5 })
      );
      expect(madeItInTime.isComplete).toBe(true);
      expect(madeItInTime.isFailed).toBe(false);
    });
  });
});

describe('describeObjective', () => {
  it('renders a human-readable hint per requirement type', () => {
    const level = makeLevel([{ type: 'SCORE', target: 100 }]);
    expect(describeObjective(level, makeContext({ score: 40 }))).toBe('Score: 40 / 100');
  });

  it('joins multiple requirements (MIXED) into one line', () => {
    const level = makeLevel([
      { type: 'CAPTURE', count: 15 },
      { type: 'SCORE', target: 5000 },
    ]);
    expect(describeObjective(level, makeContext({ score: 200 }))).toBe(
      'Captured: 0 / 15 | Score: 200 / 5000'
    );
  });

  it('appends the time/loop constraints when the level sets them', () => {
    const level = makeLevel([{ type: 'CAPTURE', count: 10 }], { timeLimit: 40, maxLoops: 5 });
    expect(describeObjective(level, makeContext({ loopsUsed: 1, elapsedSeconds: 5 }))).toBe(
      'Captured: 0 / 10 | Time: 35s | Loops: 1/5'
    );
  });
});
