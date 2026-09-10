import { create } from 'zustand';

import * as storage from '../services/storage';
import type { ObjectiveTutorialId } from '../data/objectiveTutorials';

interface TutorialState {
  isHydrated: boolean;
  seenStepIds: string[];
  seenObjectiveTutorials: string[];
  hydrate: () => Promise<void>;
  hasSeen: (stepId: string) => boolean;
  markSeen: (stepId: string) => void;
  hasSeenObjectiveTutorial: (id: ObjectiveTutorialId) => boolean;
  markObjectiveTutorialSeen: (id: ObjectiveTutorialId) => void;
  // For a future Settings/Help "replay tutorials" entry - not wired into
  // any UI yet, just the state operation it would call.
  resetObjectiveTutorials: () => void;
}

function persistState(state: TutorialState): void {
  void storage.saveTutorial({
    schemaVersion: storage.CURRENT_SCHEMA_VERSION,
    seenStepIds: state.seenStepIds,
    seenObjectiveTutorials: state.seenObjectiveTutorials,
  });
}

export const useTutorialStore = create<TutorialState>()((set, get) => ({
  isHydrated: false,
  seenStepIds: [],
  seenObjectiveTutorials: [],

  hydrate: async () => {
    const data = await storage.loadTutorial();
    set({
      seenStepIds: data.seenStepIds,
      seenObjectiveTutorials: data.seenObjectiveTutorials,
      isHydrated: true,
    });
  },

  hasSeen: (stepId) => get().seenStepIds.includes(stepId),

  markSeen: (stepId) => {
    if (get().seenStepIds.includes(stepId)) return;
    set((state) => ({ seenStepIds: [...state.seenStepIds, stepId] }));
    persistState(get());
  },

  hasSeenObjectiveTutorial: (id) => get().seenObjectiveTutorials.includes(id),

  markObjectiveTutorialSeen: (id) => {
    if (get().seenObjectiveTutorials.includes(id)) return;
    set((state) => ({ seenObjectiveTutorials: [...state.seenObjectiveTutorials, id] }));
    persistState(get());
  },

  resetObjectiveTutorials: () => {
    set({ seenObjectiveTutorials: [] });
    persistState(get());
  },
}));
