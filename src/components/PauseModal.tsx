import { Modal, StyleSheet, Text, View } from 'react-native';

import { COLORS, SPACING } from '../theme/theme';
import Button from './Button';

interface PauseModalProps {
  visible: boolean;
  onResume: () => void;
  onQuit: () => void;
}

export default function PauseModal({ visible, onResume, onQuit }: PauseModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onResume}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Paused</Text>
          <Button label="Resume" onPress={onResume} style={styles.button} />
          <Button label="Level Select" variant="secondary" onPress={onQuit} style={styles.button} />
        </View>
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
  },
  card: {
    width: 240,
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  button: {
    width: '100%',
  },
});
