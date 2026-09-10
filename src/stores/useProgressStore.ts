import { create } from 'zustand';

import { LEVELS } from '../data/levels';
import * as storage from '../services/storage';
import type { LevelProgress } from '../services/storage';
import type { StarRating } from '../types/level';

const DEFAULT_LEVEL_PROGRESS: LevelProgress = {
  unlocked: false,
  completed: false,
  bestScore: 0,
  bestRating: 0,
};

// The first level is always playable, even before any save exists.
function withFirstLevelUnlocked(
  levels: Record<string, LevelProgress>
): Record<string, LevelProgress> {
  const firstLevelId = LEVELS[0]?.id;
  if (!firstLevelId || levels[firstLevelId]?.unlocked) return levels;
  return {
    ...levels,
    [firstLevelId]: { ...DEFAULT_LEVEL_PROGRESS, ...levels[firstLevelId], unlocked: true },
  };
}

interface ProgressState {
  isHydrated: boolean;
  levels: Record<string, LevelProgress>;
  hydrate: () => Promise<void>;
  isLevelUnlocked: (levelId: string) => boolean;
  getLevelProgress: (levelId: string) => LevelProgress;
  unlockLevel: (levelId: string) => void;
  // Returns whether this was the level's first-ever completion, so callers
  // (GameScreen) know whether to award the level's coin reward - coins
  // themselves live in useEconomyStore, not here.
  recordLevelResult: (levelId: string, score: number, rating: StarRating) => boolean;
  resetProgress: () => Promise<void>;
}

function persistState(state: ProgressState): void {
  void storage.saveProgress({
    schemaVersion: storage.CURRENT_SCHEMA_VERSION,
    levels: state.levels,
  });
}

export const useProgressStore = create<ProgressState>()((set, get) => ({
  isHydrated: false,
  levels: withFirstLevelUnlocked({}),

  hydrate: async () => {
    const data = await storage.loadProgress();
    set({
      levels: withFirstLevelUnlocked(data.levels),
      isHydrated: true,
    });
  },

  isLevelUnlocked: (levelId) => get().levels[levelId]?.unlocked ?? false,

  getLevelProgress: (levelId) => get().levels[levelId] ?? DEFAULT_LEVEL_PROGRESS,

  unlockLevel: (levelId) => {
    if (get().levels[levelId]?.unlocked) return;
    set((state) => ({
      levels: {
        ...state.levels,
        [levelId]: { ...DEFAULT_LEVEL_PROGRESS, ...state.levels[levelId], unlocked: true },
      },
    }));
    persistState(get());
  },

  recordLevelResult: (levelId, score, rating) => {
    const previous = get().levels[levelId] ?? DEFAULT_LEVEL_PROGRESS;
    const isFirstCompletion = !previous.completed;

    set((state) => ({
      levels: {
        ...state.levels,
        [levelId]: {
          unlocked: true,
          completed: true,
          bestScore: Math.max(previous.bestScore, score),
          bestRating: Math.max(previous.bestRating, rating) as StarRating,
        },
      },
    }));
    persistState(get());
    return isFirstCompletion;
  },

  resetProgress: async () => {
    await storage.resetProgress();
    set({ levels: withFirstLevelUnlocked({}) });
  },
}));
