jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-audio's native player class extends a real native binding that
// doesn't exist under Jest/Node - importing it (even without ever playing
// anything) throws. Nothing in the test suite exercises actual audio
// playback, so a minimal no-op stand-in is enough to let modules that
// import services/audio.ts load.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    replace: jest.fn(),
    remove: jest.fn(),
    loop: false,
    muted: false,
    volume: 1,
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// react-native-google-mobile-ads is a native module with no native binding
// under Jest (jest-expo's built-in mocks don't cover third-party packages).
// Nothing in the test suite exercises real ad playback - services/ads/*
// already guards every real call behind loadGoogleMobileAds() - this stub
// only needs to exist so importing it (e.g. to read TestIds) never throws.
jest.mock('react-native-google-mobile-ads', () => ({
  TestIds: { REWARDED: 'test-rewarded', INTERSTITIAL: 'test-interstitial' },
  AdEventType: { LOADED: 'loaded', ERROR: 'error', OPENED: 'opened', CLOSED: 'closed', CLICKED: 'clicked' },
  RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned_reward' },
  AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED', NOT_REQUIRED: 'NOT_REQUIRED' },
  AdsConsent: {
    gatherConsent: jest.fn(() => Promise.resolve({ canRequestAds: true })),
    getConsentInfo: jest.fn(() =>
      Promise.resolve({ canRequestAds: true, privacyOptionsRequirementStatus: 'NOT_REQUIRED' })
    ),
    showPrivacyOptionsForm: jest.fn(() => Promise.resolve({ canRequestAds: true })),
  },
  MobileAds: jest.fn(() => ({ initialize: jest.fn(() => Promise.resolve([])) })),
  RewardedAd: { createForAdRequest: jest.fn(() => ({ load: jest.fn(), addAdEventListener: jest.fn(() => jest.fn()) })) },
  InterstitialAd: { createForAdRequest: jest.fn(() => ({ load: jest.fn(), addAdEventListener: jest.fn(() => jest.fn()) })) },
}));
