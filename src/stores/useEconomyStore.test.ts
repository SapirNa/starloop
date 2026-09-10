import { useEconomyStore } from './useEconomyStore';

beforeEach(async () => {
  await useEconomyStore.getState().resetEconomy();
});

describe('coins', () => {
  it('adds coins', () => {
    useEconomyStore.getState().addCoins(50);
    expect(useEconomyStore.getState().coins).toBe(50);
  });

  it('spends coins when there is enough', () => {
    useEconomyStore.getState().addCoins(50);
    expect(useEconomyStore.getState().spendCoins(30)).toBe(true);
    expect(useEconomyStore.getState().coins).toBe(20);
  });

  it('refuses to spend more coins than available', () => {
    useEconomyStore.getState().addCoins(10);
    expect(useEconomyStore.getState().spendCoins(30)).toBe(false);
    expect(useEconomyStore.getState().coins).toBe(10);
  });
});

describe('hints', () => {
  it('adds and spends hints', () => {
    useEconomyStore.getState().addHints(2);
    expect(useEconomyStore.getState().spendHint()).toBe(true);
    expect(useEconomyStore.getState().hints).toBe(2); // 1 (starter) + 2 - 1
  });

  it('refuses to spend a hint when there are none', () => {
    useEconomyStore.setState({ hints: 0 });
    expect(useEconomyStore.getState().spendHint()).toBe(false);
  });
});

describe('power-up inventory', () => {
  it('adds and consumes power-up charges', () => {
    useEconomyStore.getState().addPowerUp('FREEZE_TIME', 2);
    const before = useEconomyStore.getState().powerUpInventory.FREEZE_TIME;

    expect(useEconomyStore.getState().consumePowerUp('FREEZE_TIME')).toBe(true);
    expect(useEconomyStore.getState().powerUpInventory.FREEZE_TIME).toBe(before - 1);
  });

  it('refuses to consume a power-up with no charges', () => {
    useEconomyStore.setState((state) => ({
      powerUpInventory: { ...state.powerUpInventory, STAR_MAGNET: 0 },
    }));
    expect(useEconomyStore.getState().consumePowerUp('STAR_MAGNET')).toBe(false);
  });
});

describe('persistence across a simulated app restart', () => {
  it('reloads saved coins/hints/power-ups on hydrate', async () => {
    useEconomyStore.getState().addCoins(75);
    useEconomyStore.getState().addPowerUp('EXTRA_TIME', 3);

    await new Promise((resolve) => setTimeout(resolve, 0));

    useEconomyStore.setState({ coins: 0, hints: 0, isHydrated: false });
    await useEconomyStore.getState().hydrate();

    expect(useEconomyStore.getState().coins).toBe(75);
    expect(useEconomyStore.getState().powerUpInventory.EXTRA_TIME).toBeGreaterThanOrEqual(3);
  });
});
