import { buildLevel, type LevelDefinition } from './levelBuilder';
import { getNextObjectiveTutorial, getObjectiveConceptsForLevel } from './objectiveTutorials';
import type { RequirementDefinition } from '../types/objective';

function makeLevel(
  requirements: RequirementDefinition[],
  overrides: Partial<Omit<LevelDefinition, 'requirements'>> = {}
) {
  return buildLevel({
    id: 'test-level',
    worldId: 'world-1',
    name: 'Test Level',
    requirements,
    starCount: 3,
    starTypes: ['NORMAL'],
    rewardCoins: 10,
    ...overrides,
  });
}

describe('getObjectiveConceptsForLevel', () => {
  it('CAPTURE alone has no concept - the base gesture uses the existing tutorial', () => {
    expect(getObjectiveConceptsForLevel(makeLevel([{ type: 'CAPTURE' }]))).toEqual([]);
  });

  it('a single non-CAPTURE requirement maps to its own concept', () => {
    expect(getObjectiveConceptsForLevel(makeLevel([{ type: 'SCORE', target: 50 }]))).toEqual([
      'SCORE',
    ]);
    expect(
      getObjectiveConceptsForLevel(makeLevel([{ type: 'GOLD_HUNT', count: 3 }]))
    ).toEqual(['GOLD_HUNT']);
    expect(
      getObjectiveConceptsForLevel(makeLevel([{ type: 'BIG_LOOP', minStars: 3 }]))
    ).toEqual(['BIG_LOOP']);
    expect(
      getObjectiveConceptsForLevel(makeLevel([{ type: 'COMBO', comboCount: 2, minComboSize: 3 }]))
    ).toEqual(['COMBO']);
  });

  it('more than one requirement is MIXED, not the individual types', () => {
    const level = makeLevel([{ type: 'CAPTURE' }, { type: 'SCORE', target: 50 }]);
    expect(getObjectiveConceptsForLevel(level)).toEqual(['MIXED']);
  });

  it('timeLimit/maxLoops/bombPenalty add their own concepts alongside the requirement', () => {
    const level = makeLevel([{ type: 'CAPTURE' }], {
      timeLimit: 30,
      maxLoops: 5,
      bombPenalty: 'LOSE_LOOP',
      starTypes: ['NORMAL', 'BOMB'],
    });
    const concepts = getObjectiveConceptsForLevel(level);
    expect(concepts).toContain('TIME_ATTACK');
    expect(concepts).toContain('LIMITED_LOOPS');
    expect(concepts).toContain('AVOID_BOMBS');
  });

  it('a level with no special requirement or constraint has no concepts at all', () => {
    expect(getObjectiveConceptsForLevel(makeLevel([{ type: 'CAPTURE' }]))).toEqual([]);
  });
});

describe('getNextObjectiveTutorial', () => {
  it('returns null for a level with no new concept', () => {
    const level = makeLevel([{ type: 'CAPTURE' }]);
    expect(getNextObjectiveTutorial(level, [])).toBeNull();
  });

  it('returns the tutorial content for an unseen concept', () => {
    const level = makeLevel([{ type: 'GOLD_HUNT', count: 3 }]);
    const tutorial = getNextObjectiveTutorial(level, []);
    expect(tutorial?.id).toBe('GOLD_HUNT');
    expect(tutorial?.title).toBe('GOLD HUNT');
  });

  it('returns null once that concept is already in the seen list', () => {
    const level = makeLevel([{ type: 'GOLD_HUNT', count: 3 }]);
    expect(getNextObjectiveTutorial(level, ['GOLD_HUNT'])).toBeNull();
  });

  it('never shows more than one tutorial for a single level, even with multiple new concepts', () => {
    const level = makeLevel([{ type: 'SCORE', target: 50 }], { timeLimit: 20 });
    const tutorial = getNextObjectiveTutorial(level, []);
    expect(tutorial).not.toBeNull();

    // Only one of the two new concepts (SCORE, TIME_ATTACK) is returned -
    // never both at once.
    const concepts = getObjectiveConceptsForLevel(level);
    expect(concepts.length).toBeGreaterThan(1);
  });

  it('falls through to the next unseen concept once the higher-priority one is seen', () => {
    const level = makeLevel([{ type: 'SCORE', target: 50 }], { timeLimit: 20 });
    const firstConcept = getNextObjectiveTutorial(level, [])!.id;
    const secondTutorial = getNextObjectiveTutorial(level, [firstConcept]);
    expect(secondTutorial).not.toBeNull();
    expect(secondTutorial?.id).not.toBe(firstConcept);
  });
});
