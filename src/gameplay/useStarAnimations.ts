import { useEffect, useMemo, useRef } from 'react';
import {
  Easing,
  makeMutable,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import { MAX_PARTICLE_COUNT, STAR_VISUALS } from '../config/starVisuals';
import type { Star } from '../types/star';
import { hashStringToSeed, seededRandom } from '../utils/random';

export interface Particle {
  x: SharedValue<number>;
  y: SharedValue<number>;
  opacity: SharedValue<number>;
}

export interface StarAnim {
  // 1 normally; the capture "pop" animates this 1 -> popScale -> 0, then
  // the star is gone. Multiplies with `breathe` in StarVisual's transform,
  // so a capture mid-breath still pops correctly.
  captureScale: SharedValue<number>;
  opacity: SharedValue<number>;
  // Brief bright overlay on capture - white for a normal reward, red for a
  // bomb (see STAR_VISUALS[type].flashColor) - the "flash" beat between
  // scaling and the particle burst.
  flash: SharedValue<number>;
  particles: Particle[];
  // Idle - continuous while the star is alive, each on its own seeded
  // period/phase so stars never animate in lockstep.
  rotation: SharedValue<number>;
  breathe: SharedValue<number>;
  glow: SharedValue<number>;
  sparkle: SharedValue<number>;
}

const POP_DURATION = 100;
const FADE_DURATION = 180;
const FLASH_IN_DURATION = 55;
const FLASH_OUT_DURATION = 160;
const PARTICLE_DURATION = 260;

function particleAngles(count: number): number[] {
  return Array.from({ length: count }, (_, i) => Math.PI / 4 + i * ((2 * Math.PI) / count));
}

function startIdleAnimations(anim: StarAnim, seed: number): void {
  const random = seededRandom(seed);

  const rotationDuration = 5000 + random() * 6000;
  const rotationDirection = random() < 0.5 ? -1 : 1;
  anim.rotation.value = withRepeat(
    withTiming(rotationDirection * Math.PI * 2, { duration: rotationDuration, easing: Easing.linear }),
    -1,
    false
  );

  const breatheDuration = 1400 + random() * 900;
  const breathePeak = 1.05 + random() * 0.07;
  anim.breathe.value = withRepeat(
    withTiming(breathePeak, { duration: breatheDuration, easing: Easing.inOut(Easing.sin) }),
    -1,
    true
  );

  const glowDuration = 1600 + random() * 1100;
  anim.glow.value = withRepeat(
    withTiming(1, { duration: glowDuration, easing: Easing.inOut(Easing.sin) }),
    -1,
    true
  );

  const sparkleIdle = 2500 + random() * 4800;
  anim.sparkle.value = withRepeat(
    withSequence(
      withDelay(sparkleIdle, withTiming(1, { duration: 100 })),
      withTiming(0, { duration: 320 })
    ),
    -1,
    false
  );
}

// Creates and owns one StarAnim shared-value bundle per star id: the
// continuous idle animation (rotation/breathe/glow/occasional sparkle) that
// runs for as long as the star is alive, and the quick capture sequence
// (pop -> flash -> particle burst -> fade) played the moment it's captured.
// Everything here lives in Reanimated shared values, not React/Zustand
// state, so none of it costs a re-render or touches the JS thread per
// frame - see gameplay/StarVisual.tsx for how these drive the actual draw.
//
// The star id set is stable for the lifetime of a level (only `active`
// flips), so memoizing on the joined ids - rather than the `stars` array
// reference - keeps the same shared values (and any in-flight animation)
// across captures instead of recreating them every time a star is captured.
export function useStarAnimations(stars: Star[]): Map<string, StarAnim> {
  const starIdsKey = stars.map((star) => star.id).join(',');

  const anims = useMemo(() => {
    const map = new Map<string, StarAnim>();
    for (const star of stars) {
      map.set(star.id, {
        captureScale: makeMutable(star.active ? 1 : 0),
        opacity: makeMutable(star.active ? 1 : 0),
        flash: makeMutable(0),
        particles: Array.from({ length: MAX_PARTICLE_COUNT }, () => ({
          x: makeMutable(star.x),
          y: makeMutable(star.y),
          opacity: makeMutable(0),
        })),
        rotation: makeMutable(0),
        breathe: makeMutable(1),
        glow: makeMutable(0.6),
        sparkle: makeMutable(0),
      });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on ids, not the stars array
  }, [starIdsKey]);

  useEffect(() => {
    for (const star of stars) {
      const anim = anims.get(star.id);
      if (anim && star.active) startIdleAnimations(anim, hashStringToSeed(star.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idle loops only need to start once per anim bundle
  }, [anims]);

  const prevActiveRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    for (const star of stars) {
      const wasActive = prevActiveRef.current.get(star.id) ?? star.active;

      if (wasActive && !star.active) {
        const anim = anims.get(star.id);
        if (anim) {
          const config = STAR_VISUALS[star.type];

          anim.captureScale.value = withSequence(
            withTiming(config.popScale, { duration: POP_DURATION }),
            withTiming(0, { duration: FADE_DURATION })
          );
          anim.opacity.value = withTiming(0, { duration: POP_DURATION + FADE_DURATION });
          anim.flash.value = withSequence(
            withTiming(1, { duration: FLASH_IN_DURATION }),
            withTiming(0, { duration: FLASH_OUT_DURATION })
          );

          const distance = star.size * config.particleDistanceFactor;
          const angles = particleAngles(config.particleCount);
          anim.particles.forEach((particle, index) => {
            if (index >= config.particleCount) return;
            const angle = angles[index];
            particle.x.value = star.x;
            particle.y.value = star.y;
            particle.opacity.value = withSequence(
              withTiming(1, { duration: 40 }),
              withDelay(PARTICLE_DURATION - 120, withTiming(0, { duration: 120 }))
            );
            particle.x.value = withTiming(star.x + Math.cos(angle) * distance, {
              duration: PARTICLE_DURATION,
            });
            particle.y.value = withTiming(star.y + Math.sin(angle) * distance, {
              duration: PARTICLE_DURATION,
            });
          });
        }
      }

      prevActiveRef.current.set(star.id, star.active);
    }
  }, [stars, anims]);

  return anims;
}
