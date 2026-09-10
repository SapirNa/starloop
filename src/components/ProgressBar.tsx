import { StyleSheet, View } from 'react-native';

import { COLORS } from '../theme/theme';

interface ProgressBarProps {
  progress: number;
  target: number;
}

export default function ProgressBar({ progress, target }: ProgressBarProps) {
  const ratio = target > 0 ? Math.min(1, progress / target) : 0;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
});
