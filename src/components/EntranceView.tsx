import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface EntranceViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
}

// One-shot fade + scale-up + settle-down entrance, for moments that deserve
// a bit of ceremony (level complete, a claimed reward) without any ongoing
// animation cost once it settles.
export default function EntranceView({ children, style, delay = 0 }: EntranceViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
    );
  }, [progress, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.9 + progress.value * 0.1 },
      { translateY: (1 - progress.value) * 12 },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
