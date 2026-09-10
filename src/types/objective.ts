// Every level objective is built from these small, composable requirement
// atoms rather than a single big enum - a level just lists which ones it
// needs satisfied (see Level.requirements in types/level.ts). This is what
// makes "MIXED" objectives (capture N + reach a score + one big combo, say)
// free: it's just a requirements array with more than one entry, not a
// separate case anywhere. Universal per-attempt constraints that aren't
// really "things to complete" (a time limit, a loop limit, bombs to avoid)
// stay as their own Level fields (timeLimit/maxLoops/bombPenalty) exactly
// as before - a "TIME_ATTACK" or "LIMITED_LOOPS" level is just a level with
// a requirement AND one of those set, not a distinct requirement type.
export type RequirementType = 'CAPTURE' | 'SCORE' | 'COMBO' | 'GOLD_HUNT' | 'BIG_LOOP';

// --- Authoring-time shapes (what data/levels.ts writes) ---------------------

// `count` may be omitted to mean "capture every collectible (non-BOMB) star
// in the level" - resolved to a concrete number by data/levelBuilder.ts
// once the star layout (and therefore the real collectible count) exists.
export interface CaptureRequirementDefinition {
  type: 'CAPTURE';
  count?: number;
}

export interface ScoreRequirement {
  type: 'SCORE';
  target: number;
}

// Complete `comboCount` separate loops, each capturing at least
// `minComboSize` stars - e.g. "3 combos of 4+ stars each", not one big
// combo (see BigLoopRequirement for that).
export interface ComboRequirement {
  type: 'COMBO';
  comboCount: number;
  minComboSize: number;
}

export interface GoldHuntRequirement {
  type: 'GOLD_HUNT';
  count: number;
}

// A single loop capturing at least `minStars` stars, at any point during
// the attempt (tracked as a running max - see GameState.bestCombo).
export interface BigLoopRequirement {
  type: 'BIG_LOOP';
  minStars: number;
}

export type RequirementDefinition =
  | CaptureRequirementDefinition
  | ScoreRequirement
  | ComboRequirement
  | GoldHuntRequirement
  | BigLoopRequirement;

// --- Resolved/runtime shape (what Level.requirements actually holds) -------

export interface CaptureRequirement {
  type: 'CAPTURE';
  count: number;
}

export type Requirement =
  | CaptureRequirement
  | ScoreRequirement
  | ComboRequirement
  | GoldHuntRequirement
  | BigLoopRequirement;
