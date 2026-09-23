import type { GameIconName } from '../components/ui/GameIcon';
import type { PowerUpType } from '../gameplay/powerUps';

export interface StoreItem {
  id: string;
  label: string;
  description: string;
  price: number;
  icon: GameIconName;
  // What buying this item actually grants - one entry per power-up type,
  // so a bundle (see 'bundle-freeze-time') can hand over more than one kind
  // in a single purchase.
  grants: { type: PowerUpType; amount: number }[];
}

// Prices are coin costs, not tied to any single power-up's real-money value
// - coins themselves come from levels, Daily Reward, and rewarded ads (see
// services/ads). A bundle's price is deliberately below the sum of buying
// its contents separately, so it reads as an actual deal.
export const STORE_ITEMS: StoreItem[] = [
  {
    id: 'freeze-1',
    label: 'Freeze x1',
    description: 'Stops every star in place for a few seconds.',
    price: 70,
    icon: 'powerUpFreeze',
    grants: [{ type: 'FREEZE_TIME', amount: 1 }],
  },
  {
    id: 'timer-1',
    label: '+Time x1',
    description: 'Adds extra seconds to a timed level.',
    price: 50,
    icon: 'powerUpExtraTime',
    grants: [{ type: 'EXTRA_TIME', amount: 1 }],
  },
  {
    id: 'bundle-freeze-time',
    label: 'Value Bundle',
    description: '2x +Time + 1x Freeze',
    price: 150,
    icon: 'store',
    grants: [
      { type: 'EXTRA_TIME', amount: 2 },
      { type: 'FREEZE_TIME', amount: 1 },
    ],
  },
];
