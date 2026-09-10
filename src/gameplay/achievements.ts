import type { AchievementDefinition } from '../data/achievements';
import type { PlayerStatsSnapshot } from '../services/storage';

export interface AchievementContext {
  stats: PlayerStatsSnapshot;
  dailyStreak: number;
  // Count of levels whose best rating is 3 stars - derived from
  // useProgressStore, not tracked as a separate counter, to avoid two
  // sources of truth for the same fact.
  perfectLevels: number;
}

export interface AchievementProgress {
  definition: AchievementDefinition;
  progress: number;
  isComplete: boolean;
  isClaimed: boolean;
}

function getMetricValue(definition: AchievementDefinition, context: AchievementContext): number {
  switch (definition.metric) {
    case 'starsCaptured':
      return context.stats.starsCaptured;
    case 'goldStarsCaptured':
      return context.stats.goldStarsCaptured;
    case 'bestComboEver':
      return context.stats.bestComboEver;
    case 'dailyStreak':
      return context.dailyStreak;
    case 'perfectLevels':
      return context.perfectLevels;
    default:
      return 0;
  }
}

export function getAchievementsProgress(
  definitions: AchievementDefinition[],
  context: AchievementContext,
  claimedIds: string[]
): AchievementProgress[] {
  return definitions.map((definition) => {
    const value = getMetricValue(definition, context);
    const progress = Math.min(value, definition.target);
    return {
      definition,
      progress,
      isComplete: progress >= definition.target,
      isClaimed: claimedIds.includes(definition.id),
    };
  });
}

export type AchievementSortGroup = 'unclaimedComplete' | 'inProgress' | 'claimed';

const GROUP_ORDER: Record<AchievementSortGroup, number> = {
  unclaimedComplete: 0,
  inProgress: 1,
  claimed: 2,
};

export function getAchievementSortGroup(entry: AchievementProgress): AchievementSortGroup {
  if (entry.isClaimed) return 'claimed';
  if (entry.isComplete) return 'unclaimedComplete';
  return 'inProgress';
}

// Reusable, render-independent ordering: completed-but-unclaimed first
// (reward ready, most obvious call to action), then in-progress, then
// already-claimed at the bottom. A stable sort (Array.prototype.sort is
// stable per spec) keeps entries within the same group in their original
// (definition) order rather than shuffling them.
export function sortAchievements(entries: AchievementProgress[]): AchievementProgress[] {
  return [...entries].sort(
    (a, b) => GROUP_ORDER[getAchievementSortGroup(a)] - GROUP_ORDER[getAchievementSortGroup(b)]
  );
}
