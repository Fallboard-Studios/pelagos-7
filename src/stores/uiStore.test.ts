import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './uiStore';

const INITIAL_STATE = useUIStore.getState();

describe('uiStore — activeHubTile', () => {
  beforeEach(() => {
    useUIStore.setState(INITIAL_STATE, true);
  });

  it('defaults to null (grid view), not a pre-selected tile', () => {
    expect(useUIStore.getState().activeHubTile).toBeNull();
  });

  it('setActiveHubTile sets one of the four surviving hub tiles', () => {
    useUIStore.getState().setActiveHubTile('robotEditor');
    expect(useUIStore.getState().activeHubTile).toBe('robotEditor');
  });

  it('setActiveHubTile(null) returns to the grid', () => {
    useUIStore.getState().setActiveHubTile('audioRig');
    useUIStore.getState().setActiveHubTile(null);
    expect(useUIStore.getState().activeHubTile).toBeNull();
  });
});
