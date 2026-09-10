import { StyleSheet, Text, View } from 'react-native';

import { COLORS, RADIUS } from '../../theme/theme';

interface BadgeProps {
  // Omit for a plain attention dot (e.g. "daily reward available"); pass a
  // count for a claimable-item number (e.g. "2 achievements ready").
  count?: number;
  color?: string;
}

// Small pill/dot used to draw the eye to something actionable on Home
// (daily reward ready, achievements to claim) without a full text label.
// Purely visual - callers position it (typically absolute, top-right of the
// element it's attached to).
export default function Badge({ count, color = COLORS.danger }: BadgeProps) {
  if (count !== undefined && count <= 0) return null;

  return (
    <View style={[styles.base, { backgroundColor: color }, count === undefined && styles.dot]}>
      {count !== undefined && <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 18,
    height: 18,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.backgroundDeep,
  },
  dot: {
    minWidth: 10,
    width: 10,
    height: 10,
    borderWidth: 1.5,
  },
  text: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
});
