import { BlurMask, Circle, Group, Path } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { STAR_VISUALS } from '../config/starVisuals';
import type { Star } from '../types/star';
import type { StarAnim } from './useStarAnimations';
import type { StarMotion } from './useStarMotion';
import { createClockTicksPath, createStarPath } from './starShape';

interface StarVisualProps {
  star: Star;
  motion: StarMotion;
  anim: StarAnim;
}

// Routes to a type-specific visual - BOMB is a fundamentally different
// silhouette (a dark orb, not a star), never just a recolored star, per the
// accessibility requirement that gameplay-important types read apart by
// shape/detail, not color alone.
export default function StarVisual({ star, motion, anim }: StarVisualProps) {
  if (star.type === 'BOMB') {
    return <BombVisual star={star} motion={motion} anim={anim} />;
  }
  return <StandardStarVisual star={star} motion={motion} anim={anim} />;
}

function StandardStarVisual({ star, motion, anim }: StarVisualProps) {
  const config = STAR_VISUALS[star.type];
  const outerRadius = star.size;

  const starPath = useMemo(() => createStarPath(outerRadius), [outerRadius]);
  const clockTicksPath = useMemo(
    () => (star.type === 'TIME' ? createClockTicksPath(outerRadius * 0.62) : null),
    [outerRadius, star.type]
  );

  const positionTransform = useDerivedValue(() => [
    { translateX: motion.x.value },
    { translateY: motion.y.value },
  ]);
  const localTransform = useDerivedValue(() => [
    { rotate: anim.rotation.value },
    { scale: anim.breathe.value * anim.captureScale.value },
  ]);

  const glowOpacity = useDerivedValue(() => anim.opacity.value * (0.25 + anim.glow.value * 0.35));
  const highlightOpacity = useDerivedValue(() => anim.opacity.value * 0.55);
  const sparkleOpacity = useDerivedValue(() => anim.opacity.value * anim.sparkle.value);

  // A SPEED star communicates its pace with two short trailing marks
  // opposite its live direction of travel - direction changes over time as
  // it bounces, so this reads straight from the same vx/vy shared values
  // driving its motion (see useStarMotion.ts), never a static offset.
  const isSpeedType = star.type === 'SPEED';
  const trailUnit = useDerivedValue(() => {
    const speed = Math.hypot(motion.vx.value, motion.vy.value);
    if (!isSpeedType || speed === 0) return { x: 0, y: 0 };
    return { x: motion.vx.value / speed, y: motion.vy.value / speed };
  });
  const trail1X = useDerivedValue(() => motion.x.value - trailUnit.value.x * outerRadius * 1.6);
  const trail1Y = useDerivedValue(() => motion.y.value - trailUnit.value.y * outerRadius * 1.6);
  const trail2X = useDerivedValue(() => motion.x.value - trailUnit.value.x * outerRadius * 2.8);
  const trail2Y = useDerivedValue(() => motion.y.value - trailUnit.value.y * outerRadius * 2.8);
  const trailOpacity1 = useDerivedValue(() => anim.opacity.value * 0.45);
  const trailOpacity2 = useDerivedValue(() => anim.opacity.value * 0.22);

  return (
    <Group>
      {isSpeedType && (
        <>
          <Circle cx={trail2X} cy={trail2Y} r={outerRadius * 0.32} color={config.glow} opacity={trailOpacity2} />
          <Circle cx={trail1X} cy={trail1Y} r={outerRadius * 0.42} color={config.glow} opacity={trailOpacity1} />
        </>
      )}

      {/* Soft outer glow - a circle needs no rotation, so it tracks
          position directly without the transform groups below. */}
      <Circle cx={motion.x} cy={motion.y} r={outerRadius * 1.8} color={config.glow} opacity={glowOpacity}>
        <BlurMask blur={outerRadius * 0.9} style="normal" />
      </Circle>

      <Group transform={positionTransform}>
        <Group transform={localTransform}>
          <Path path={starPath} color={config.fill} opacity={anim.opacity} />
          {/* Luminous center / highlight, offset slightly up for a subtle
              sense of depth (a flat center would read as a paper cutout). */}
          <Circle cx={0} cy={-outerRadius * 0.15} r={outerRadius * 0.32} color={config.highlight} opacity={highlightOpacity} />
          {clockTicksPath && (
            <Path path={clockTicksPath} style="stroke" strokeWidth={1.4} strokeCap="round" color={config.highlight} opacity={anim.opacity} />
          )}
        </Group>
      </Group>

      {/* Capture flash. */}
      <Circle cx={motion.x} cy={motion.y} r={outerRadius * 1.6} color={config.flashColor} opacity={anim.flash} />
      {/* Occasional idle sparkle. */}
      <Circle cx={motion.x} cy={motion.y} r={outerRadius * 0.35} color={config.highlight} opacity={sparkleOpacity} />

      {anim.particles.map((particle, index) => (
        <Circle key={index} cx={particle.x} cy={particle.y} r={3} color={config.particleColor} opacity={particle.opacity} />
      ))}
    </Group>
  );
}

// A dark, distinctly non-star silhouette with a pulsing danger ring - never
// just a recolored star (see StarVisual above).
function BombVisual({ star, motion, anim }: StarVisualProps) {
  const config = STAR_VISUALS.BOMB;
  const outerRadius = star.size;

  const bodyRadius = useDerivedValue(() => outerRadius * anim.captureScale.value);
  const highlightRadius = useDerivedValue(() => outerRadius * 0.28 * anim.captureScale.value);
  const highlightOpacity = useDerivedValue(() => anim.opacity.value * 0.6);
  const glowOpacity = useDerivedValue(() => anim.opacity.value * 0.35);
  const ringRadius = useDerivedValue(
    () => outerRadius * (1.25 + anim.glow.value * 0.45) * anim.captureScale.value
  );
  const ringOpacity = useDerivedValue(() => anim.opacity.value * (0.3 + anim.glow.value * 0.4));
  const highlightX = useDerivedValue(() => motion.x.value - outerRadius * 0.22);
  const highlightY = useDerivedValue(() => motion.y.value - outerRadius * 0.22);

  return (
    <Group>
      <Circle cx={motion.x} cy={motion.y} r={outerRadius * 2.2} color={config.glow} opacity={glowOpacity}>
        <BlurMask blur={outerRadius} style="normal" />
      </Circle>
      <Circle
        cx={motion.x}
        cy={motion.y}
        r={ringRadius}
        color={config.glow}
        opacity={ringOpacity}
        style="stroke"
        strokeWidth={2}
      />
      <Circle cx={motion.x} cy={motion.y} r={bodyRadius} color={config.fill} opacity={anim.opacity} />
      <Circle
        cx={highlightX}
        cy={highlightY}
        r={highlightRadius}
        color={config.highlight}
        opacity={highlightOpacity}
      />

      <Circle cx={motion.x} cy={motion.y} r={outerRadius * 1.8} color={config.flashColor} opacity={anim.flash} />

      {anim.particles.map((particle, index) => (
        <Circle key={index} cx={particle.x} cy={particle.y} r={3} color={config.particleColor} opacity={particle.opacity} />
      ))}
    </Group>
  );
}
