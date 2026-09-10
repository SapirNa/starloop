import {
  calculatePathLength,
  calculatePolygonArea,
  isLoopClosed,
  isPointInsidePolygon,
  validateLoop,
  type Point,
} from './geometry';

const square: Point[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

describe('isPointInsidePolygon', () => {
  it('returns true for a point inside the polygon', () => {
    expect(isPointInsidePolygon({ x: 50, y: 50 }, square)).toBe(true);
  });

  it('returns false for a point outside the polygon', () => {
    expect(isPointInsidePolygon({ x: 200, y: 200 }, square)).toBe(false);
  });

  it('treats a point just inside an edge as inside', () => {
    expect(isPointInsidePolygon({ x: 99, y: 50 }, square)).toBe(true);
  });

  it('treats a point just outside an edge as outside', () => {
    expect(isPointInsidePolygon({ x: 101, y: 50 }, square)).toBe(false);
  });
});

describe('calculatePolygonArea', () => {
  it('computes the area of a simple square', () => {
    expect(calculatePolygonArea(square)).toBe(10000);
  });

  it('returns 0 for fewer than 3 points', () => {
    expect(calculatePolygonArea([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe(0);
  });
});

describe('calculatePathLength', () => {
  it('sums the distance between consecutive points', () => {
    const path: Point[] = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 8 },
    ];
    expect(calculatePathLength(path)).toBe(9);
  });
});

describe('isLoopClosed', () => {
  it('is closed when the last point is within the threshold of the first', () => {
    const path: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 5, y: 5 },
    ];
    expect(isLoopClosed(path, 10)).toBe(true);
  });

  it('is not closed when the last point is far from the first', () => {
    const path: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
    ];
    expect(isLoopClosed(path, 10)).toBe(false);
  });
});

describe('validateLoop', () => {
  const config = {
    closingDistanceThreshold: 20,
    minimumPathLength: 100,
    minimumPolygonArea: 1000,
    minimumPointCount: 4,
  };

  it('accepts a large, deliberately drawn closed loop', () => {
    const loop: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 5, y: 5 },
    ];
    expect(validateLoop(loop, config)).toBe(true);
  });

  it('rejects a tiny accidental loop (short path, small area)', () => {
    const tinyLoop: Point[] = [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 0, y: 5 },
      { x: 1, y: 1 },
    ];
    expect(validateLoop(tinyLoop, config)).toBe(false);
  });

  it('rejects a single tap (too few points)', () => {
    expect(validateLoop([{ x: 10, y: 10 }], config)).toBe(false);
  });

  describe('closingDistanceRatio', () => {
    // A big loop (500x500 bounding box) that returns within 90px of its
    // start - well outside the flat 20px floor above, but within 18% of
    // its own ~707px bounding-box diagonal (~127px).
    const bigLoop: Point[] = [
      { x: 0, y: 0 },
      { x: 500, y: 0 },
      { x: 500, y: 500 },
      { x: 0, y: 500 },
      { x: 80, y: 80 },
    ];

    it('without a ratio configured, a large loop still needs the flat threshold (historical behavior)', () => {
      expect(validateLoop(bigLoop, config)).toBe(false);
    });

    it('with a ratio configured, a large loop gets a proportionally larger closing tolerance', () => {
      expect(validateLoop(bigLoop, { ...config, closingDistanceRatio: 0.18 })).toBe(true);
    });

    it('a small loop is unaffected by the ratio - the flat threshold still applies as a floor', () => {
      const tinyLoop: Point[] = [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 5 },
        { x: 0, y: 5 },
        { x: 1, y: 1 },
      ];
      expect(validateLoop(tinyLoop, { ...config, closingDistanceRatio: 0.18 })).toBe(false);
    });
  });
});
