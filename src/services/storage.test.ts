import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_ACHIEVEMENTS,
  DEFAULT_ADS,
  DEFAULT_CHALLENGES,
  DEFAULT_DAILY_REWARDS,
  DEFAULT_ECONOMY,
  DEFAULT_PLAYER_STATS,
  DEFAULT_PROFILE,
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  DEFAULT_TUTORIAL,
  EMPTY_PLAYER_STATS,
  loadAchievements,
  loadAds,
  loadChallenges,
  loadDailyRewards,
  loadEconomy,
  loadPlayerStats,
  loadProfile,
  loadProgress,
  loadSettings,
  loadTutorial,
  resetProgress,
  saveAchievements,
  saveAds,
  saveChallenges,
  saveDailyRewards,
  saveEconomy,
  savePlayerStats,
  saveProfile,
  saveProgress,
  saveSettings,
  saveTutorial,
} from './storage';

afterEach(async () => {
  await AsyncStorage.clear();
});

describe('progress persistence', () => {
  it('returns defaults when no save data exists (missing save data)', async () => {
    const data = await loadProgress();
    expect(data).toEqual(DEFAULT_PROGRESS);
  });

  it('round-trips a saved progress object', async () => {
    const saved = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      levels: { 'level-1': { unlocked: true, completed: true, bestScore: 42, bestRating: 2 as const } },
    };
    await saveProgress(saved);

    const loaded = await loadProgress();
    expect(loaded).toEqual(saved);
  });

  it('falls back to defaults when the saved schema version does not match', async () => {
    await AsyncStorage.setItem(
      'starloop:progress',
      JSON.stringify({ schemaVersion: 999, levels: { foo: {} } })
    );

    const loaded = await loadProgress();
    expect(loaded).toEqual(DEFAULT_PROGRESS);
  });

  it('falls back to defaults when the saved data is corrupted JSON', async () => {
    await AsyncStorage.setItem('starloop:progress', '{not valid json');
    const loaded = await loadProgress();
    expect(loaded).toEqual(DEFAULT_PROGRESS);
  });

  it('resetProgress clears the saved data', async () => {
    await saveProgress({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      levels: { 'level-1': { unlocked: true, completed: true, bestScore: 10, bestRating: 1 } },
    });

    await resetProgress();

    const loaded = await loadProgress();
    expect(loaded).toEqual(DEFAULT_PROGRESS);
  });
});

describe('settings persistence', () => {
  it('returns defaults when no settings are saved', async () => {
    const data = await loadSettings();
    expect(data).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', async () => {
    const saved = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      musicEnabled: false,
      soundEnabled: false,
      hapticsEnabled: false,
      notificationsEnabled: false,
    };
    await saveSettings(saved);

    const loaded = await loadSettings();
    expect(loaded).toEqual(saved);
  });

  it('migrates a v1 save (no notificationsEnabled) without wiping the rest of the settings', async () => {
    await AsyncStorage.setItem(
      'starloop:settings',
      JSON.stringify({ schemaVersion: 1, musicEnabled: false, soundEnabled: true, hapticsEnabled: false })
    );

    const loaded = await loadSettings();
    expect(loaded).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      musicEnabled: false,
      soundEnabled: true,
      hapticsEnabled: false,
      notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
    });
  });
});

describe('daily rewards persistence', () => {
  it('returns defaults when no save data exists', async () => {
    expect(await loadDailyRewards()).toEqual(DEFAULT_DAILY_REWARDS);
  });

  it('round-trips a saved claim state', async () => {
    const saved = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastClaimDate: '2024-01-05',
      dailyStreak: 3,
      currentRewardDay: 4,
      highestDailyStreak: 5,
    };
    await saveDailyRewards(saved);
    expect(await loadDailyRewards()).toEqual(saved);
  });

  it('falls back to defaults on corrupted data', async () => {
    await AsyncStorage.setItem('starloop:dailyRewards', 'not json');
    expect(await loadDailyRewards()).toEqual(DEFAULT_DAILY_REWARDS);
  });

  it('falls back to defaults when the saved schema version is older than supported', async () => {
    await AsyncStorage.setItem(
      'starloop:dailyRewards',
      JSON.stringify({ schemaVersion: 0, lastClaimDate: '2020-01-01', dailyStreak: 99, currentRewardDay: 3 })
    );
    expect(await loadDailyRewards()).toEqual(DEFAULT_DAILY_REWARDS);
  });

  it('migrates a v1 save (no highestDailyStreak) using the current streak as the recovered high-water mark', async () => {
    await AsyncStorage.setItem(
      'starloop:dailyRewards',
      JSON.stringify({ schemaVersion: 1, lastClaimDate: '2024-01-05', dailyStreak: 4, currentRewardDay: 5 })
    );

    const loaded = await loadDailyRewards();
    expect(loaded).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastClaimDate: '2024-01-05',
      dailyStreak: 4,
      currentRewardDay: 5,
      highestDailyStreak: 4,
    });
  });
});

describe('economy persistence', () => {
  it('returns defaults (including the starter power-up grant) when no save data exists', async () => {
    expect(await loadEconomy()).toEqual(DEFAULT_ECONOMY);
  });

  it('round-trips saved coins/hints/power-ups', async () => {
    const saved = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      coins: 120,
      hints: 3,
      powerUpInventory: { FREEZE_TIME: 2, EXTRA_TIME: 1, STAR_MAGNET: 0, SHIELD: 0, PERFECT_LOOP: 0 },
      items: {},
    };
    await saveEconomy(saved);
    expect(await loadEconomy()).toEqual(saved);
  });

  it('falls back to defaults when the saved schema version is old/unrecognized', async () => {
    await AsyncStorage.setItem(
      'starloop:economy',
      JSON.stringify({ schemaVersion: 0, coins: 99999, hints: 50 })
    );
    expect(await loadEconomy()).toEqual(DEFAULT_ECONOMY);
  });
});

describe('player stats persistence', () => {
  it('returns defaults (all zero) when no save data exists', async () => {
    expect(await loadPlayerStats()).toEqual(DEFAULT_PLAYER_STATS);
  });

  it('round-trips saved lifetime stats', async () => {
    const saved = { schemaVersion: CURRENT_SCHEMA_VERSION, ...EMPTY_PLAYER_STATS, starsCaptured: 42 };
    await savePlayerStats(saved);
    expect(await loadPlayerStats()).toEqual(saved);
  });

  it('migrates a v1 save (no totalLoopsSubmitted/totalChallengesCompleted) to zero for the new counters', async () => {
    await AsyncStorage.setItem(
      'starloop:playerStats',
      JSON.stringify({
        schemaVersion: 1,
        starsCaptured: 12,
        goldStarsCaptured: 2,
        levelsCompleted: 3,
        comboLoopsMade: 1,
        totalScoreEarned: 500,
        bestComboEver: 4,
        levelsCompletedUnderFourLoops: 1,
      })
    );

    const loaded = await loadPlayerStats();
    expect(loaded).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      starsCaptured: 12,
      goldStarsCaptured: 2,
      levelsCompleted: 3,
      comboLoopsMade: 1,
      totalScoreEarned: 500,
      bestComboEver: 4,
      levelsCompletedUnderFourLoops: 1,
      totalLoopsSubmitted: 0,
      totalChallengesCompleted: 0,
    });
  });
});

describe('challenges persistence', () => {
  it('returns defaults when no save data exists', async () => {
    expect(await loadChallenges()).toEqual(DEFAULT_CHALLENGES);
  });

  it('round-trips a saved daily baseline, active set, and claimed set', async () => {
    const saved = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      date: '2024-01-05',
      baseline: { ...EMPTY_PLAYER_STATS, starsCaptured: 10 },
      claimedChallengeIds: ['capture-30-stars'],
      activeChallengeIds: ['capture-30-stars', 'play-3-levels', 'best-combo-5'],
      generation: 1,
    };
    await saveChallenges(saved);
    expect(await loadChallenges()).toEqual(saved);
  });

  it('migrates a v1 save (no activeChallengeIds/generation) to an empty active set, signalling regeneration is needed', async () => {
    await AsyncStorage.setItem(
      'starloop:challenges',
      JSON.stringify({
        schemaVersion: 1,
        date: '2024-01-05',
        baseline: { ...EMPTY_PLAYER_STATS, starsCaptured: 7 },
        claimedChallengeIds: [],
      })
    );

    const loaded = await loadChallenges();
    expect(loaded.activeChallengeIds).toEqual([]);
    expect(loaded.generation).toBe(0);
    expect(loaded.date).toBe('2024-01-05');
    expect(loaded.baseline.starsCaptured).toBe(7);
  });
});

describe('achievements persistence', () => {
  it('returns defaults when no save data exists', async () => {
    expect(await loadAchievements()).toEqual(DEFAULT_ACHIEVEMENTS);
  });

  it('round-trips claimed achievements', async () => {
    const saved = { schemaVersion: CURRENT_SCHEMA_VERSION, claimedAchievementIds: ['FIRST_LOOP'] };
    await saveAchievements(saved);
    expect(await loadAchievements()).toEqual(saved);
  });
});

describe('tutorial persistence', () => {
  it('returns defaults when no save data exists', async () => {
    expect(await loadTutorial()).toEqual(DEFAULT_TUTORIAL);
  });

  it('round-trips seen tutorial steps and seen objective tutorials', async () => {
    const saved = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      seenStepIds: ['level-1', 'level-2'],
      seenObjectiveTutorials: ['SCORE', 'GOLD_HUNT'],
    };
    await saveTutorial(saved);
    expect(await loadTutorial()).toEqual(saved);
  });

  it('migrates a v3 save (no seenObjectiveTutorials) to an empty list, without losing seenStepIds', async () => {
    await AsyncStorage.setItem(
      'starloop:tutorial',
      JSON.stringify({ schemaVersion: 3, seenStepIds: ['level-1'] })
    );
    expect(await loadTutorial()).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      seenStepIds: ['level-1'],
      seenObjectiveTutorials: [],
    });
  });
});

describe('profile persistence', () => {
  it('returns the default display name when no save data exists', async () => {
    expect(await loadProfile()).toEqual(DEFAULT_PROFILE);
  });

  it('round-trips an edited display name', async () => {
    const saved = { schemaVersion: CURRENT_SCHEMA_VERSION, displayName: 'Nova' };
    await saveProfile(saved);
    expect(await loadProfile()).toEqual(saved);
  });

  it('falls back to the default name if the saved name is blank/whitespace', async () => {
    await AsyncStorage.setItem(
      'starloop:profile',
      JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, displayName: '   ' })
    );
    expect(await loadProfile()).toEqual(DEFAULT_PROFILE);
  });
});

describe('ads persistence', () => {
  it('returns defaults when no save data exists', async () => {
    expect(await loadAds()).toEqual(DEFAULT_ADS);
  });

  it('round-trips the Daily Reward doubler flag, coin-ad count, and interstitial cadence', async () => {
    const saved = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      dailyRewardDoubledDate: '2024-01-05',
      rewardedCoinAdsWatchedToday: 2,
      rewardedCoinAdsDate: '2024-01-05',
      levelsSinceLastInterstitial: 1,
      lastInterstitialAt: 1_700_000_000_000,
      lastRewardedCompletedAt: 1_700_000_500_000,
    };
    await saveAds(saved);
    expect(await loadAds()).toEqual(saved);
  });

  it('falls back to defaults on corrupted data', async () => {
    await AsyncStorage.setItem('starloop:ads', 'not json');
    expect(await loadAds()).toEqual(DEFAULT_ADS);
  });

  it('migrates a v2 save (the ads domain did not exist yet) to full defaults, without erasing other domains', async () => {
    // The ads key never existed under schema v2 - there's nothing to
    // migrate *from* for this domain specifically, only the general
    // "old schema version is still supported" contract.
    await AsyncStorage.setItem(
      'starloop:ads',
      JSON.stringify({ schemaVersion: 2, dailyRewardDoubledDate: null })
    );
    const loaded = await loadAds();
    expect(loaded).toEqual(DEFAULT_ADS);
  });
});
