import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import BackButton from '../components/BackButton';
import Screen from '../components/Screen';
import StarRating from '../components/StarRating';
import GameIcon from '../components/ui/GameIcon';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/theme';
import { getLevelsForWorld, WORLDS } from '../data/worlds';
import { useProgressStore } from '../stores/useProgressStore';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'LevelSelect'>;

export default function LevelSelectScreen({ route, navigation }: Props) {
  const { worldId } = route.params;
  const world = WORLDS.find((w) => w.id === worldId);
  const levels = getLevelsForWorld(worldId);
  const levelsProgress = useProgressStore((state) => state.levels);

  return (
    <Screen accentColor={world?.accentColor}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={styles.title}>{world?.name ?? 'Select Level'}</Text>

      <FlatList
        data={levels}
        keyExtractor={(level) => level.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const progress = levelsProgress[item.id];
          const unlocked = progress?.unlocked ?? false;

          return (
            <Pressable
              disabled={!unlocked}
              style={[styles.levelButton, !unlocked && styles.levelButtonLocked]}
              onPress={() => navigation.navigate('Game', { levelId: item.id })}
            >
              <View>
                <Text style={styles.levelText}>{item.name}</Text>
                {progress?.completed && (
                  <Text style={styles.levelSubtext}>Best score: {progress.bestScore}</Text>
                )}
              </View>
              {unlocked ? (
                <StarRating rating={progress?.bestRating ?? 0} />
              ) : (
                <GameIcon name="lock" size={18} color={COLORS.textMuted} />
              )}
            </Pressable>
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
    gap: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  levelButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md + 4,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelButtonLocked: {
    opacity: 0.5,
  },
  levelText: {
    color: COLORS.text,
    fontSize: 18,
  },
  levelSubtext: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
