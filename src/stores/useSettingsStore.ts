import { create } from 'zustand';

import * as storage from '../services/storage';

interface SettingsState {
  isHydrated: boolean;
  musicEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  hydrate: () => Promise<void>;
  setMusicEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  // Persists the flag only - requesting OS permission and (re)scheduling
  // reminders is orchestrated by services/notifications.ts, not here, so
  // this store stays a plain settings container like the others.
  setNotificationsEnabled: (enabled: boolean) => void;
}

function persistState(state: SettingsState): void {
  void storage.saveSettings({
    schemaVersion: storage.CURRENT_SCHEMA_VERSION,
    musicEnabled: state.musicEnabled,
    soundEnabled: state.soundEnabled,
    hapticsEnabled: state.hapticsEnabled,
    notificationsEnabled: state.notificationsEnabled,
  });
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  isHydrated: false,
  musicEnabled: true,
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: true,

  hydrate: async () => {
    const data = await storage.loadSettings();
    set({
      musicEnabled: data.musicEnabled,
      soundEnabled: data.soundEnabled,
      hapticsEnabled: data.hapticsEnabled,
      notificationsEnabled: data.notificationsEnabled,
      isHydrated: true,
    });
  },

  setMusicEnabled: (enabled) => {
    set({ musicEnabled: enabled });
    persistState(get());
  },

  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
    persistState(get());
  },

  setHapticsEnabled: (enabled) => {
    set({ hapticsEnabled: enabled });
    persistState(get());
  },

  setNotificationsEnabled: (enabled) => {
    set({ notificationsEnabled: enabled });
    persistState(get());
  },
}));
