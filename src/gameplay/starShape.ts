import { Skia, type SkPath } from '@shopify/react-native-skia';

import { computeStarVertices } from './starGeometry';

// A classic 5-point star silhouette, centered at (0, 0) - positioning,
// rotation, and scale are applied by the caller via a Group transform (see
// StarVisual.tsx), so this only ever needs to be built once per distinct
// outer radius, not per frame.
export function createStarPath(outerRadius: number): SkPath {
  const path = Skia.Path.Make();
  computeStarVertices(outerRadius).forEach((point, i) => {
    if (i === 0) path.moveTo(point.x, point.y);
    else path.lineTo(point.x, point.y);
  });
  path.close();
  return path;
}

// A simple ring of short tick marks around a circle, used for the TIME
// star's clock-face motif (see StarVisual.tsx) - centered at (0, 0).
export function createClockTicksPath(radius: number, tickCount = 8, tickLength = 3): SkPath {
  const path = Skia.Path.Make();
  for (let i = 0; i < tickCount; i++) {
    const angle = (Math.PI * 2 * i) / tickCount;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    path.moveTo(cos * (radius - tickLength), sin * (radius - tickLength));
    path.lineTo(cos * radius, sin * radius);
  }
  return path;
}
