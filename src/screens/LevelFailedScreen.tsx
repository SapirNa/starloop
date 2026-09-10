import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Button from '../components/Button';
import Screen from '../components/Screen';
import {
  CONTINUE_BONUS_LOOPS,
  CONTINUE_BONUS_SECONDS,
  getRewardedAdStatus,
  isAdsSdkAvailable,
  MAX_REWARDED_CONTINUES_PER_ATTEMPT,
  preloadRewardedAd,
  showRewardedAd,
} from '../services/ads';
import { LEVELS } from '../data/levels';
import { useAdsStore } from '../stores/useAdsStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme/theme';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelFailed'>;

type AdButtonState = 'unavailable' | 'loading' | 'available' | 'watching';

export default function LevelFailedScreen({ route, navigation }: Props) {
  const { levelId, score, reason } = route.params;
  const continuationsUsed = route.params.continuationsUsed ?? 0;
  const level = LEVELS.find((item) => item.id === levelId);

  // A continuation is only meaningful for a level whose failure was tied to
  // running out of time or loops - offering it on e.g. a bomb-hit failure
  // with no timer/loop limit would be a reward with nothing to apply to.
  const continuationTarget: 'seconds' | 'loops' | null =
    level?.timeLimit !== undefined && level?.timeLimit !== null
      ? 'seconds'
      : level?.maxLoops !== undefined && level?.maxLoops !== null
        ? 'loops'
        : null;

  const canOfferContinuation =
    continuationsUsed < MAX_REWARDED_CONTINUES_PER_ATTEMPT &&
    continuationTarget !== null &&
    isAdsSdkAvailable;

  const [adState, setAdState] = useState<AdButtonState>(() =>
    getRewardedAdStatus() === 'loaded' ? 'available' : 'unavailable'
  );

  useEffect(() => {
    if (!canOfferContinuation) return;
    if (getRewardedAdStatus() === 'idle') preloadRewardedAd();

    const interval = setInterval(() => {
      const status = getRewardedAdStatus();
      setAdState((prev) => {
        if (prev === 'watching') return prev;
        if (status === 'loaded') return 'available';
        if (status === 'loading') return 'loading';
        return 'unavailable';
      });
    }, 500);
    return () => clearInterval(interval);
  }, [canOfferContinuation]);

  const handleWatchAdToContinue = async () => {
    if (adState !== 'available') return;
    setAdState('watching');

    const result = await showRewardedAd('continue');
    if (!result.earnedReward) {
      setAdState(getRewardedAdStatus() === 'loaded' ? 'available' : 'unavailable');
      return;
    }

    useAdsStore.getState().recordRewardedCompleted();
    navigation.replace('Game', {
      levelId,
      continueBonus:
        continuationTarget === 'seconds' ? { seconds: CONTINUE_BONUS_SECONDS } : { loops: CONTINUE_BONUS_LOOPS },
      continuationsUsed: continuationsUsed + 1,
    });
  };

  const continueLabel =
    adState === 'watching'
      ? 'Watching Ad...'
      : adState === 'loading'
        ? 'Preparing Ad...'
        : continuationTarget === 'seconds'
          ? `Watch Ad — +${CONTINUE_BONUS_SECONDS}s`
          : `Watch Ad — +${CONTINUE_BONUS_LOOPS} Loop`;

  return (
    <Screen accentColor={COLORS.danger}>
      <View style={styles.center}>
        <Text style={styles.title}>Level Failed</Text>
        {reason && <Text style={styles.reason}>{reason}</Text>}
        <Text style={styles.score}>Score: {score}</Text>

        <View style={styles.buttons}>
          <Button label="Retry" onPress={() => navigation.replace('Game', { levelId })} />
          {canOfferContinuation && (
            <Button
              label={continueLabel}
              variant="secondary"
              disabled={adState !== 'available'}
              onPress={() => void handleWatchAdToContinue()}
            />
          )}
          <Button
            label="Level Select"
            variant="secondary"
            onPress={() =>
              navigation.reset({
                index: 2,
                routes: [
                  { name: 'Home' },
                  { name: 'WorldMap' },
                  { name: 'LevelSelect', params: { worldId: level?.worldId ?? 'world-1' } },
                ],
              })
            }
          />
        </View>
      </View>
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
    color: COLORS.danger,
    fontSize: 28,
    fontWeight: '700',
  },
  reason: {
    ...TYPOGRAPHY.bodyMuted,
    fontSize: 16,
  },
  score: {
    ...TYPOGRAPHY.bodyMuted,
    fontSize: 18,
  },
  buttons: {
    marginTop: SPACING.sm,
    gap: SPACING.sm + 4,
    alignItems: 'stretch',
    width: 240,
  },
});
