import { useCallback, useState, type ReactNode } from 'react';
import { LayoutChangeEvent, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, SPACING } from '../theme/theme';
import StarfieldBackground from './StarfieldBackground';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  accentColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
}

// Shared shell for every non-gameplay screen: safe-area-aware padding (so
// content never sits under a notch, status bar, or Android nav bar) plus the
// decorative cosmic background. GameScreen intentionally does NOT use this -
// it owns its own layout and cannot afford a second Skia canvas underneath
// the gameplay one.
export default function Screen({ children, scroll = false, accentColor, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.width === width && prev.height === height ? prev : { width, height }
    );
  }, []);

  const padding = {
    paddingTop: insets.top + SPACING.lg,
    paddingBottom: insets.bottom + SPACING.lg,
    paddingHorizontal: SPACING.lg,
  };

  return (
    <View style={styles.root} onLayout={handleLayout}>
      {size && (
        <StarfieldBackground width={size.width} height={size.height} accentColor={accentColor} />
      )}
      {scroll ? (
        <ScrollView contentContainerStyle={[padding, contentStyle]}>{children}</ScrollView>
      ) : (
        <View style={[styles.flexFill, padding, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.backgroundDeep,
  },
  flexFill: {
    flex: 1,
  },
});
