import { StyleSheet, View } from 'react-native';

import { COLORS } from '../../theme/theme';
import GameIcon from './GameIcon';

interface AvatarProps {
  size?: number;
}

// The one player-avatar treatment, shared by Home's top bar and the Profile
// header - no photo/backend account, just a consistent circular badge.
export default function Avatar({ size = 56 }: AvatarProps) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <GameIcon name="profile" size={size * 0.55} color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
});
