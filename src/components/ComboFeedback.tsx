import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { COLORS } from '../theme/theme';
import type { ComboFeedback as ComboFeedbackValue } from '../stores/useGameStore';

interface ComboFeedbackProps {
  feedback: ComboFeedbackValue | null;
}

const VISIBLE_MS = 650;
const FADE_MS = 200;

// A brief, non-blocking toast for combo captures ("NICE LOOP!", etc). Purely
// cosmetic - gameplay state never waits on this animation.
export default function ComboFeedback({ feedback }: ComboFeedbackProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (!feedback) return;
    cancelAnimation(opacity);
    cancelAnimation(scale);
    opacity.value = withSequence(
      withTiming(1, { duration: FADE_MS }),
      withTiming(1, { duration: VISIBLE_MS }),
      withTiming(0, { duration: FADE_MS })
    );
    scale.value = withTiming(1, { duration: FADE_MS });
    // Re-fires whenever a new feedback event (seq) arrives, even with the
    // same text.
  }, [feedback, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!feedback) return null;

  return (
    <Animated.Text style={[styles.text, animatedStyle]} pointerEvents="none">
      {feedback.text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    color: COLORS.gold,
    fontSize: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
