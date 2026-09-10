import { usePlayerStatsStore } from './usePlayerStatsStore';

beforeEach(async () => {
  await usePlayerStatsStore.getState().resetStats();
});

describe('recordCapture', () => {
  it('accumulates stars and gold stars captured', () => {
    usePlayerStatsStore.getState().recordCapture({
      starCount: 3,
      goldCount: 1,
      isCombo: true,
      scoreEarned: 45,
    });

    const state = usePlayerStatsStore.getState();
    expect(state.starsCaptured).toBe(3);
    expect(state.goldStarsCaptured).toBe(1);
    expect(state.comboLoopsMade).toBe(1);
    expect(state.totalScoreEarned).toBe(45);
    expect(state.bestComboEver).toBe(3);
  });

  it('does not count a single-star capture as a combo loop', () => {
    usePlayerStatsStore.getState().recordCapture({
      starCount: 1,
      goldCount: 0,
      isCombo: false,
      scoreEarned: 10,
    });
    expect(usePlayerStatsStore.getState().comboLoopsMade).toBe(0);
  });

  it('tracks the best combo ever across multiple captures', () => {
    usePlayerStatsStore.getState().recordCapture({ starCount: 2, goldCount: 0, isCombo: true, scoreEarned: 20 });
    usePlayerStatsStore.getState().recordCapture({ starCount: 5, goldCount: 0, isCombo: true, scoreEarned: 50 });
    usePlayerStatsStore.getState().recordCapture({ starCount: 3, goldCount: 0, isCombo: true, scoreEarned: 30 });
    expect(usePlayerStatsStore.getState().bestComboEver).toBe(5);
  });
});

describe('recordLevelCompletion', () => {
  it('increments levelsCompleted', () => {
    usePlayerStatsStore.getState().recordLevelCompletion(6);
    expect(usePlayerStatsStore.getState().levelsCompleted).toBe(1);
  });

  it('counts a completion under 4 loops', () => {
    usePlayerStatsStore.getState().recordLevelCompletion(3);
    expect(usePlayerStatsStore.getState().levelsCompletedUnderFourLoops).toBe(1);
  });

  it('does not count a completion at or above 4 loops', () => {
    usePlayerStatsStore.getState().recordLevelCompletion(4);
    expect(usePlayerStatsStore.getState().levelsCompletedUnderFourLoops).toBe(0);
  });
});

describe('persistence across a simulated app restart', () => {
  it('reloads accumulated stats on hydrate', async () => {
    usePlayerStatsStore.getState().recordCapture({ starCount: 4, goldCount: 2, isCombo: true, scoreEarned: 60 });
    usePlayerStatsStore.getState().recordLevelCompletion(2);

    await new Promise((resolve) => setTimeout(resolve, 0));

    usePlayerStatsStore.setState({ starsCaptured: 0, levelsCompleted: 0, isHydrated: false });
    await usePlayerStatsStore.getState().hydrate();

    expect(usePlayerStatsStore.getState().starsCaptured).toBe(4);
    expect(usePlayerStatsStore.getState().levelsCompleted).toBe(1);
  });
});
