import { create } from 'zustand';

import { canShowInterstitial, type InterstitialFrequencyState } from '../services/ads/adFrequency';
import { MAX_REWARDED_COIN_ADS_PER_DAY } from '../services/ads/config';
import { showInterstitialAd } from '../services/ads/interstitialAds';
import { getLocalDateString } from '../services/dailyRewards';
import * as storage from '../services/storage';

interface AdsState {
  isHydrated: boolean;
  dailyRewardDoubledDate: string | null;
  rewardedCoinAdsWatchedToday: number;
  rewardedCoinAdsDate: string | null;
  levelsSinceLastInterstitial: number;
  lastInterstitialAt: number | null;
  lastRewardedCompletedAt: number | null;

  hydrate: () => Promise<void>;

  // Daily Reward doubler - one rewarded-ad double per calendar day, and
  // only for a reward that was actually claimed today (see
  // components/DailyRewardModal.tsx).
  canDoubleDailyReward: () => boolean;
  markDailyRewardDoubled: () => void;

  // Rewarded coin ads - MAX_REWARDED_COIN_ADS_PER_DAY per calendar day.
  canWatchCoinAd: () => boolean;
  recordCoinAdWatched: () => void;

  // Feeds the interstitial cooldown (see services/ads/adFrequency.ts).
  recordRewardedCompleted: () => void;

  // Called once per level completion, regardless of whether an interstitial
  // ends up showing - see screens/GameScreen.tsx.
  recordLevelCompletedForInterstitial: () => void;

  // The single entry point screens call to (maybe) show an interstitial -
  // checks the frequency rules, shows only if they pass, and updates the
  // persisted cadence state only when an ad was actually shown. Resolves
  // `true` only if an interstitial was actually shown, so callers can
  // decide whether to still navigate immediately either way (they always
  // should - see screens/LevelCompleteScreen.tsx).
  maybeShowInterstitial: () => Promise<boolean>;
}

function persistState(state: AdsState): void {
  void storage.saveAds({
    schemaVersion: storage.CURRENT_SCHEMA_VERSION,
    dailyRewardDoubledDate: state.dailyRewardDoubledDate,
    rewardedCoinAdsWatchedToday: state.rewardedCoinAdsWatchedToday,
    rewardedCoinAdsDate: state.rewardedCoinAdsDate,
    levelsSinceLastInterstitial: state.levelsSinceLastInterstitial,
    lastInterstitialAt: state.lastInterstitialAt,
    lastRewardedCompletedAt: state.lastRewardedCompletedAt,
  });
}

// Both the coin-ad limit and the daily doubler compare against "today" on
// read rather than storing a separately-reset counter, mirroring
// useDailyRewardsStore/useChallengesStore - a stale date just means the
// effective count is 0, no explicit "new day" transition needed.
function watchedCoinAdsToday(state: Pick<AdsState, 'rewardedCoinAdsDate' | 'rewardedCoinAdsWatchedToday'>): number {
  return state.rewardedCoinAdsDate === getLocalDateString() ? state.rewardedCoinAdsWatchedToday : 0;
}

export const useAdsStore = create<AdsState>()((set, get) => ({
  isHydrated: false,
  dailyRewardDoubledDate: null,
  rewardedCoinAdsWatchedToday: 0,
  rewardedCoinAdsDate: null,
  levelsSinceLastInterstitial: 0,
  lastInterstitialAt: null,
  lastRewardedCompletedAt: null,

  hydrate: async () => {
    const data = await storage.loadAds();
    set({
      dailyRewardDoubledDate: data.dailyRewardDoubledDate,
      rewardedCoinAdsWatchedToday: data.rewardedCoinAdsWatchedToday,
      rewardedCoinAdsDate: data.rewardedCoinAdsDate,
      levelsSinceLastInterstitial: data.levelsSinceLastInterstitial,
      lastInterstitialAt: data.lastInterstitialAt,
      lastRewardedCompletedAt: data.lastRewardedCompletedAt,
      isHydrated: true,
    });
  },

  canDoubleDailyReward: () => get().dailyRewardDoubledDate !== getLocalDateString(),

  markDailyRewardDoubled: () => {
    set({ dailyRewardDoubledDate: getLocalDateString() });
    persistState(get());
  },

  canWatchCoinAd: () => watchedCoinAdsToday(get()) < MAX_REWARDED_COIN_ADS_PER_DAY,

  recordCoinAdWatched: () => {
    const watched = watchedCoinAdsToday(get());
    set({ rewardedCoinAdsDate: getLocalDateString(), rewardedCoinAdsWatchedToday: watched + 1 });
    persistState(get());
  },

  recordRewardedCompleted: () => {
    set({ lastRewardedCompletedAt: Date.now() });
    persistState(get());
  },

  recordLevelCompletedForInterstitial: () => {
    set((state) => ({ levelsSinceLastInterstitial: state.levelsSinceLastInterstitial + 1 }));
    persistState(get());
  },

  maybeShowInterstitial: async () => {
    const state = get();
    const frequencyState: InterstitialFrequencyState = {
      levelsSinceLastInterstitial: state.levelsSinceLastInterstitial,
      lastInterstitialAt: state.lastInterstitialAt,
      lastRewardedCompletedAt: state.lastRewardedCompletedAt,
    };
    if (!canShowInterstitial(frequencyState, Date.now())) return false;

    const result = await showInterstitialAd();
    if (!result.shown) return false;

    set({ levelsSinceLastInterstitial: 0, lastInterstitialAt: Date.now() });
    persistState(get());
    return true;
  },
}));
