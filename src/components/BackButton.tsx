import { Pressable, StyleSheet } from 'react-native';

import { COLORS } from '../theme/theme';
import { selection } from '../services/haptics';
import GameIcon from './ui/GameIcon';

interface BackButtonProps {
  onPress: () => void;
}

// The one back-navigation control, reused on every screen that pushes on
// top of another - keeps the icon, hit target, and haptic feedback
// consistent instead of each screen re-implementing its own "‹ Back" text.
export default function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable
      onPress={() => {
        void selection();
        onPress();
      }}
      hitSlop={8}
      style={styles.button}
    >
      <GameIcon name="back" size={24} color={COLORS.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
  },
});
