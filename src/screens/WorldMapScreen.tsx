import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import BackButton from '../components/BackButton';
import Screen from '../components/Screen';
import GameIcon from '../components/ui/GameIcon';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/theme';
import { getLevelsForWorld, WORLDS } from '../data/worlds';
import { useProgressStore } from '../stores/useProgressStore';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'WorldMap'>;

export default function WorldMapScreen({ navigation }: Props) {
  const levelsProgress = useProgressStore((state) => state.levels);

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Worlds</Text>

      <FlatList
        data={WORLDS}
        keyExtractor={(world) => world.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: world }) => {
          const worldLevels = getLevelsForWorld(world.id);
          const completedCount = worldLevels.filter((l) => levelsProgress[l.id]?.completed).length;

          return (
            <Pressable
              disabled={!world.implemented}
              style={[
                styles.card,
                { borderColor: world.implemented ? world.accentColor : COLORS.border },
                !world.implemented && styles.cardLocked,
              ]}
              onPress={() => navigation.navigate('LevelSelect', { worldId: world.id })}
            >
              <View>
                <Text style={[styles.cardTitle, { color: world.implemented ? COLORS.text : COLORS.textMuted }]}>
                  {world.name}
                </Text>
                <Text style={styles.cardDescription}>
                  {world.implemented ? `${completedCount}/${worldLevels.length} levels complete` : world.description}
                </Text>
              </View>
              {!world.implemented && <GameIcon name="lock" size={20} color={COLORS.textMuted} />}
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLocked: {
    opacity: 0.55,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardDescription: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
