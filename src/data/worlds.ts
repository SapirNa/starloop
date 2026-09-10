import { COLORS } from '../theme/theme';
import { LEVELS } from './levels';
import type { World } from '../types/world';

export const WORLDS: World[] = [
  {
    id: 'world-1',
    name: 'Star Garden',
    description: 'Where every looper begins.',
    order: 1,
    accentColor: COLORS.success,
    implemented: true,
  },
  {
    id: 'world-2',
    name: 'Moonlight Sky',
    description: 'Coming soon.',
    order: 2,
    accentColor: '#A9C7FF',
    implemented: false,
  },
  {
    id: 'world-3',
    name: 'Cosmic Clouds',
    description: 'Coming soon.',
    order: 3,
    accentColor: COLORS.secondary,
    implemented: false,
  },
  {
    id: 'world-4',
    name: 'Neon Galaxy',
    description: 'Coming soon.',
    order: 4,
    accentColor: '#FF6BD6',
    implemented: false,
  },
  {
    id: 'world-5',
    name: 'Black Hole',
    description: 'Coming soon.',
    order: 5,
    accentColor: '#7A5CFF',
    implemented: false,
  },
  {
    id: 'world-6',
    name: 'Dream Universe',
    description: 'Coming soon.',
    order: 6,
    accentColor: COLORS.gold,
    implemented: false,
  },
];

export function getLevelsForWorld(worldId: string) {
  return LEVELS.filter((level) => level.worldId === worldId);
}
