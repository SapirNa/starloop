import * as storage from '../services/storage';
import { useProfileStore } from './useProfileStore';

beforeEach(async () => {
  await storage.saveProfile(storage.DEFAULT_PROFILE);
  useProfileStore.setState({ displayName: storage.DEFAULT_PROFILE.displayName, isHydrated: false });
});

describe('hydrate', () => {
  it('loads the persisted display name', async () => {
    await storage.saveProfile({ schemaVersion: storage.CURRENT_SCHEMA_VERSION, displayName: 'Nova' });
    await useProfileStore.getState().hydrate();
    expect(useProfileStore.getState().displayName).toBe('Nova');
    expect(useProfileStore.getState().isHydrated).toBe(true);
  });
});

describe('setDisplayName', () => {
  it('trims surrounding whitespace', () => {
    useProfileStore.getState().setDisplayName('  Nova  ');
    expect(useProfileStore.getState().displayName).toBe('Nova');
  });

  it('ignores a blank/whitespace-only name, keeping the previous value', () => {
    useProfileStore.getState().setDisplayName('Nova');
    useProfileStore.getState().setDisplayName('   ');
    expect(useProfileStore.getState().displayName).toBe('Nova');
  });

  it('truncates a name longer than the max length', () => {
    useProfileStore.getState().setDisplayName('a'.repeat(40));
    expect(useProfileStore.getState().displayName).toHaveLength(20);
  });

  it('persists the new name so it survives a simulated app restart', async () => {
    useProfileStore.getState().setDisplayName('Nova');
    await new Promise((resolve) => setTimeout(resolve, 0));

    useProfileStore.setState({ displayName: storage.DEFAULT_PROFILE.displayName, isHydrated: false });
    await useProfileStore.getState().hydrate();

    expect(useProfileStore.getState().displayName).toBe('Nova');
  });
});
