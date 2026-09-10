import { ensureConsent } from './consent';
import { preloadInterstitialAd } from './interstitialAds';
import { loadGoogleMobileAds } from './nativeAds';
import { preloadRewardedAd } from './rewardedAds';

export { AD_UNIT_IDS, CONTINUE_BONUS_LOOPS, CONTINUE_BONUS_SECONDS, MAX_REWARDED_COIN_ADS_PER_DAY, MAX_REWARDED_CONTINUES_PER_ATTEMPT, REWARDED_COIN_AD_AMOUNT } from './config';
export { canRequestAds, ensureConsent, isPrivacyOptionsRequired, showPrivacyOptionsForm } from './consent';
export { getInterstitialAdStatus, preloadInterstitialAd, showInterstitialAd } from './interstitialAds';
export { isAdsSdkAvailable } from './nativeAds';
export { getRewardedAdStatus, preloadRewardedAd, showRewardedAd, type ShowRewardedResult } from './rewardedAds';

let initialized = false;

// Called once from services/bootstrap.ts, after game state has hydrated and
// the app is ready to open - never blocks or delays startup, and never
// shows an ad itself. Consent -> SDK init -> background preload, exactly
// the sequence the task calls for; any failure at any step just leaves ads
// unavailable for this session rather than breaking anything else.
export async function initializeAds(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const mobileAds = loadGoogleMobileAds();
  if (!mobileAds) return;

  try {
    const canRequest = await ensureConsent();
    if (!canRequest) return;

    await mobileAds.MobileAds().initialize();

    preloadRewardedAd();
    preloadInterstitialAd();
  } catch (error) {
    console.warn('[ads] initialization failed - ads unavailable this session', error);
  }
}
