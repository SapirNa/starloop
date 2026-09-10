import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import BackButton from '../components/BackButton';
import Screen from '../components/Screen';
import GameIcon, { type GameIconName } from '../components/ui/GameIcon';
import {
  cancelAllStarLoopNotifications,
  isNotificationsSupported,
  refreshScheduledNotifications,
  requestPermissionsIfNeeded,
} from '../services/notifications';
import { isPrivacyOptionsRequired, showPrivacyOptionsForm } from '../services/ads';
import { useSettingsStore } from '../stores/useSettingsStore';
import { APP_NAME, COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/theme';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

interface SettingsRowProps {
  icon: GameIconName;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  note?: string;
}

function SettingsRow({ icon, label, value, onValueChange, disabled, note }: SettingsRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTopLine}>
        <View style={styles.rowLabelGroup}>
          <GameIcon name={icon} size={20} color={disabled ? COLORS.textMuted : COLORS.text} />
          <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>{label}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ true: COLORS.primary, false: COLORS.border }}
        />
      </View>
      {note && <Text style={styles.rowNote}>{note}</Text>}
    </View>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  const musicEnabled = useSettingsStore((state) => state.musicEnabled);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setMusicEnabled = useSettingsStore((state) => state.setMusicEnabled);
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore((state) => state.setHapticsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);

  // Only shown at all when the Google Mobile Ads consent SDK says the
  // player actually has a privacy choice to revisit (e.g. under GDPR) -
  // never a permanent row, and never a fake "disable ads" control (this
  // game has no ability to disable ads, so it never claims one).
  const [showPrivacyRow, setShowPrivacyRow] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void isPrivacyOptionsRequired().then((required) => {
      if (!cancelled) setShowPrivacyRow(required);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Permission is only ever requested here, in direct response to the
  // player explicitly opting in - never on app launch without context.
  const handleToggleNotifications = async (enabled: boolean) => {
    if (!isNotificationsSupported) return;
    if (enabled) {
      const granted = await requestPermissionsIfNeeded();
      setNotificationsEnabled(granted);
      if (granted) void refreshScheduledNotifications();
    } else {
      setNotificationsEnabled(false);
      void cancelAllStarLoopNotifications();
    }
  };

  return (
    <Screen>
      <BackButton onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Settings</Text>

      <SettingsRow icon="music" label="Music" value={musicEnabled} onValueChange={setMusicEnabled} />
      <SettingsRow
        icon="sound"
        label="Sound Effects"
        value={soundEnabled}
        onValueChange={setSoundEnabled}
      />
      <SettingsRow
        icon="haptics"
        label="Haptics (Vibration)"
        value={hapticsEnabled}
        onValueChange={setHapticsEnabled}
      />
      <SettingsRow
        icon="notifications"
        label="Notifications"
        value={notificationsEnabled && isNotificationsSupported}
        onValueChange={handleToggleNotifications}
        disabled={!isNotificationsSupported}
        note={
          isNotificationsSupported
            ? undefined
            : 'Not available in Expo Go on Android - build the app to enable notifications.'
        }
      />
      {showPrivacyRow && (
        <Pressable style={styles.row} onPress={() => void showPrivacyOptionsForm()}>
          <View style={styles.rowTopLine}>
            <View style={styles.rowLabelGroup}>
              <GameIcon name="lock" size={20} color={COLORS.text} />
              <Text style={styles.rowLabel}>Ad Privacy Options</Text>
            </View>
          </View>
        </Pressable>
      )}

      <Text style={styles.version}>{APP_NAME} v1.0.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...TYPOGRAPHY.screenTitle,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  row: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rowLabel: {
    color: COLORS.text,
    fontSize: 16,
  },
  rowLabelDisabled: {
    color: COLORS.textMuted,
  },
  rowNote: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  version: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
