import { describe, it, expect } from 'vitest';
import { usePlanetStore, DEFAULT_PELAGOS } from './planetStore';

describe('planetStore', () => {
  it('initialises with DEFAULT_PELAGOS', () => {
    const state = usePlanetStore.getState();
    expect(state.planets.length).toBeGreaterThan(0);
    const p = state.planets.find((x) => x.id === DEFAULT_PELAGOS.id);
    expect(p).toBeDefined();
    expect(p?.name).toBe('Pelagos');
  });
});
