import { STAR_SIZE_BY_TYPE } from '../config/starTypes';
import type { BombPenaltyType, Level, LevelStarLayout } from '../types/level';
import type { Requirement, RequirementDefinition } from '../types/objective';
import type { StarType } from '../types/star';
import { getStarValue } from '../utils/scoring';

const LAYOUT_MARGIN_X = 0.18;
const LAYOUT_TOP = 0.22;
const LAYOUT_BAND_HEIGHT = 0.5;

// Arranges `count` stars in a simple responsive grid within the play area,
// cycling through `typePattern` for variety (e.g. ['NORMAL','NORMAL','GOLD']
// puts a gold star every third position). Deterministic - no randomness -
// so level layouts are reproducible.
export function generateStarLayout(
  levelId: string,
  count: number,
  typePattern: StarType[]
): LevelStarLayout[] {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const usableWidth = 1 - LAYOUT_MARGIN_X * 2;

  const layout: LevelStarLayout[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const xRatio =
      LAYOUT_MARGIN_X + (cols === 1 ? usableWidth / 2 : (col / (cols - 1)) * usableWidth);
    const yRatio =
      LAYOUT_TOP + (rows === 1 ? LAYOUT_BAND_HEIGHT / 2 : (row / (rows - 1)) * LAYOUT_BAND_HEIGHT);
    const type = typePattern[i % typePattern.length];

    layout.push({
      id: `${levelId}-s${i + 1}`,
      xRatio,
      yRatio,
      size: STAR_SIZE_BY_TYPE[type],
      type,
    });
  }

  return layout;
}

export interface LevelDefinition {
  id: string;
  worldId: string;
  name: string;
  // What the level actually asks the player to do - see
  // types/objective.ts. A single entry is a "simple" level (CAPTURE, SCORE,
  // COMBO, GOLD_HUNT, BIG_LOOP); more than one is a "MIXED" level, with no
  // separate case needed anywhere. TIME_ATTACK/LIMITED_LOOPS/AVOID_BOMBS
  // aren't requirement types at all - they're this same requirements list
  // combined with timeLimit/maxLoops/bombPenalty below.
  requirements: RequirementDefinition[];
  starCount: number;
  starTypes: StarType[];
  timeLimit?: number | null;
  maxLoops?: number | null;
  movementSpeed?: number;
  bombPenalty?: BombPenaltyType | null;
  rewardCoins: number;
}

// A CAPTURE requirement with no `count` means "every collectible star" -
// resolved here, once the real star layout (and therefore the true
// collectible count) exists, so level authors never have to keep a
// duplicate "starCount minus bombs" number in sync by hand.
function resolveRequirement(requirement: RequirementDefinition, collectibleCount: number): Requirement {
  if (requirement.type === 'CAPTURE' && requirement.count === undefined) {
    return { type: 'CAPTURE', count: collectibleCount };
  }
  return requirement as Requirement;
}

// Star-rating thresholds are derived from the level's maximum possible score
// (every star captured) so authors only need to tune starCount/starTypes,
// not separately maintained score numbers.
export function buildLevel(definition: LevelDefinition): Level {
  const stars = generateStarLayout(definition.id, definition.starCount, definition.starTypes);
  const maxScore = stars.reduce((total, star) => total + getStarValue(star.type), 0);
  const collectibleCount = stars.filter((star) => star.type !== 'BOMB').length;

  return {
    id: definition.id,
    worldId: definition.worldId,
    name: definition.name,
    requirements: definition.requirements.map((requirement) =>
      resolveRequirement(requirement, collectibleCount)
    ),
    starCount: definition.starCount,
    starTypes: definition.starTypes,
    stars,
    timeLimit: definition.timeLimit ?? null,
    maxLoops: definition.maxLoops ?? null,
    movementSpeed: definition.movementSpeed ?? 0,
    bombPenalty: definition.bombPenalty ?? null,
    rewardCoins: definition.rewardCoins,
    oneStarScore: Math.ceil(maxScore * 0.4),
    twoStarScore: Math.ceil(maxScore * 0.7),
    threeStarScore: maxScore,
    specialRules: {},
  };
}
