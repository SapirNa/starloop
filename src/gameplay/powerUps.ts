import type { GameIconName } from '../components/ui/GameIcon';

export type PowerUpType = 'FREEZE_TIME' | 'STAR_MAGNET' | 'SHIELD' | 'EXTRA_TIME' | 'PERFECT_LOOP';

export interface PowerUpDefinition {
  type: PowerUpType;
  label: string;
  icon: GameIconName;
  implemented: boolean;
}

// STAR_MAGNET, SHIELD, and PERFECT_LOOP are recognized types with no
// behavior yet - they simply never get a starting charge in useGameStore, so
// requesting them is always a no-op. Icons reuse existing semantic names
// (no dedicated magnet/shield glyphs added while unimplemented).
export const POWER_UPS: Record<PowerUpType, PowerUpDefinition> = {
  FREEZE_TIME: { type: 'FREEZE_TIME', label: 'Freeze', icon: 'powerUpFreeze', implemented: true },
  EXTRA_TIME: { type: 'EXTRA_TIME', label: '+Time', icon: 'powerUpExtraTime', implemented: true },
  STAR_MAGNET: { type: 'STAR_MAGNET', label: 'Magnet', icon: 'starFilled', implemented: false },
  SHIELD: { type: 'SHIELD', label: 'Shield', icon: 'lock', implemented: false },
  PERFECT_LOOP: { type: 'PERFECT_LOOP', label: 'Perfect', icon: 'checkmark', implemented: false },
};

export const IMPLEMENTED_POWER_UPS: PowerUpType[] = Object.values(POWER_UPS)
  .filter((definition) => definition.implemented)
  .map((definition) => definition.type);

// Power-up charges are a persisted economy resource (see useEconomyStore),
// not a per-level freebie. This is just the zero-value shape used as a base
// for the persisted inventory and for merging in saved data.
export function createEmptyPowerUpInventory(): Record<PowerUpType, number> {
  return {
    FREEZE_TIME: 0,
    EXTRA_TIME: 0,
    STAR_MAGNET: 0,
    SHIELD: 0,
    PERFECT_LOOP: 0,
  };
}
