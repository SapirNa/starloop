import { isRunningInExpoGo } from 'expo';
import type * as NotificationsModule from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { evaluateClaim, getLocalDateString } from './dailyRewards';
import { useDailyRewardsStore } from '../stores/useDailyRewardsStore';
import { useSettingsStore } from '../stores/useSettingsStore';

// expo-notifications throws synchronously the instant it's imported on
// Android inside Expo Go: remote/push registration support was removed from
// Expo Go in SDK 53+, and the package runs that check unconditionally as an
// import-time side effect, even though StarLoop only ever schedules *local*
// notifications and never touches push tokens. Rather than force a
// development build just to avoid that crash, this module skips loading
// expo-notifications in that one unsupported environment and every export
// below becomes a safe no-op there instead - a real device build, iOS Expo
// Go, and Android dev/production builds all behave normally.
const notificationsUnsupported = Platform.OS === 'android' && isRunningInExpoGo();

// Exposed so the Settings screen can explain (rather than silently ignore)
// why toggling notifications on has no effect in this one environment.
export const isNotificationsSupported = !notificationsUnsupported;

// A dynamic require (not a static import) is required here: a static
// `import * as Notifications from 'expo-notifications'` gets hoisted by the
// bundler and evaluated unconditionally before this file's own code runs,
// which would throw immediately regardless of the guard above.
function loadNotificationsModule(): typeof NotificationsModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}

const Notifications: typeof NotificationsModule | null = notificationsUnsupported
  ? null
  : loadNotificationsModule();

// Fixed identifiers, one per notification "kind". Scheduling always cancels
// any existing notification under the same identifier first, so re-running
// refreshScheduledNotifications() (background, claim, setting toggle, ...)
// can never produce duplicates - no need to track our own scheduled-ID
// state separately from what expo-notifications already persists natively.
const DAILY_CHECKIN_ID = 'starloop-daily-checkin';
const CHALLENGES_REMINDER_ID = 'starloop-challenges-reminder';
const RETURN_REMINDER_ID = 'starloop-return-reminder';

const DAILY_CHECKIN_DELAY_HOURS = 20;
const CHALLENGES_REMINDER_DELAY_HOURS = 24;
const RETURN_REMINDER_DELAY_HOURS = 48;

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('default', {
      name: 'StarLoop',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

// Requests OS permission only if the user hasn't already answered (granted
// or denied) - never re-prompts. Returns whether notifications can actually
// be sent afterward.
export async function requestPermissionsIfNeeded(): Promise<boolean> {
  if (!Notifications) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

async function cancel(identifier: string): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
}

async function scheduleOnce(
  identifier: string,
  title: string,
  body: string,
  delayHours: number
): Promise<void> {
  if (!Notifications) return;
  await cancel(identifier);
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, data: { kind: identifier } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.round(delayHours * 3600),
      repeats: false,
    },
  });
}

export async function cancelAllStarLoopNotifications(): Promise<void> {
  if (!Notifications) return;
  await Promise.all([cancel(DAILY_CHECKIN_ID), cancel(CHALLENGES_REMINDER_ID), cancel(RETURN_REMINDER_ID)]);
}

// The single place that decides which reminders should currently be
// pending, and (re)schedules or cancels them to match - settings/permission
// changes, a completed claim, and backgrounding the app all just call this
// rather than each managing notifications themselves.
export async function refreshScheduledNotifications(): Promise<void> {
  if (!Notifications) return;

  if (!useSettingsStore.getState().notificationsEnabled) {
    await cancelAllStarLoopNotifications();
    return;
  }

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    await cancelAllStarLoopNotifications();
    return;
  }

  const dailyRewards = useDailyRewardsStore.getState();
  if (evaluateClaim(dailyRewards, getLocalDateString()).canClaim) {
    await scheduleOnce(
      DAILY_CHECKIN_ID,
      'StarLoop',
      'Your daily reward is ready to claim.',
      DAILY_CHECKIN_DELAY_HOURS
    );
  } else {
    await cancel(DAILY_CHECKIN_ID);
  }

  await scheduleOnce(
    CHALLENGES_REMINDER_ID,
    'StarLoop',
    'Fresh daily challenges are waiting for you.',
    CHALLENGES_REMINDER_DELAY_HOURS
  );

  await scheduleOnce(
    RETURN_REMINDER_ID,
    'StarLoop',
    'New stars are waiting for you in Star Garden.',
    RETURN_REMINDER_DELAY_HOURS
  );
}

// Reminders are about bringing the player *back* - the natural moment to
// queue them is when the app leaves the foreground, not while they're
// actively looking at the screen.
AppState.addEventListener('change', (nextState) => {
  if (nextState !== 'active') void refreshScheduledNotifications();
});
