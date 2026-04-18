// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach } from 'vitest';

import { usePlanetStore, DEFAULT_PELAGOS } from './planetStore';

// ========================================
// TESTS
// ========================================

describe('planetStore', () => {
  beforeEach(() => {
    usePlanetStore.setState({ planets: [{ ...DEFAULT_PELAGOS }] });
  });

  describe('initial state', () => {
    it('has one planet on init', () => {
      expect(usePlanetStore.getState().planets).toHaveLength(1);
    });

    it('default planet id is pelagos', () => {
      expect(usePlanetStore.getState().planets[0].id).toBe('pelagos');
    });

    it('default planet size is medium', () => {
      expect(usePlanetStore.getState().planets[0].size).toBe('medium');
    });

    it('maintains serializable state', () => {
      expect(() => JSON.stringify(usePlanetStore.getState())).not.toThrow();
    });
  });

  describe('setPlanetSize', () => {
    it('updates size for the target planet', () => {
      usePlanetStore.getState().setPlanetSize('pelagos', 'small');
      expect(usePlanetStore.getState().planets[0].size).toBe('small');
    });

    it('leaves other fields unchanged', () => {
      const before = usePlanetStore.getState().planets[0];
      usePlanetStore.getState().setPlanetSize('pelagos', 'large');
      const after = usePlanetStore.getState().planets[0];
      expect(after.id).toBe(before.id);
      expect(after.name).toBe(before.name);
      expect(after.currentLocaleId).toBe(before.currentLocaleId);
    });

    it('does not affect other planets', () => {
      usePlanetStore.getState().addPlanet({ ...DEFAULT_PELAGOS, id: 'other', name: 'Other', size: 'large' });
      usePlanetStore.getState().setPlanetSize('pelagos', 'small');
      const other = usePlanetStore.getState().planets.find((p) => p.id === 'other');
      expect(other?.size).toBe('large');
    });
  });

  describe('setCurrentHour', () => {
    it('updates currentHour', () => {
      usePlanetStore.getState().setCurrentHour('pelagos', 14);
      expect(usePlanetStore.getState().planets[0].currentHour).toBe(14);
    });

    it('accepts fractional hours', () => {
      usePlanetStore.getState().setCurrentHour('pelagos', 6.75);
      expect(usePlanetStore.getState().planets[0].currentHour).toBe(6.75);
    });
  });

  describe('setDayStartTimestamp', () => {
    it('updates dayStartTimestamp', () => {
      usePlanetStore.getState().setDayStartTimestamp('pelagos', 9999);
      expect(usePlanetStore.getState().planets[0].dayStartTimestamp).toBe(9999);
    });
  });

  describe('setCurrentLocale', () => {
    it('updates currentLocaleId', () => {
      usePlanetStore.getState().setCurrentLocale('pelagos', 'other-locale');
      expect(usePlanetStore.getState().planets[0].currentLocaleId).toBe('other-locale');
    });
  });

  describe('addPlanet', () => {
    it('appends a planet to the list', () => {
      usePlanetStore.getState().addPlanet({ ...DEFAULT_PELAGOS, id: 'new-planet', name: 'New' });
      expect(usePlanetStore.getState().planets).toHaveLength(2);
      expect(usePlanetStore.getState().planets[1].id).toBe('new-planet');
    });
  });

  describe('removePlanet', () => {
    it('removes the planet by id', () => {
      usePlanetStore.getState().removePlanet('pelagos');
      expect(usePlanetStore.getState().planets).toHaveLength(0);
    });

    it('does not affect other planets', () => {
      usePlanetStore.getState().addPlanet({ ...DEFAULT_PELAGOS, id: 'extra', name: 'Extra' });
      usePlanetStore.getState().removePlanet('pelagos');
      expect(usePlanetStore.getState().planets).toHaveLength(1);
      expect(usePlanetStore.getState().planets[0].id).toBe('extra');
    });
  });
});
