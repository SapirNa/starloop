import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { COLORS, SPACING, TYPOGRAPHY, glowShadow } from '../theme/theme';
import GameIcon, { type GameIconName } from './ui/GameIcon';

export type PowerUpOrbState = 'available' | 'active' | 'unavailable';

interface PowerUpOrbProps {
  icon: GameIconName;
  label: string;
  accentColor: string;
  state: PowerUpOrbState;
  quantity: number;
  // Replaces the "x{quantity}" line while active (e.g. a countdown) or to
  // explain an unavailable state beyond "zero left" (e.g. "No Timer").
  statusOverride?: string;
  onActivate: () => void;
}

const ORB_SIZE = 68;
// Ignore a second tap within this window - a real double-activation (two
// separate, deliberate presses) is still allowed through, this only
// absorbs an accidental double-fire from a single tap gesture.
const DOUBLE_TAP_GUARD_MS = 400;

// A premium, orb-shaped power-up control - circular body, colored glow,
// icon, label, and a quantity/status line underneath. Deliberately not
// built as a generic list item: FREEZE and TIME+ are important, limited
// tools, not secondary navigation buttons.
export default function PowerUpOrb({
  icon,
  label,
  accentColor,
  state,
  quantity,
  statusOverride,
  onActivate,
}: PowerUpOrbProps) {
  const pressScale = useSharedValue(1);
  const activePulse = useSharedValue(0);
  const lastActivationAt = useRef(0);

  useEffect(() => {
    if (state === 'active') {
      activePulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 480 }), withTiming(0.5, { duration: 480 })),
        -1,
        true
      );
    } else {
      activePulse.value = withTiming(0, { duration: 200 });
    }
  }, [state, activePulse]);

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.3 + activePulse.value * 0.4,
    transform: [{ scale: 1 + activePulse.value * 0.12 }],
  }));

  const disabled = state === 'unavailable';

  const handlePress = () => {
    const now = Date.now();
    if (now - lastActivationAt.current < DOUBLE_TAP_GUARD_MS) return;
    lastActivationAt.current = now;
    onActivate();
  };

  /* eslint-disable react-hooks/immutability --
   * Mutating a SharedValue's `.value` inside a plain press-event handler
   * (not during render) is the standard Reanimated idiom for driving a
   * press-in/press-out animation - the same pattern this codebase already
   * uses lint-clean inside useEffect/useFrameCallback (see
   * gameplay/useStarMotion.ts); this rule just doesn't special-case
   * Pressable's callback props the same way. */
  const handlePressIn = () => {
    pressScale.value = withTiming(0.88, { duration: 80 });
  };
  const handlePressOut = () => {
    pressScale.value = withSequence(withTiming(1.06, { duration: 90 }), withTiming(1, { duration: 110 }));
  };
  /* eslint-enable react-hooks/immutability */

  return (
    <View style={styles.container}>
      <Pressable
        disabled={disabled}
        hitSlop={8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <Animated.View
          style={[styles.glow, { backgroundColor: accentColor }, glowAnimatedStyle]}
          pointerEvents="none"
        />
        <Animated.View
          style={[
            styles.orb,
            { borderColor: disabled ? COLORS.border : accentColor },
            !disabled && glowShadow(accentColor),
            orbAnimatedStyle,
          ]}
        >
          <View style={styles.innerHighlight} pointerEvents="none" />
          <GameIcon name={icon} size={28} color={disabled ? COLORS.textMuted : accentColor} />
        </Animated.View>
      </Pressable>

      <Text style={[styles.label, disabled && styles.textDisabled]}>{label}</Text>
      <Text style={[styles.status, !disabled && { color: accentColor }, disabled && styles.textDisabled]}>
        {statusOverride ?? `x${quantity}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 88,
    gap: 2,
  },
  glow: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: ORB_SIZE - 8,
    height: ORB_SIZE - 8,
    borderRadius: (ORB_SIZE - 8) / 2,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  innerHighlight: {
    position: 'absolute',
    top: 7,
    left: 13,
    width: ORB_SIZE * 0.42,
    height: ORB_SIZE * 0.24,
    borderRadius: ORB_SIZE * 0.2,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING.xs,
  },
  status: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  textDisabled: {
    color: COLORS.textMuted,
  },
});
