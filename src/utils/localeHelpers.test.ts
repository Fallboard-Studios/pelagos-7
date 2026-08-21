// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach } from 'vitest';

import { getActiveLocaleId } from './localeHelpers';
import { usePlanetStore, DEFAULT_PELAGOS } from '@/stores/planetStore';

// ========================================
// TESTS
// ========================================

describe('getActiveLocaleId', () => {
  beforeEach(() => {
    usePlanetStore.setState({ planets: [{ ...DEFAULT_PELAGOS }], currentPlanetId: DEFAULT_PELAGOS.id });
  });

  it('returns the current planet\'s currentLocaleId', () => {
    expect(getActiveLocaleId()).toBe(DEFAULT_PELAGOS.currentLocaleId);
  });

  it('follows setCurrentPlanetId to a newly selected planet', () => {
    usePlanetStore.getState().addPlanet({
      ...DEFAULT_PELAGOS,
      id: 'other',
      name: 'Other',
      currentLocaleId: 'other-locale',
    });
    usePlanetStore.getState().setCurrentPlanetId('other');
    expect(getActiveLocaleId()).toBe('other-locale');
  });

  it('returns an empty string without throwing when no planet is selected', () => {
    usePlanetStore.getState().setCurrentPlanetId('does-not-exist');
    expect(() => getActiveLocaleId()).not.toThrow();
    expect(getActiveLocaleId()).toBe('');
  });

  it('returns an empty string without throwing when the planets list is empty', () => {
    usePlanetStore.getState().removePlanet('pelagos');
    expect(() => getActiveLocaleId()).not.toThrow();
    expect(getActiveLocaleId()).toBe('');
  });
});
