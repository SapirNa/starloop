import { isRunningInExpoGo } from 'expo';

import type * as GoogleMobileAdsModule from 'react-native-google-mobile-ads';

// react-native-google-mobile-ads requires native code that is never present
// in Expo Go (any platform, any SDK version) - it only works in a real
// development or production build (see eas.json / app.config.js). Importing
// it in Expo Go, or calling into it, would throw. Rather than let that
// crash the app, this is the single guarded gateway every other ads/*
// module goes through - see services/notifications.ts for the same pattern
// applied to expo-notifications.
export const isAdsSdkAvailable = !isRunningInExpoGo();

let cached: typeof GoogleMobileAdsModule | null = null;
let attempted = false;

export function loadGoogleMobileAds(): typeof GoogleMobileAdsModule | null {
  if (attempted) return cached;
  attempted = true;
  if (!isAdsSdkAvailable) return cached;

  try {
    // A dynamic require (not a static import) is required here for the same
    // reason as services/notifications.ts: a static import would be hoisted
    // and evaluated unconditionally, before the guard above runs.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('react-native-google-mobile-ads');
  } catch {
    cached = null;
  }
  return cached;
}
