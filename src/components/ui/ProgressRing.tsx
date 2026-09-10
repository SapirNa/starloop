import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { COLORS } from '../../theme/theme';

interface ProgressRingProps {
  progress: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

// A compact circular completion indicator for the Profile header ("overall
// game completion") - reuses the Skia canvas already a project dependency
// (see StarfieldBackground.tsx) rather than pulling in a new SVG library
// for one ring. Static (no animated draw-in): re-renders cheaply whenever
// `progress` changes, which is all a header stat needs.
export default function ProgressRing({
  progress,
  size = 76,
  strokeWidth = 8,
  color = COLORS.primary,
  trackColor = COLORS.surfaceElevated,
  children,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const rect = useMemo(
    () => ({
      x: strokeWidth / 2,
      y: strokeWidth / 2,
      width: size - strokeWidth,
      height: size - strokeWidth,
    }),
    [size, strokeWidth]
  );

  const trackPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addOval(rect);
    return path;
  }, [rect]);

  const fillPath = useMemo(() => {
    const path = Skia.Path.Make();
    // Starts at the top (-90deg) and sweeps clockwise.
    path.addArc(rect, -90, clamped * 360);
    return path;
  }, [rect, clamped]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={trackPath} style="stroke" strokeWidth={strokeWidth} color={trackColor} />
        {clamped > 0 && (
          <Path
            path={fillPath}
            style="stroke"
            strokeWidth={strokeWidth}
            color={color}
            strokeCap="round"
          />
        )}
      </Canvas>
      {children && <View style={[StyleSheet.absoluteFill, styles.content]}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
