import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { ObjectiveTutorialContent } from '../data/objectiveTutorials';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/theme';
import Button from './Button';
import EntranceView from './EntranceView';
import GameIcon from './ui/GameIcon';

interface ObjectiveTutorialModalProps {
  // null = hidden. Shown once, the first time a level introduces a new
  // objective/constraint "concept" - see data/objectiveTutorials.ts.
  tutorial: ObjectiveTutorialContent | null;
  onDismiss: () => void;
}

// A small, focused explainer for a new level mechanic - shown before
// gameplay starts (the level hasn't been started yet, so there's nothing
// running behind it to pause). Deliberately terse: one icon, one line of
// title, one line of explanation, one button.
export default function ObjectiveTutorialModal({ tutorial, onDismiss }: ObjectiveTutorialModalProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!tutorial) return;
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [tutorial, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.35,
    transform: [{ scale: 1 + pulse.value * 0.15 }],
  }));

  return (
    <Modal visible={!!tutorial} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        {tutorial && (
          <EntranceView style={styles.card}>
            <View style={styles.iconWrap}>
              <Animated.View style={[styles.glow, glowStyle]} />
              <GameIcon name={tutorial.icon} size={36} color={COLORS.gold} />
            </View>
            <Text style={styles.title}>{tutorial.title}</Text>
            <Text style={styles.explanation}>{tutorial.explanation}</Text>
            <Button label="GOT IT" onPress={onDismiss} style={styles.button} />
          </EntranceView>
        )}
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
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  glow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.gold,
  },
  title: {
    ...TYPOGRAPHY.sectionTitle,
    fontSize: 20,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  explanation: {
    ...TYPOGRAPHY.bodyMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: SPACING.sm,
    width: '100%',
  },
});
