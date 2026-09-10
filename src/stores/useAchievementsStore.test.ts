import * as storage from '../services/storage';
import { useAchievementsStore } from './useAchievementsStore';
import { useEconomyStore } from './useEconomyStore';
import { usePlayerStatsStore } from './usePlayerStatsStore';

beforeEach(async () => {
  await usePlayerStatsStore.getState().resetStats();
  await useEconomyStore.getState().resetEconomy();
  await storage.saveAchievements(storage.DEFAULT_ACHIEVEMENTS);
  useAchievementsStore.setState({ claimedAchievementIds: [], isHydrated: false });
});

describe('getProgress', () => {
  it('shows FIRST_LOOP incomplete before any capture', () => {
    const progress = useAchievementsStore
      .getState()
      .getProgress()
      .find((entry) => entry.definition.id === 'FIRST_LOOP');
    expect(progress?.isComplete).toBe(false);
  });

  it('shows FIRST_LOOP complete after a single capture', () => {
    usePlayerStatsStore.getState().recordCapture({
      starCount: 1,
      goldCount: 0,
      isCombo: false,
      scoreEarned: 10,
    });

    const progress = useAchievementsStore
      .getState()
      .getProgress()
      .find((entry) => entry.definition.id === 'FIRST_LOOP');
    expect(progress?.isComplete).toBe(true);
  });
});

describe('claim', () => {
  it('refuses to claim an incomplete achievement', () => {
    expect(useAchievementsStore.getState().claim('FIRST_LOOP')).toBe(false);
  });

  it('claims a completed achievement exactly once and credits coins', () => {
    usePlayerStatsStore.getState().recordCapture({
      starCount: 1,
      goldCount: 0,
      isCombo: false,
      scoreEarned: 10,
    });

    const coinsBefore = useEconomyStore.getState().coins;
    expect(useAchievementsStore.getState().claim('FIRST_LOOP')).toBe(true);
    expect(useEconomyStore.getState().coins).toBeGreaterThan(coinsBefore);

    expect(useAchievementsStore.getState().claim('FIRST_LOOP')).toBe(false);
  });
});

describe('persistence across a simulated app restart', () => {
  it('reloads the claimed set on hydrate', async () => {
    usePlayerStatsStore.getState().recordCapture({
      starCount: 1,
      goldCount: 0,
      isCombo: false,
      scoreEarned: 10,
    });
    useAchievementsStore.getState().claim('FIRST_LOOP');

    await new Promise((resolve) => setTimeout(resolve, 0));

    useAchievementsStore.setState({ claimedAchievementIds: [], isHydrated: false });
    await useAchievementsStore.getState().hydrate();

    expect(useAchievementsStore.getState().claimedAchievementIds).toContain('FIRST_LOOP');
  });
});
