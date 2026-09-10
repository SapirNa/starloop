import { AD_UNIT_IDS } from './config';
import { logAdEvent } from './events';
import { loadGoogleMobileAds } from './nativeAds';

export type InterstitialAdStatus = 'unavailable' | 'idle' | 'loading' | 'loaded' | 'showing';

// Frequency/eligibility rules (services/ads/adFrequency.ts) and the
// persisted counters they run against (stores/useAdsStore.ts) are decided
// by the caller *before* reaching for this module - this module only ever
// owns the ad SDK object's own load/show lifecycle, never the decision of
// whether showing one right now is a good idea.
let currentAd: ReturnType<NonNullable<ReturnType<typeof loadGoogleMobileAds>>['InterstitialAd']['createForAdRequest']> | null =
  null;
let status: InterstitialAdStatus = 'idle';
let cleanupListeners: (() => void) | null = null;

function teardown(): void {
  cleanupListeners?.();
  cleanupListeners = null;
  currentAd = null;
}

export function getInterstitialAdStatus(): InterstitialAdStatus {
  if (!loadGoogleMobileAds()) return 'unavailable';
  return status;
}

export function preloadInterstitialAd(): void {
  const mobileAds = loadGoogleMobileAds();
  if (!mobileAds) return;
  if (status === 'loading' || status === 'loaded' || status === 'showing') return;

  status = 'loading';
  const ad = mobileAds.InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);

  const unsubLoaded = ad.addAdEventListener(mobileAds.AdEventType.LOADED, () => {
    status = 'loaded';
    logAdEvent('interstitial_loaded');
  });
  const unsubError = ad.addAdEventListener(mobileAds.AdEventType.ERROR, (error) => {
    status = 'idle';
    logAdEvent('interstitial_failed', { reason: String(error) });
    teardown();
  });

  cleanupListeners = () => {
    unsubLoaded();
    unsubError();
  };
  currentAd = ad;
  ad.load();
}

// Resolves once the ad has closed (or immediately with `shown: false` if
// none was loaded/available) - callers proceed with navigation either way,
// an interstitial must never block the flow it's placed in.
export async function showInterstitialAd(): Promise<{ shown: boolean }> {
  const mobileAds = loadGoogleMobileAds();
  if (!mobileAds || status !== 'loaded' || !currentAd) {
    return { shown: false };
  }

  const ad = currentAd;
  status = 'showing';

  return new Promise<{ shown: boolean }>((resolve) => {
    let settled = false;
    const finish = (shown: boolean) => {
      if (settled) return;
      settled = true;
      status = 'idle';
      teardown();
      resolve({ shown });
      preloadInterstitialAd();
    };

    const unsubClosed = ad.addAdEventListener(mobileAds.AdEventType.CLOSED, () => finish(true));
    const unsubError = ad.addAdEventListener(mobileAds.AdEventType.ERROR, (error) => {
      logAdEvent('interstitial_failed', { reason: String(error) });
      finish(false);
    });

    cleanupListeners = () => {
      unsubClosed();
      unsubError();
    };

    logAdEvent('interstitial_shown');
    void ad.show().catch((error) => {
      logAdEvent('interstitial_failed', { reason: String(error) });
      finish(false);
    });
  });
}
