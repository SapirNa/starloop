import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import { APP_NAME, COLORS } from '../theme/theme';
import { hydrateAll } from '../services/bootstrap';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const MIN_DISPLAY_MS = 500;

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const start = Date.now();
      await hydrateAll();
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      await new Promise((resolve) => setTimeout(resolve, remaining));
      if (!cancelled) navigation.replace('Home');
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  return (
    <Screen>
      <View style={styles.center}>
        <Text style={styles.title}>{APP_NAME}</Text>
      </View>
      <ActivityIndicator style={styles.spinner} color={COLORS.primary} size="large" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '700',
  },
  spinner: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
  },
});
