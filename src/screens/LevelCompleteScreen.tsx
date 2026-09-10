import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Button from '../components/Button';
import EntranceView from '../components/EntranceView';
import Screen from '../components/Screen';
import StarRating from '../components/StarRating';
import { LEVELS } from '../data/levels';
import { useAdsStore } from '../stores/useAdsStore';
import { COLORS, SPACING } from '../theme/theme';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelComplete'>;

export default function LevelCompleteScreen({ route, navigation }: Props) {
  const { levelId, score, rating, coinsEarned } = route.params;
  const levelIndex = LEVELS.findIndex((item) => item.id === levelId);
  const level = LEVELS[levelIndex];
  const nextLevel = LEVELS[levelIndex + 1];

  // Never blocks these actions on ad load/network - maybeShowInterstitial
  // itself only ever shows one if it was already preloaded and the
  // frequency rules allow it, and always resolves (never rejects/hangs).
  // This just keeps a double-tap from firing the check twice while it's
  // deciding.
  const [isLeaving, setIsLeaving] = useState(false);

  const leaveViaInterstitial = async (proceed: () => void) => {
    if (isLeaving) return;
    setIsLeaving(true);
    await useAdsStore.getState().maybeShowInterstitial();
    proceed();
  };

  return (
    <Screen accentColor={COLORS.success}>
      <EntranceView style={styles.center}>
        <Text style={styles.title}>Level Complete!</Text>
        <StarRating rating={rating} size={40} />
        <Text style={styles.score}>Score: {score}</Text>
        {coinsEarned > 0 && <Text style={styles.coins}>+{coinsEarned} coins</Text>}

        <View style={styles.buttons}>
          {nextLevel && (
            <Button
              label="Next Level"
              disabled={isLeaving}
              onPress={() =>
                void leaveViaInterstitial(() => navigation.replace('Game', { levelId: nextLevel.id }))
              }
            />
          )}
          <Button
            label="Replay"
            variant="secondary"
            disabled={isLeaving}
            onPress={() => void leaveViaInterstitial(() => navigation.replace('Game', { levelId }))}
          />
          <Button
            label="Level Select"
            variant="secondary"
            disabled={isLeaving}
            onPress={() =>
              void leaveViaInterstitial(() =>
                navigation.reset({
                  index: 2,
                  routes: [
                    { name: 'Home' },
                    { name: 'WorldMap' },
                    { name: 'LevelSelect', params: { worldId: level?.worldId ?? 'world-1' } },
                  ],
                })
              )
            }
          />
        </View>
      </EntranceView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
  },
  score: {
    color: COLORS.textMuted,
    fontSize: 18,
  },
  coins: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '600',
  },
  buttons: {
    marginTop: SPACING.sm,
    gap: SPACING.sm + 4,
    alignItems: 'stretch',
    width: 220,
  },
});
