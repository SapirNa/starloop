import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { COLORS, RADIUS, SPACING } from '../theme/theme';
import { selection } from '../services/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_BACKGROUND: Record<ButtonVariant, string> = {
  primary: COLORS.primary,
  secondary: COLORS.surfaceElevated,
  danger: COLORS.danger,
};

// One rounded button style shared by every screen, so "premium casual"
// consistency doesn't depend on each screen re-deriving the same padding/
// radius/colors by hand. Also the one place important-button-press haptics
// and press feedback live, instead of being sprinkled into every screen.
export default function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const handlePress = () => {
    void selection();
    onPress();
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: VARIANT_BACKGROUND[variant] },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: SPACING.md - 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
