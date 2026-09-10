import AsyncStorage from '@react-native-async-storage/async-storage';

import { createEmptyPowerUpInventory, type PowerUpType } from '../gameplay/powerUps';
import type { StarRating } from '../types/level';

const PROGRESS_KEY = 'starloop:progress';
const SETTINGS_KEY = 'starloop:settings';
const DAILY_REWARDS_KEY = 'starloop:dailyRewards';
const ECONOMY_KEY = 'starloop:economy';
const PLAYER_STATS_KEY = 'starloop:playerStats';
const CHALLENGES_KEY = 'starloop:challenges';
const ACHIEVEMENTS_KEY = 'starloop:achievements';
const TUTORIAL_KEY = 'starloop:tutorial';
const PROFILE_KEY = 'starloop:profile';
const ADS_KEY = 'starloop:ads';

// Bump whenever any *Data shape below gains/changes a field, and extend the
// corresponding migrate* function to upgrade older saves in place - never
// just discard them (see isSupportedSchemaVersion). Version 2 added:
// notificationsEnabled, highestDailyStreak, challenge set persistence
// (activeChallengeIds/generation), totalLoopsSubmitted/
// totalChallengesCompleted, and the profile domain. Version 3 added the ads
// domain (rewarded-ad daily limits, the Daily Reward doubler flag,
// interstitial cadence state). Version 4 added seenObjectiveTutorials to
// the tutorial domain. All were purely additive, so every older field is
// still read as-is.
export const CURRENT_SCHEMA_VERSION = 4;

// The oldest schema version migrate*() still knows how to upgrade. Anything
// older (or newer than CURRENT_SCHEMA_VERSION, which would mean a save from
// a future version of the app) falls back to defaults rather than risk
// misinterpreting an unrecognized shape.
const MIN_SUPPORTED_SCHEMA_VERSION = 1;

function isSupportedSchemaVersion(version: unknown): boolean {
  return (
    typeof version === 'number' &&
    version >= MIN_SUPPORTED_SCHEMA_VERSION &&
    version <= CURRENT_SCHEMA_VERSION
  );
}

export interface LevelProgress {
  unlocked: boolean;
  completed: boolean;
  bestScore: number;
  bestRating: StarRating;
}

export interface ProgressData {
  schemaVersion: number;
  levels: Record<string, LevelProgress>;
}

export interface SettingsData {
  schemaVersion: number;
  musicEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  // v2
  notificationsEnabled: boolean;
}

export const DEFAULT_PROGRESS: ProgressData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  levels: {},
};

export const DEFAULT_SETTINGS: SettingsData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  musicEnabled: true,
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: true,
};

function migrateProgress(data: unknown): ProgressData {
  if (!data || typeof data !== 'object') return DEFAULT_PROGRESS;
  const parsed = data as Partial<ProgressData>;
  if (!isSupportedSchemaVersion(parsed.schemaVersion)) return DEFAULT_PROGRESS;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    levels: parsed.levels ?? {},
  };
}

function migrateSettings(data: unknown): SettingsData {
  if (!data || typeof data !== 'object') return DEFAULT_SETTINGS;
  const parsed = data as Partial<SettingsData>;
  if (!isSupportedSchemaVersion(parsed.schemaVersion)) return DEFAULT_SETTINGS;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    musicEnabled: parsed.musicEnabled ?? DEFAULT_SETTINGS.musicEnabled,
    soundEnabled: parsed.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
    hapticsEnabled: parsed.hapticsEnabled ?? DEFAULT_SETTINGS.hapticsEnabled,
    notificationsEnabled: parsed.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled,
  };
}

export async function loadProgress(): Promise<ProgressData> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return migrateProgress(JSON.parse(raw));
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export async function saveProgress(data: ProgressData): Promise<void> {
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
}

export async function loadSettings(): Promise<SettingsData> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return migrateSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(data: SettingsData): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}

export async function resetProgress(): Promise<void> {
  await AsyncStorage.removeItem(PROGRESS_KEY);
}

// ---------------------------------------------------------------------------
// Daily rewards
// ---------------------------------------------------------------------------

export interface DailyRewardsData {
  schemaVersion: number;
  // 'YYYY-MM-DD' local calendar date of the last successful claim, or null
  // before the first ever claim.
  lastClaimDate: string | null;
  dailyStreak: number;
  // Which of the 7 reward slots is next up (1-7).
  currentRewardDay: number;
  // v2: the highest dailyStreak ever reached, kept even after a reset.
  highestDailyStreak: number;
}

export const DEFAULT_DAILY_REWARDS: DailyRewardsData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  lastClaimDate: null,
  dailyStreak: 0,
  currentRewardDay: 1,
  highestDailyStreak: 0,
};

function migrateDailyRewards(data: unknown): DailyRewardsData {
  if (!data || typeof data !== 'object') return DEFAULT_DAILY_REWARDS;
  const parsed = data as Partial<DailyRewardsData>;
  if (!isSupportedSchemaVersion(parsed.schemaVersion)) return DEFAULT_DAILY_REWARDS;
  const dailyStreak = parsed.dailyStreak ?? 0;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    lastClaimDate: parsed.lastClaimDate ?? null,
    dailyStreak,
    currentRewardDay: parsed.currentRewardDay ?? 1,
    // A v1 save has no recorded high score for the streak - the current
    // streak is the best lower bound we can recover.
    highestDailyStreak: Math.max(parsed.highestDailyStreak ?? 0, dailyStreak),
  };
}

export async function loadDailyRewards(): Promise<DailyRewardsData> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_REWARDS_KEY);
    if (!raw) return DEFAULT_DAILY_REWARDS;
    return migrateDailyRewards(JSON.parse(raw));
  } catch {
    return DEFAULT_DAILY_REWARDS;
  }
}

export async function saveDailyRewards(data: DailyRewardsData): Promise<void> {
  await AsyncStorage.setItem(DAILY_REWARDS_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Economy: coins, hints, power-up inventory, and a generic item bag for
// future cosmetics/boosters (empty today - nothing invents fake items).
// ---------------------------------------------------------------------------

export interface EconomyData {
  schemaVersion: number;
  coins: number;
  hints: number;
  powerUpInventory: Record<PowerUpType, number>;
  items: Record<string, number>;
}

export const DEFAULT_ECONOMY: EconomyData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  coins: 0,
  hints: 1,
  // A small starter grant so a new player has something to try immediately.
  powerUpInventory: { ...createEmptyPowerUpInventory(), FREEZE_TIME: 1, EXTRA_TIME: 1 },
  items: {},
};

function migrateEconomy(data: unknown): EconomyData {
  if (!data || typeof data !== 'object') return DEFAULT_ECONOMY;
  const parsed = data as Partial<EconomyData>;
  if (!isSupportedSchemaVersion(parsed.schemaVersion)) return DEFAULT_ECONOMY;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    coins: parsed.coins ?? 0,
    hints: parsed.hints ?? 0,
    powerUpInventory: { ...createEmptyPowerUpInventory(), ...parsed.powerUpInventory },
    items: parsed.items ?? {},
  };
}

export async function loadEconomy(): Promise<EconomyData> {
  try {
    const raw = await AsyncStorage.getItem(ECONOMY_KEY);
    if (!raw) return DEFAULT_ECONOMY;
    return migrateEconomy(JSON.parse(raw));
  } catch {
    return DEFAULT_ECONOMY;
  }
}

export async function saveEconomy(data: EconomyData): Promise<void> {
  await AsyncStorage.setItem(ECONOMY_KEY, JSON.stringify(data));
}

export async function resetEconomy(): Promise<void> {
  await AsyncStorage.removeItem(ECONOMY_KEY);
}

// ---------------------------------------------------------------------------
// Player stats: lifetime cumulative counters. The single source of truth
// that challenge and achievement progress is derived from - see
// gameplay/challenges.ts and gameplay/achievements.ts.
// ---------------------------------------------------------------------------

export interface PlayerStatsSnapshot {
  starsCaptured: number;
  goldStarsCaptured: number;
  levelsCompleted: number;
  comboLoopsMade: number;
  totalScoreEarned: number;
  bestComboEver: number;
  levelsCompletedUnderFourLoops: number;
  // v2
  totalLoopsSubmitted: number;
  totalChallengesCompleted: number;
}

export interface PlayerStatsData extends PlayerStatsSnapshot {
  schemaVersion: number;
}

export const EMPTY_PLAYER_STATS: PlayerStatsSnapshot = {
  starsCaptured: 0,
  goldStarsCaptured: 0,
  levelsCompleted: 0,
  comboLoopsMade: 0,
  totalScoreEarned: 0,
  bestComboEver: 0,
  levelsCompletedUnderFourLoops: 0,
  totalLoopsSubmitted: 0,
  totalChallengesCompleted: 0,
};

export const DEFAULT_PLAYER_STATS: PlayerStatsData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  ...EMPTY_PLAYER_STATS,
};

function migratePlayerStats(data: unknown): PlayerStatsData {
  if (!data || typeof data !== 'object') return DEFAULT_PLAYER_STATS;
  const parsed = data as Partial<PlayerStatsData>;
  if (!isSupportedSchemaVersion(parsed.schemaVersion)) return DEFAULT_PLAYER_STATS;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    starsCaptured: parsed.starsCaptured ?? 0,
    goldStarsCaptured: parsed.goldStarsCaptured ?? 0,
    levelsCompleted: parsed.levelsCompleted ?? 0,
    comboLoopsMade: parsed.comboLoopsMade ?? 0,
    totalScoreEarned: parsed.totalScoreEarned ?? 0,
    bestComboEver: parsed.bestComboEver ?? 0,
    levelsCompletedUnderFourLoops: parsed.levelsCompletedUnderFourLoops ?? 0,
    totalLoopsSubmitted: parsed.totalLoopsSubmitted ?? 0,
    totalChallengesCompleted: parsed.totalChallengesCompleted ?? 0,
  };
}

export async function loadPlayerStats(): Promise<PlayerStatsData> {
  try {
    const raw = await AsyncStorage.getItem(PLAYER_STATS_KEY);
    if (!raw) return DEFAULT_PLAYER_STATS;
    return migratePlayerStats(JSON.parse(raw));
  } catch {
    return DEFAULT_PLAYER_STATS;
  }
}

export async function savePlayerStats(data: PlayerStatsData): Promise<void> {
  await AsyncStorage.setItem(PLAYER_STATS_KEY, JSON.stringify(data));
}

export async function resetPlayerStats(): Promise<void> {
  await AsyncStorage.removeItem(PLAYER_STATS_KEY);
}

// ---------------------------------------------------------------------------
// Daily challenges: the active challenge set + progress-tracking state. The
// challenge *definitions* are static data (see data/challenges.ts) shaped so
// they could be swapped for a backend-fetched list later without touching
// this shape.
// ---------------------------------------------------------------------------

export interface ChallengesData {
  schemaVersion: number;
  // 'YYYY-MM-DD' - the calendar date the active set was generated for. A
  // mismatch with today's date means the daily set has rolled over.
  date: string | null;
  baseline: PlayerStatsSnapshot;
  claimedChallengeIds: string[];
  // v2: the actual 3 active challenge ids (explicit, not re-derived from
  // `date` alone) and which regeneration "round" they are within that date -
  // lets a completed set be replaced mid-day without waiting for the
  // calendar date to change. Empty activeChallengeIds means "needs
  // generating" (treated the same as a new day).
  activeChallengeIds: string[];
  generation: number;
}

export const DEFAULT_CHALLENGES: ChallengesData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  date: null,
  baseline: EMPTY_PLAYER_STATS,
  claimedChallengeIds: [],
  activeChallengeIds: [],
  generation: 0,
};

function migrateChallenges(data: unknown): ChallengesData {
  if (!data || typeof data !== 'object') return DEFAULT_CHALLENGES;
  const parsed = data as Partial<ChallengesData>;
  if (!isSupportedSchemaVersion(parsed.schemaVersion)) return DEFAULT_CHALLENGES;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    date: parsed.date ?? null,
    baseline: { ...EMPTY_PLAYER_STATS, ...parsed.baseline },
    claimedChallengeIds: parsed.claimedChallengeIds ?? [],
    // A v1 save has no activeChallengeIds; leaving it empty makes the store
    // regenerate a fresh set on next read (see useChallengesStore).
    activeChallengeIds: parsed.activeChallengeIds ?? [],
    generation: parsed.generation ?? 0,
  };
}

export async function loadChallenges(): Promise<ChallengesData> {
  try {
    const raw = await AsyncStorage.getItem(CHALLENGES_KEY);
    if (!raw) return DEFAULT_CHALLENGES;
    return migrateChallenges(JSON.parse(raw));
  } catch {
    return DEFAULT_CHALLENGES;
  }
}

export async function saveChallenges(data: ChallengesData): Promise<void> {
  await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Achievements: only which ones have been claimed is persisted. Progress and
// definitions are derived/static - see gameplay/achievements.ts.
// ---------------------------------------------------------------------------

export interface AchievementsData {
  schemaVersion: number;
  claimedAchievementIds: string[];
}

export const DEFAULT_ACHIEVEMENTS: AchievementsData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  claimedAchievementIds: [],
};

function migrateAchievements(data: unknown): AchievementsData {
  if (!data || typeof data !== 'object') return DEFAULT_ACHIEVEMENTS;
  const parsed = data as Partial<AchievementsData>;
  if (!isSupportedSchemaVersion(parsed.schemaVersion)) return DEFAULT_ACHIEVEMENTS;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    claimedAchievementIds: parsed.claimedAchievementIds ?? [],
  };
}

export async function loadAchievements(): Promise<AchievementsData> {
  try {
    const raw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return DEFAULT_ACHIEVEMENTS;
    return migrateAchievements(JSON.parse(raw));
  } catch {
    return DEFAULT_ACHIEVEMENTS;
  }
}

export async function saveAchievements(data: AchievementsData): Promise<void> {
  await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Tutorial: which one-time interactive tutorial steps (the in-canvas loop-
// gesture demo, levels 1-3) and objective-type explainer modals (SCORE,
// GOLD_HUNT, etc. - see data/objectiveTutorials.ts) have already been
// shown, so neither ever replays once the player has seen it.
// ---------------------------------------------------------------------------

export interface TutorialData {
  schemaVersion: number;
  seenStepIds: string[];
  // v4: ObjectiveTutorialId values already shown - see
  // data/objectiveTutorials.ts and stores/useTutorialStore.ts.
  seenObjectiveTutorials: string[];
}

export const DEFAULT_TUTORIAL: TutorialData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  seenStepIds: [],
  seenObjectiveTutorials: [],
};

function migrateTutorial(data: unknown): TutorialData {
  if (!data || typeof data !== 'object') return DEFAULT_TUTORIAL;
  const parsed = data as Partial<TutorialData>;
  if (!isSupportedSchemaVersion(parsed.schemaVersion)) return DEFAULT_TUTORIAL;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    seenStepIds: parsed.seenStepIds ?? [],
    seenObjectiveTutorials: parsed.seenObjectiveTutorials ?? [],
  };
}

export async function loadTutorial(): Promise<TutorialData> {
  try {
    const raw = await AsyncStorage.getItem(TUTORIAL_KEY);
    if (!raw) return DEFAULT_TUTORIAL;
    return migrateTutorial(JSON.parse(raw));
  } catch {
    return DEFAULT_TUTORIAL;
  }
}

export async function saveTutorial(data: TutorialData): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Profile: local-only player identity. No accounts/auth - just a display
// name the player can edit.
// ---------------------------------------------------------------------------

export interface ProfileData {
  schemaVersion: number;
  displayName: string;
}

export const DEFAULT_PROFILE: ProfileData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  displayName: 'Player',
};

function migrateProfile(data: unknown): ProfileData {
  if (!data || typeof data !== 'object') return DEFAULT_PROFILE;
  const parsed = data as Partial<ProfileData>;
  if (!isSupportedSchemaVersion(parsed.schemaVersion)) return DEFAULT_PROFILE;
  const displayName = parsed.displayName?.trim();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    displayName: displayName ? displayName : DEFAULT_PROFILE.displayName,
  };
}

export async function loadProfile(): Promise<ProfileData> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return migrateProfile(JSON.parse(raw));
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(data: ProfileData): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Ads: rewarded-ad daily limits, the Daily Reward doubler flag, and
// interstitial cadence state. Kept separate from the domains ads *affect*
// (daily rewards, economy) rather than folded into them, so those
// well-tested stores don't need to know ads exist at all - see
// stores/useAdsStore.ts.
// ---------------------------------------------------------------------------

export interface AdsData {
  schemaVersion: number;
  // 'YYYY-MM-DD' local date whose Daily Reward claim has already been
  // doubled via a rewarded ad - null if not yet doubled (today or ever).
  dailyRewardDoubledDate: string | null;
  // Rewarded coin ads watched today, and which calendar date that count is
  // for - same reset-by-date pattern as dailyRewards/challenges.
  rewardedCoinAdsWatchedToday: number;
  rewardedCoinAdsDate: string | null;
  // Interstitial cadence - persisted (not session-only) so force-quitting
  // the app can't be used to dodge the frequency rules.
  levelsSinceLastInterstitial: number;
  lastInterstitialAt: number | null;
  // Drives the "no interstitial soon after a rewarded ad" cooldown.
  lastRewardedCompletedAt: number | null;
}

export const DEFAULT_ADS: AdsData = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  dailyRewardDoubledDate: null,
  rewardedCoinAdsWatchedToday: 0,
  rewardedCoinAdsDate: null,
  levelsSinceLastInterstitial: 0,
  lastInterstitialAt: null,
  lastRewardedCompletedAt: null,
};

function migrateAds(data: unknown): AdsData {
  if (!data || typeof data !== 'object') return DEFAULT_ADS;
  const parsed = data as Partial<AdsData>;
  if (!isSupportedSchemaVersion(parsed.schemaVersion)) return DEFAULT_ADS;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    dailyRewardDoubledDate: parsed.dailyRewardDoubledDate ?? null,
    rewardedCoinAdsWatchedToday: parsed.rewardedCoinAdsWatchedToday ?? 0,
    rewardedCoinAdsDate: parsed.rewardedCoinAdsDate ?? null,
    levelsSinceLastInterstitial: parsed.levelsSinceLastInterstitial ?? 0,
    lastInterstitialAt: parsed.lastInterstitialAt ?? null,
    lastRewardedCompletedAt: parsed.lastRewardedCompletedAt ?? null,
  };
}

export async function loadAds(): Promise<AdsData> {
  try {
    const raw = await AsyncStorage.getItem(ADS_KEY);
    if (!raw) return DEFAULT_ADS;
    return migrateAds(JSON.parse(raw));
  } catch {
    return DEFAULT_ADS;
  }
}

export async function saveAds(data: AdsData): Promise<void> {
  await AsyncStorage.setItem(ADS_KEY, JSON.stringify(data));
}
