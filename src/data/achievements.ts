export type AchievementMetric =
  | 'starsCaptured'
  | 'goldStarsCaptured'
  | 'bestComboEver'
  | 'dailyStreak'
  | 'perfectLevels';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  metric: AchievementMetric;
  target: number;
  rewardCoins: number;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'FIRST_LOOP',
    title: 'First Loop',
    description: 'Capture your first star',
    metric: 'starsCaptured',
    target: 1,
    rewardCoins: 10,
  },
  {
    id: 'STAR_HUNTER_100',
    title: 'Star Hunter I',
    description: 'Capture 100 stars',
    metric: 'starsCaptured',
    target: 100,
    rewardCoins: 50,
  },
  {
    id: 'STAR_HUNTER_1000',
    title: 'Star Hunter II',
    description: 'Capture 1000 stars',
    metric: 'starsCaptured',
    target: 1000,
    rewardCoins: 200,
  },
  {
    id: 'COMBO_5',
    title: 'Combo Master',
    description: 'Capture 5 stars in a single loop',
    metric: 'bestComboEver',
    target: 5,
    rewardCoins: 50,
  },
  {
    id: 'PERFECT_10_LEVELS',
    title: 'Perfectionist',
    description: 'Earn a 3-star rating on 10 levels',
    metric: 'perfectLevels',
    target: 10,
    rewardCoins: 100,
  },
  {
    id: 'DAILY_STREAK_7',
    title: 'Dedicated',
    description: 'Reach a 7-day login streak',
    metric: 'dailyStreak',
    target: 7,
    rewardCoins: 75,
  },
  {
    id: 'GOLD_STAR_HUNTER',
    title: 'Gold Star Hunter',
    description: 'Capture 50 Gold Stars',
    metric: 'goldStarsCaptured',
    target: 50,
    rewardCoins: 60,
  },
];
