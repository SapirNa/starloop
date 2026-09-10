import type { PlayerStatsSnapshot } from '../services/storage';

export type ChallengeMetric = keyof PlayerStatsSnapshot;

export interface ChallengeDefinition {
  id: string;
  title: string;
  description: string;
  metric: ChallengeMetric;
  target: number;
  rewardCoins: number;
  // Optional gate so a challenge can't be handed to a player who hasn't
  // unlocked the feature it needs yet (e.g. a bomb-specific challenge before
  // world 1's bomb levels). None of today's challenges need this - it's here
  // so future ones can declare it instead of the selector needing special
  // cases per challenge.
  minLevelsCompleted?: number;
}

// Plain, JSON-serializable data. The pool is local for now, but nothing
// about its shape depends on that - a real backend could serve this same
// array (e.g. `await fetchChallengePool()`) without any other part of the
// challenge system changing. No network call is made here.
export const CHALLENGE_POOL: ChallengeDefinition[] = [
  {
    id: 'capture-30-stars',
    title: 'Star Collector',
    description: 'Capture 30 stars',
    metric: 'starsCaptured',
    target: 30,
    rewardCoins: 30,
  },
  {
    id: 'complete-3-levels',
    title: 'Level Runner',
    description: 'Complete 3 levels',
    metric: 'levelsCompleted',
    target: 3,
    rewardCoins: 25,
  },
  {
    id: 'combo-5-loops',
    title: 'Combo Artist',
    description: 'Make 5 combo loops',
    metric: 'comboLoopsMade',
    target: 5,
    rewardCoins: 35,
  },
  {
    id: 'earn-5000-points',
    title: 'High Scorer',
    description: 'Earn 5000 points',
    metric: 'totalScoreEarned',
    target: 5000,
    rewardCoins: 50,
  },
  {
    id: 'capture-3-gold',
    title: 'Gold Digger',
    description: 'Capture 3 Gold Stars',
    metric: 'goldStarsCaptured',
    target: 3,
    rewardCoins: 30,
  },
  {
    id: 'efficient-clear',
    title: 'Efficiency Expert',
    description: 'Complete a level using fewer than 4 loops',
    metric: 'levelsCompletedUnderFourLoops',
    target: 1,
    rewardCoins: 40,
  },
];

// How many of the pool are "today's" challenges - see
// gameplay/challenges.ts selectDailyChallenges. The pool size is kept an
// exact multiple of this so a mid-day regeneration can rotate to a fully
// disjoint set instead of risking repeats.
export const DAILY_CHALLENGE_COUNT = 3;
