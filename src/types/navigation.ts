import type { StarRating } from './level';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  WorldMap: undefined;
  LevelSelect: { worldId: string };
  Game: {
    levelId: string;
    // Present only when this attempt is a rewarded-ad continuation of a
    // failed one - see screens/LevelFailedScreen.tsx and
    // stores/useGameStore.ts (startLevel).
    continueBonus?: { seconds?: number; loops?: number };
    // How many rewarded continuations have already been used for this
    // level attempt-chain - threaded through untouched on failure so
    // LevelFailedScreen can enforce MAX_REWARDED_CONTINUES_PER_ATTEMPT
    // (see services/ads/config.ts). Absent/0 on a fresh attempt.
    continuationsUsed?: number;
  };
  LevelComplete: { levelId: string; score: number; rating: StarRating; coinsEarned: number };
  LevelFailed: {
    levelId: string;
    score: number;
    reason: string | null;
    continuationsUsed?: number;
  };
  DailyReward: undefined;
  DailyChallenges: undefined;
  Achievements: undefined;
  Profile: undefined;
  Settings: undefined;
};
