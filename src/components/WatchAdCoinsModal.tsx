import { Modal, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADIUS, SPACING } from '../theme/theme';
import Button from './Button';
import GameIcon from './ui/GameIcon';

export type CoinAdState = 'unavailable' | 'loading' | 'available' | 'watching';

interface WatchAdCoinsModalProps {
  visible: boolean;
  coins: number;
  amount: number;
  adState: CoinAdState;
  onWatchAd: () => void;
  onClose: () => void;
}

const BUTTON_LABEL: Record<CoinAdState, string> = {
  available: 'Watch Ad',
  watching: 'Watching Ad...',
  loading: 'Preparing Ad...',
  unavailable: 'No Ad Available Right Now',
};

// Reached by tapping the coin count on Home - kept as a deliberate tap
// rather than an always-visible pill, so the wallet row reads as just "how
// many coins do I have" at a glance instead of two numbers competing for
// attention.
export default function WatchAdCoinsModal({
  visible,
  coins,
  amount,
  adState,
  onWatchAd,
  onClose,
}: WatchAdCoinsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <GameIcon name="coins" size={32} color={COLORS.gold} />
          <Text style={styles.title}>{coins} coins</Text>
          <Text style={styles.body}>Watch a short ad to earn {amount} more coins.</Text>
          <Button
            label={BUTTON_LABEL[adState]}
            disabled={adState !== 'available'}
            onPress={onWatchAd}
            style={styles.button}
          />
          <Button label="Close" variant="secondary" onPress={onClose} style={styles.button} />
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
    padding: SPACING.lg,
  },
  card: {
    width: 280,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  body: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  button: {
    width: '100%',
  },
});
