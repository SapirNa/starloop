// A plain app.json can't read process.env, and the AdMob native App ID
// needs to differ between "no production ID configured yet" (falls back to
// Google's published demo App ID, safe to ship in a dev/test build) and a
// real production ID once one exists - see the ADMOB_ANDROID_APP_ID /
// ADMOB_IOS_APP_ID comments below for exactly where that goes.
//
// This governs the native AdMob *App* ID only (embedded in the Android
// manifest / iOS Info.plist at build time). Per-placement *Ad Unit* IDs
// (rewarded/interstitial) are a separate, runtime concern - see
// src/services/ads/config.ts.

// Google's official AdMob sample/demo App IDs - documented by Google for
// use during development and testing. Safe defaults; replace via the
// ADMOB_ANDROID_APP_ID / ADMOB_IOS_APP_ID environment variables once real
// production App IDs exist (set them wherever this config is built - a
// local .env consumed by `expo`/`eas build`, or as EAS secrets).
const DEFAULT_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
const DEFAULT_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';

// An unset env var is undefined, but a .env file with the key present and
// left blank (e.g. `ADMOB_IOS_APP_ID=`) is an empty string - `??` alone
// wouldn't catch that, and would ship a blank native App ID.
function envOrDefault(value, fallback) {
  return value ? value : fallback;
}

module.exports = {
  expo: {
    name: 'startloop',
    slug: 'startloop',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
    },
    android: {
      package: 'com.sapir.starloop',
      adaptiveIcon: {
        // Matches assets/android-icon-background.png's deep-space gradient -
        // only used as a fallback where backgroundImage isn't honored,
        // since backgroundImage takes precedence when both are set.
        backgroundColor: '#150f30',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-audio',
      'expo-asset',
      'expo-font',
      'expo-system-ui',
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: envOrDefault(process.env.ADMOB_ANDROID_APP_ID, DEFAULT_ANDROID_APP_ID),
          iosAppId: envOrDefault(process.env.ADMOB_IOS_APP_ID, DEFAULT_IOS_APP_ID),
          userTrackingUsageDescription:
            'This identifier will be used to deliver ads that are more relevant to you.',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '65c4c58f-4395-4c33-a70c-70bf20d74cfc',
      },
    },
  },
};
