import type { PowerUpType } from '../gameplay/powerUps';

export interface DailyRewardTier {
  day: number; // 1-7
  coins: number;
  hints: number;
  powerUp: { type: PowerUpType; amount: number } | null;
}

export const DAILY_REWARD_TIERS: DailyRewardTier[] = [
  { day: 1, coins: 20, hints: 0, powerUp: null },
  { day: 2, coins: 25, hints: 0, powerUp: null },
  { day: 3, coins: 30, hints: 1, powerUp: null },
  { day: 4, coins: 40, hints: 0, powerUp: null },
  { day: 5, coins: 50, hints: 1, powerUp: null },
  { day: 6, coins: 60, hints: 0, powerUp: { type: 'EXTRA_TIME', amount: 1 } },
  { day: 7, coins: 100, hints: 2, powerUp: { type: 'FREEZE_TIME', amount: 1 } },
];

export function getRewardForDay(day: number): DailyRewardTier {
  const index = ((day - 1) % DAILY_REWARD_TIERS.length + DAILY_REWARD_TIERS.length) % DAILY_REWARD_TIERS.length;
  return DAILY_REWARD_TIERS[index];
}

// Local calendar date (not UTC, not a rolling 24h window) as 'YYYY-MM-DD',
// so "one claim per calendar day" matches what the player's clock shows.
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Whole calendar days between two 'YYYY-MM-DD' strings (to - from). Parsed
// as UTC noon so DST transitions in the local zone can't shift the result
// by a day.
export function getDaysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T12:00:00Z`);
  const to = Date.parse(`${toDate}T12:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export interface DailyRewardState {
  lastClaimDate: string | null;
  dailyStreak: number;
  // Which of the 7 tiers will be granted on the *next* claim.
  currentRewardDay: number;
  // The highest dailyStreak ever reached - never decreases, even when
  // dailyStreak itself resets to 1.
  highestDailyStreak: number;
}

export type ClaimBlockedReason = 'ALREADY_CLAIMED_TODAY' | 'CLOCK_MOVED_BACKWARD';

export type ClaimEvaluation =
  | { canClaim: true }
  | { canClaim: false; reason: ClaimBlockedReason };

// Pure eligibility check - no mutation, safe to call from UI to decide
// whether to show a "Claim" button.
export function evaluateClaim(state: DailyRewardState, today: string): ClaimEvaluation {
  if (state.lastClaimDate === null) return { canClaim: true };

  const daysSince = getDaysBetween(state.lastClaimDate, today);
  // The device clock moved backward (or was tampered with): today looks
  // earlier than - or the same instant as an already-recorded claim from
  // "the future". Block rather than risk re-granting or corrupting streak
  // state; don't crash either way.
  if (daysSince < 0) return { canClaim: false, reason: 'CLOCK_MOVED_BACKWARD' };
  if (daysSince === 0) return { canClaim: false, reason: 'ALREADY_CLAIMED_TODAY' };
  return { canClaim: true };
}

export interface ClaimResult {
  state: DailyRewardState;
  reward: DailyRewardTier;
}

// Pure state transition: given the current persisted state and today's
// date, returns the new state and the reward to grant - or null if a claim
// isn't currently allowed (see evaluateClaim). Performs no side effects;
// useDailyRewardsStore is responsible for persisting the result and
// crediting the reward to the economy.
export function claimDailyReward(state: DailyRewardState, today: string): ClaimResult | null {
  if (!evaluateClaim(state, today).canClaim) return null;

  const daysSince = state.lastClaimDate === null ? null : getDaysBetween(state.lastClaimDate, today);
  // Only claiming on the very next calendar day continues the streak.
  // Missing one full calendar day (daysSince >= 2) resets the cycle back to
  // Day 1 - e.g. claimed Mon/Tue/Wed, skipped Thu, returns Fri: Wed->Fri is
  // 2 days apart, so Friday starts over at Day 1. No grace period.
  const isConsecutiveDay = daysSince === null || daysSince === 1;

  const dayToReward = isConsecutiveDay ? state.currentRewardDay : 1;
  const reward = getRewardForDay(dayToReward);
  const dailyStreak = isConsecutiveDay ? state.dailyStreak + 1 : 1;
  const nextRewardDay = (dayToReward % DAILY_REWARD_TIERS.length) + 1;

  return {
    state: {
      lastClaimDate: today,
      dailyStreak,
      currentRewardDay: nextRewardDay,
      highestDailyStreak: Math.max(state.highestDailyStreak, dailyStreak),
    },
    reward,
  };
}

export type DailyTileState = 'claimed' | 'today' | 'locked';

// Pure UI-state derivation for the 7-day grid, kept here (not in the
// component) so the "which tiles look claimed/current/locked" rule lives
// next to the streak rules it depends on. currentRewardDay alone is enough:
// every day before it was claimed in the present unbroken run, it is
// "today", everything after is still locked.
export function getDayTileState(day: number, currentRewardDay: number): DailyTileState {
  if (day < currentRewardDay) return 'claimed';
  if (day === currentRewardDay) return 'today';
  return 'locked';
}
