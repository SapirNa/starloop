import { useEffect, useMemo } from 'react';
import { makeMutable, useFrameCallback } from 'react-native-reanimated';
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
    return stars.map((star) => ({
      id: star.id,
      x: makeMutable(star.x),
      y: makeMutable(star.y),
      radius: star.size,
      vx: makeMutable(star.vx),
      vy: makeMutable(star.vy),
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

  useEffect(() => {
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
