import { LEVELS } from '../data/levels';
import { useGameStore } from './useGameStore';

// Regression coverage for the stale-session race that let a delayed
// GameScreen unmount (native-stack "replace" can defer that past the next
// screen's mount) call reset() *after* a newer level had already started -
// wiping its fresh 'playing' session back to 'idle', or (the reverse) let a
// newer screen's completion-redirect effect react to a previous level's
// leftover 'completed' status/score before its own startLevel ran. See
// screens/GameScreen.tsx for how sessionId is used alongside this.
describe('sessionId / reset guarding', () => {
  const level = LEVELS[0];

  it('bumps sessionId on every startLevel call', () => {
    useGameStore.getState().startLevel(level, 400, 800);
    const first = useGameStore.getState().sessionId;

    useGameStore.getState().startLevel(level, 400, 800);
    const second = useGameStore.getState().sessionId;

    expect(second).toBe(first + 1);
  });

  it('ignores reset() called with a session that is no longer current', () => {
    useGameStore.getState().startLevel(level, 400, 800);
    const staleSessionId = useGameStore.getState().sessionId;

    // A second screen starts a newer session before the first one's
    // (delayed) cleanup runs.
    useGameStore.getState().startLevel(level, 400, 800);
    expect(useGameStore.getState().status).toBe('playing');

    useGameStore.getState().reset(staleSessionId);

    expect(useGameStore.getState().status).toBe('playing');
    expect(useGameStore.getState().level).not.toBeNull();
  });

  it('applies reset() when the passed session is still current', () => {
    useGameStore.getState().startLevel(level, 400, 800);
    const currentSessionId = useGameStore.getState().sessionId;

    useGameStore.getState().reset(currentSessionId);

    expect(useGameStore.getState().status).toBe('idle');
    expect(useGameStore.getState().level).toBeNull();
  });

  it('applies reset() unconditionally when no session is passed', () => {
    useGameStore.getState().startLevel(level, 400, 800);

    useGameStore.getState().reset();

    expect(useGameStore.getState().status).toBe('idle');
    expect(useGameStore.getState().level).toBeNull();
  });
});
