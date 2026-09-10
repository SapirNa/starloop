// Pure geometry, deliberately in its own Skia-free file: react-native-skia
// ships an ESM-only entry point Jest can't parse without extra transform
// config, so anything that needs to be unit tested (see starGeometry.test.ts)
// must never transitively import it - see gameplay/starShape.ts for the
// thin Skia-Path wrapper built from this.
export interface Point2D {
  x: number;
  y: number;
}

const STAR_POINTS = 5;
const DEFAULT_INNER_RADIUS_RATIO = 0.48;

export function computeStarVertices(
  outerRadius: number,
  innerRadiusRatio: number = DEFAULT_INNER_RADIUS_RATIO
): Point2D[] {
  const innerRadius = outerRadius * innerRadiusRatio;
  const totalPoints = STAR_POINTS * 2;
  const vertices: Point2D[] = [];

  for (let i = 0; i < totalPoints; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    // Starts pointing straight up so the star sits upright before any
    // idle rotation is applied.
    const angle = (Math.PI / STAR_POINTS) * i - Math.PI / 2;
    vertices.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }

  return vertices;
}
