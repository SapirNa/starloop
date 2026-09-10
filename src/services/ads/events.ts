// Internal ad-lifecycle events, kept structured (not scattered console.logs)
// so real analytics can be wired in later without touching rewardedAds.ts /
// interstitialAds.ts - swap the body of logAdEvent for a real analytics
// call when one exists. No fake/placeholder network calls are made here.
export type AdEventName =
  | 'rewarded_requested'
  | 'rewarded_loaded'
  | 'rewarded_started'
  | 'rewarded_completed'
  | 'rewarded_failed'
  | 'interstitial_loaded'
  | 'interstitial_shown'
  | 'interstitial_failed';

export interface AdEventData {
  placement?: string;
  reason?: string;
}

export function logAdEvent(event: AdEventName, data?: AdEventData): void {
  if (__DEV__) {
    console.log(`[ads] ${event}`, data ?? '');
  }
}
