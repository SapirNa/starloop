import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { COLORS } from './src/theme/theme';
import RootNavigator from './src/navigation/RootNavigator';

// The NavigationContainer/contentStyle theming below only covers the RN
// content view - the underlying native Android window still defaults to a
// white background, which briefly shows through during the Fragment swap
// react-native-screens does for push/pop transitions (most visible on the
// back animation). This is the one thing that actually paints over that
// native layer, and it works inside Expo Go too (unlike app.json's
// android.backgroundColor, which only takes effect in a real native build).
void SystemUI.setBackgroundColorAsync(COLORS.backgroundDeep);

// Without an explicit theme, NavigationContainer falls back to its
// DefaultTheme, whose background is white - that white shows through during
// push/pop transitions (most visible on the back gesture/animation) even
// though every individual screen paints its own dark background. Basing this
// on DarkTheme keeps the rest of React Navigation's built-in chrome (edge
// gesture indicators, etc.) consistent with the app's theme too.
const NAVIGATION_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.backgroundDeep,
    card: COLORS.backgroundDeep,
    border: COLORS.border,
    primary: COLORS.primary,
    text: COLORS.text,
  },
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={NAVIGATION_THEME}>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
