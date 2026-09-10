import type { LoopValidationConfig } from '../utils/geometry';

export const GAMEPLAY_CONFIG: LoopValidationConfig & { minPointSpacing: number } = {
  // Max distance (px) between the loop's start and end point to count as
  // "closed". 44 (~a fingertip's own touch-target width) proved too tight
  // for a real finger returning to the start point mid-gesture; widened for
  // a more forgiving close.
  closingDistanceThreshold: 60,
  // For levels needing a large loop (e.g. enclosing 3+ spread-out stars for
  // a combo), the closing tolerance also grows with the loop's own size -
  // up to 18% of its bounding-box diagonal, on top of the flat threshold
  // above. Without this, a big deliberate loop was disproportionately
  // likely to register as "not closed" even when it visually looked
  // complete, simply because a large sweeping gesture has more natural
  // finger-return error than a small tight one.
  closingDistanceRatio: 0.18,
  // Minimum total finger-travel distance (px) for a loop to be considered deliberate.
  minimumPathLength: 140,
  // Minimum enclosed polygon area (px^2) - rejects tiny accidental loops.
  minimumPolygonArea: 1200,
  // Minimum number of recorded points - rejects taps and instant releases.
  minimumPointCount: 8,
  // Minimum distance (px) between recorded points, to keep the path array small.
  minPointSpacing: 4,
} as const;
