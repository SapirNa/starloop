import type { AchievementDefinition } from '../data/achievements';
import { EMPTY_PLAYER_STATS } from '../services/storage';
import {
  getAchievementSortGroup,
  getAchievementsProgress,
  sortAchievements,
  type AchievementContext,
  type AchievementProgress,
} from './achievements';

function makeContext(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    stats: EMPTY_PLAYER_STATS,
    dailyStreak: 0,
    perfectLevels: 0,
    ...overrides,
  };
}

const FIRST_LOOP: AchievementDefinition = {
  id: 'FIRST_LOOP',
  title: 'First Loop',
  description: '',
  metric: 'starsCaptured',
  target: 1,
  rewardCoins: 10,
};

describe('getAchievementsProgress', () => {
  it('reads starsCaptured from player stats', () => {
    const context = makeContext({ stats: { ...EMPTY_PLAYER_STATS, starsCaptured: 5 } });
    const [progress] = getAchievementsProgress([FIRST_LOOP], context, []);
    expect(progress.progress).toBe(1); // clamped to target
    expect(progress.isComplete).toBe(true);
  });

  it('is not complete before the target is reached', () => {
    const context = makeContext({ stats: EMPTY_PLAYER_STATS });
    const [progress] = getAchievementsProgress([FIRST_LOOP], context, []);
    expect(progress.isComplete).toBe(false);
  });

  it('reads dailyStreak for DAILY_STREAK_7', () => {
    const definition: AchievementDefinition = {
      id: 'DAILY_STREAK_7',
      title: 'Dedicated',
      description: '',
      metric: 'dailyStreak',
      target: 7,
      rewardCoins: 75,
    };
    const context = makeContext({ dailyStreak: 4 });
    const [progress] = getAchievementsProgress([definition], context, []);
    expect(progress.progress).toBe(4);
    expect(progress.isComplete).toBe(false);

    const [completed] = getAchievementsProgress([definition], makeContext({ dailyStreak: 7 }), []);
    expect(completed.isComplete).toBe(true);
  });

  it('reads perfectLevels (derived from progress store) for PERFECT_10_LEVELS', () => {
    const definition: AchievementDefinition = {
      id: 'PERFECT_10_LEVELS',
      title: 'Perfectionist',
      description: '',
      metric: 'perfectLevels',
      target: 10,
      rewardCoins: 100,
    };
    const [progress] = getAchievementsProgress([definition], makeContext({ perfectLevels: 10 }), []);
    expect(progress.isComplete).toBe(true);
  });

  it('reads bestComboEver for COMBO_5', () => {
    const definition: AchievementDefinition = {
      id: 'COMBO_5',
      title: 'Combo Master',
      description: '',
      metric: 'bestComboEver',
      target: 5,
      rewardCoins: 50,
    };
    const context = makeContext({ stats: { ...EMPTY_PLAYER_STATS, bestComboEver: 3 } });
    const [progress] = getAchievementsProgress([definition], context, []);
    expect(progress.progress).toBe(3);
    expect(progress.isComplete).toBe(false);
  });

  it('reflects claimed status from the provided claimed id list', () => {
    const context = makeContext({ stats: { ...EMPTY_PLAYER_STATS, starsCaptured: 1 } });
    const [progress] = getAchievementsProgress([FIRST_LOOP], context, ['FIRST_LOOP']);
    expect(progress.isClaimed).toBe(true);
  });
});

function makeEntry(
  id: string,
  overrides: Partial<Pick<AchievementProgress, 'isComplete' | 'isClaimed'>> = {}
): AchievementProgress {
  return {
    definition: { id, title: id, description: '', metric: 'starsCaptured', target: 1, rewardCoins: 1 },
    progress: 0,
    isComplete: false,
    isClaimed: false,
    ...overrides,
  };
}

describe('getAchievementSortGroup', () => {
  it('groups a completed, unclaimed entry as unclaimedComplete', () => {
    expect(getAchievementSortGroup(makeEntry('a', { isComplete: true, isClaimed: false }))).toBe(
      'unclaimedComplete'
    );
  });

  it('groups an incomplete entry as inProgress', () => {
    expect(getAchievementSortGroup(makeEntry('a', { isComplete: false, isClaimed: false }))).toBe(
      'inProgress'
    );
  });

  it('groups a claimed entry as claimed, even if isComplete is also true', () => {
    expect(getAchievementSortGroup(makeEntry('a', { isComplete: true, isClaimed: true }))).toBe('claimed');
  });
});

describe('sortAchievements', () => {
  it('puts completed-but-unclaimed entries first, then in-progress, then claimed', () => {
    const claimed = makeEntry('claimed', { isComplete: true, isClaimed: true });
    const inProgress = makeEntry('inProgress', { isComplete: false, isClaimed: false });
    const readyToClaim = makeEntry('readyToClaim', { isComplete: true, isClaimed: false });

    const sorted = sortAchievements([claimed, inProgress, readyToClaim]);
    expect(sorted.map((e) => e.definition.id)).toEqual(['readyToClaim', 'inProgress', 'claimed']);
  });

  it('keeps multiple ready-to-claim entries grouped together at the top, in their original order', () => {
    const ready1 = makeEntry('ready1', { isComplete: true, isClaimed: false });
    const ready2 = makeEntry('ready2', { isComplete: true, isClaimed: false });
    const inProgress = makeEntry('inProgress', { isComplete: false, isClaimed: false });

    const sorted = sortAchievements([inProgress, ready1, ready2]);
    expect(sorted.map((e) => e.definition.id)).toEqual(['ready1', 'ready2', 'inProgress']);
  });

  it('does not mutate the input array', () => {
    const entries = [makeEntry('claimed', { isClaimed: true }), makeEntry('ready', { isComplete: true })];
    const original = [...entries];
    sortAchievements(entries);
    expect(entries).toEqual(original);
  });

  it('is a no-op ordering when nothing is claimed or complete', () => {
    const entries = [makeEntry('a'), makeEntry('b'), makeEntry('c')];
    expect(sortAchievements(entries).map((e) => e.definition.id)).toEqual(['a', 'b', 'c']);
  });
});
