// RAINBOW and MAGNET are recognized everywhere a StarType is expected (data,
// scoring, rendering) but have no special behavior yet - they currently fall
// back to NORMAL-like handling. See gameplay/starEffects.ts and scoring.ts.
export type StarType =
  | 'NORMAL'
  | 'GOLD'
  | 'RAINBOW'
  | 'SPEED'
  | 'TINY'
  | 'BOMB'
  | 'TIME'
  | 'MAGNET';

export interface Star {
  id: string;
  x: number;
  y: number;
  size: number;
  type: StarType;
  value: number;
  active: boolean;
  // px/sec. (0, 0) for stationary stars. Boundary-bounced by gameplay/useStarMotion.
  vx: number;
  vy: number;
}
