import { create } from 'zustand';

import * as storage from '../services/storage';

const MAX_DISPLAY_NAME_LENGTH = 20;

interface ProfileState {
  isHydrated: boolean;
  displayName: string;
  hydrate: () => Promise<void>;
  setDisplayName: (name: string) => void;
}

function persistState(state: ProfileState): void {
  void storage.saveProfile({
    schemaVersion: storage.CURRENT_SCHEMA_VERSION,
    displayName: state.displayName,
  });
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
  isHydrated: false,
  displayName: storage.DEFAULT_PROFILE.displayName,

  hydrate: async () => {
    const data = await storage.loadProfile();
    set({ displayName: data.displayName, isHydrated: true });
  },

  setDisplayName: (name) => {
    const trimmed = name.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
    if (!trimmed) return;
    set({ displayName: trimmed });
    persistState(get());
  },
}));
