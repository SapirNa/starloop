import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../theme/theme';

// The one place a concrete icon family/glyph is chosen. Every screen/
// component asks for a semantic name (what the icon *means*), never an
// Ionicons glyph directly - swapping the underlying icon set later, or
// changing a glyph, only touches this map. Keeps size/stroke/weight
// consistent by construction (one family, one component).
export type GameIconName =
  | 'back'
  | 'close'
  | 'profile'
  | 'settings'
  | 'coins'
  | 'hint'
  | 'store'
  | 'lock'
  | 'pause'
  | 'freeze'
  | 'starFilled'
  | 'starOutline'
  | 'trophy'
  | 'gift'
  | 'challenge'
  | 'checkmark'
  | 'powerUpFreeze'
  | 'powerUpExtraTime'
  | 'edit'
  | 'notifications'
  | 'music'
  | 'sound'
  | 'haptics'
  | 'world'
  | 'scoreTarget'
  | 'comboBurst'
  | 'timeAttack'
  | 'loopLimit'
  | 'bombWarning'
  | 'bigLoop'
  | 'mixedObjective';

const ICON_MAP: Record<GameIconName, keyof typeof Ionicons.glyphMap> = {
  back: 'chevron-back',
  close: 'close',
  profile: 'person-circle-outline',
  settings: 'settings-outline',
  coins: 'cash-outline',
  hint: 'bulb-outline',
  store: 'storefront-outline',
  lock: 'lock-closed-outline',
  pause: 'pause',
  freeze: 'snow-outline',
  starFilled: 'star',
  starOutline: 'star-outline',
  trophy: 'trophy-outline',
  gift: 'gift-outline',
  challenge: 'flag-outline',
  checkmark: 'checkmark-circle',
  powerUpFreeze: 'snow-outline',
  powerUpExtraTime: 'time-outline',
  edit: 'create-outline',
  notifications: 'notifications-outline',
  music: 'musical-notes-outline',
  sound: 'volume-high-outline',
  haptics: 'phone-portrait-outline',
  world: 'planet-outline',
  scoreTarget: 'trending-up-outline',
  comboBurst: 'flash-outline',
  timeAttack: 'timer-outline',
  loopLimit: 'repeat-outline',
  bombWarning: 'warning-outline',
  bigLoop: 'expand-outline',
  mixedObjective: 'layers-outline',
};

interface GameIconProps {
  name: GameIconName;
  size?: number;
  color?: string;
}

export default function GameIcon({ name, size = 22, color = COLORS.text }: GameIconProps) {
  return <Ionicons name={ICON_MAP[name]} size={size} color={color} />;
}
