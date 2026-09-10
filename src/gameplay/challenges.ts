import { CHALLENGE_POOL, DAILY_CHALLENGE_COUNT, type ChallengeDefinition } from '../data/challenges';
import type { PlayerStatsSnapshot } from '../services/storage';

export interface ChallengeProgress {
  definition: ChallengeDefinition;
  progress: number;
  isComplete: boolean;
  isClaimed: boolean;
}

function getMetricDelta(
  current: PlayerStatsSnapshot,
  baseline: PlayerStatsSnapshot,
  metric: keyof PlayerStatsSnapshot
): number {
  // Clamped at 0: a stat can only go up, but guards against a corrupted or
  // stale baseline (e.g. from a schema change) producing a negative delta.
  return Math.max(0, current[metric] - baseline[metric]);
}

// Filters out challenges that reference a feature the player hasn't reached
// yet (see ChallengeDefinition.minLevelsCompleted), so a freshly-generated
// set never hands out something impossible to make progress on right now.
export function getAvailableChallenges(
  pool: ChallengeDefinition[],
  levelsCompleted: number
): ChallengeDefinition[] {
  return pool.filter(
    (definition) => definition.minLevelsCompleted === undefined || levelsCompleted >= definition.minLevelsCompleted
  );
}

// Deterministic rotation - which challenges make up a set, based on the
// calendar date and a "generation" counter (0 for the day's first set, 1+
// for each mid-day regeneration after all 3 are claimed - see
// useChallengesStore). Reopening the screen without claiming anything always
// yields the same set for a given (date, generation); no randomness, no
// per-session state. Advancing the generation offsets the rotation by a
// full DAILY_CHALLENGE_COUNT, so with a pool that's an exact multiple of
// DAILY_CHALLENGE_COUNT, generation 1 is guaranteed fully disjoint from
// generation 0 (generation 2 wraps back to 0's set, etc).
export function selectDailyChallenges(
  date: string,
  generation = 0,
  pool: ChallengeDefinition[] = CHALLENGE_POOL
): ChallengeDefinition[] {
  if (pool.length <= DAILY_CHALLENGE_COUNT) return pool;

  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }

  const startIndex = (hash + generation * DAILY_CHALLENGE_COUNT) % pool.length;
  const selected: ChallengeDefinition[] = [];
  for (let i = 0; i < DAILY_CHALLENGE_COUNT; i++) {
    selected.push(pool[(startIndex + i) % pool.length]);
  }
  return selected;
}

// Progress is always derived from (current stats - baseline snapshot), never
// stored redundantly, so it can't drift out of sync with the underlying
// stats.
export function getChallengeProgress(
  definitions: ChallengeDefinition[],
  current: PlayerStatsSnapshot,
  baseline: PlayerStatsSnapshot,
  claimedIds: string[]
): ChallengeProgress[] {
  return definitions.map((definition) => {
    const delta = getMetricDelta(current, baseline, definition.metric);
    const progress = Math.min(delta, definition.target);
    return {
      definition,
      progress,
      isComplete: progress >= definition.target,
      isClaimed: claimedIds.includes(definition.id),
    };
  });
}
