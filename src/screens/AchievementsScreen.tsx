import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import BackButton from '../components/BackButton';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import GameIcon from '../components/ui/GameIcon';
import { sortAchievements } from '../gameplay/achievements';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme/theme';
import { useAchievementsStore } from '../stores/useAchievementsStore';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Achievements'>;

export default function AchievementsScreen({ navigation }: Props) {
  const getProgress = useAchievementsStore((state) => state.getProgress);
  const claim = useAchievementsStore((state) => state.claim);
  // Sorted exactly once, on entry to the screen - claiming updates an
  // entry's own isClaimed flag in place (see handleClaim) rather than
  // re-sorting, so the list doesn't jump around while claiming several in a
  // row. The next time this screen mounts fresh (left and reopened), this
  // initializer runs again and claimed entries settle to the bottom.
  const [achievements, setAchievements] = useState(() => sortAchievements(getProgress()));

  const handleClaim = (id: string) => {
    if (!claim(id)) return;
    setAchievements((prev) =>
      prev.map((entry) => (entry.definition.id === id ? { ...entry, isClaimed: true } : entry))
    );
  };

  return (
    <Screen accentColor={COLORS.gold}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Achievements</Text>

      <FlatList
        data={achievements}
        keyExtractor={(entry) => entry.definition.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const readyToClaim = item.isComplete && !item.isClaimed;
          return (
            <Card highlighted={readyToClaim} style={styles.cardInner}>
              <View style={styles.cardHeader}>
                <GameIcon
                  name="trophy"
                  size={18}
                  color={readyToClaim ? COLORS.gold : COLORS.textMuted}
                />
                <Text style={styles.cardTitle}>{item.definition.title}</Text>
              </View>
              <Text style={styles.cardDescription}>{item.definition.description}</Text>
              <ProgressBar progress={item.progress} target={item.definition.target} />
              <View style={styles.cardFooter}>
                <Text style={styles.cardProgress}>
                  {item.progress} / {item.definition.target}
                </Text>
                <Text style={styles.cardReward}>+{item.definition.rewardCoins} coins</Text>
              </View>
              {item.isClaimed ? (
                <View style={styles.claimedRow}>
                  <GameIcon name="checkmark" size={16} color={COLORS.success} />
                  <Text style={styles.claimedLabel}>Claimed</Text>
                </View>
              ) : (
                <Button
                  label={item.isComplete ? 'Claim Reward' : 'Locked'}
                  disabled={!item.isComplete}
                  onPress={() => handleClaim(item.definition.id)}
                />
              )}
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...TYPOGRAPHY.screenTitle,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  list: {
    gap: SPACING.sm + 4,
    paddingBottom: SPACING.lg,
  },
  cardInner: {
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  cardTitle: {
    ...TYPOGRAPHY.cardTitle,
  },
  cardDescription: {
    ...TYPOGRAPHY.bodyMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardProgress: {
    ...TYPOGRAPHY.label,
  },
  cardReward: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '600',
  },
  claimedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  claimedLabel: {
    ...TYPOGRAPHY.label,
  },
});
