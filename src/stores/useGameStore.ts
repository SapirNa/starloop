import { create } from 'zustand';

import { GAMEPLAY_CONFIG } from '../config/gameplay';
import { EXTRA_TIME_BONUS_SECONDS, FREEZE_TIME_DURATION_SECONDS } from '../config/starTypes';
import { createStarsForLevel } from '../gameplay/levelSetup';
import { evaluateObjective } from '../gameplay/objectives';
import type { PowerUpType } from '../gameplay/powerUps';
import { resolveLoopCapture } from '../gameplay/starEffects';
import { playSound } from '../services/audio';
import {
  impactHeavy,
  impactLight,
  impactMedium,
  notificationError,
  notificationSuccess,
  selection,
} from '../services/haptics';
import { useEconomyStore } from './useEconomyStore';
import { usePlayerStatsStore } from './usePlayerStatsStore';
import type { Level } from '../types/level';
import type { Star } from '../types/star';
import type { Point } from '../utils/geometry';
import { validateLoop } from '../utils/geometry';
import { calculateCaptureScore, getComboFeedbackText } from '../utils/scoring';

export type GameSessionStatus = 'idle' | 'playing' | 'completed' | 'failed';

export interface LivePosition {
  id: string;
  x: number;
  y: number;
}

export interface ComboFeedback {
  text: string;
  seq: number;
}

interface GameState {
  level: Level | null;
  stars: Star[];
  score: number;
  loopsUsed: number;
  elapsedSeconds: number;
  bestCombo: number;
  // Cumulative GOLD stars captured this attempt, and one entry per loop
  // that captured at least one star - both feed requirement types
  // (GOLD_HUNT, COMBO) that bestCombo/score alone can't answer. See
  // gameplay/objectives.ts.
  goldCaptured: number;
  loopCaptureCounts: number[];
  status: GameSessionStatus;
  failureReason: string | null;
  isPaused: boolean;
  freezeSecondsRemaining: number;
  comboFeedback: ComboFeedback | null;

  // `bonus` is only ever present for a rewarded-ad continuation of a failed
  // attempt (see screens/LevelFailedScreen.tsx) - applied once, at the
  // start of this attempt, rather than requiring the failed session itself
  // to somehow stay alive across the LevelFailed screen.
  startLevel: (
    level: Level,
    canvasWidth: number,
    canvasHeight: number,
    bonus?: { seconds?: number; loops?: number }
  ) => void;
  // The one entry point for the drawn-loop mechanic - validation, capture,
  // and scoring stay conceptually the same as the original prototype;
  // star-type-specific effects (bombs, time bonus) are resolved by the pure
  // gameplay/starEffects helper rather than inline here.
  submitLoop: (points: Point[], starPositions: LivePosition[]) => void;
  tick: () => void;
  pause: () => void;
  resume: () => void;
  // Returns whether it actually activated (false if there was nothing to
  // consume, or the game isn't in a state to accept it) - lets callers
  // (see components/PowerUpOrb.tsx usage in GameScreen) trigger their own
  // feedback (haptics, the TIME+ floating "+N SEC") only on genuine success.
  activatePowerUp: (type: PowerUpType) => boolean;
  addBonusTime: (seconds: number) => void;
  // Bumped by every startLevel call - lets a screen that started session N
  // recognize (in cleanup, or a status-watching effect) whether the store's
  // *current* session is still the one it started, vs. a newer session
  // some other screen instance has since begun. Passing that N back into
  // reset() as expectedSessionId makes a stale/late cleanup (e.g. a
  // navigation-transition-delayed unmount) a no-op instead of clobbering a
  // level that already started playing - see screens/GameScreen.tsx.
  sessionId: number;
  reset: (expectedSessionId?: number) => void;
}

export const useGameStore = create<GameState>()((set, get) => ({
  level: null,
  stars: [],
  score: 0,
  loopsUsed: 0,
  elapsedSeconds: 0,
  bestCombo: 0,
  goldCaptured: 0,
  loopCaptureCounts: [],
  status: 'idle',
  failureReason: null,
  isPaused: false,
  freezeSecondsRemaining: 0,
  comboFeedback: null,
  sessionId: 0,

  startLevel: (level, canvasWidth, canvasHeight, bonus) => {
    // A bonus loop count is applied to a shallow-cloned level, never the
    // shared static Level object from data/levels.ts - evaluateObjective
    // just reads whatever level is in state, so this is enough to extend
    // *this* attempt's loop budget without touching gameplay/objectives.ts
    // or mutating level data other attempts/levels also reference.
    const effectiveLevel =
      bonus?.loops && level.maxLoops !== null
        ? { ...level, maxLoops: level.maxLoops + bonus.loops }
        : level;

    set({
      level: effectiveLevel,
      stars: createStarsForLevel(effectiveLevel, canvasWidth, canvasHeight),
      score: 0,
      loopsUsed: 0,
      // Starting elapsedSeconds already negative is the same mechanism
      // addBonusTime uses mid-session (elapsedSeconds - seconds) - it makes
      // "Time: X" (describeObjective) correctly show the bonus, and delays
      // the timeLimit failure check by exactly that many extra seconds.
      elapsedSeconds: bonus?.seconds ? -bonus.seconds : 0,
      bestCombo: 0,
      goldCaptured: 0,
      loopCaptureCounts: [],
      status: 'playing',
      failureReason: null,
      isPaused: false,
      freezeSecondsRemaining: 0,
      comboFeedback: null,
      sessionId: get().sessionId + 1,
    });
  },

  submitLoop: (points, starPositions) => {
    const state = get();
    if (state.status !== 'playing' || state.isPaused || !state.level) return;
    if (!validateLoop(points, GAMEPLAY_CONFIG)) {
      // A drawn-but-rejected loop (not closed precisely enough, too short,
      // too small) otherwise leaves the player with zero feedback - it can
      // look and feel identical to the touch simply not registering at
      // all. A light, distinct-from-success tap at least confirms "that
      // gesture didn't count" instead of silence.
      void selection();
      return;
    }
    void playSound('loopClose');
    void impactLight();
    usePlayerStatsStore.getState().recordLoop();

    // Moving stars: use their live position at the instant the loop closed,
    // not whatever was last stored in state.
    const positionById = new Map(starPositions.map((position) => [position.id, position]));
    const starsNow = state.stars.map((star) => {
      const live = positionById.get(star.id);
      return live ? { ...star, x: live.x, y: live.y } : star;
    });

    const result = resolveLoopCapture(starsNow, points, state.level);
    const loopsUsed = state.loopsUsed + 1;

    const removedIds = new Set(
      [...result.capturedStars, ...result.triggeredBombs].map((star) => star.id)
    );
    const stars =
      removedIds.size > 0
        ? starsNow.map((star) => (removedIds.has(star.id) ? { ...star, active: false } : star))
        : starsNow;

    let score = state.score;
    let bestCombo = state.bestCombo;
    let goldCaptured = state.goldCaptured;
    let loopCaptureCounts = state.loopCaptureCounts;
    let comboFeedback = state.comboFeedback;

    if (result.capturedStars.length > 0) {
      const captureScore = calculateCaptureScore(result.capturedStars);
      const goldCount = result.capturedStars.filter((star) => star.type === 'GOLD').length;
      const isCombo = result.capturedStars.length >= 2;

      score += captureScore;
      bestCombo = Math.max(bestCombo, result.capturedStars.length);
      goldCaptured += goldCount;
      loopCaptureCounts = [...loopCaptureCounts, result.capturedStars.length];
      void impactMedium();
      void playSound('capture');
      if (isCombo) {
        void playSound('combo');
        void impactHeavy();
      }
      if (goldCount > 0) {
        void playSound('goldCapture');
        void notificationSuccess();
      }

      const feedbackText = getComboFeedbackText(result.capturedStars.length);
      if (feedbackText) {
        comboFeedback = { text: feedbackText, seq: (state.comboFeedback?.seq ?? 0) + 1 };
      }

      // Lifetime stats feed the challenges/achievements systems; recorded
      // here (the one place a capture actually happens) rather than
      // duplicating capture detection elsewhere.
      usePlayerStatsStore.getState().recordCapture({
        starCount: result.capturedStars.length,
        goldCount,
        isCombo,
        scoreEarned: captureScore,
      });
    }

    score = Math.max(0, score - result.scorePenalty);
    const elapsedSeconds = Math.max(0, state.elapsedSeconds - result.bonusTimeSeconds);

    if (result.triggeredBombs.length > 0) void notificationError();

    if (result.shouldFailLevel) {
      set({
        stars,
        score,
        loopsUsed,
        bestCombo,
        goldCaptured,
        loopCaptureCounts,
        elapsedSeconds,
        comboFeedback,
        status: 'failed',
        failureReason: 'Hit a bomb!',
      });
      return;
    }

    const objective = evaluateObjective(state.level, {
      stars,
      score,
      loopsUsed,
      elapsedSeconds,
      bestCombo,
      goldCaptured,
      loopCaptureCounts,
    });

    if (objective.isComplete) {
      void notificationSuccess();
      void playSound('levelComplete');
    } else if (objective.isFailed) {
      void notificationError();
    }

    set({
      stars,
      score,
      loopsUsed,
      bestCombo,
      goldCaptured,
      loopCaptureCounts,
      elapsedSeconds,
      comboFeedback,
      status: objective.isComplete ? 'completed' : objective.isFailed ? 'failed' : 'playing',
      failureReason: objective.failureReason,
    });
  },

  tick: () => {
    const state = get();
    if (state.status !== 'playing' || state.isPaused || !state.level) return;

    if (state.freezeSecondsRemaining > 0) {
      set({ freezeSecondsRemaining: state.freezeSecondsRemaining - 1 });
      return;
    }

    const elapsedSeconds = state.elapsedSeconds + 1;
    const objective = evaluateObjective(state.level, {
      stars: state.stars,
      score: state.score,
      loopsUsed: state.loopsUsed,
      elapsedSeconds,
      bestCombo: state.bestCombo,
      goldCaptured: state.goldCaptured,
      loopCaptureCounts: state.loopCaptureCounts,
    });

    if (objective.isFailed) void notificationError();

    set({
      elapsedSeconds,
      status: objective.isFailed ? 'failed' : state.status,
      failureReason: objective.failureReason,
    });
  },

  pause: () => {
    if (get().status !== 'playing') return;
    set({ isPaused: true });
  },

  resume: () => {
    if (get().status !== 'playing') return;
    set({ isPaused: false });
  },

  activatePowerUp: (type) => {
    const state = get();
    if (state.status !== 'playing' || state.isPaused) return false;
    // Adding time only means something on a level with a timer to extend -
    // refused here (the source of truth), not just hidden/disabled in the
    // UI, so a charge is never silently wasted for zero effect.
    if (type === 'EXTRA_TIME' && state.level?.timeLimit === null) return false;

    // Power-ups are a persisted economy resource, not a per-level freebie -
    // consuming a charge here also persists it (see useEconomyStore).
    const consumed = useEconomyStore.getState().consumePowerUp(type);
    if (!consumed) return false;

    if (type === 'FREEZE_TIME') {
      set({ freezeSecondsRemaining: FREEZE_TIME_DURATION_SECONDS });
    } else if (type === 'EXTRA_TIME') {
      get().addBonusTime(EXTRA_TIME_BONUS_SECONDS);
    }
    // STAR_MAGNET/SHIELD/PERFECT_LOOP: not implemented yet. They never have
    // inventory charges (see createEmptyPowerUpInventory), so consumePowerUp
    // always returns false for them today - this line is unreachable until
    // real behavior is wired up.
    return true;
  },

  addBonusTime: (seconds) => {
    set((state) => ({ elapsedSeconds: Math.max(0, state.elapsedSeconds - seconds) }));
  },

  reset: (expectedSessionId) => {
    if (expectedSessionId !== undefined && get().sessionId !== expectedSessionId) return;
    set({
      level: null,
      stars: [],
      score: 0,
      loopsUsed: 0,
      elapsedSeconds: 0,
      bestCombo: 0,
      goldCaptured: 0,
      loopCaptureCounts: [],
      status: 'idle',
      failureReason: null,
      isPaused: false,
      freezeSecondsRemaining: 0,
      comboFeedback: null,
    });
  },
}));
