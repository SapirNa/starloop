import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Button from '../components/Button';
import DailyRewardModal from '../components/DailyRewardModal';
import ProgressBar from '../components/ProgressBar';
import Screen from '../components/Screen';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import GameIcon, { type GameIconName } from '../components/ui/GameIcon';
import { getLevelsForWorld, WORLDS } from '../data/worlds';
import {
  getRewardedAdStatus,
  isAdsSdkAvailable,
  preloadRewardedAd,
  REWARDED_COIN_AD_AMOUNT,
  showRewardedAd,
} from '../services/ads';
import { useAchievementsStore } from '../stores/useAchievementsStore';
import { useAdsStore } from '../stores/useAdsStore';
import { useChallengesStore } from '../stores/useChallengesStore';
import { useDailyRewardsStore } from '../stores/useDailyRewardsStore';
import { useEconomyStore } from '../stores/useEconomyStore';
import { useProfileStore } from '../stores/useProfileStore';
import { useProgressStore } from '../stores/useProgressStore';
import { APP_NAME, COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/theme';
import { RootStackParamList } from '../types/navigation';

type CoinAdState = 'unavailable' | 'loading' | 'available' | 'watching';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface HomeStatus {
  rewardAvailable: boolean;
  claimableAchievements: number;
  challengesComplete: number;
}

// These read from other stores on demand (not via a reactive selector), so
// this is called both on mount and on refocus rather than relied on to
// update itself - see the useFocusEffect below.
function readStatus(): HomeStatus {
  return {
    rewardAvailable: useDailyRewardsStore.getState().getClaimStatus().canClaim,
    claimableAchievements: useAchievementsStore
      .getState()
      .getProgress()
      .filter((entry) => entry.isComplete && !entry.isClaimed).length,
    challengesComplete: useChallengesStore
      .getState()
      .getTodaysProgress()
      .filter((entry) => entry.isComplete).length,
  };
}

export default function HomeScreen({ navigation }: Props) {
  const coins = useEconomyStore((state) => state.coins);
  const hints = useEconomyStore((state) => state.hints);
  const displayName = useProfileStore((state) => state.displayName);
  const levelsProgress = useProgressStore((state) => state.levels);
  const canWatchCoinAd = useAdsStore((state) => state.canWatchCoinAd());

  const [coinAdState, setCoinAdState] = useState<CoinAdState>(() =>
    getRewardedAdStatus() === 'loaded' ? 'available' : 'unavailable'
  );

  // Mirrors the polling pattern in LevelFailedScreen - the ad itself is
  // preloaded app-wide (services/ads/index.ts), this just reflects whatever
  // state it's already in so the button never lets the player tap while
  // loading, and hides itself if the SDK/placement isn't available at all.
  useEffect(() => {
    if (!canWatchCoinAd || !isAdsSdkAvailable) return;
    if (getRewardedAdStatus() === 'idle') preloadRewardedAd();

    const interval = setInterval(() => {
      const adStatus = getRewardedAdStatus();
      setCoinAdState((prev) => {
        if (prev === 'watching') return prev;
        if (adStatus === 'loaded') return 'available';
        if (adStatus === 'loading') return 'loading';
        return 'unavailable';
      });
    }, 500);
    return () => clearInterval(interval);
  }, [canWatchCoinAd]);

  const handleWatchAdForCoins = async () => {
    if (coinAdState !== 'available') return;
    setCoinAdState('watching');

    const result = await showRewardedAd('coins');
    if (!result.earnedReward) {
      setCoinAdState(getRewardedAdStatus() === 'loaded' ? 'available' : 'unavailable');
      return;
    }

    useEconomyStore.getState().addCoins(REWARDED_COIN_AD_AMOUNT);
    useAdsStore.getState().recordRewardedCompleted();
    useAdsStore.getState().recordCoinAdWatched();
    setCoinAdState(getRewardedAdStatus() === 'loaded' ? 'available' : 'unavailable');
  };

  // Part of the startup experience, not a menu item the player has to seek
  // out: if a reward is waiting the moment Home appears, surface it right
  // away.
  const [showDailyReward, setShowDailyReward] = useState(() => readStatus().rewardAvailable);
  const [status, setStatus] = useState(readStatus);

  // Home stays mounted for the app's lifetime (it's the root of the stack),
  // so the badge counters above need an explicit refresh point rather than
  // reacting to every other store automatically - refresh whenever Home
  // regains focus (e.g. after finishing a level, or leaving Achievements/
  // Challenges having claimed something there).
  useFocusEffect(
    useCallback(() => {
      setStatus(readStatus());
    }, [])
  );

  const currentWorld = WORLDS.find((world) => world.implemented) ?? WORLDS[0];
  const worldLevels = getLevelsForWorld(currentWorld.id);
  const worldCompleted = worldLevels.filter((level) => levelsProgress[level.id]?.completed).length;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.topRow}>
        <Pressable
          style={styles.identity}
          onPress={() => navigation.navigate('Profile')}
          hitSlop={8}
        >
          <Avatar size={40} />
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
        </Pressable>

        <View style={styles.walletRow}>
          <View style={styles.walletItem}>
            <GameIcon name="coins" size={16} color={COLORS.gold} />
            <Text style={styles.walletValue}>{coins}</Text>
            {canWatchCoinAd && isAdsSdkAvailable && (
              <Pressable
                style={[styles.coinAdPill, coinAdState !== 'available' && styles.coinAdPillDisabled]}
                disabled={coinAdState !== 'available'}
                onPress={() => void handleWatchAdForCoins()}
                hitSlop={6}
              >
                <Text style={styles.coinAdPillText}>
                  {coinAdState === 'watching' ? '...' : `+${REWARDED_COIN_AD_AMOUNT}`}
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.walletItem}>
            <GameIcon name="hint" size={16} color={COLORS.primary} />
            <Text style={styles.walletValue}>{hints}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8}>
            <GameIcon name="settings" size={22} color={COLORS.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.center}>
        <Text style={styles.title}>{APP_NAME}</Text>

        <View style={styles.worldCard}>
          <View style={styles.worldHeaderRow}>
            <Text style={styles.worldName}>{currentWorld.name}</Text>
            <Text style={styles.worldProgress}>
              {worldCompleted}/{worldLevels.length} levels
            </Text>
          </View>
          <ProgressBar progress={worldCompleted} target={worldLevels.length} />
        </View>

        <Button label="Play" onPress={() => navigation.navigate('WorldMap')} style={styles.playButton} />

        <View style={styles.menuGrid}>
          <MenuTile
            icon="gift"
            iconColor={COLORS.gold}
            label="Daily Reward"
            showDot={status.rewardAvailable}
            onPress={() => navigation.navigate('DailyReward')}
          />
          <MenuTile
            icon="challenge"
            iconColor={COLORS.secondary}
            label="Challenges"
            statusText={`${status.challengesComplete}/3`}
            onPress={() => navigation.navigate('DailyChallenges')}
          />
          <MenuTile
            icon="trophy"
            iconColor={COLORS.gold}
            label="Achievements"
            count={status.claimableAchievements}
            onPress={() => navigation.navigate('Achievements')}
          />
        </View>
      </View>

      <DailyRewardModal visible={showDailyReward} onClose={() => setShowDailyReward(false)} />
    </Screen>
  );
}

interface MenuTileProps {
  icon: GameIconName;
  iconColor: string;
  label: string;
  onPress: () => void;
  showDot?: boolean;
  count?: number;
  statusText?: string;
}

function MenuTile({ icon, iconColor, label, onPress, showDot, count, statusText }: MenuTileProps) {
  return (
    <Pressable style={styles.menuButton} onPress={onPress}>
      <View style={styles.menuIconWrap}>
        <GameIcon name={icon} size={20} color={iconColor} />
        {(showDot || (count ?? 0) > 0) && (
          <View style={styles.menuBadge}>
            <Badge count={showDot ? undefined : count} />
          </View>
        )}
      </View>
      <Text style={styles.menuButtonText}>{label}</Text>
      {statusText && <Text style={styles.menuStatusText}>{statusText}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'flex-start',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexShrink: 1,
  },
  name: {
    ...TYPOGRAPHY.sectionTitle,
    flexShrink: 1,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  walletValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  coinAdPill: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
  },
  coinAdPillDisabled: {
    opacity: 0.4,
  },
  coinAdPillText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.heroTitle,
    fontSize: 36,
    letterSpacing: 1,
  },
  worldCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  worldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  worldName: {
    ...TYPOGRAPHY.cardTitle,
  },
  worldProgress: {
    ...TYPOGRAPHY.label,
  },
  playButton: {
    paddingHorizontal: SPACING.xl,
    width: '100%',
  },
  menuGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: SPACING.sm,
  },
  menuButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md - 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  menuIconWrap: {
    position: 'relative',
  },
  menuBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
  },
  menuButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  menuStatusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
