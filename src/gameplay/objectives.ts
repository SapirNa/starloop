import type { Level } from '../types/level';
import type { Requirement } from '../types/objective';
import type { Star } from '../types/star';

export interface ObjectiveContext {
  stars: Star[];
  score: number;
  loopsUsed: number;
  elapsedSeconds: number;
  // Running max of any single loop's capture count this attempt - drives
  // BIG_LOOP (and was the old single "combo" concept).
  bestCombo: number;
  // Cumulative GOLD stars captured this attempt - drives GOLD_HUNT.
  goldCaptured: number;
  // One entry per loop that captured at least one star, in order - drives
  // COMBO ("N combos of at least size M"), which bestCombo alone can't
  // answer (it only remembers the biggest, not how many crossed a
  // threshold).
  loopCaptureCounts: number[];
}

export interface ObjectiveStatus {
  isComplete: boolean;
  isFailed: boolean;
  failureReason: string | null;
}

// Bombs are obstacles, not objectives - a level is never "complete" or
// "counted" by requiring bombs to be captured (that would make bomb levels
// unwinnable).
function collectibleStars(stars: Star[]): Star[] {
  return stars.filter((star) => star.type !== 'BOMB');
}

function capturedCount(stars: Star[]): number {
  return collectibleStars(stars).filter((star) => !star.active).length;
}

function comboCountAtLeast(loopCaptureCounts: number[], minSize: number): number {
  return loopCaptureCounts.filter((count) => count >= minSize).length;
}

// The one place that knows how to check each requirement type - adding a
// new one means adding a case here (and to describeRequirement below), not
// hunting through GameScreen or the store for scattered objective logic.
function isRequirementMet(requirement: Requirement, context: ObjectiveContext): boolean {
  switch (requirement.type) {
    case 'CAPTURE':
      return capturedCount(context.stars) >= requirement.count;
    case 'SCORE':
      return context.score >= requirement.target;
    case 'COMBO':
      return comboCountAtLeast(context.loopCaptureCounts, requirement.minComboSize) >= requirement.comboCount;
    case 'GOLD_HUNT':
      return context.goldCaptured >= requirement.count;
    case 'BIG_LOOP':
      return context.bestCombo >= requirement.minStars;
    default: {
      const exhaustive: never = requirement;
      return exhaustive;
    }
  }
}

function describeRequirement(requirement: Requirement, context: ObjectiveContext): string {
  switch (requirement.type) {
    case 'CAPTURE':
      return `Captured: ${capturedCount(context.stars)} / ${requirement.count}`;
    case 'SCORE':
      return `Score: ${context.score} / ${requirement.target}`;
    case 'COMBO':
      return `Combos (${requirement.minComboSize}+): ${comboCountAtLeast(context.loopCaptureCounts, requirement.minComboSize)} / ${requirement.comboCount}`;
    case 'GOLD_HUNT':
      return `Gold: ${context.goldCaptured} / ${requirement.count}`;
    case 'BIG_LOOP':
      return `Best combo: ${context.bestCombo} / ${requirement.minStars}`;
    default: {
      const exhaustive: never = requirement;
      return exhaustive;
    }
  }
}

// Pure objective evaluation, kept separate from the gameplay/rendering layer
// so each requirement type - and the universal timer/loop constraints - can
// be reasoned about (and tested) independently. A level is complete once
// EVERY one of its requirements is met (a "MIXED" level is just a
// requirements list with more than one entry - no special case needed).
export function evaluateObjective(level: Level, context: ObjectiveContext): ObjectiveStatus {
  const allRequirementsMet = level.requirements.every((requirement) =>
    isRequirementMet(requirement, context)
  );
  if (allRequirementsMet) return { isComplete: true, isFailed: false, failureReason: null };

  // Universal constraints: any level can carry a timeLimit and/or maxLoops
  // regardless of its requirements (e.g. a GOLD_HUNT level could also be
  // timed - that's what makes it "TIME_ATTACK" flavored).
  if (level.timeLimit !== null && context.elapsedSeconds >= level.timeLimit) {
    return { isComplete: false, isFailed: true, failureReason: 'Out of time' };
  }
  if (level.maxLoops !== null && context.loopsUsed >= level.maxLoops) {
    return { isComplete: false, isFailed: true, failureReason: 'Out of loops' };
  }

  return { isComplete: false, isFailed: false, failureReason: null };
}

// Short HUD line describing progress toward every requirement, plus any
// universal timer/loop info that's relevant.
export function describeObjective(level: Level, context: ObjectiveContext): string {
  const parts = level.requirements.map((requirement) => describeRequirement(requirement, context));

  if (level.timeLimit !== null) {
    parts.push(`Time: ${Math.max(0, level.timeLimit - context.elapsedSeconds)}s`);
  }
  if (level.maxLoops !== null) {
    parts.push(`Loops: ${context.loopsUsed}/${level.maxLoops}`);
  }

  return parts.join(' | ');
}
