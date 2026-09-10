import { computeStarVertices } from './starGeometry';

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('computeStarVertices', () => {
  it('returns 10 vertices for a classic 5-point star (5 outer + 5 inner)', () => {
    expect(computeStarVertices(20)).toHaveLength(10);
  });

  it('alternates between the outer radius and a smaller inner radius', () => {
    const vertices = computeStarVertices(20);
    const outerDistances = vertices.filter((_, i) => i % 2 === 0).map((v) => distance(v, { x: 0, y: 0 }));
    const innerDistances = vertices.filter((_, i) => i % 2 === 1).map((v) => distance(v, { x: 0, y: 0 }));

    for (const d of outerDistances) expect(d).toBeCloseTo(20, 5);
    for (const d of innerDistances) expect(d).toBeLessThan(20);
    for (const d of innerDistances) expect(d).toBeGreaterThan(0);
  });

  it('respects a custom inner radius ratio', () => {
    const vertices = computeStarVertices(20, 0.3);
    const innerDistances = vertices
      .filter((_, i) => i % 2 === 1)
      .map((v) => distance(v, { x: 0, y: 0 }));
    for (const d of innerDistances) expect(d).toBeCloseTo(6, 5); // 20 * 0.3
  });

  it('the first vertex points straight up (negative y, zero x)', () => {
    const [first] = computeStarVertices(20);
    expect(first.x).toBeCloseTo(0, 5);
    expect(first.y).toBeCloseTo(-20, 5);
  });

  it('is centered at the origin - vertices are symmetric around (0,0)', () => {
    const vertices = computeStarVertices(20);
    const sumX = vertices.reduce((total, v) => total + v.x, 0);
    const sumY = vertices.reduce((total, v) => total + v.y, 0);
    expect(sumX).toBeCloseTo(0, 5);
    expect(sumY).toBeCloseTo(0, 5);
  });

  it('scales proportionally with the outer radius', () => {
    const small = computeStarVertices(10);
    const large = computeStarVertices(20);
    for (let i = 0; i < small.length; i++) {
      expect(large[i].x).toBeCloseTo(small[i].x * 2, 5);
      expect(large[i].y).toBeCloseTo(small[i].y * 2, 5);
    }
  });
});
