import * as storage from '../services/storage';
import type { PlayerStatsSnapshot } from '../services/storage';
import { useChallengesStore } from './useChallengesStore';
import { useEconomyStore } from './useEconomyStore';
import { usePlayerStatsStore } from './usePlayerStatsStore';

beforeEach(async () => {
  await usePlayerStatsStore.getState().resetStats();
  await useEconomyStore.getState().resetEconomy();
  await storage.saveChallenges(storage.DEFAULT_CHALLENGES);
  useChallengesStore.setState({
    date: null,
    generation: 0,
    activeChallengeIds: [],
    baseline: storage.EMPTY_PLAYER_STATS,
    claimedChallengeIds: [],
    isHydrated: false,
  });
  useChallengesStore.getState().refreshIfNeeded();
});

// Which exact challenges are "today's" depends on the real calendar date
// (see gameplay/challenges.ts selectDailyChallenges), so tests drive
// whichever challenge actually rotated in today rather than assuming a
// fixed one - directly setting the underlying stat its `metric` reads from
// works for any of the pool's metrics.
function completeFirstTodaysChallenge(): string {
  const [first] = useChallengesStore.getState().getTodaysProgress();
  const metric = first.definition.metric as keyof PlayerStatsSnapshot;
  usePlayerStatsStore.setState((state) => ({ [metric]: state[metric] + first.definition.target }));
  return first.definition.id;
}

// Bumps every active challenge's stat to its target, then claims all of
// them in sequence, returning the (pre-regeneration) active id list.
function completeAndClaimEveryActiveChallenge(): string[] {
  const progress = useChallengesStore.getState().getTodaysProgress();
  for (const entry of progress) {
    const metric = entry.definition.metric as keyof PlayerStatsSnapshot;
    usePlayerStatsStore.setState((state) => ({ [metric]: state[metric] + entry.definition.target }));
  }

  const ids = [...useChallengesStore.getState().activeChallengeIds];
  for (const id of ids) {
    useChallengesStore.getState().claim(id);
  }
  return ids;
}

describe('refreshIfNeeded', () => {
  it('captures a baseline snapshot of current stats on first run', () => {
    usePlayerStatsStore.getState().recordCapture({
      starCount: 10,
      goldCount: 0,
      isCombo: false,
      scoreEarned: 100,
    });
    useChallengesStore.setState({ date: null, activeChallengeIds: [] });
    useChallengesStore.getState().refreshIfNeeded();

    expect(useChallengesStore.getState().baseline.starsCaptured).toBe(10);
  });

  it('does not reset an already-current-day, already-generated set', () => {
    usePlayerStatsStore.getState().recordCapture({
      starCount: 5,
      goldCount: 0,
      isCombo: false,
      scoreEarned: 50,
    });
    const baselineBefore = useChallengesStore.getState().baseline;
    const idsBefore = useChallengesStore.getState().activeChallengeIds;
    useChallengesStore.getState().refreshIfNeeded();
    expect(useChallengesStore.getState().baseline).toEqual(baselineBefore);
    expect(useChallengesStore.getState().activeChallengeIds).toEqual(idsBefore);
  });

  it('always yields exactly 3 active challenges', () => {
    expect(useChallengesStore.getState().activeChallengeIds).toHaveLength(3);
  });
});

describe('getTodaysProgress and claim', () => {
  it('starts every one of todays challenges at zero progress', () => {
    const progress = useChallengesStore.getState().getTodaysProgress();
    expect(progress.length).toBeGreaterThan(0);
    for (const entry of progress) {
      expect(entry.progress).toBe(0);
      expect(entry.isComplete).toBe(false);
    }
  });

  it('marks a challenge complete once its underlying stat reaches the target', () => {
    const id = completeFirstTodaysChallenge();
    const progress = useChallengesStore
      .getState()
      .getTodaysProgress()
      .find((entry) => entry.definition.id === id);
    expect(progress?.isComplete).toBe(true);
  });

  it('refuses to claim an incomplete challenge', () => {
    const [first] = useChallengesStore.getState().getTodaysProgress();
    expect(useChallengesStore.getState().claim(first.definition.id)).toEqual({
      success: false,
      regenerated: false,
    });
  });

  it('claims a completed challenge exactly once and credits coins', () => {
    const id = completeFirstTodaysChallenge();
    const definition = useChallengesStore
      .getState()
      .getTodaysProgress()
      .find((entry) => entry.definition.id === id)!.definition;

    const coinsBefore = useEconomyStore.getState().coins;
    expect(useChallengesStore.getState().claim(id)).toEqual({ success: true, regenerated: false });
    expect(useEconomyStore.getState().coins).toBe(coinsBefore + definition.rewardCoins);

    // Duplicate claim prevention.
    expect(useChallengesStore.getState().claim(id)).toEqual({ success: false, regenerated: false });
    expect(useEconomyStore.getState().coins).toBe(coinsBefore + definition.rewardCoins);
  });

  it('records a lifetime challenge-completion count independent of the per-set claimed list', () => {
    completeFirstTodaysChallenge();
    const id = useChallengesStore.getState().getTodaysProgress().find((e) => e.isComplete)!.definition.id;
    useChallengesStore.getState().claim(id);
    expect(usePlayerStatsStore.getState().totalChallengesCompleted).toBe(1);
  });
});

describe('completing all 3 active challenges', () => {
  it('generates 3 new challenges immediately, without waiting for a new day', () => {
    const oldIds = completeAndClaimEveryActiveChallenge();
    const newIds = useChallengesStore.getState().activeChallengeIds;

    expect(newIds).toHaveLength(3);
    // The pool (6) is an exact multiple of the daily count (3), so the
    // regenerated set is guaranteed fully disjoint from the old one.
    expect(newIds.some((id) => oldIds.includes(id))).toBe(false);
  });

  it('clears claimed state for the new set', () => {
    completeAndClaimEveryActiveChallenge();
    expect(useChallengesStore.getState().claimedChallengeIds).toHaveLength(0);
  });

  it('resets progress to zero for the new set - old progress does not leak in', () => {
    completeAndClaimEveryActiveChallenge();
    const progress = useChallengesStore.getState().getTodaysProgress();
    for (const entry of progress) {
      expect(entry.progress).toBe(0);
      expect(entry.isComplete).toBe(false);
    }
  });

  it('reports regenerated:true only on the claim that completes the set', () => {
    const progress = useChallengesStore.getState().getTodaysProgress();
    for (const entry of progress) {
      const metric = entry.definition.metric as keyof PlayerStatsSnapshot;
      usePlayerStatsStore.setState((state) => ({ [metric]: state[metric] + entry.definition.target }));
    }
    const ids = [...useChallengesStore.getState().activeChallengeIds];

    expect(useChallengesStore.getState().claim(ids[0])).toEqual({ success: true, regenerated: false });
    expect(useChallengesStore.getState().claim(ids[1])).toEqual({ success: true, regenerated: false });
    expect(useChallengesStore.getState().claim(ids[2])).toEqual({ success: true, regenerated: true });
  });
});

describe('persistence across a simulated app restart', () => {
  it('reloads the baseline and claimed set on hydrate', async () => {
    const id = completeFirstTodaysChallenge();
    useChallengesStore.getState().claim(id);

    await new Promise((resolve) => setTimeout(resolve, 0));

    useChallengesStore.setState({ claimedChallengeIds: [], isHydrated: false });
    await useChallengesStore.getState().hydrate();

    expect(useChallengesStore.getState().claimedChallengeIds).toContain(id);
  });

  it('preserves partial progress across a restart without completing the set', async () => {
    const id = completeFirstTodaysChallenge();
    const activeIdsBefore = useChallengesStore.getState().activeChallengeIds;

    await new Promise((resolve) => setTimeout(resolve, 0));

    useChallengesStore.setState({ activeChallengeIds: [], isHydrated: false });
    await useChallengesStore.getState().hydrate();

    expect(useChallengesStore.getState().activeChallengeIds).toEqual(activeIdsBefore);
    const restored = useChallengesStore
      .getState()
      .getTodaysProgress()
      .find((entry) => entry.definition.id === id);
    expect(restored?.isComplete).toBe(true);
  });
});
