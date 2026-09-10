import type { GameIconName } from '../components/ui/GameIcon';
import type { Level } from '../types/level';

// One-time explainer modals for each *kind* of objective/constraint a level
// can introduce - shown the first time the player meets each kind, never
// again after that (see stores/useTutorialStore.ts seenObjectiveTutorials).
// CAPTURE has no entry here on purpose: the existing TutorialOverlay
// (data/tutorial.ts, levels 1-3) already teaches the base loop gesture, and
// this task explicitly keeps that system as-is rather than duplicating it.
export type ObjectiveTutorialId =
  | 'SCORE'
  | 'COMBO'
  | 'TIME_ATTACK'
  | 'LIMITED_LOOPS'
  | 'GOLD_HUNT'
  | 'AVOID_BOMBS'
  | 'BIG_LOOP'
  | 'MIXED';

export interface ObjectiveTutorialContent {
  id: ObjectiveTutorialId;
  title: string;
  explanation: string;
  icon: GameIconName;
}

export const OBJECTIVE_TUTORIALS: Record<ObjectiveTutorialId, ObjectiveTutorialContent> = {
  SCORE: {
    id: 'SCORE',
    title: 'SCORE CHALLENGE',
    explanation: 'Build bigger loops and combos to reach the target score.',
    icon: 'scoreTarget',
  },
  COMBO: {
    id: 'COMBO',
    title: 'COMBO CHALLENGE',
    explanation: 'Capture several stars in the same loop to build combos.',
    icon: 'comboBurst',
  },
  TIME_ATTACK: {
    id: 'TIME_ATTACK',
    title: 'BEAT THE CLOCK',
    explanation: 'Complete the objective before time runs out.',
    icon: 'timeAttack',
  },
  LIMITED_LOOPS: {
    id: 'LIMITED_LOOPS',
    title: 'MAKE EVERY LOOP COUNT',
    explanation: 'You only have a limited number of loops. Plan carefully.',
    icon: 'loopLimit',
  },
  GOLD_HUNT: {
    id: 'GOLD_HUNT',
    title: 'GOLD HUNT',
    explanation: 'Look for Gold Stars and capture the required number.',
    icon: 'starFilled',
  },
  AVOID_BOMBS: {
    id: 'AVOID_BOMBS',
    title: 'WATCH OUT!',
    explanation: 'Bombs are dangerous. Draw carefully and keep them outside your loops.',
    icon: 'bombWarning',
  },
  BIG_LOOP: {
    id: 'BIG_LOOP',
    title: 'BIG LOOP',
    explanation: 'Capture several stars with one large loop.',
    icon: 'bigLoop',
  },
  MIXED: {
    id: 'MIXED',
    title: 'MULTI CHALLENGE',
    explanation: 'This level has more than one objective. Complete them all to win.',
    icon: 'mixedObjective',
  },
};

// Fixed precedence for the rare case a level introduces more than one new
// concept at once - levels are authored one new mechanic at a time (see
// data/levels.ts), so in practice this never has to break a tie, but a
// level should still only ever show a single tutorial modal, never stack
// them (see the task's "don't overload Level 1" rule, applied generally).
const PRIORITY: ObjectiveTutorialId[] = [
  'MIXED',
  'GOLD_HUNT',
  'BIG_LOOP',
  'COMBO',
  'SCORE',
  'TIME_ATTACK',
  'LIMITED_LOOPS',
  'AVOID_BOMBS',
];

// Every objective "concept" this level actually exercises, independent of
// whether the player has seen it before. TIME_ATTACK/LIMITED_LOOPS/
// AVOID_BOMBS come from the level's universal constraints
// (timeLimit/maxLoops/bombPenalty), not a requirement type - see
// types/objective.ts.
export function getObjectiveConceptsForLevel(level: Level): ObjectiveTutorialId[] {
  const concepts = new Set<ObjectiveTutorialId>();

  if (level.requirements.length > 1) {
    concepts.add('MIXED');
  } else {
    const [only] = level.requirements;
    if (only && only.type !== 'CAPTURE') {
      concepts.add(only.type);
    }
  }

  if (level.timeLimit !== null) concepts.add('TIME_ATTACK');
  if (level.maxLoops !== null) concepts.add('LIMITED_LOOPS');
  if (level.bombPenalty !== null) concepts.add('AVOID_BOMBS');

  return PRIORITY.filter((id) => concepts.has(id));
}

// The single tutorial (if any) to show before this level starts - the
// highest-priority concept this level uses that isn't in `seenIds` yet.
// Pure and store-independent; see stores/useTutorialStore.ts for the
// persisted seen-list this is checked against.
export function getNextObjectiveTutorial(
  level: Level,
  seenIds: readonly string[]
): ObjectiveTutorialContent | null {
  const nextId = getObjectiveConceptsForLevel(level).find((id) => !seenIds.includes(id));
  return nextId ? OBJECTIVE_TUTORIALS[nextId] : null;
}
