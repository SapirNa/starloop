import {
  claimDailyReward,
  evaluateClaim,
  getDayTileState,
  getDaysBetween,
  getLocalDateString,
  getRewardForDay,
  type DailyRewardState,
} from './dailyRewards';

describe('getLocalDateString', () => {
  it('formats a date as local YYYY-MM-DD', () => {
    const date = new Date(2024, 0, 5, 23, 59); // Jan 5, 2024, local time
    expect(getLocalDateString(date)).toBe('2024-01-05');
  });

  it('pads single-digit months and days', () => {
    expect(getLocalDateString(new Date(2024, 2, 4))).toBe('2024-03-04');
  });
});

describe('getDaysBetween', () => {
  it('is 0 for the same date', () => {
    expect(getDaysBetween('2024-01-05', '2024-01-05')).toBe(0);
  });

  it('is 1 for consecutive days', () => {
    expect(getDaysBetween('2024-01-05', '2024-01-06')).toBe(1);
  });

  it('is negative when the second date is earlier', () => {
    expect(getDaysBetween('2024-01-06', '2024-01-05')).toBe(-1);
  });

  it('handles a month boundary', () => {
    expect(getDaysBetween('2024-01-31', '2024-02-01')).toBe(1);
  });
});

describe('getRewardForDay', () => {
  it('returns the matching tier for days 1-7', () => {
    expect(getRewardForDay(1).day).toBe(1);
    expect(getRewardForDay(7).day).toBe(7);
  });

  it('wraps safely for out-of-range input', () => {
    expect(getRewardForDay(8).day).toBe(1);
    expect(getRewardForDay(0).day).toBe(7);
  });
});

const FRESH: DailyRewardState = {
  lastClaimDate: null,
  dailyStreak: 0,
  currentRewardDay: 1,
  highestDailyStreak: 0,
};

describe('evaluateClaim', () => {
  it('allows the very first claim ever', () => {
    expect(evaluateClaim(FRESH, '2024-01-05')).toEqual({ canClaim: true });
  });

  it('blocks a second claim on the same calendar day (duplicate prevention)', () => {
    const state: DailyRewardState = {
      lastClaimDate: '2024-01-05',
      dailyStreak: 1,
      currentRewardDay: 2,
      highestDailyStreak: 1,
    };
    expect(evaluateClaim(state, '2024-01-05')).toEqual({
      canClaim: false,
      reason: 'ALREADY_CLAIMED_TODAY',
    });
  });

  it('allows claiming the next calendar day', () => {
    const state: DailyRewardState = {
      lastClaimDate: '2024-01-05',
      dailyStreak: 1,
      currentRewardDay: 2,
      highestDailyStreak: 1,
    };
    expect(evaluateClaim(state, '2024-01-06')).toEqual({ canClaim: true });
  });

  it('blocks claiming if the device clock moved backward (handles date changes safely)', () => {
    const state: DailyRewardState = {
      lastClaimDate: '2024-01-10',
      dailyStreak: 1,
      currentRewardDay: 2,
      highestDailyStreak: 1,
    };
    expect(evaluateClaim(state, '2024-01-05')).toEqual({
      canClaim: false,
      reason: 'CLOCK_MOVED_BACKWARD',
    });
  });
});

describe('claimDailyReward', () => {
  it('returns null when a claim is not allowed (duplicate prevention)', () => {
    const state: DailyRewardState = {
      lastClaimDate: '2024-01-05',
      dailyStreak: 1,
      currentRewardDay: 2,
      highestDailyStreak: 1,
    };
    expect(claimDailyReward(state, '2024-01-05')).toBeNull();
  });

  it('starts the streak at 1 on the very first claim and grants day 1', () => {
    const result = claimDailyReward(FRESH, '2024-01-05');
    expect(result?.state).toEqual({
      lastClaimDate: '2024-01-05',
      dailyStreak: 1,
      currentRewardDay: 2,
      highestDailyStreak: 1,
    });
    expect(result?.reward.day).toBe(1);
  });

  it('advances the streak and reward day on a consecutive claim', () => {
    const state: DailyRewardState = {
      lastClaimDate: '2024-01-05',
      dailyStreak: 1,
      currentRewardDay: 2,
      highestDailyStreak: 1,
    };
    const result = claimDailyReward(state, '2024-01-06');
    expect(result?.state).toEqual({
      lastClaimDate: '2024-01-06',
      dailyStreak: 2,
      currentRewardDay: 3,
      highestDailyStreak: 2,
    });
    expect(result?.reward.day).toBe(2);
  });

  it('resets to Day 1 after missing exactly one full calendar day', () => {
    // The task's own example: claimed Mon (day1) / Tue (day2) / Wed (day3).
    // No claim Thu. Returns Fri - Wed to Fri is 2 calendar days apart, so
    // Friday must start over at Day 1.
    const monday = claimDailyReward(FRESH, '2024-01-01'); // Monday
    const tuesday = claimDailyReward(monday!.state, '2024-01-02');
    const wednesday = claimDailyReward(tuesday!.state, '2024-01-03');
    expect(wednesday?.reward.day).toBe(3);
    expect(wednesday?.state.dailyStreak).toBe(3);

    // Thursday (01-04) skipped entirely; player returns Friday (01-05).
    const friday = claimDailyReward(wednesday!.state, '2024-01-05');
    expect(friday?.reward.day).toBe(1);
    expect(friday?.state.dailyStreak).toBe(1);
    expect(friday?.state.currentRewardDay).toBe(2);
  });

  it('resets after missing several days, with no penalty beyond restarting at Day 1', () => {
    const state: DailyRewardState = {
      lastClaimDate: '2024-01-05',
      dailyStreak: 5,
      currentRewardDay: 6,
      highestDailyStreak: 5,
    };
    const result = claimDailyReward(state, '2024-01-09'); // 4 days later
    expect(result?.state.dailyStreak).toBe(1);
    expect(result?.state.currentRewardDay).toBe(2);
    expect(result?.reward.day).toBe(1);
    // highestDailyStreak is a high-water mark - it must not drop with the
    // reset.
    expect(result?.state.highestDailyStreak).toBe(5);
  });

  it('wraps from day 7 back to day 1 while keeping the streak climbing', () => {
    const state: DailyRewardState = {
      lastClaimDate: '2024-01-07',
      dailyStreak: 7,
      currentRewardDay: 7,
      highestDailyStreak: 7,
    };
    const result = claimDailyReward(state, '2024-01-08');
    expect(result?.reward.day).toBe(7);
    expect(result?.state.currentRewardDay).toBe(1);
    expect(result?.state.dailyStreak).toBe(8);
    expect(result?.state.highestDailyStreak).toBe(8);
  });

  it('returns null when the clock moved backward (duplicate/exploit prevention)', () => {
    const state: DailyRewardState = {
      lastClaimDate: '2024-01-10',
      dailyStreak: 3,
      currentRewardDay: 4,
      highestDailyStreak: 3,
    };
    expect(claimDailyReward(state, '2024-01-05')).toBeNull();
  });
});

describe('getDayTileState', () => {
  it('marks days before currentRewardDay as claimed', () => {
    expect(getDayTileState(1, 3)).toBe('claimed');
    expect(getDayTileState(2, 3)).toBe('claimed');
  });

  it('marks currentRewardDay as today', () => {
    expect(getDayTileState(3, 3)).toBe('today');
  });

  it('marks days after currentRewardDay as locked', () => {
    expect(getDayTileState(4, 3)).toBe('locked');
    expect(getDayTileState(7, 3)).toBe('locked');
  });
});
