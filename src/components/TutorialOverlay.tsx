import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { COLORS, RADIUS, SPACING } from '../theme/theme';
import type { Point } from '../utils/geometry';

interface TutorialOverlayProps {
  // Star centers (canvas pixel space) to trace an animated loop around.
  targets: Point[];
  message: string;
  onSkip: () => void;
}

const DOT_SIZE = 16;
const PADDING = 44;
const MIN_RADIUS = 46;

interface Ellipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

function computeEllipse(targets: Point[]): Ellipse {
  const xs = targets.map((t) => t.x);
  const ys = targets.map((t) => t.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    rx: Math.max(MIN_RADIUS, (maxX - minX) / 2 + PADDING),
    ry: Math.max(MIN_RADIUS, (maxY - minY) / 2 + PADDING),
  };
}

// Teaches the loop gesture through a looping animated demonstration instead
// of a text wall - a small glowing dot traces the exact loop the player
// should draw. Purely decorative (pointerEvents box-none except the tiny
// skip pill), so it can never block the real drawing gesture underneath.
export default function TutorialOverlay({ targets, message, onSkip }: TutorialOverlayProps) {
  const angle = useSharedValue(0);

  useEffect(() => {
    angle.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 2400, easing: Easing.linear }),
      -1,
      false
    );
  }, [angle]);

  const ellipse = targets.length > 0 ? computeEllipse(targets) : null;

  const dotStyle = useAnimatedStyle(() => {
    if (!ellipse) return { opacity: 0 };
    return {
      opacity: 1,
      transform: [
        { translateX: ellipse.cx + Math.cos(angle.value) * ellipse.rx - DOT_SIZE / 2 },
        { translateY: ellipse.cy + Math.sin(angle.value) * ellipse.ry - DOT_SIZE / 2 },
      ],
    };
  });

  if (!ellipse) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[styles.dot, dotStyle]} />
      <Pressable style={styles.pill} onPress={onSkip} hitSlop={8}>
        <Text style={styles.pillText}>{message} · tap to skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  pill: {
    position: 'absolute',
    bottom: SPACING.lg,
    alignSelf: 'center',
    backgroundColor: 'rgba(22, 27, 41, 0.85)',
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  pillText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
