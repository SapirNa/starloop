import { canShowInterstitial, INTERSTITIAL_RULES, type InterstitialFrequencyState } from './adFrequency';

const NOW = 1_700_000_000_000;
const MINUTE = 60_000;

function state(overrides: Partial<InterstitialFrequencyState> = {}): InterstitialFrequencyState {
  return {
    levelsSinceLastInterstitial: 0,
    lastInterstitialAt: null,
    lastRewardedCompletedAt: null,
    ...overrides,
  };
}

describe('canShowInterstitial', () => {
  it('blocks the very first interstitial before minLevelsBeforeFirst levels are completed', () => {
    expect(canShowInterstitial(state({ levelsSinceLastInterstitial: 2 }), NOW)).toBe(false);
  });

  it('allows the very first interstitial once minLevelsBeforeFirst levels are completed', () => {
    expect(
      canShowInterstitial(
        state({ levelsSinceLastInterstitial: INTERSTITIAL_RULES.minLevelsBeforeFirst }),
        NOW
      )
    ).toBe(true);
  });

  it('after one has shown, blocks until levelsBetweenInterstitials more levels complete', () => {
    const afterFirst = state({
      levelsSinceLastInterstitial: 3,
      lastInterstitialAt: NOW - 10 * MINUTE,
    });
    expect(canShowInterstitial(afterFirst, NOW)).toBe(false);
  });

  it('allows another once levelsBetweenInterstitials have completed and enough time has passed', () => {
    const eligible = state({
      levelsSinceLastInterstitial: INTERSTITIAL_RULES.levelsBetweenInterstitials,
      lastInterstitialAt: NOW - 10 * MINUTE,
    });
    expect(canShowInterstitial(eligible, NOW)).toBe(true);
  });

  it('blocks if minMinutesBetweenInterstitials has not yet elapsed, even with enough levels', () => {
    const tooSoon = state({
      levelsSinceLastInterstitial: INTERSTITIAL_RULES.levelsBetweenInterstitials,
      lastInterstitialAt: NOW - (INTERSTITIAL_RULES.minMinutesBetweenInterstitials - 1) * MINUTE,
    });
    expect(canShowInterstitial(tooSoon, NOW)).toBe(false);
  });

  it('blocks soon after a rewarded ad, even if every other rule passes', () => {
    const justRewarded = state({
      levelsSinceLastInterstitial: INTERSTITIAL_RULES.minLevelsBeforeFirst,
      lastRewardedCompletedAt: NOW - (INTERSTITIAL_RULES.minMinutesAfterRewardedBeforeInterstitial - 1) * MINUTE,
    });
    expect(canShowInterstitial(justRewarded, NOW)).toBe(false);
  });

  it('allows once enough time has passed since the rewarded ad', () => {
    const longAfterRewarded = state({
      levelsSinceLastInterstitial: INTERSTITIAL_RULES.minLevelsBeforeFirst,
      lastRewardedCompletedAt: NOW - (INTERSTITIAL_RULES.minMinutesAfterRewardedBeforeInterstitial + 1) * MINUTE,
    });
    expect(canShowInterstitial(longAfterRewarded, NOW)).toBe(true);
  });
});
