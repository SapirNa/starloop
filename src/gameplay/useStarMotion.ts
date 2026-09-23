import { useEffect, useMemo, useRef } from 'react';
import {
  Easing,
  makeMutable,
  useFrameCallback,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import type { Star } from '../types/star';

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
  // at a fixed, deterministic off-screen placeholder (real randomization
  // happens in the entrance effect below, not here - React's purity rule
  // forbids Math.random() during render, which this useMemo factory counts
  // as). Plain numbers are enough; unlike x/y this never needs to be read
  // reactively.
  targetX: number;
  targetY: number;
}

const ENTRANCE_DURATION_MS = 420;
const ENTRANCE_LEG_1_RATIO = 0.55; // start -> waypoint gets more of the duration than waypoint -> target
const ENTRANCE_MAX_STAGGER_MS = 220;
const ENTRANCE_TOTAL_MS = ENTRANCE_DURATION_MS + ENTRANCE_MAX_STAGGER_MS;
// How far the path's midpoint bends sideways, as a fraction of the
// straight-line start->target distance - large enough to read as a curve,
// not so large the star visibly overshoots past its own resting position.
const CURVE_BEND_RATIO = 0.35;

// A different, genuinely random entrance every time a level starts (or
// restarts) - a fully random direction (not derived from layout position,
// which made every replay of the same level look identical) pushed out
// past the canvas diagonal (a generous, direction-independent guarantee
// the start point is off-screen), plus a sideways-bent waypoint so the
// path swoops in rather than tracing a straight line to its resting spot.
// Called from the entrance effect (not render) specifically because it's
// impure - see the MotionEntry.targetX/targetY comment above.
function randomEntrancePath(
  targetX: number,
  targetY: number,
  canvasWidth: number,
  canvasHeight: number
): { startX: number; startY: number; waypointX: number; waypointY: number } {
  const angle = Math.random() * Math.PI * 2;
  const pushDistance = Math.hypot(canvasWidth, canvasHeight);
  const startX = targetX + Math.cos(angle) * pushDistance;
  const startY = targetY + Math.sin(angle) * pushDistance;

  const dx = targetX - startX;
  const dy = targetY - startY;
  const pathLength = Math.hypot(dx, dy) || 1;
  // Unit vector perpendicular to the straight start->target line.
  const perpX = -dy / pathLength;
  const perpY = dx / pathLength;
  const bend = (Math.random() * 2 - 1) * pathLength * CURVE_BEND_RATIO;

  return {
    startX,
    startY,
    waypointX: (startX + targetX) / 2 + perpX * bend,
    waypointY: (startY + targetY) / 2 + perpY * bend,
  };
}

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
    // A fixed, deterministic off-screen placeholder - just needs to be
    // outside the canvas so nothing visible flashes at it for the one
    // frame between this running and the entrance effect below replacing
    // it with the real randomized start position (see there for why the
    // real randomization can't happen here, in render).
    const placeholderY = -Math.hypot(canvasWidth, canvasHeight);
    return stars.map((star) => ({
      id: star.id,
      x: makeMutable(star.x),
      y: makeMutable(placeholderY),
      radius: star.size,
      vx: makeMutable(star.vx),
      vy: makeMutable(star.vy),
      targetX: star.x,
      targetY: star.y,
    }));
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

    const leg1Duration = ENTRANCE_DURATION_MS * ENTRANCE_LEG_1_RATIO;
    const leg2Duration = ENTRANCE_DURATION_MS - leg1Duration;

    for (const entry of entries) {
      // Computed here (not in the useMemo above) specifically because it's
      // random - a genuinely different direction, curve, and stagger order
      // every time this effect runs, i.e. every level start/replay.
      const path = randomEntrancePath(entry.targetX, entry.targetY, canvasWidth, canvasHeight);
      const entranceDelayMs = Math.random() * ENTRANCE_MAX_STAGGER_MS;

      // Jump (no animation) from the placeholder to the real randomized
      // start position first - both are off-screen, so this is invisible -
      // then animate in two legs through the bent waypoint, not one
      // straight shot, so it reads as a curved swoop rather than a star
      // sliding directly into its grid cell.
      entry.x.value = path.startX;
      entry.x.value = withDelay(
        entranceDelayMs,
        withSequence(
          withTiming(path.waypointX, { duration: leg1Duration, easing: Easing.out(Easing.quad) }),
          withTiming(entry.targetX, { duration: leg2Duration, easing: Easing.inOut(Easing.quad) })
        )
      );
      entry.y.value = path.startY;
      entry.y.value = withDelay(
        entranceDelayMs,
        withSequence(
          withTiming(path.waypointY, { duration: leg1Duration, easing: Easing.out(Easing.quad) }),
          withTiming(entry.targetY, { duration: leg2Duration, easing: Easing.inOut(Easing.quad) })
        )
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
