import { StyleSheet, View } from 'react-native';

import { COLORS } from '../theme/theme';
import type { StarRating as StarRatingValue } from '../types/level';
import GameIcon from './ui/GameIcon';

interface StarRatingProps {
  rating: StarRatingValue;
  size?: number;
}

export default function StarRating({ rating, size = 18 }: StarRatingProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3].map((position) => (
        <GameIcon
          key={position}
          name={position <= rating ? 'starFilled' : 'starOutline'}
          size={size}
          color={position <= rating ? COLORS.gold : COLORS.textMuted}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
  },
});
