import { AD_UNIT_IDS } from './config';
import { logAdEvent } from './events';
import { loadGoogleMobileAds } from './nativeAds';

export type RewardedAdStatus = 'unavailable' | 'idle' | 'loading' | 'loaded' | 'showing';

// One shared rewarded-ad slot for every placement (continue, daily-reward
// doubler, coin bonus) - they all use the same Ad Unit ID (see
// services/ads/config.ts), so there's one instance to preload/show/replace
// rather than one per placement.
let currentAd: ReturnType<NonNullable<ReturnType<typeof loadGoogleMobileAds>>['RewardedAd']['createForAdRequest']> | null =
  null;
let status: RewardedAdStatus = 'idle';
let cleanupListeners: (() => void) | null = null;

function teardown(): void {
  cleanupListeners?.();
  cleanupListeners = null;
  currentAd = null;
}

export function getRewardedAdStatus(): RewardedAdStatus {
  if (!loadGoogleMobileAds()) return 'unavailable';
  return status;
}

// Begins loading a rewarded ad ahead of time so it's ready the moment a
// player taps a "Watch Ad" button - never triggered by that tap itself.
// Safe to call repeatedly; a no-op while one is already loading/loaded/
// showing.
export function preloadRewardedAd(): void {
  const mobileAds = loadGoogleMobileAds();
  if (!mobileAds) return;
  if (status === 'loading' || status === 'loaded' || status === 'showing') return;

  status = 'loading';
  const ad = mobileAds.RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);

  const unsubLoaded = ad.addAdEventListener(mobileAds.RewardedAdEventType.LOADED, () => {
    status = 'loaded';
    logAdEvent('rewarded_loaded');
  });
  const unsubError = ad.addAdEventListener(mobileAds.AdEventType.ERROR, (error) => {
    status = 'idle';
    logAdEvent('rewarded_failed', { reason: String(error) });
    teardown();
  });

  cleanupListeners = () => {
    unsubLoaded();
    unsubError();
  };
  currentAd = ad;
  ad.load();
}

export interface ShowRewardedResult {
  earnedReward: boolean;
}

// Shows the preloaded rewarded ad for `placement` (a label used only for
// the internal event log - see services/ads/events.ts). Resolves once the
// ad closes; `earnedReward` is only ever true if the SDK actually fired its
// "earned reward" event - closing early (or any failure) always resolves
// false. Callers must grant the reward only when this is true, and never
// call this without first checking getRewardedAdStatus() === 'loaded'.
export async function showRewardedAd(placement: string): Promise<ShowRewardedResult> {
  const mobileAds = loadGoogleMobileAds();
  logAdEvent('rewarded_requested', { placement });

  if (!mobileAds || status !== 'loaded' || !currentAd) {
    logAdEvent('rewarded_failed', { placement, reason: 'not_loaded' });
    return { earnedReward: false };
  }

  const ad = currentAd;
  status = 'showing';

  return new Promise<ShowRewardedResult>((resolve) => {
    let earnedReward = false;
    let settled = false;

    const finish = (result: ShowRewardedResult) => {
      if (settled) return;
      settled = true;
      status = 'idle';
      teardown();
      resolve(result);
      // Immediately start getting the next one ready.
      preloadRewardedAd();
    };

    const unsubEarned = ad.addAdEventListener(mobileAds.RewardedAdEventType.EARNED_REWARD, () => {
      earnedReward = true;
      logAdEvent('rewarded_completed', { placement });
    });
    const unsubClosed = ad.addAdEventListener(mobileAds.AdEventType.CLOSED, () => {
      finish({ earnedReward });
    });
    const unsubError = ad.addAdEventListener(mobileAds.AdEventType.ERROR, (error) => {
      logAdEvent('rewarded_failed', { placement, reason: String(error) });
      finish({ earnedReward: false });
    });

    cleanupListeners = () => {
      unsubEarned();
      unsubClosed();
      unsubError();
    };

    logAdEvent('rewarded_started', { placement });
    void ad.show().catch((error) => {
      logAdEvent('rewarded_failed', { placement, reason: String(error) });
      finish({ earnedReward: false });
    });
  });
}
