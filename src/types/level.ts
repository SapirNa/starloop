import type { Requirement } from './objective';
import type { StarType } from './star';

// Star positions are stored as ratios (0-1) of the play area so the same
// level layout adapts to any screen size.
export interface LevelStarLayout {
  id: string;
  xRatio: number;
  yRatio: number;
  size: number;
  type: StarType;
}

// 0 = completed below the 1-star threshold (still a completion).
export type StarRating = 0 | 1 | 2 | 3;

// What happens when a drawn loop encloses a BOMB star. Applies once per
// loop regardless of how many bombs/collectibles it also contains - see
// gameplay/starEffects.ts.
export type BombPenaltyType = 'FAIL_LEVEL' | 'SCORE_PENALTY' | 'LOSE_LOOP';

export interface Level {
  id: string;
  worldId: string;
  name: string;
  // ALL of these must be satisfied to complete the level - see
  // types/objective.ts and gameplay/objectives.ts.
  requirements: Requirement[];
  starCount: number;
  starTypes: StarType[];
  stars: LevelStarLayout[];
  // Universal per-attempt constraints, independent of which requirements
  // are set - null means "not used by this level". A level is a
  // "TIME_ATTACK"/"LIMITED_LOOPS" level simply by having one of these set
  // alongside its requirements, not via a separate objective type.
  timeLimit: number | null;
  maxLoops: number | null;
  // px/sec applied to every star in the level (SPEED-type stars move at
  // least this fast even when this is 0). See gameplay/useStarMotion.ts.
  movementSpeed: number;
  // null when the level has no bombs. A level "avoids bombs" simply by
  // including 'BOMB' in starTypes and setting this - see
  // gameplay/starEffects.ts.
  bombPenalty: BombPenaltyType | null;
  rewardCoins: number;
  oneStarScore: number;
  twoStarScore: number;
  threeStarScore: number;
  specialRules: Record<string, unknown>;
}
