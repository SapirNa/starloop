import type { ChallengeDefinition } from '../data/challenges';
import type { PlayerStatsSnapshot } from '../services/storage';
import { EMPTY_PLAYER_STATS } from '../services/storage';
import { getAvailableChallenges, getChallengeProgress, selectDailyChallenges } from './challenges';

function makeStats(overrides: Partial<PlayerStatsSnapshot> = {}): PlayerStatsSnapshot {
  return { ...EMPTY_PLAYER_STATS, ...overrides };
}

const STARS_CHALLENGE: ChallengeDefinition = {
  id: 'stars-30',
  title: 'Star Collector',
  description: 'Capture 30 stars',
  metric: 'starsCaptured',
  target: 30,
  rewardCoins: 10,
};

describe('getChallengeProgress', () => {
  it('computes progress as the delta since the daily baseline, not the lifetime total', () => {
    const baseline = makeStats({ starsCaptured: 100 });
    const current = makeStats({ starsCaptured: 115 });

    const [progress] = getChallengeProgress([STARS_CHALLENGE], current, baseline, []);
    expect(progress.progress).toBe(15);
    expect(progress.isComplete).toBe(false);
  });

  it('marks a challenge complete once the delta reaches its target', () => {
    const baseline = makeStats({ starsCaptured: 100 });
    const current = makeStats({ starsCaptured: 130 });

    const [progress] = getChallengeProgress([STARS_CHALLENGE], current, baseline, []);
    expect(progress.progress).toBe(30);
    expect(progress.isComplete).toBe(true);
  });

  it('clamps progress at the target even if the delta overshoots', () => {
    const baseline = makeStats({ starsCaptured: 0 });
    const current = makeStats({ starsCaptured: 999 });

    const [progress] = getChallengeProgress([STARS_CHALLENGE], current, baseline, []);
    expect(progress.progress).toBe(30);
  });

  it('never goes negative even if the baseline is inconsistent with current stats', () => {
    const baseline = makeStats({ starsCaptured: 50 });
    const current = makeStats({ starsCaptured: 10 });

    const [progress] = getChallengeProgress([STARS_CHALLENGE], current, baseline, []);
    expect(progress.progress).toBe(0);
  });

  it('reflects claimed status from the provided claimed id list', () => {
    const baseline = makeStats();
    const current = makeStats({ starsCaptured: 30 });

    const [progress] = getChallengeProgress([STARS_CHALLENGE], current, baseline, ['stars-30']);
    expect(progress.isClaimed).toBe(true);
  });
});

describe('selectDailyChallenges', () => {
  const pool: ChallengeDefinition[] = Array.from({ length: 6 }, (_, i) => ({
    id: `challenge-${i}`,
    title: `Challenge ${i}`,
    description: '',
    metric: 'starsCaptured',
    target: 1,
    rewardCoins: 1,
  }));

  it('is deterministic for a given (date, generation) - always selects the same set', () => {
    const first = selectDailyChallenges('2024-01-05', 0, pool);
    const second = selectDailyChallenges('2024-01-05', 0, pool);
    expect(first.map((c) => c.id)).toEqual(second.map((c) => c.id));
  });

  it('returns the configured daily count', () => {
    expect(selectDailyChallenges('2024-01-05', 0, pool)).toHaveLength(3);
  });

  it('can select a different set for a different date', () => {
    const dates = ['2024-01-01', '2024-02-14', '2024-06-30', '2024-12-25'];
    const selections = dates.map((date) =>
      selectDailyChallenges(date, 0, pool).map((c) => c.id).join(',')
    );
    // Not every date needs a different set, but they shouldn't all collapse
    // to the exact same rotation for a pool this size.
    expect(new Set(selections).size).toBeGreaterThan(1);
  });

  it('returns the whole pool when it is not larger than the daily count', () => {
    const smallPool = pool.slice(0, 2);
    expect(selectDailyChallenges('2024-01-05', 0, smallPool)).toEqual(smallPool);
  });

  it('regenerating (generation + 1) yields a fully disjoint set when the pool is an exact multiple of the daily count', () => {
    const generation0 = selectDailyChallenges('2024-01-05', 0, pool).map((c) => c.id);
    const generation1 = selectDailyChallenges('2024-01-05', 1, pool).map((c) => c.id);
    expect(generation0).toHaveLength(3);
    expect(generation1).toHaveLength(3);
    expect(generation0.some((id) => generation1.includes(id))).toBe(false);
  });

  it('wraps generation 2 back to the same set as generation 0 for a 2x pool', () => {
    const generation0 = selectDailyChallenges('2024-01-05', 0, pool).map((c) => c.id);
    const generation2 = selectDailyChallenges('2024-01-05', 2, pool).map((c) => c.id);
    expect(generation2).toEqual(generation0);
  });
});

describe('getAvailableChallenges', () => {
  const gatedPool: ChallengeDefinition[] = [
    { id: 'early', title: 'Early', description: '', metric: 'starsCaptured', target: 1, rewardCoins: 1 },
    {
      id: 'late',
      title: 'Late',
      description: '',
      metric: 'starsCaptured',
      target: 1,
      rewardCoins: 1,
      minLevelsCompleted: 5,
    },
  ];

  it('includes challenges with no gate regardless of progress', () => {
    expect(getAvailableChallenges(gatedPool, 0).map((c) => c.id)).toContain('early');
  });

  it('excludes a gated challenge before its requirement is met', () => {
    expect(getAvailableChallenges(gatedPool, 0).map((c) => c.id)).not.toContain('late');
  });

  it('includes a gated challenge once its requirement is met', () => {
    expect(getAvailableChallenges(gatedPool, 5).map((c) => c.id)).toContain('late');
  });
});
