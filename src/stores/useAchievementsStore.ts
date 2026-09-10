import { create } from 'zustand';

import { ACHIEVEMENTS } from '../data/achievements';
import { getAchievementsProgress, type AchievementProgress } from '../gameplay/achievements';
import * as storage from '../services/storage';
import { useDailyRewardsStore } from './useDailyRewardsStore';
import { useEconomyStore } from './useEconomyStore';
import { usePlayerStatsStore } from './usePlayerStatsStore';
import { useProgressStore } from './useProgressStore';

interface AchievementsState {
  isHydrated: boolean;
  claimedAchievementIds: string[];

  hydrate: () => Promise<void>;
  getProgress: () => AchievementProgress[];
  claim: (achievementId: string) => boolean;
}

function persistState(state: AchievementsState): void {
  void storage.saveAchievements({
    schemaVersion: storage.CURRENT_SCHEMA_VERSION,
    claimedAchievementIds: state.claimedAchievementIds,
  });
}

function countPerfectLevels(): number {
  const levels = useProgressStore.getState().levels;
  return Object.values(levels).filter((progress) => progress.bestRating === 3).length;
}

export const useAchievementsStore = create<AchievementsState>()((set, get) => ({
  isHydrated: false,
  claimedAchievementIds: [],

  hydrate: async () => {
    const data = await storage.loadAchievements();
    set({ claimedAchievementIds: data.claimedAchievementIds, isHydrated: true });
  },

  getProgress: () => {
    const context = {
      stats: usePlayerStatsStore.getState().getSnapshot(),
      dailyStreak: useDailyRewardsStore.getState().dailyStreak,
      perfectLevels: countPerfectLevels(),
    };
    return getAchievementsProgress(ACHIEVEMENTS, context, get().claimedAchievementIds);
  },

  claim: (achievementId) => {
    const state = get();
    if (state.claimedAchievementIds.includes(achievementId)) return false;

    const match = get()
      .getProgress()
      .find((entry) => entry.definition.id === achievementId);
    if (!match || !match.isComplete) return false;

    set({ claimedAchievementIds: [...state.claimedAchievementIds, achievementId] });
    persistState(get());
    useEconomyStore.getState().addCoins(match.definition.rewardCoins);
    return true;
  },
}));
