import { Platform } from 'react-native';

import { loadGoogleMobileAds } from './nativeAds';

// Ad Unit IDs are a *runtime* (per-placement) concern, distinct from the
// native AdMob *App* ID configured in app.config.js. Production values are
// never hardcoded here - set them via EXPO_PUBLIC_ prefixed env vars
// (Expo's standard, Metro-inlined mechanism for client-readable config, no
// extra package required) wherever this app is built:
//
//   EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
//   EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
//   EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
//   EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-xxxxxxxx/xxxxxxxxxx
//
// Until those exist, and always in a development build, Google's own
// TestIds are used - StarLoop must never request a real ad during
// development (see __DEV__ below).
function resolveAdUnitId(
  envAndroid: string | undefined,
  envIos: string | undefined,
  fallbackTestId: string
): string {
  if (__DEV__) return fallbackTestId;

  const configured = Platform.select({ android: envAndroid, ios: envIos });
  if (configured) return configured;

  // Fails safely rather than silently: a production build shipped without
  // real Ad Unit IDs configured will still serve Google's test ads (never
  // crash, never show a broken placement) but says so loudly in logs so
  // this is never mistaken for a finished production configuration.
  console.warn(
    '[ads] No production Ad Unit ID configured for this platform - falling back to a Google test ad. ' +
      'Set the EXPO_PUBLIC_ADMOB_* environment variables before a real release build.'
  );
  return fallbackTestId;
}

// TestIds is plain data from the JS side of the package - safe to read even
// when the native module itself isn't available (Expo Go), so this doesn't
// need the loadGoogleMobileAds() guard.
const mobileAds = loadGoogleMobileAds();
const TEST_REWARDED = mobileAds?.TestIds.REWARDED ?? 'test-rewarded-unavailable';
const TEST_INTERSTITIAL = mobileAds?.TestIds.INTERSTITIAL ?? 'test-interstitial-unavailable';

export const AD_UNIT_IDS = {
  rewarded: resolveAdUnitId(
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID,
    process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID,
    TEST_REWARDED
  ),
  interstitial: resolveAdUnitId(
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID,
    process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
    TEST_INTERSTITIAL
  ),
} as const;

// ---------------------------------------------------------------------------
// Placement-specific tuning. Every reward amount/limit an ad placement uses
// lives here, not hardcoded in a screen - see the individual ads/*.ts
// modules and stores/useAdsStore.ts for where each is applied.
// ---------------------------------------------------------------------------

export const MAX_REWARDED_COIN_ADS_PER_DAY = 3;
export const REWARDED_COIN_AD_AMOUNT = 100;

export const CONTINUE_BONUS_SECONDS = 30;
export const CONTINUE_BONUS_LOOPS = 1;
export const MAX_REWARDED_CONTINUES_PER_ATTEMPT = 1;
