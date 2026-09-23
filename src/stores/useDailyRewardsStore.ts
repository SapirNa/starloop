import { create } from 'zustand';

import {
  claimDailyReward,
  evaluateClaim,
  getDailyRewardDisplayState,
  getLocalDateString,
  type ClaimEvaluation,
  type DailyRewardTier,
} from '../services/dailyRewards';
import { playSound } from '../services/audio';
import { notificationSuccess } from '../services/haptics';
import * as storage from '../services/storage';
import { useEconomyStore } from './useEconomyStore';

interface DailyRewardsState {
  isHydrated: boolean;
  lastClaimDate: string | null;
  dailyStreak: number;
  currentRewardDay: number;
  highestDailyStreak: number;

  hydrate: () => Promise<void>;
  getClaimStatus: () => ClaimEvaluation;
  // What the grid/streak should render right now - already reflects a
  // missed-day reset even before the player taps Claim. See
  // services/dailyRewards.ts.
  getDisplayState: () => Pick<DailyRewardsState, 'currentRewardDay' | 'dailyStreak'>;
  // Claims today's reward and credits it to the economy. Returns the
  // granted reward, or null if a claim isn't currently allowed (already
  // claimed today, or the clock moved backward).
  claim: () => DailyRewardTier | null;
}

function persistState(state: DailyRewardsState): void {
  void storage.saveDailyRewards({
    schemaVersion: storage.CURRENT_SCHEMA_VERSION,
    lastClaimDate: state.lastClaimDate,
    dailyStreak: state.dailyStreak,
    currentRewardDay: state.currentRewardDay,
    highestDailyStreak: state.highestDailyStreak,
  });
}

export const useDailyRewardsStore = create<DailyRewardsState>()((set, get) => ({
  isHydrated: false,
  lastClaimDate: null,
  dailyStreak: 0,
  currentRewardDay: 1,
  highestDailyStreak: 0,

  hydrate: async () => {
    const data = await storage.loadDailyRewards();
    set({
      lastClaimDate: data.lastClaimDate,
      dailyStreak: data.dailyStreak,
      currentRewardDay: data.currentRewardDay,
      highestDailyStreak: data.highestDailyStreak,
      isHydrated: true,
    });
  },

  getClaimStatus: () => evaluateClaim(get(), getLocalDateString()),

  getDisplayState: () => getDailyRewardDisplayState(get(), getLocalDateString()),

  claim: () => {
    const state = get();
    const result = claimDailyReward(state, getLocalDateString());
    if (!result) return null;

    set({
      lastClaimDate: result.state.lastClaimDate,
      dailyStreak: result.state.dailyStreak,
      currentRewardDay: result.state.currentRewardDay,
      highestDailyStreak: result.state.highestDailyStreak,
    });
    persistState(get());

    const economy = useEconomyStore.getState();
    economy.addCoins(result.reward.coins);
    for (const powerUp of result.reward.powerUps) {
      economy.addPowerUp(powerUp.type, powerUp.amount);
    }

    void playSound('rewardOpen');
    void notificationSuccess();

    return result.reward;
  },
}));
