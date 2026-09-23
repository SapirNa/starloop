import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DAILY_REWARD_TIERS,
  getDayTileState,
  type DailyRewardTier,
} from '../services/dailyRewards';
import {
  getRewardedAdStatus,
  isAdsSdkAvailable,
  showRewardedAd,
} from '../services/ads';
import { useAdsStore } from '../stores/useAdsStore';
import { useDailyRewardsStore } from '../stores/useDailyRewardsStore';
import { useEconomyStore } from '../stores/useEconomyStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/theme';
import Button from './Button';
import EntranceView from './EntranceView';
import GameIcon from './ui/GameIcon';

interface DailyRewardModalProps {
  visible: boolean;
  onClose: () => void;
}

function describeReward(tier: DailyRewardTier): string {
  const parts = [`${tier.coins} coins`];
  for (const powerUp of tier.powerUps) {
    const label = powerUp.type.replace('_', ' ').toLowerCase();
    parts.push(`${powerUp.amount}x ${label}`);
  }
  return parts.join(' + ');
}

function grantReward(reward: DailyRewardTier): void {
  const economy = useEconomyStore.getState();
  economy.addCoins(reward.coins);
  for (const powerUp of reward.powerUps) {
    economy.addPowerUp(powerUp.type, powerUp.amount);
  }
}

// Shown automatically on app startup when a reward is available (see
// HomeScreen), and reused as-is for the manual "Daily Reward" menu entry
// (DailyRewardScreen) - one implementation, two entry points.
export default function DailyRewardModal({ visible, onClose }: DailyRewardModalProps) {
  const claim = useDailyRewardsStore((state) => state.claim);
  const getClaimStatus = useDailyRewardsStore((state) => state.getClaimStatus);
  const getDisplayState = useDailyRewardsStore((state) => state.getDisplayState);
  const canDoubleDailyReward = useAdsStore((state) => state.canDoubleDailyReward());

  const [justClaimed, setJustClaimed] = useState<DailyRewardTier | null>(null);
  const [doubled, setDoubled] = useState(false);
  const [isWatchingDoubleAd, setIsWatchingDoubleAd] = useState(false);
  const claimStatus = getClaimStatus();
  // Reflects a missed-day reset immediately, even before Claim is tapped -
  // see getDailyRewardDisplayState in services/dailyRewards.ts.
  const { dailyStreak, currentRewardDay } = getDisplayState();

  const handleClaim = () => {
    const reward = claim();
    if (reward) setJustClaimed(reward);
  };

  const handleWatchAdToDouble = async () => {
    if (!justClaimed || isWatchingDoubleAd) return;
    setIsWatchingDoubleAd(true);

    // Preloading happens app-wide (see services/ads/index.ts) - this only
    // ever shows one that's already ready; it never starts a fresh load on
    // tap.
    if (getRewardedAdStatus() !== 'loaded') {
      setIsWatchingDoubleAd(false);
      return;
    }

    const result = await showRewardedAd('dailyRewardDouble');
    setIsWatchingDoubleAd(false);
    if (!result.earnedReward) return;

    // The reward is only ever granted a second time after the SDK confirms
    // it was actually earned - never just for the ad having opened.
    grantReward(justClaimed);
    useAdsStore.getState().recordRewardedCompleted();
    useAdsStore.getState().markDailyRewardDoubled();
    setDoubled(true);
  };

  const showDoubleOption =
    !!justClaimed && !doubled && canDoubleDailyReward && isAdsSdkAvailable;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <EntranceView style={styles.card}>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <GameIcon name="close" size={22} color={COLORS.textMuted} />
          </Pressable>

          <GameIcon name="gift" size={36} color={COLORS.gold} />
          <Text style={styles.title}>Daily Reward</Text>
          <Text style={styles.streak}>
            {dailyStreak}-day streak{dailyStreak !== 1 ? 's' : ''}
          </Text>

          <View style={styles.grid}>
            {DAILY_REWARD_TIERS.map((tier) => {
              const tileState = getDayTileState(tier.day, currentRewardDay);
              return (
                <View
                  key={tier.day}
                  style={[
                    styles.tile,
                    tileState === 'today' && styles.tileToday,
                    tileState === 'claimed' && styles.tileClaimed,
                  ]}
                >
                  {tileState === 'claimed' ? (
                    <GameIcon name="checkmark" size={16} color={COLORS.success} />
                  ) : tileState === 'locked' ? (
                    <GameIcon name="lock" size={14} color={COLORS.textMuted} />
                  ) : (
                    <Text style={styles.tileDay}>Day {tier.day}</Text>
                  )}
                  <Text style={styles.tileReward}>{describeReward(tier)}</Text>
                </View>
              );
            })}
          </View>

          {justClaimed ? (
            <EntranceView style={styles.claimedGroup}>
              <Text style={styles.claimedText}>
                {doubled ? 'Doubled! ' : 'Claimed: '}
                {describeReward(justClaimed)}
              </Text>
              {showDoubleOption && (
                <Button
                  label={isWatchingDoubleAd ? 'Watching Ad...' : 'Watch Ad — Double Reward'}
                  variant="secondary"
                  disabled={isWatchingDoubleAd}
                  onPress={() => void handleWatchAdToDouble()}
                  style={styles.doubleButton}
                />
              )}
            </EntranceView>
          ) : (
            <Button
              label={claimStatus.canClaim ? 'Claim Reward' : 'Already Claimed Today'}
              disabled={!claimStatus.canClaim}
              onPress={handleClaim}
              style={styles.claimButton}
            />
          )}
        </EntranceView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.sectionTitle,
    fontSize: 22,
  },
  streak: {
    ...TYPOGRAPHY.bodyMuted,
    marginBottom: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xs + 2,
  },
  tile: {
    width: 76,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    gap: 4,
  },
  tileToday: {
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  tileClaimed: {
    opacity: 0.6,
  },
  tileDay: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  tileReward: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  claimedGroup: {
    width: '100%',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  claimedText: {
    color: COLORS.gold,
    fontSize: 14,
    textAlign: 'center',
  },
  claimButton: {
    marginTop: SPACING.md,
    width: '100%',
  },
  doubleButton: {
    width: '100%',
  },
});
