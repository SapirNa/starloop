import { useEffect, useRef } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

interface PulseTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

// A text label that gives a quick, cheap scale-pulse whenever its content
// changes (score going up, etc). Skips the pulse on first mount so screens
// don't "pop" just from appearing.
export default function PulseText({ text, style }: PulseTextProps) {
  const scale = useSharedValue(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    scale.value = withSequence(withTiming(1.18, { duration: 90 }), withTiming(1, { duration: 140 }));
  }, [text, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return <Animated.Text style={[style, animatedStyle]}>{text}</Animated.Text>;
}
