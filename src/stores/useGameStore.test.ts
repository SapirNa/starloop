import { LEVELS } from '../data/levels';
import { createStarsForLevel } from '../gameplay/levelSetup';
import type { Point } from '../utils/geometry';
import { useGameStore } from './useGameStore';

// A closed, roughly circular loop enclosing just (cx, cy) - big enough to
// clear GAMEPLAY_CONFIG's minimumPolygonArea/minimumPathLength/
// minimumPointCount thresholds (see config/gameplay.ts) so validateLoop
// actually accepts it, the same way a real drawn gesture would.
function circleLoop(cx: number, cy: number, radius = 80, points = 16): Point[] {
  const loop: Point[] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    loop.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  return loop;
}

// A closed rectangular loop around the bounding box of the given points
// (with padding) - enough corner/midpoints to clear
// GAMEPLAY_CONFIG.minimumPointCount, closes exactly (distance 0), and its
// shoelace area equals the padded rectangle regardless of the extra
// midpoints, so it reliably clears minimumPolygonArea too.
function rectLoop(points: Point[], pad = 40): Point[] {
  const minX = Math.min(...points.map((p) => p.x)) - pad;
  const maxX = Math.max(...points.map((p) => p.x)) + pad;
  const minY = Math.min(...points.map((p) => p.y)) - pad;
  const maxY = Math.max(...points.map((p) => p.y)) + pad;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return [
    { x: minX, y: minY },
    { x: midX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: midY },
    { x: maxX, y: maxY },
    { x: midX, y: maxY },
    { x: minX, y: maxY },
    { x: minX, y: midY },
    { x: minX, y: minY },
  ];
}

// Regression coverage for the stale-session race that let a delayed
// GameScreen unmount (native-stack "replace" can defer that past the next
// screen's mount) call reset() *after* a newer level had already started -
// wiping its fresh 'playing' session back to 'idle', or (the reverse) let a
// newer screen's completion-redirect effect react to a previous level's
// leftover 'completed' status/score before its own startLevel ran. See
// screens/GameScreen.tsx for how sessionId is used alongside this.
describe('sessionId / reset guarding', () => {
  const level = LEVELS[0];

  it('bumps sessionId on every startLevel call', () => {
    useGameStore.getState().startLevel(level, 400, 800);
    const first = useGameStore.getState().sessionId;

    useGameStore.getState().startLevel(level, 400, 800);
    const second = useGameStore.getState().sessionId;

    expect(second).toBe(first + 1);
  });

  it('ignores reset() called with a session that is no longer current', () => {
    useGameStore.getState().startLevel(level, 400, 800);
    const staleSessionId = useGameStore.getState().sessionId;

    // A second screen starts a newer session before the first one's
    // (delayed) cleanup runs.
    useGameStore.getState().startLevel(level, 400, 800);
    expect(useGameStore.getState().status).toBe('playing');

    useGameStore.getState().reset(staleSessionId);

    expect(useGameStore.getState().status).toBe('playing');
    expect(useGameStore.getState().level).not.toBeNull();
  });

  it('applies reset() when the passed session is still current', () => {
    useGameStore.getState().startLevel(level, 400, 800);
    const currentSessionId = useGameStore.getState().sessionId;

    useGameStore.getState().reset(currentSessionId);

    expect(useGameStore.getState().status).toBe('idle');
    expect(useGameStore.getState().level).toBeNull();
  });

  it('applies reset() unconditionally when no session is passed', () => {
    useGameStore.getState().startLevel(level, 400, 800);

    useGameStore.getState().reset();

    expect(useGameStore.getState().status).toBe('idle');
    expect(useGameStore.getState().level).toBeNull();
  });
});

// level-38 "Careful Count": CAPTURE count 8 out of 10 stars (2 are BOMB),
// maxLoops 5 - was maxLoops 4 (a flawless 2-per-loop run, zero margin for
// even one below-par loop) until rebalanced to match every sibling
// maxLoops level's ~1.6 captures-per-loop headroom. Covers both that the
// completion code path is sound on the very last loop, and that the
// rebalance actually restored real margin for error.
describe('finishing exactly on the last available loop (level-38 "Careful Count")', () => {
  const level = LEVELS.find((l) => l.id === 'level-38')!;
  const width = 400;
  const height = 800;

  it('completing the CAPTURE requirement on the final loop registers as completed, not failed', () => {
    const stars = createStarsForLevel(level, width, height);
    const normalStars = stars.filter((star) => star.type === 'NORMAL');
    expect(normalStars).toHaveLength(8);
    const starPositions = stars.map((star) => ({ id: star.id, x: star.x, y: star.y }));

    useGameStore.getState().startLevel(level, width, height);
    // Two stars per loop, four loops - clears the 8-capture target with a
    // loop to spare, same as a flawless real playthrough.
    for (let i = 0; i < 4; i++) {
      const pair = [normalStars[i * 2], normalStars[i * 2 + 1]];
      useGameStore.getState().submitLoop(rectLoop(pair), starPositions);
    }

    expect(useGameStore.getState().status).toBe('completed');
    expect(useGameStore.getState().loopsUsed).toBe(4);
  });

  it('recovers from a single below-par loop, unlike the old maxLoops: 4 balance', () => {
    const stars = createStarsForLevel(level, width, height);
    const starPositions = stars.map((star) => ({ id: star.id, x: star.x, y: star.y }));
    // NORMAL/NORMAL/NORMAL/BOMB cycling over 10 stars puts NORMAL at every
    // index except 3 and 7 - three tight same-row pairs (0,1)(4,5)(8,9)
    // plus one lone leftover (2), each loop kept spatially isolated so its
    // rectLoop can't accidentally sweep up a neighboring pair too.
    useGameStore.getState().startLevel(level, width, height);
    useGameStore.getState().submitLoop(rectLoop([stars[0], stars[1]]), starPositions);
    useGameStore.getState().submitLoop(rectLoop([stars[4], stars[5]]), starPositions);
    useGameStore.getState().submitLoop(rectLoop([stars[8], stars[9]]), starPositions);
    // Loop 4 only captures the lone leftover (1 star instead of a pair) -
    // exactly the single real-play mistake the old maxLoops: 4 balance had
    // no room to recover from.
    useGameStore.getState().submitLoop(rectLoop([stars[2]]), starPositions);
    expect(useGameStore.getState().status).toBe('playing');
    expect(useGameStore.getState().loopsUsed).toBe(4);

    // The 5th loop is exactly the margin the rebalance restored - it can
    // still capture the one remaining star (index 6) and finish the level.
    useGameStore.getState().submitLoop(rectLoop([stars[6]]), starPositions);

    expect(useGameStore.getState().status).toBe('completed');
  });
});

// Confirms the actual player-facing behavior end to end (real level data,
// real star layout, a geometrically valid drawn loop) for every level
// configured with bombPenalty: 'FAIL_LEVEL' - catching a bomb there must
// fail the level immediately, not just deduct score or waste the loop
// (that's LOSE_LOOP/SCORE_PENALTY, a deliberate difficulty lever on other
// levels - see gameplay/starEffects.ts).
describe('bombPenalty FAIL_LEVEL', () => {
  const failLevelLevels = LEVELS.filter((level) => level.bombPenalty === 'FAIL_LEVEL');

  it('has at least one level configured this way to test against', () => {
    expect(failLevelLevels.length).toBeGreaterThan(0);
  });

  it.each(failLevelLevels.map((level) => [level.id, level] as const))(
    'looping a bomb on %s fails the level immediately',
    (_id, level) => {
      const width = 400;
      const height = 800;
      const stars = createStarsForLevel(level, width, height);
      const bomb = stars.find((star) => star.type === 'BOMB');
      expect(bomb).toBeDefined();
      if (!bomb) return;

      useGameStore.getState().startLevel(level, width, height);
      useGameStore
        .getState()
        .submitLoop(circleLoop(bomb.x, bomb.y), stars.map((star) => ({ id: star.id, x: star.x, y: star.y })));

      expect(useGameStore.getState().status).toBe('failed');
      expect(useGameStore.getState().failureReason).toBe('Hit a bomb!');
    }
  );
});
