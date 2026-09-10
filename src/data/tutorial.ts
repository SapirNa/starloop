export interface TutorialStep {
  levelId: string;
  message: string;
  // Indices into that level's star list (creation order) to trace a loop
  // around for the demonstration.
  starIndices: number[];
}

// Level 1 teaches the base loop gesture (one target star, even though the
// level itself has a few stars on screen), level 2 teaches multi-star
// capture, level 3 teaches that a bigger loop scores a combo bonus.
export const TUTORIAL_STEPS: TutorialStep[] = [
  { levelId: 'level-1', message: 'Draw a loop around the star', starIndices: [0] },
  { levelId: 'level-2', message: 'Loop multiple stars at once', starIndices: [0, 1] },
  { levelId: 'level-3', message: 'Catch 3+ in one loop for a combo bonus', starIndices: [0, 1, 2] },
];

export function getTutorialStep(levelId: string): TutorialStep | undefined {
  return TUTORIAL_STEPS.find((step) => step.levelId === levelId);
}
