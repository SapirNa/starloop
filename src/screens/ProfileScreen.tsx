import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import BackButton from '../components/BackButton';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import Screen from '../components/Screen';
import Avatar from '../components/ui/Avatar';
import Card from '../components/ui/Card';
import GameIcon from '../components/ui/GameIcon';
import ProgressRing from '../components/ui/ProgressRing';
import { ACHIEVEMENTS } from '../data/achievements';
import { LEVELS } from '../data/levels';
import { WORLDS } from '../data/worlds';
import { useAchievementsStore } from '../stores/useAchievementsStore';
import { useDailyRewardsStore } from '../stores/useDailyRewardsStore';
import { useEconomyStore } from '../stores/useEconomyStore';
import { usePlayerStatsStore } from '../stores/usePlayerStatsStore';
import { useProfileStore } from '../stores/useProfileStore';
import { useProgressStore } from '../stores/useProgressStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/theme';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

interface StatTileProps {
  label: string;
  value: number;
}

function StatTile({ label, value }: StatTileProps) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const displayName = useProfileStore((state) => state.displayName);
  const setDisplayName = useProfileStore((state) => state.setDisplayName);

  const starsCaptured = usePlayerStatsStore((state) => state.starsCaptured);
  const goldStarsCaptured = usePlayerStatsStore((state) => state.goldStarsCaptured);
  const levelsCompleted = usePlayerStatsStore((state) => state.levelsCompleted);
  const bestComboEver = usePlayerStatsStore((state) => state.bestComboEver);
  const totalScoreEarned = usePlayerStatsStore((state) => state.totalScoreEarned);
  const totalLoopsSubmitted = usePlayerStatsStore((state) => state.totalLoopsSubmitted);
  const totalChallengesCompleted = usePlayerStatsStore((state) => state.totalChallengesCompleted);

  const coins = useEconomyStore((state) => state.coins);
  const dailyStreak = useDailyRewardsStore((state) => state.dailyStreak);
  const highestDailyStreak = useDailyRewardsStore((state) => state.highestDailyStreak);
  const claimedAchievementIds = useAchievementsStore((state) => state.claimedAchievementIds);
  const getAchievementsProgress = useAchievementsStore((state) => state.getProgress);
  const levelsProgress = useProgressStore((state) => state.levels);

  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(displayName);

  const totalLevelStars = Object.values(levelsProgress).reduce(
    (sum, progress) => sum + progress.bestRating,
    0
  );
  const maxLevelStars = LEVELS.length * 3;
  const currentWorld = WORLDS.find((world) => world.implemented) ?? WORLDS[0];

  // Distinct levels ever completed at least once - deliberately NOT
  // usePlayerStatsStore's levelsCompleted, which is a lifetime counter that
  // increments on every completion including replays (it can legitimately
  // exceed LEVELS.length, and is shown as its own "Level Completions" stat
  // below). This is the one that means "out of 50" the way the UI reads.
  const distinctLevelsCompleted = Object.values(levelsProgress).filter(
    (progress) => progress.completed
  ).length;

  const claimableAchievements = getAchievementsProgress().filter(
    (entry) => entry.isComplete && !entry.isClaimed
  ).length;

  // Two real, independently-meaningful ratios blended into one headline
  // number - not a fabricated "player level", just an at-a-glance sense of
  // "how far along is this save" for the header ring.
  const levelCompletionRatio = LEVELS.length > 0 ? distinctLevelsCompleted / LEVELS.length : 0;
  const achievementCompletionRatio =
    ACHIEVEMENTS.length > 0 ? claimedAchievementIds.length / ACHIEVEMENTS.length : 0;
  const overallCompletion = (levelCompletionRatio + achievementCompletionRatio) / 2;

  const startEditingName = () => {
    setDraftName(displayName);
    setIsEditingName(true);
  };

  const saveName = () => {
    setDisplayName(draftName);
    setIsEditingName(false);
  };

  return (
    <Screen scroll>
      <BackButton onPress={() => navigation.goBack()} />

      <View style={styles.header}>
        <ProgressRing progress={overallCompletion} size={100} strokeWidth={6}>
          <Avatar size={78} />
        </ProgressRing>

        {isEditingName ? (
          <View style={styles.nameEditRow}>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              style={styles.nameInput}
              placeholder="Player name"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
              maxLength={20}
              onSubmitEditing={saveName}
              returnKeyType="done"
            />
            <Pressable onPress={saveName} hitSlop={8}>
              <GameIcon name="checkmark" size={22} color={COLORS.success} />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.nameRow} onPress={startEditingName} hitSlop={8}>
            <Text style={styles.name}>{displayName}</Text>
            <GameIcon name="edit" size={16} color={COLORS.textMuted} />
          </Pressable>
        )}

        <Text style={styles.worldLabel}>{currentWorld.name}</Text>
        <Text style={styles.completionLabel}>{Math.round(overallCompletion * 100)}% complete</Text>
      </View>

      <Text style={styles.sectionHeading}>Progress</Text>
      <Card style={styles.card}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Levels</Text>
          <Text style={styles.progressValue}>
            {distinctLevelsCompleted}/{LEVELS.length}
          </Text>
        </View>
        <ProgressBar progress={distinctLevelsCompleted} target={LEVELS.length} />

        <View style={[styles.progressRow, styles.progressRowSpaced]}>
          <Text style={styles.progressLabel}>Level Stars</Text>
          <Text style={styles.progressValue}>
            {totalLevelStars}/{maxLevelStars}
          </Text>
        </View>
        <ProgressBar progress={totalLevelStars} target={maxLevelStars} />
      </Card>

      <Text style={styles.sectionHeading}>Gameplay Stats</Text>
      <Card style={styles.card}>
        <View style={styles.statsGrid}>
          <StatTile label="Level Completions" value={levelsCompleted} />
          <StatTile label="Total Score" value={totalScoreEarned} />
          <StatTile label="Stars Captured" value={starsCaptured} />
          <StatTile label="Gold Stars" value={goldStarsCaptured} />
          <StatTile label="Loops Completed" value={totalLoopsSubmitted} />
          <StatTile label="Best Combo" value={bestComboEver} />
        </View>
      </Card>

      <Text style={styles.sectionHeading}>Achievements</Text>
      <Card style={styles.card}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Claimed</Text>
          <Text style={styles.progressValue}>
            {claimedAchievementIds.length}/{ACHIEVEMENTS.length}
          </Text>
        </View>
        <ProgressBar progress={claimedAchievementIds.length} target={ACHIEVEMENTS.length} />
        {claimableAchievements > 0 && (
          <Text style={styles.achievementsNote}>
            {claimableAchievements} ready to claim
          </Text>
        )}
        <Button
          label="View Achievements"
          variant="secondary"
          onPress={() => navigation.navigate('Achievements')}
          style={styles.viewAllButton}
        />
      </Card>

      <Text style={styles.sectionHeading}>Activity</Text>
      <Card style={styles.card}>
        <View style={styles.statsGrid}>
          <StatTile label="Current Streak" value={dailyStreak} />
          <StatTile label="Best Streak" value={highestDailyStreak} />
          <StatTile label="Challenges Done" value={totalChallengesCompleted} />
          <StatTile label="Coins" value={coins} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  name: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '80%',
    marginTop: SPACING.sm,
  },
  nameInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingVertical: 2,
  },
  worldLabel: {
    ...TYPOGRAPHY.bodyMuted,
  },
  completionLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },
  sectionHeading: {
    ...TYPOGRAPHY.label,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  card: {
    marginBottom: SPACING.md,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  progressRowSpaced: {
    marginTop: SPACING.sm,
  },
  progressLabel: {
    ...TYPOGRAPHY.label,
  },
  progressValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  achievementsNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.gold,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  viewAllButton: {
    marginTop: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm + 4,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
    textAlign: 'center',
  },
});
