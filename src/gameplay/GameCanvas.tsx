import { BlurMask, Canvas, Fill, Group, Path, Skia } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { COLORS } from '../theme/theme';
import { GAMEPLAY_CONFIG } from '../config/gameplay';
import type { Star } from '../types/star';
import type { Point } from '../utils/geometry';
import StarVisual from './StarVisual';
import { useStarAnimations } from './useStarAnimations';
import { useStarMotion } from './useStarMotion';

export interface LivePosition {
  id: string;
  x: number;
  y: number;
}

interface GameCanvasProps {
  width: number;
  height: number;
  stars: Star[];
  paused?: boolean;
  // The FREEZE power-up: stops star movement (but, unlike `paused`,
  // deliberately does NOT disable the drawing gesture - the whole point is
  // to let the player keep drawing calmly while stars hold still).
  frozen?: boolean;
  onLoopDrawn: (points: Point[], starPositions: LivePosition[]) => void;
}

// Subtle screen-wide icy veil while FREEZE is active - "frozen" needs to
// read as a deliberate effect, not just stars quietly stopping.
const FROZEN_TINT_OPACITY = 0.12;

export default function GameCanvas({
  width,
  height,
  stars,
  paused = false,
  frozen = false,
  onLoopDrawn,
}: GameCanvasProps) {
  const pathPoints = useSharedValue<Point[]>([]);
  const trailOpacity = useSharedValue(0);
  const starAnims = useStarAnimations(stars);
  const { byId: starMotionById, entries: starMotionEntries } = useStarMotion(
    stars,
    width,
    height,
    paused || frozen
  );

  const frozenTint = useSharedValue(0);
  useEffect(() => {
    frozenTint.value = withTiming(frozen ? 1 : 0, { duration: 280 });
  }, [frozen, frozenTint]);
  const frozenTintOpacity = useDerivedValue(() => frozenTint.value * FROZEN_TINT_OPACITY);

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .minDistance(0)
    .enabled(!paused)
    .onBegin((event) => {
      pathPoints.value = [{ x: event.x, y: event.y }];
      trailOpacity.value = 1;
    })
    .onUpdate((event) => {
      // A new array reference every update, deliberately: reassigning
      // `.value` to the *same* mutated reference does not reliably notify
      // dependents (useDerivedValue below never re-ran, so the drawn trail
      // never appeared) - reference equality apparently short-circuits the
      // change notification. A fresh array is the proven-correct approach;
      // the O(n) copy per point is not a real cost at the point counts a
      // finger gesture produces.
      const points = pathPoints.value;
      const last = points[points.length - 1];
      const dx = event.x - last.x;
      const dy = event.y - last.y;
      if (Math.hypot(dx, dy) >= GAMEPLAY_CONFIG.minPointSpacing) {
        pathPoints.value = [...points, { x: event.x, y: event.y }];
      }
    })
    .onEnd(() => {
      // Snapshot each star's live (possibly moving) position at the exact
      // moment the loop closes, so capture checks use where stars actually
      // are - not their last-known position in React state. Reads directly
      // from `starMotionEntries` (a plain array), never through the `byId`
      // Map, which worklets can't safely close over.
      const snapshot: LivePosition[] = [];
      for (let i = 0; i < starMotionEntries.length; i++) {
        const entry = starMotionEntries[i];
        snapshot.push({ id: entry.id, x: entry.x.value, y: entry.y.value });
      }
      runOnJS(onLoopDrawn)(pathPoints.value, snapshot);
    })
    // Runs after onEnd on a normal completion, but - unlike onEnd - also
    // runs when the touch is interrupted or cancelled (an incoming call, the
    // OS reclaiming the gesture, another recognizer stealing it, etc). Fading
    // the trail here rather than in onEnd means an interrupted touch can
    // never leave a glowing trail stuck on screen.
    .onFinalize(() => {
      trailOpacity.value = withTiming(0, { duration: 200 });
    });

  const skiaPath = useDerivedValue(() => {
    const points = pathPoints.value;
    const path = Skia.Path.Make();
    if (points.length === 0) return path;

    path.moveTo(points[0].x, points[0].y);
    if (points.length === 1) return path;

    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      path.quadTo(points[i].x, points[i].y, midX, midY);
    }

    const last = points[points.length - 1];
    path.lineTo(last.x, last.y);
    return path;
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Canvas style={{ width, height }}>
        <Group>
          {stars.map((star) => {
            const anim = starAnims.get(star.id);
            const motion = starMotionById.get(star.id);
            if (!anim || !motion) return null;
            return <StarVisual key={star.id} star={star} motion={motion} anim={anim} />;
          })}
        </Group>

        <Fill color={COLORS.primary} opacity={frozenTintOpacity} />

        <Group opacity={trailOpacity}>
          <Path
            path={skiaPath}
            style="stroke"
            strokeWidth={16}
            strokeCap="round"
            strokeJoin="round"
            color={COLORS.primary}
            opacity={0.35}
          >
            <BlurMask blur={10} style="normal" />
          </Path>
          <Path
            path={skiaPath}
            style="stroke"
            strokeWidth={4}
            strokeCap="round"
            strokeJoin="round"
            color={COLORS.text}
          />
        </Group>
      </Canvas>
    </GestureDetector>
  );
}
