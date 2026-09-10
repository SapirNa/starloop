import { LEVELS } from '../data/levels';
import * as storage from '../services/storage';
import { useProgressStore } from './useProgressStore';

beforeEach(async () => {
  // resetProgress both clears AsyncStorage and restores the "level 1
  // unlocked" baseline, so every test starts from a clean save.
  await useProgressStore.getState().resetProgress();
});

describe('initial state', () => {
  it('unlocks only the first level before anything is completed', () => {
    expect(useProgressStore.getState().isLevelUnlocked(LEVELS[0].id)).toBe(true);
    expect(useProgressStore.getState().isLevelUnlocked(LEVELS[1].id)).toBe(false);
  });
});

describe('completing a level', () => {
  it('records the score and rating, and unlocking the next level makes it playable', () => {
    const [level1, level2] = LEVELS;

    useProgressStore.getState().recordLevelResult(level1.id, 80, 2);
    expect(useProgressStore.getState().isLevelUnlocked(level2.id)).toBe(false);

    useProgressStore.getState().unlockLevel(level2.id);
    expect(useProgressStore.getState().isLevelUnlocked(level2.id)).toBe(true);

    const progress = useProgressStore.getState().getLevelProgress(level1.id);
    expect(progress.completed).toBe(true);
    expect(progress.bestScore).toBe(80);
    expect(progress.bestRating).toBe(2);
  });

  it('reports first-completion only once, so callers award coins exactly once', () => {
    const level = LEVELS[0];

    expect(useProgressStore.getState().recordLevelResult(level.id, 50, 1)).toBe(true);
    expect(useProgressStore.getState().recordLevelResult(level.id, 60, 1)).toBe(false);
  });
});

describe('replaying a completed level', () => {
  it('keeps the best score and rating rather than overwriting with a worse run', () => {
    const level = LEVELS[0];

    useProgressStore.getState().recordLevelResult(level.id, 90, 3);
    useProgressStore.getState().recordLevelResult(level.id, 40, 1);

    const progress = useProgressStore.getState().getLevelProgress(level.id);
    expect(progress.bestScore).toBe(90);
    expect(progress.bestRating).toBe(3);
  });

  it('updates the best score and rating when a replay does better', () => {
    const level = LEVELS[0];

    useProgressStore.getState().recordLevelResult(level.id, 40, 1);
    useProgressStore.getState().recordLevelResult(level.id, 90, 3);

    const progress = useProgressStore.getState().getLevelProgress(level.id);
    expect(progress.bestScore).toBe(90);
    expect(progress.bestRating).toBe(3);
  });

  it('stays unlocked and playable after completion (replay allowed)', () => {
    const level = LEVELS[0];
    useProgressStore.getState().recordLevelResult(level.id, 50, 1);
    expect(useProgressStore.getState().isLevelUnlocked(level.id)).toBe(true);
  });
});

describe('persistence across a simulated app restart', () => {
  it('reloads saved progress on hydrate after closing and reopening the app', async () => {
    const [level1, level2] = LEVELS;
    useProgressStore.getState().recordLevelResult(level1.id, 75, 2);
    useProgressStore.getState().unlockLevel(level2.id);

    // Persisting happens fire-and-forget; let it flush before "reopening".
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate a fresh app launch: reset in-memory state, then hydrate from
    // whatever is on disk, exactly like App.tsx does on mount.
    useProgressStore.setState({ levels: {}, isHydrated: false });
    await useProgressStore.getState().hydrate();

    expect(useProgressStore.getState().isLevelUnlocked(level2.id)).toBe(true);
    expect(useProgressStore.getState().getLevelProgress(level1.id).bestScore).toBe(75);
  });

  it('falls back to the level-1-unlocked baseline when there is no save data', async () => {
    await storage.resetProgress();
    useProgressStore.setState({ levels: {}, isHydrated: false });

    await useProgressStore.getState().hydrate();

    expect(useProgressStore.getState().isLevelUnlocked(LEVELS[0].id)).toBe(true);
    expect(useProgressStore.getState().isLevelUnlocked(LEVELS[1].id)).toBe(false);
  });
});
