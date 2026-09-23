import { useEffect, useMemo, useRef } from 'react';
import {
  Easing,
  makeMutable,
  useFrameCallback,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import type { Star } from '../types/star';
import { hashStringToSeed, seededRandom } from '../utils/random';

export interface StarMotion {
  x: SharedValue<number>;
  y: SharedValue<number>;
  // Live velocity - exposed (not just x/y) so a type-specific visual (the
  // SPEED star's trail, see StarVisual.tsx) can orient itself off the
  // star's actual current direction, which changes over time as it bounces.
  vx: SharedValue<number>;
  vy: SharedValue<number>;
}

interface MotionEntry extends StarMotion {
  id: string;
  radius: number;
  // Shared values (not plain numbers) so bouncing off a wall - which
  // reassigns these every frame - mutates through `.value`, the same
  // sanctioned idiom used for x/y, rather than a plain field on a memoized
  // object.
  vx: SharedValue<number>;
  vy: SharedValue<number>;
  // Where this star actually belongs (its layout position) - x/y start off
  // at a point well outside the canvas and animate in to here, see the
  // entrance effect below. Plain numbers are enough; unlike x/y this never
  // needs to be read reactively.
  targetX: number;
  targetY: number;
  entranceDelayMs: number;
}

// How far outside the canvas each star starts, along the direction from
// canvas center through its own layout position (falling back to a random
// direction for the rare star that lands exactly on center) - the diagonal
// is a generous, direction-independent guarantee that the start point is
// off-screen no matter which way that direction points.
function entranceStartPosition(
  targetX: number,
  targetY: number,
  canvasWidth: number,
  canvasHeight: number,
  random: () => number
): { x: number; y: number } {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  let dx = targetX - centerX;
  let dy = targetY - centerY;
  const magnitude = Math.hypot(dx, dy);
  if (magnitude < 1) {
    const angle = random() * Math.PI * 2;
    dx = Math.cos(angle);
    dy = Math.sin(angle);
  } else {
    dx /= magnitude;
    dy /= magnitude;
  }
  const pushDistance = Math.hypot(canvasWidth, canvasHeight);
  return { x: targetX + dx * pushDistance, y: targetY + dy * pushDistance };
}

const ENTRANCE_DURATION_MS = 420;
const ENTRANCE_MAX_STAGGER_MS = 220;
const ENTRANCE_TOTAL_MS = ENTRANCE_DURATION_MS + ENTRANCE_MAX_STAGGER_MS;

export interface StarMotionHandle {
  // Per-star reactive position, for driving Skia cx/cy props during render.
  byId: Map<string, StarMotion>;
  // The raw records, for reading live positions synchronously inside the
  // pan gesture's onEnd worklet (a plain array of plain objects, safe to
  // capture in a worklet closure - unlike a Map, which isn't).
  entries: MotionEntry[];
}

// Caps the per-frame delta so a stall (e.g. resuming from background) can't
// make a star jump across the whole screen in one tick.
const MAX_DELTA_SECONDS = 0.05;

// Drives star movement entirely on the UI thread via a Reanimated frame
// callback - completely independent of the pan gesture driving the drawn
// trail, and of React/Zustand state. Neither loop touches the JS thread or
// triggers a re-render, so drawing stays smooth regardless of how many
// stars are moving.
export function useStarMotion(
  stars: Star[],
  canvasWidth: number,
  canvasHeight: number,
  paused: boolean
): StarMotionHandle {
  const starIdsKey = stars.map((star) => star.id).join(',');

  const entries = useMemo<MotionEntry[]>(() => {
    return stars.map((star) => {
      const random = seededRandom(hashStringToSeed(star.id));
      const start = entranceStartPosition(star.x, star.y, canvasWidth, canvasHeight, random);
      return {
        id: star.id,
        x: makeMutable(start.x),
        y: makeMutable(start.y),
        radius: star.size,
        vx: makeMutable(star.vx),
        vy: makeMutable(star.vy),
        targetX: star.x,
        targetY: star.y,
        entranceDelayMs: random() * ENTRANCE_MAX_STAGGER_MS,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on ids, not the stars array
  }, [starIdsKey]);

  /* eslint-disable react-hooks/immutability --
   * Mutating a SharedValue's `.value` inside a UI-thread frame callback is
   * the standard Reanimated idiom for a per-frame animation loop (the same
   * pattern this codebase already uses lint-clean inside useEffect, e.g.
   * useStarAnimations.ts) - this rule just doesn't special-case
   * useFrameCallback the way it does useEffect. `entries` (and each
   * SharedValue in it) is created once per level by the useMemo above and
   * intentionally mutated here every frame; nothing here is mutated during
   * render. */
  const frameCallback = useFrameCallback((frameInfo) => {
    const deltaSeconds = Math.min(
      (frameInfo.timeSincePreviousFrame ?? 16) / 1000,
      MAX_DELTA_SECONDS
    );

    for (const entry of entries) {
      const vx = entry.vx.value;
      const vy = entry.vy.value;
      if (vx === 0 && vy === 0) continue;

      let nextX = entry.x.value + vx * deltaSeconds;
      let nextY = entry.y.value + vy * deltaSeconds;

      if (nextX < entry.radius) {
        nextX = entry.radius;
        entry.vx.value = -vx;
      } else if (nextX > canvasWidth - entry.radius) {
        nextX = canvasWidth - entry.radius;
        entry.vx.value = -vx;
      }

      if (nextY < entry.radius) {
        nextY = entry.radius;
        entry.vy.value = -vy;
      } else if (nextY > canvasHeight - entry.radius) {
        nextY = canvasHeight - entry.radius;
        entry.vy.value = -vy;
      }

      entry.x.value = nextX;
      entry.y.value = nextY;
    }
  });
  /* eslint-enable react-hooks/immutability */

  // Bounce physics stays off for the duration of the entrance animation -
  // otherwise this same frame callback would overwrite x/y with
  // vx/vy-driven positions every frame, fighting (and winning against) the
  // withTiming entrance animation, which just looks like the stars snap
  // straight to their resting position instead of flying in.
  const enteringRef = useRef(true);
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  /* eslint-disable react-hooks/immutability --
   * Kicking off each star's fly-in animation by assigning `.value =
   * withDelay(...)` here, once per new star set, is the same useEffect-time
   * mutation pattern useStarAnimations.ts uses for its own animations
   * (e.g. startIdleAnimations) - not a per-frame loop, but the same
   * "outside render" justification applies. */
  useEffect(() => {
    enteringRef.current = true;
    frameCallback.setActive(false);

    for (const entry of entries) {
      entry.x.value = withDelay(
        entry.entranceDelayMs,
        withTiming(entry.targetX, { duration: ENTRANCE_DURATION_MS, easing: Easing.out(Easing.cubic) })
      );
      entry.y.value = withDelay(
        entry.entranceDelayMs,
        withTiming(entry.targetY, { duration: ENTRANCE_DURATION_MS, easing: Easing.out(Easing.cubic) })
      );
    }

    const timer = setTimeout(() => {
      enteringRef.current = false;
      frameCallback.setActive(!pausedRef.current);
    }, ENTRANCE_TOTAL_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entrance kicks off once per new star set (entries); frameCallback is a stable ref across renders
  }, [entries]);
  /* eslint-enable react-hooks/immutability */

  useEffect(() => {
    if (enteringRef.current) return; // the entrance-completion timer above will activate it once it's done
    frameCallback.setActive(!paused);
  }, [paused, frameCallback]);

  const byId = useMemo(
    () =>
      new Map(
        entries.map((entry) => [entry.id, { x: entry.x, y: entry.y, vx: entry.vx, vy: entry.vy }])
      ),
    [entries]
  );

  return { byId, entries };
}
