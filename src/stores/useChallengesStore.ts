import { create } from 'zustand';

import { CHALLENGE_POOL, type ChallengeDefinition } from '../data/challenges';
import {
  getAvailableChallenges,
  getChallengeProgress,
  selectDailyChallenges,
  type ChallengeProgress,
} from '../gameplay/challenges';
import { getLocalDateString } from '../services/dailyRewards';
import * as storage from '../services/storage';
import type { PlayerStatsSnapshot } from '../services/storage';
import { useEconomyStore } from './useEconomyStore';
import { usePlayerStatsStore } from './usePlayerStatsStore';

export interface ClaimChallengeResult {
  success: boolean;
  // True if this claim completed the active set and a fresh set of 3 was
  // generated to replace it.
  regenerated: boolean;
}

interface ChallengesState {
  isHydrated: boolean;
  date: string | null;
  generation: number;
  activeChallengeIds: string[];
  baseline: PlayerStatsSnapshot;
  claimedChallengeIds: string[];

  hydrate: () => Promise<void>;
  // Generates a fresh active set if there isn't one yet for today (new
  // calendar day, or a save that predates active-set persistence). Cheap
  // and idempotent - safe to call whenever the challenges screen is opened.
  refreshIfNeeded: () => void;
  getTodaysProgress: () => ChallengeProgress[];
  claim: (challengeId: string) => ClaimChallengeResult;
}

function persistState(state: ChallengesState): void {
  void storage.saveChallenges({
    schemaVersion: storage.CURRENT_SCHEMA_VERSION,
    date: state.date,
    baseline: state.baseline,
    claimedChallengeIds: state.claimedChallengeIds,
    activeChallengeIds: state.activeChallengeIds,
    generation: state.generation,
  });
}

function generateActiveSet(
  date: string,
  generation: number
): { activeChallengeIds: string[]; baseline: PlayerStatsSnapshot } {
  const baseline = usePlayerStatsStore.getState().getSnapshot();
  const available = getAvailableChallenges(CHALLENGE_POOL, baseline.levelsCompleted);
  const pool = available.length > 0 ? available : CHALLENGE_POOL;
  const selected = selectDailyChallenges(date, generation, pool);
  return { activeChallengeIds: selected.map((definition) => definition.id), baseline };
}

function resolveDefinitions(ids: string[]): ChallengeDefinition[] {
  return ids
    .map((id) => CHALLENGE_POOL.find((definition) => definition.id === id))
    .filter((definition): definition is ChallengeDefinition => definition !== undefined);
}

export const useChallengesStore = create<ChallengesState>()((set, get) => ({
  isHydrated: false,
  date: null,
  generation: 0,
  activeChallengeIds: [],
  baseline: storage.EMPTY_PLAYER_STATS,
  claimedChallengeIds: [],

  hydrate: async () => {
    const data = await storage.loadChallenges();
    set({
      date: data.date,
      baseline: data.baseline,
      claimedChallengeIds: data.claimedChallengeIds,
      activeChallengeIds: data.activeChallengeIds,
      generation: data.generation,
      isHydrated: true,
    });
    get().refreshIfNeeded();
  },

  refreshIfNeeded: () => {
    const state = get();
    const today = getLocalDateString();
    const isNewDay = state.date !== today;
    // An empty active set (e.g. a save from before this field existed)
    // needs generating even on "the same day".
    if (!isNewDay && state.activeChallengeIds.length > 0) return;

    const generation = isNewDay ? 0 : state.generation;
    const { activeChallengeIds, baseline } = generateActiveSet(today, generation);

    set({ date: today, generation, activeChallengeIds, baseline, claimedChallengeIds: [] });
    persistState(get());
  },

  getTodaysProgress: () => {
    const state = get();
    const definitions = resolveDefinitions(state.activeChallengeIds);
    const current = usePlayerStatsStore.getState().getSnapshot();
    return getChallengeProgress(definitions, current, state.baseline, state.claimedChallengeIds);
  },

  claim: (challengeId) => {
    const state = get();
    if (!state.activeChallengeIds.includes(challengeId)) {
      return { success: false, regenerated: false };
    }
    if (state.claimedChallengeIds.includes(challengeId)) {
      return { success: false, regenerated: false };
    }

    const match = get()
      .getTodaysProgress()
      .find((entry) => entry.definition.id === challengeId);
    if (!match || !match.isComplete) return { success: false, regenerated: false };

    useEconomyStore.getState().addCoins(match.definition.rewardCoins);
    usePlayerStatsStore.getState().recordChallengeCompleted();

    const claimedChallengeIds = [...state.claimedChallengeIds, challengeId];
    const allClaimed = state.activeChallengeIds.every((id) => claimedChallengeIds.includes(id));

    if (allClaimed) {
      // All 3 done - replace the set immediately rather than waiting for
      // the next calendar day. The regeneration offset guarantees a
      // disjoint (or at least varied) set from the one just completed.
      const nextGeneration = state.generation + 1;
      const today = state.date ?? getLocalDateString();
      const { activeChallengeIds, baseline } = generateActiveSet(today, nextGeneration);

      set({ generation: nextGeneration, activeChallengeIds, baseline, claimedChallengeIds: [] });
      persistState(get());
      return { success: true, regenerated: true };
    }

    set({ claimedChallengeIds });
    persistState(get());
    return { success: true, regenerated: false };
  },
}));
