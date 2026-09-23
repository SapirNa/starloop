import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import BackButton from '../components/BackButton';
import Button from '../components/Button';
import Screen from '../components/Screen';
import Card from '../components/ui/Card';
import GameIcon from '../components/ui/GameIcon';
import { STORE_ITEMS, type StoreItem } from '../data/storeItems';
import { playSound } from '../services/audio';
import { notificationSuccess, notificationError } from '../services/haptics';
import { useEconomyStore } from '../stores/useEconomyStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme/theme';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Store'>;

function describeGrants(item: StoreItem): string {
  return item.grants
    .map((grant) => `${grant.amount}x ${grant.type === 'FREEZE_TIME' ? 'Freeze' : '+Time'}`)
    .join(' + ');
}

export default function StoreScreen({ navigation }: Props) {
  const coins = useEconomyStore((state) => state.coins);
  const powerUpInventory = useEconomyStore((state) => state.powerUpInventory);

  const handleBuy = (item: StoreItem) => {
    const spent = useEconomyStore.getState().spendCoins(item.price);
    if (!spent) {
      void notificationError();
      return;
    }
    for (const grant of item.grants) {
      useEconomyStore.getState().addPowerUp(grant.type, grant.amount);
    }
    void playSound('rewardOpen');
    void notificationSuccess();
  };

  return (
    <Screen accentColor={COLORS.gold}>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Store</Text>

      <View style={styles.balanceRow}>
        <View style={styles.balanceItem}>
          <GameIcon name="coins" size={18} color={COLORS.gold} />
          <Text style={styles.balanceValue}>{coins}</Text>
        </View>
        <View style={styles.balanceItem}>
          <GameIcon name="powerUpFreeze" size={16} color={COLORS.primary} />
          <Text style={styles.balanceValue}>{powerUpInventory.FREEZE_TIME}</Text>
        </View>
        <View style={styles.balanceItem}>
          <GameIcon name="powerUpExtraTime" size={16} color={COLORS.primary} />
          <Text style={styles.balanceValue}>{powerUpInventory.EXTRA_TIME}</Text>
        </View>
      </View>

      <FlatList
        data={STORE_ITEMS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const canAfford = coins >= item.price;
          return (
            <Card style={styles.cardInner}>
              <View style={styles.cardHeader}>
                <GameIcon name={item.icon} size={20} color={COLORS.gold} />
                <Text style={styles.cardTitle}>{item.label}</Text>
              </View>
              <Text style={styles.cardDescription}>{item.description}</Text>
              <Text style={styles.cardGrants}>{describeGrants(item)}</Text>
              <Button
                label={canAfford ? `Buy - ${item.price} coins` : `Need ${item.price} coins`}
                disabled={!canAfford}
                onPress={() => handleBuy(item)}
              />
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
  balanceRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  balanceValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
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
  cardGrants: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '600',
  },
});
