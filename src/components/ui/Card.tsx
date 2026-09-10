import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { COLORS, RADIUS, SHADOWS, SPACING } from '../../theme/theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  highlighted?: boolean;
}

// The one elevated-surface container shared by every card-shaped list item
// and section (achievements, challenges, profile sections, settings rows)
// so radius/padding/border treatment stay identical everywhere instead of
// each screen re-deriving its own. `highlighted` is the shared "this needs
// your attention" treatment (a claimable achievement, today's reward tile).
export default function Card({ children, style, elevated, highlighted }: CardProps) {
  return (
    <View style={[styles.base, elevated && SHADOWS.card, highlighted && styles.highlighted, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: SPACING.md,
  },
  highlighted: {
    borderColor: COLORS.gold,
  },
});
