import { NativeStackScreenProps } from '@react-navigation/native-stack';

import DailyRewardModal from '../components/DailyRewardModal';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DailyReward'>;

// Daily Reward primarily shows itself as an automatic startup modal (see
// HomeScreen); this screen is just the manual "check in on it later" entry
// point from the Home menu, reusing the exact same modal content.
export default function DailyRewardScreen({ navigation }: Props) {
  return <DailyRewardModal visible onClose={() => navigation.goBack()} />;
}
