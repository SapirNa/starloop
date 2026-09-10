import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import BackButton from '../components/BackButton';
import Button from '../components/Button';
import EntranceView from '../components/EntranceView';
import ProgressBar from '../components/ProgressBar';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import GameIcon from '../components/ui/GameIcon';
import { useChallengesStore } from '../stores/useChallengesStore';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/theme';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyChallenges'>;

export default function DailyChallengesScreen({ navigation }: Props) {
  const getTodaysProgress = useChallengesStore((state) => state.getTodaysProgress);
  const claim = useChallengesStore((state) => state.claim);
  // Progress is computed on demand (not stored reactively in zustand state),
  // so it's snapshotted into local state and refreshed after a successful
  // claim.
  const [challenges, setChallenges] = useState(() => getTodaysProgress());
  const [justRegenerated, setJustRegenerated] = useState(false);

  const handleClaim = (id: string) => {
    const result = claim(id);
    if (!result.success) return;
    setChallenges(getTodaysProgress());
    if (result.regenerated) {
      setJustRegenerated(true);
      setTimeout(() => setJustRegenerated(false), 2600);
    }
  };

  return (
    <Screen accentColor={COLORS.secondary}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Daily Challenges</Text>

      {justRegenerated && (
        <EntranceView style={styles.banner}>
          <GameIcon name="checkmark" size={18} color={COLORS.success} />
          <Text style={styles.bannerText}>All challenges complete! New challenges are ready.</Text>
        </EntranceView>
      )}

      <FlatList
        data={challenges}
        keyExtractor={(entry) => entry.definition.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <GameIcon name="challenge" size={18} color={COLORS.secondary} />
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
              <Text style={styles.claimedLabel}>Claimed</Text>
            ) : (
              <Button
                label={item.isComplete ? 'Claim' : 'In Progress'}
                disabled={!item.isComplete}
                onPress={() => handleClaim(item.definition.id)}
              />
            )}
          </Card>
        )}
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.md,
  },
  bannerText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
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
  claimedLabel: {
    ...TYPOGRAPHY.label,
    textAlign: 'center',
  },
});
