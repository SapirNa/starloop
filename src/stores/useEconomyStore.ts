import { create } from 'zustand';

import { createEmptyPowerUpInventory, type PowerUpType } from '../gameplay/powerUps';
import * as storage from '../services/storage';

interface EconomyState {
  isHydrated: boolean;
  coins: number;
  hints: number;
  powerUpInventory: Record<PowerUpType, number>;
  // Generic extensible item bag for future cosmetics/boosters - empty until
  // real items exist.
  items: Record<string, number>;

  hydrate: () => Promise<void>;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  addHints: (amount: number) => void;
  spendHint: () => boolean;
  addPowerUp: (type: PowerUpType, amount?: number) => void;
  consumePowerUp: (type: PowerUpType) => boolean;
  resetEconomy: () => Promise<void>;
}

function persistState(state: EconomyState): void {
  void storage.saveEconomy({
    schemaVersion: storage.CURRENT_SCHEMA_VERSION,
    coins: state.coins,
    hints: state.hints,
    powerUpInventory: state.powerUpInventory,
    items: state.items,
  });
}

export const useEconomyStore = create<EconomyState>()((set, get) => ({
  isHydrated: false,
  coins: 0,
  hints: 0,
  powerUpInventory: createEmptyPowerUpInventory(),
  items: {},

  hydrate: async () => {
    const data = await storage.loadEconomy();
    set({
      coins: data.coins,
      hints: data.hints,
      powerUpInventory: data.powerUpInventory,
      items: data.items,
      isHydrated: true,
    });
  },

  addCoins: (amount) => {
    if (amount <= 0) return;
    set((state) => ({ coins: state.coins + amount }));
    persistState(get());
  },

  spendCoins: (amount) => {
    const state = get();
    if (amount <= 0 || state.coins < amount) return false;
    set({ coins: state.coins - amount });
    persistState(get());
    return true;
  },

  addHints: (amount) => {
    if (amount <= 0) return;
    set((state) => ({ hints: state.hints + amount }));
    persistState(get());
  },

  spendHint: () => {
    const state = get();
    if (state.hints <= 0) return false;
    set({ hints: state.hints - 1 });
    persistState(get());
    return true;
  },

  addPowerUp: (type, amount = 1) => {
    if (amount <= 0) return;
    set((state) => ({
      powerUpInventory: {
        ...state.powerUpInventory,
        [type]: (state.powerUpInventory[type] ?? 0) + amount,
      },
    }));
    persistState(get());
  },

  consumePowerUp: (type) => {
    const state = get();
    const current = state.powerUpInventory[type] ?? 0;
    if (current <= 0) return false;
    set({ powerUpInventory: { ...state.powerUpInventory, [type]: current - 1 } });
    persistState(get());
    return true;
  },

  resetEconomy: async () => {
    await storage.resetEconomy();
    set({
      coins: storage.DEFAULT_ECONOMY.coins,
      hints: storage.DEFAULT_ECONOMY.hints,
      powerUpInventory: storage.DEFAULT_ECONOMY.powerUpInventory,
      items: storage.DEFAULT_ECONOMY.items,
    });
  },
}));
