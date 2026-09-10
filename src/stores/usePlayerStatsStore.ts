import { create } from 'zustand';

import * as storage from '../services/storage';
import type { PlayerStatsSnapshot } from '../services/storage';

export interface CaptureStatsInput {
  starCount: number;
  goldCount: number;
  isCombo: boolean;
  scoreEarned: number;
}

interface PlayerStatsState extends PlayerStatsSnapshot {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  // Called once per successful (non-bomb) loop capture. The single place
  // lifetime stats are updated from live gameplay - challenges and
  // achievements only ever read from here, never recompute their own
  // counters.
  recordCapture: (input: CaptureStatsInput) => void;
  recordLevelCompletion: (loopsUsed: number) => void;
  // Called once per geometrically-valid closed loop (capture or not) - the
  // "Loops completed" profile statistic.
  recordLoop: () => void;
  // Called once per daily challenge claim (any challenge, any day) - a
  // lifetime counter distinct from useChallengesStore's per-set
  // claimedChallengeIds, which resets whenever the active set regenerates.
  recordChallengeCompleted: () => void;
  getSnapshot: () => PlayerStatsSnapshot;
  resetStats: () => Promise<void>;
}

function persistState(state: PlayerStatsState): void {
  void storage.savePlayerStats({
    schemaVersion: storage.CURRENT_SCHEMA_VERSION,
    starsCaptured: state.starsCaptured,
    goldStarsCaptured: state.goldStarsCaptured,
    levelsCompleted: state.levelsCompleted,
    comboLoopsMade: state.comboLoopsMade,
    totalScoreEarned: state.totalScoreEarned,
    bestComboEver: state.bestComboEver,
    levelsCompletedUnderFourLoops: state.levelsCompletedUnderFourLoops,
    totalLoopsSubmitted: state.totalLoopsSubmitted,
    totalChallengesCompleted: state.totalChallengesCompleted,
  });
}

export const usePlayerStatsStore = create<PlayerStatsState>()((set, get) => ({
  isHydrated: false,
  ...storage.EMPTY_PLAYER_STATS,

  hydrate: async () => {
    const data = await storage.loadPlayerStats();
    set({ ...data, isHydrated: true });
  },

  recordCapture: ({ starCount, goldCount, isCombo, scoreEarned }) => {
    set((state) => ({
      starsCaptured: state.starsCaptured + starCount,
      goldStarsCaptured: state.goldStarsCaptured + goldCount,
      comboLoopsMade: state.comboLoopsMade + (isCombo ? 1 : 0),
      totalScoreEarned: state.totalScoreEarned + scoreEarned,
      bestComboEver: Math.max(state.bestComboEver, starCount),
    }));
    persistState(get());
  },

  recordLevelCompletion: (loopsUsed) => {
    set((state) => ({
      levelsCompleted: state.levelsCompleted + 1,
      levelsCompletedUnderFourLoops:
        state.levelsCompletedUnderFourLoops + (loopsUsed < 4 ? 1 : 0),
    }));
    persistState(get());
  },

  recordLoop: () => {
    set((state) => ({ totalLoopsSubmitted: state.totalLoopsSubmitted + 1 }));
    persistState(get());
  },

  recordChallengeCompleted: () => {
    set((state) => ({ totalChallengesCompleted: state.totalChallengesCompleted + 1 }));
    persistState(get());
  },

  getSnapshot: () => {
    const state = get();
    return {
      starsCaptured: state.starsCaptured,
      goldStarsCaptured: state.goldStarsCaptured,
      levelsCompleted: state.levelsCompleted,
      comboLoopsMade: state.comboLoopsMade,
      totalScoreEarned: state.totalScoreEarned,
      bestComboEver: state.bestComboEver,
      levelsCompletedUnderFourLoops: state.levelsCompletedUnderFourLoops,
      totalLoopsSubmitted: state.totalLoopsSubmitted,
      totalChallengesCompleted: state.totalChallengesCompleted,
    };
  },

  resetStats: async () => {
    await storage.resetPlayerStats();
    set({ ...storage.EMPTY_PLAYER_STATS });
  },
}));
