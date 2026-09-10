import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AchievementsScreen from '../screens/AchievementsScreen';
import DailyChallengesScreen from '../screens/DailyChallengesScreen';
import DailyRewardScreen from '../screens/DailyRewardScreen';
import GameScreen from '../screens/GameScreen';
import HomeScreen from '../screens/HomeScreen';
import LevelCompleteScreen from '../screens/LevelCompleteScreen';
import LevelFailedScreen from '../screens/LevelFailedScreen';
import LevelSelectScreen from '../screens/LevelSelectScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SplashScreen from '../screens/SplashScreen';
import WorldMapScreen from '../screens/WorldMapScreen';
import { COLORS } from '../theme/theme';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        // Without this, the native screen container defaults to white and
        // briefly flashes through it during the push/pop transition -
        // before our own <Screen> component has painted its dark
        // background in JS. Most visible on the back gesture/animation.
        contentStyle: { backgroundColor: COLORS.backgroundDeep },
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="WorldMap" component={WorldMapScreen} />
      <Stack.Screen name="LevelSelect" component={LevelSelectScreen} />
      <Stack.Screen name="Game" component={GameScreen} />
      <Stack.Screen name="LevelComplete" component={LevelCompleteScreen} />
      <Stack.Screen name="LevelFailed" component={LevelFailedScreen} />
      <Stack.Screen name="DailyReward" component={DailyRewardScreen} />
      <Stack.Screen name="DailyChallenges" component={DailyChallengesScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
