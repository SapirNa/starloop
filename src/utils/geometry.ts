export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface LoopValidationConfig {
  closingDistanceThreshold: number;
  minimumPathLength: number;
  minimumPolygonArea: number;
  minimumPointCount: number;
  // Optional: on top of the flat closingDistanceThreshold floor, allow the
  // closing tolerance to grow with the loop's own size (a fraction of its
  // bounding-box diagonal). A big sweeping gesture to enclose several
  // spread-out stars naturally has more absolute finger-return error than a
  // small tight loop, so a flat pixel threshold alone disproportionately
  // penalizes exactly the large, deliberate loops a multi-star capture
  // needs. Omit (or 0) to keep the historical flat-threshold-only behavior.
  closingDistanceRatio?: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function calculatePathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance(points[i - 1], points[i]);
  }
  return total;
}

export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;

  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}

export function getPolygonBoundingBox(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }

  return { minX, minY, maxX, maxY };
}

// Ray casting algorithm: counts how many polygon edges a rightward ray from
// `point` crosses. An odd number of crossings means the point is inside.
export function isPointInsidePolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const vertexI = polygon[i];
    const vertexJ = polygon[j];

    const intersects =
      vertexI.y > point.y !== vertexJ.y > point.y &&
      point.x <
        ((vertexJ.x - vertexI.x) * (point.y - vertexI.y)) / (vertexJ.y - vertexI.y) +
          vertexI.x;

    if (intersects) inside = !inside;
  }

  return inside;
}

export function isLoopClosed(points: Point[], closingDistanceThreshold: number): boolean {
  if (points.length < 2) return false;
  return distance(points[0], points[points.length - 1]) <= closingDistanceThreshold;
}

function getEffectiveClosingThreshold(points: Point[], config: LoopValidationConfig): number {
  if (!config.closingDistanceRatio) return config.closingDistanceThreshold;
  const box = getPolygonBoundingBox(points);
  const diagonal = distance({ x: box.minX, y: box.minY }, { x: box.maxX, y: box.maxY });
  return Math.max(config.closingDistanceThreshold, diagonal * config.closingDistanceRatio);
}

// Combines all loop-validity rules so a drawn path only counts as a capture
// loop when it is deliberate: enough points, long enough, closed, and
// enclosing a non-trivial area (rejects taps and tiny accidental loops).
export function validateLoop(points: Point[], config: LoopValidationConfig): boolean {
  if (points.length < config.minimumPointCount) return false;
  if (!isLoopClosed(points, getEffectiveClosingThreshold(points, config))) return false;
  if (calculatePathLength(points) < config.minimumPathLength) return false;
  if (calculatePolygonArea(points) < config.minimumPolygonArea) return false;
  return true;
}
