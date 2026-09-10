import * as storage from '../services/storage';
import { useTutorialStore } from './useTutorialStore';

beforeEach(async () => {
  await storage.saveTutorial(storage.DEFAULT_TUTORIAL);
  useTutorialStore.setState({ seenStepIds: [], seenObjectiveTutorials: [], isHydrated: false });
});

describe('hasSeen / markSeen', () => {
  it('reports unseen before any step is marked', () => {
    expect(useTutorialStore.getState().hasSeen('level-1')).toBe(false);
  });

  it('marks a step seen and reports it afterward', () => {
    useTutorialStore.getState().markSeen('level-1');
    expect(useTutorialStore.getState().hasSeen('level-1')).toBe(true);
    expect(useTutorialStore.getState().hasSeen('level-2')).toBe(false);
  });

  it('does not duplicate an already-seen step', () => {
    useTutorialStore.getState().markSeen('level-1');
    useTutorialStore.getState().markSeen('level-1');
    expect(useTutorialStore.getState().seenStepIds).toEqual(['level-1']);
  });
});

describe('hasSeenObjectiveTutorial / markObjectiveTutorialSeen', () => {
  it('reports unseen before any objective tutorial is marked', () => {
    expect(useTutorialStore.getState().hasSeenObjectiveTutorial('SCORE')).toBe(false);
  });

  it('marks an objective tutorial seen and reports it afterward, independent of others', () => {
    useTutorialStore.getState().markObjectiveTutorialSeen('SCORE');
    expect(useTutorialStore.getState().hasSeenObjectiveTutorial('SCORE')).toBe(true);
    expect(useTutorialStore.getState().hasSeenObjectiveTutorial('GOLD_HUNT')).toBe(false);
  });

  it('does not duplicate an already-seen objective tutorial', () => {
    useTutorialStore.getState().markObjectiveTutorialSeen('SCORE');
    useTutorialStore.getState().markObjectiveTutorialSeen('SCORE');
    expect(useTutorialStore.getState().seenObjectiveTutorials).toEqual(['SCORE']);
  });

  it('is independent of the base loop-gesture seenStepIds list', () => {
    useTutorialStore.getState().markSeen('level-1');
    useTutorialStore.getState().markObjectiveTutorialSeen('SCORE');
    expect(useTutorialStore.getState().seenStepIds).toEqual(['level-1']);
    expect(useTutorialStore.getState().seenObjectiveTutorials).toEqual(['SCORE']);
  });
});

describe('resetObjectiveTutorials', () => {
  it('clears every seen objective tutorial so they would show again', () => {
    useTutorialStore.getState().markObjectiveTutorialSeen('SCORE');
    useTutorialStore.getState().markObjectiveTutorialSeen('GOLD_HUNT');
    useTutorialStore.getState().resetObjectiveTutorials();
    expect(useTutorialStore.getState().seenObjectiveTutorials).toEqual([]);
  });
});

describe('persistence across a simulated app restart', () => {
  it('reloads seen steps and seen objective tutorials on hydrate', async () => {
    useTutorialStore.getState().markSeen('level-1');
    useTutorialStore.getState().markSeen('level-2');
    useTutorialStore.getState().markObjectiveTutorialSeen('SCORE');

    await new Promise((resolve) => setTimeout(resolve, 0));

    useTutorialStore.setState({ seenStepIds: [], seenObjectiveTutorials: [], isHydrated: false });
    await useTutorialStore.getState().hydrate();

    expect(useTutorialStore.getState().hasSeen('level-1')).toBe(true);
    expect(useTutorialStore.getState().hasSeen('level-2')).toBe(true);
    expect(useTutorialStore.getState().hasSeenObjectiveTutorial('SCORE')).toBe(true);
  });
});
