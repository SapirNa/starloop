import { loadGoogleMobileAds } from './nativeAds';

// Thin wrapper around the Google Mobile Ads SDK's own UMP (User Messaging
// Platform) consent flow - the SDK-supported mechanism, not a homemade
// popup. Every other ads/* module calls through here rather than touching
// AdsConsent directly, so consent state has one owner.

// True once `ensureConsent()` has resolved (with or without a form actually
// being shown - not every user/region requires one).
let hasGatheredConsent = false;

// Requests/updates consent info and shows Google's consent form only if the
// SDK determines it's required for this user - a no-op (resolves
// immediately) everywhere it isn't. Safe to call multiple times; only does
// real work once per app session.
export async function ensureConsent(): Promise<boolean> {
  if (hasGatheredConsent) return true;

  const mobileAds = loadGoogleMobileAds();
  if (!mobileAds) return false;

  try {
    const info = await mobileAds.AdsConsent.gatherConsent();
    hasGatheredConsent = true;
    return info.canRequestAds;
  } catch (error) {
    // Consent gathering failing (no network, SDK error) must never block
    // the app from opening - ads simply stay unavailable this session.
    console.warn('[ads] consent gathering failed', error);
    return false;
  }
}

// Whether ads are currently allowed to be requested at all, per the last
// known consent state. Callers still get NOT_REQUIRED === true in regions
// with no consent requirement.
export async function canRequestAds(): Promise<boolean> {
  const mobileAds = loadGoogleMobileAds();
  if (!mobileAds) return false;

  try {
    const info = await mobileAds.AdsConsent.getConsentInfo();
    return info.canRequestAds;
  } catch {
    return false;
  }
}

// Whether the "privacy options" entry point should be shown in Settings at
// all - the SDK only requires this when the user has a choice to revisit
// (e.g. under GDPR); showing it unconditionally would be misleading.
export async function isPrivacyOptionsRequired(): Promise<boolean> {
  const mobileAds = loadGoogleMobileAds();
  if (!mobileAds) return false;

  try {
    const info = await mobileAds.AdsConsent.getConsentInfo();
    return info.privacyOptionsRequirementStatus === mobileAds.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch {
    return false;
  }
}

export async function showPrivacyOptionsForm(): Promise<void> {
  const mobileAds = loadGoogleMobileAds();
  if (!mobileAds) return;

  try {
    await mobileAds.AdsConsent.showPrivacyOptionsForm();
  } catch (error) {
    console.warn('[ads] showPrivacyOptionsForm failed', error);
  }
}
