import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { COLORS } from '../theme/theme';

export interface TimeBonusFeedbackValue {
  seconds: number;
  seq: number;
}

interface TimeBonusFeedbackProps {
  feedback: TimeBonusFeedbackValue | null;
}

// A brief "+N SEC" that rises and fades near the HUD's time display when
// TIME+ is activated - purely cosmetic, mirrors ComboFeedback's pattern.
export default function TimeBonusFeedback({ feedback }: TimeBonusFeedbackProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!feedback) return;
    cancelAnimation(opacity);
    cancelAnimation(translateY);
    opacity.value = 0;
    translateY.value = 0;
    opacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(1, { duration: 420 }),
      withTiming(0, { duration: 260 })
    );
    translateY.value = withTiming(-26, { duration: 700, easing: Easing.out(Easing.cubic) });
    // Re-fires whenever a new bonus event (seq) arrives, even with the same amount.
  }, [feedback, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!feedback) return null;

  return (
    <Animated.Text style={[styles.text, animatedStyle]} pointerEvents="none">
      +{feedback.seconds} SEC
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    top: 0,
    left: 0,
    color: COLORS.success,
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
