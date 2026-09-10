import { BlurMask, Canvas, Circle, Fill, Group } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { makeMutable, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { COLORS } from '../theme/theme';

interface StarfieldBackgroundProps {
  width: number;
  height: number;
  accentColor?: string;
}

interface StaticDot {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

// Deterministic pseudo-random so the field looks the same every render/app
// launch instead of reshuffling (and to avoid any real Math.random cost).
function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const DOT_COUNT = 36;
const TWINKLE_COUNT = 6;

// Purely decorative, drawn once (no per-frame work beyond a handful of slow
// opacity twinkles) - safe to use on menu/list screens. Never used behind
// GameCanvas, which already owns the gameplay Skia canvas.
export default function StarfieldBackground({ width, height, accentColor }: StarfieldBackgroundProps) {
  const dots = useMemo<StaticDot[]>(() => {
    const random = seededRandom(width * 7919 + height * 104729 + 1);
    return Array.from({ length: DOT_COUNT }, () => ({
      x: random() * width,
      y: random() * height,
      r: 0.6 + random() * 1.6,
      opacity: 0.25 + random() * 0.55,
    }));
  }, [width, height]);

  const twinkles = useMemo(
    () => dots.slice(0, Math.min(TWINKLE_COUNT, dots.length)).map((dot) => ({ dot, opacity: makeMutable(dot.opacity) })),
    [dots]
  );

  useEffect(() => {
    // Bounded (not infinite) repeat count: a few gentle twinkles on
    // appearance, then the animation settles and stops driving frames
    // entirely - this screen may stay mounted (but not visible) behind
    // others in the navigation stack, and an indefinite loop back there
    // would keep costing UI-thread work for no visible benefit.
    twinkles.forEach(({ opacity }, index) => {
      opacity.value = withDelay(
        index * 260,
        withRepeat(
          withSequence(withTiming(0.15, { duration: 1400 }), withTiming(1, { duration: 1400 })),
          3,
          true
        )
      );
    });
  }, [twinkles]);

  const secondary = accentColor ?? COLORS.secondary;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill color={COLORS.backgroundDeep} />

      {/* Soft nebula glows - two large blurred circles, static. */}
      <Group opacity={0.16}>
        <Circle cx={width * 0.18} cy={height * 0.14} r={Math.max(width, height) * 0.28} color={COLORS.primary}>
          <BlurMask blur={60} style="normal" />
        </Circle>
      </Group>
      <Group opacity={0.14}>
        <Circle cx={width * 0.85} cy={height * 0.75} r={Math.max(width, height) * 0.24} color={secondary}>
          <BlurMask blur={70} style="normal" />
        </Circle>
      </Group>

      {dots.map((dot, index) => (
        <Circle key={index} cx={dot.x} cy={dot.y} r={dot.r} color={COLORS.text} opacity={dot.opacity} />
      ))}

      {twinkles.map(({ dot, opacity }, index) => (
        <Circle key={`twinkle-${index}`} cx={dot.x} cy={dot.y} r={dot.r * 1.4} color={COLORS.gold} opacity={opacity} />
      ))}
    </Canvas>
  );
}
