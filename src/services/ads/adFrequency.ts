// All interstitial cadence rules in one place, as pure functions over a
// small state shape - testable without touching the ad SDK, a Zustand
// store, or React. stores/useAdsStore.ts owns persisting the state this
// operates on; services/ads/interstitialAds.ts is the only caller.
export const INTERSTITIAL_RULES = {
  // No interstitial at all until this many levels have been completed.
  minLevelsBeforeFirst: 3,
  // After showing one, wait this many more completed levels.
  levelsBetweenInterstitials: 4,
  // ...and at least this long, regardless of level count.
  minMinutesBetweenInterstitials: 5,
  // Never immediately after a rewarded ad, even if the level-count/time
  // rules above would otherwise allow it.
  minMinutesAfterRewardedBeforeInterstitial: 5,
} as const;

export interface InterstitialFrequencyState {
  levelsSinceLastInterstitial: number;
  lastInterstitialAt: number | null;
  lastRewardedCompletedAt: number | null;
}

function minutesSince(timestamp: number, now: number): number {
  return (now - timestamp) / 60_000;
}

// ALL applicable rules must pass - this is deliberately conservative
// (returns false on anything not yet satisfied) rather than showing an
// interstitial "when in doubt".
export function canShowInterstitial(state: InterstitialFrequencyState, now: number): boolean {
  const hasShownBefore = state.lastInterstitialAt !== null;
  const levelsRequired = hasShownBefore
    ? INTERSTITIAL_RULES.levelsBetweenInterstitials
    : INTERSTITIAL_RULES.minLevelsBeforeFirst;
  if (state.levelsSinceLastInterstitial < levelsRequired) return false;

  if (
    state.lastInterstitialAt !== null &&
    minutesSince(state.lastInterstitialAt, now) < INTERSTITIAL_RULES.minMinutesBetweenInterstitials
  ) {
    return false;
  }

  if (
    state.lastRewardedCompletedAt !== null &&
    minutesSince(state.lastRewardedCompletedAt, now) <
      INTERSTITIAL_RULES.minMinutesAfterRewardedBeforeInterstitial
  ) {
    return false;
  }

  return true;
}
