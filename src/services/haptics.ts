import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '../stores/useSettingsStore';
import { isIOS, isAndroid } from '../utils/platform';

const isSupported = isIOS || isAndroid;

function isEnabled(): boolean {
  return isSupported && useSettingsStore.getState().hapticsEnabled;
}

export async function impactLight(): Promise<void> {
  if (!isEnabled()) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function impactMedium(): Promise<void> {
  if (!isEnabled()) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export async function impactHeavy(): Promise<void> {
  if (!isEnabled()) return;
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export async function selection(): Promise<void> {
  if (!isEnabled()) return;
  await Haptics.selectionAsync();
}

export async function notificationSuccess(): Promise<void> {
  if (!isEnabled()) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export async function notificationError(): Promise<void> {
  if (!isEnabled()) return;
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
