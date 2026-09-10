import { getLocalDateString } from '../services/dailyRewards';
import * as storage from '../services/storage';
import { useAdsStore } from './useAdsStore';

jest.mock('../services/ads/interstitialAds', () => ({
  showInterstitialAd: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { showInterstitialAd } = require('../services/ads/interstitialAds') as {
  showInterstitialAd: jest.Mock;
};

beforeEach(async () => {
  showInterstitialAd.mockReset();
  await storage.saveAds(storage.DEFAULT_ADS);
  useAdsStore.setState({
    dailyRewardDoubledDate: null,
    rewardedCoinAdsWatchedToday: 0,
    rewardedCoinAdsDate: null,
    levelsSinceLastInterstitial: 0,
    lastInterstitialAt: null,
    lastRewardedCompletedAt: null,
    isHydrated: false,
  });
});

describe('Daily Reward doubler', () => {
  it('can be doubled before it has been doubled today', () => {
    expect(useAdsStore.getState().canDoubleDailyReward()).toBe(true);
  });

  it('cannot be doubled again the same day after marking it doubled', () => {
    useAdsStore.getState().markDailyRewardDoubled();
    expect(useAdsStore.getState().canDoubleDailyReward()).toBe(false);
  });

  it('persists the doubled date across a simulated app restart', async () => {
    useAdsStore.getState().markDailyRewardDoubled();
    await new Promise((resolve) => setTimeout(resolve, 0));

    useAdsStore.setState({ dailyRewardDoubledDate: null, isHydrated: false });
    await useAdsStore.getState().hydrate();

    expect(useAdsStore.getState().canDoubleDailyReward()).toBe(false);
  });

  it('becomes available again on a new calendar day (via the persisted date not matching today)', () => {
    useAdsStore.setState({ dailyRewardDoubledDate: '2000-01-01' });
    expect(useAdsStore.getState().canDoubleDailyReward()).toBe(true);
  });
});

describe('rewarded coin ads', () => {
  it('allows watching up to the daily maximum', () => {
    useAdsStore.getState().recordCoinAdWatched();
    useAdsStore.getState().recordCoinAdWatched();
    expect(useAdsStore.getState().canWatchCoinAd()).toBe(true);
    useAdsStore.getState().recordCoinAdWatched();
    expect(useAdsStore.getState().canWatchCoinAd()).toBe(false);
  });

  it('resets the count on a new calendar day', () => {
    useAdsStore.setState({ rewardedCoinAdsDate: '2000-01-01', rewardedCoinAdsWatchedToday: 3 });
    expect(useAdsStore.getState().canWatchCoinAd()).toBe(true);
  });

  it('persists the watched count and date across a simulated app restart', async () => {
    useAdsStore.getState().recordCoinAdWatched();
    await new Promise((resolve) => setTimeout(resolve, 0));

    useAdsStore.setState({ rewardedCoinAdsWatchedToday: 0, rewardedCoinAdsDate: null, isHydrated: false });
    await useAdsStore.getState().hydrate();

    expect(useAdsStore.getState().rewardedCoinAdsWatchedToday).toBe(1);
    expect(useAdsStore.getState().rewardedCoinAdsDate).toBe(getLocalDateString());
  });
});

describe('maybeShowInterstitial', () => {
  it('does not show (or call the SDK) when the frequency rules block it', async () => {
    const shown = await useAdsStore.getState().maybeShowInterstitial();
    expect(shown).toBe(false);
    expect(showInterstitialAd).not.toHaveBeenCalled();
  });

  it('shows and records cadence state when the frequency rules allow it and the SDK reports success', async () => {
    showInterstitialAd.mockResolvedValue({ shown: true });
    useAdsStore.setState({ levelsSinceLastInterstitial: 3 });

    const shown = await useAdsStore.getState().maybeShowInterstitial();

    expect(shown).toBe(true);
    expect(useAdsStore.getState().levelsSinceLastInterstitial).toBe(0);
    expect(useAdsStore.getState().lastInterstitialAt).not.toBeNull();
  });

  it('does not update cadence state when eligible but the SDK fails to actually show one', async () => {
    showInterstitialAd.mockResolvedValue({ shown: false });
    useAdsStore.setState({ levelsSinceLastInterstitial: 3 });

    const shown = await useAdsStore.getState().maybeShowInterstitial();

    expect(shown).toBe(false);
    expect(useAdsStore.getState().levelsSinceLastInterstitial).toBe(3);
    expect(useAdsStore.getState().lastInterstitialAt).toBeNull();
  });

  it('blocks soon after a rewarded ad even if the level-count rule is satisfied', async () => {
    useAdsStore.setState({ levelsSinceLastInterstitial: 3, lastRewardedCompletedAt: Date.now() });

    const shown = await useAdsStore.getState().maybeShowInterstitial();

    expect(shown).toBe(false);
    expect(showInterstitialAd).not.toHaveBeenCalled();
  });
});
