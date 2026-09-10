import * as storage from '../services/storage';
import { useDailyRewardsStore } from './useDailyRewardsStore';
import { useEconomyStore } from './useEconomyStore';

beforeEach(async () => {
  await storage.saveDailyRewards(storage.DEFAULT_DAILY_REWARDS);
  await useEconomyStore.getState().resetEconomy();
  useDailyRewardsStore.setState({
    lastClaimDate: null,
    dailyStreak: 0,
    currentRewardDay: 1,
    isHydrated: false,
  });
});

describe('claim', () => {
  it('grants the reward and credits coins to the economy', () => {
    const coinsBefore = useEconomyStore.getState().coins;
    const reward = useDailyRewardsStore.getState().claim();

    expect(reward).not.toBeNull();
    expect(useEconomyStore.getState().coins).toBe(coinsBefore + (reward?.coins ?? 0));
  });

  it('prevents a duplicate claim on the same day', () => {
    const first = useDailyRewardsStore.getState().claim();
    expect(first).not.toBeNull();

    const second = useDailyRewardsStore.getState().claim();
    expect(second).toBeNull();
  });

  it('does not grant coins twice for a blocked duplicate claim', () => {
    useDailyRewardsStore.getState().claim();
    const coinsAfterFirst = useEconomyStore.getState().coins;

    useDailyRewardsStore.getState().claim();
    expect(useEconomyStore.getState().coins).toBe(coinsAfterFirst);
  });
});

describe('getClaimStatus', () => {
  it('reports claimable before any claim', () => {
    expect(useDailyRewardsStore.getState().getClaimStatus()).toEqual({ canClaim: true });
  });

  it('reports not claimable right after a claim', () => {
    useDailyRewardsStore.getState().claim();
    expect(useDailyRewardsStore.getState().getClaimStatus().canClaim).toBe(false);
  });
});

describe('persistence across a simulated app restart', () => {
  it('reloads the streak and reward day on hydrate', async () => {
    useDailyRewardsStore.getState().claim();
    const streakAfterClaim = useDailyRewardsStore.getState().dailyStreak;

    await new Promise((resolve) => setTimeout(resolve, 0));

    useDailyRewardsStore.setState({ dailyStreak: 0, lastClaimDate: null, isHydrated: false });
    await useDailyRewardsStore.getState().hydrate();

    expect(useDailyRewardsStore.getState().dailyStreak).toBe(streakAfterClaim);
    expect(useDailyRewardsStore.getState().lastClaimDate).not.toBeNull();
  });

  it('falls back to a fresh, claimable state when there is no save data', async () => {
    await storage.saveDailyRewards(storage.DEFAULT_DAILY_REWARDS);
    await useDailyRewardsStore.getState().hydrate();

    expect(useDailyRewardsStore.getState().getClaimStatus()).toEqual({ canClaim: true });
    expect(useDailyRewardsStore.getState().dailyStreak).toBe(0);
  });
});
