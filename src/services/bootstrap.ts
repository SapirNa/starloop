import { initializeAds } from './ads';
import { playMusic } from './audio';
import { refreshScheduledNotifications } from './notifications';
import { useAchievementsStore } from '../stores/useAchievementsStore';
import { useAdsStore } from '../stores/useAdsStore';
import { useChallengesStore } from '../stores/useChallengesStore';
import { useDailyRewardsStore } from '../stores/useDailyRewardsStore';
import { useEconomyStore } from '../stores/useEconomyStore';
import { usePlayerStatsStore } from '../stores/usePlayerStatsStore';
import { useProfileStore } from '../stores/useProfileStore';
import { useProgressStore } from '../stores/useProgressStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTutorialStore } from '../stores/useTutorialStore';

// Loads every persisted store from AsyncStorage. Called once from
// SplashScreen before the app navigates to Home.
export async function hydrateAll(): Promise<void> {
  // Challenges/achievements derive their progress from progress, player
  // stats, and daily-rewards state, so those must finish loading first or a
  // first-launch-of-the-day race could snapshot a stale (zeroed) baseline.
  await Promise.all([
    useProgressStore.getState().hydrate(),
    useSettingsStore.getState().hydrate(),
    useProfileStore.getState().hydrate(),
    useEconomyStore.getState().hydrate(),
    usePlayerStatsStore.getState().hydrate(),
    useDailyRewardsStore.getState().hydrate(),
    useTutorialStore.getState().hydrate(),
    useAdsStore.getState().hydrate(),
  ]);
  await Promise.all([
    useChallengesStore.getState().hydrate(),
    useAchievementsStore.getState().hydrate(),
  ]);

  void playMusic();
  // Only re-syncs scheduling to match whatever permission/settings state
  // already exists (a no-op if permission was never granted) - never
  // prompts for permission itself. See services/notifications.ts.
  void refreshScheduledNotifications();
  // Consent -> SDK init -> background preload. Never blocks startup and
  // never shows an ad itself - see services/ads/index.ts.
  void initializeAds();
}
