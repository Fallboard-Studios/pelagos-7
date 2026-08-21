// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach } from 'vitest';

import { usePlanetStore, DEFAULT_PELAGOS, selectCurrentPlanet } from './planetStore';

// ========================================
// TESTS
// ========================================

describe('planetStore', () => {
  beforeEach(() => {
    usePlanetStore.setState({ planets: [{ ...DEFAULT_PELAGOS }], currentPlanetId: DEFAULT_PELAGOS.id });
  });

  describe('initial state', () => {
    it('has one planet on init', () => {
      expect(usePlanetStore.getState().planets).toHaveLength(1);
    });

    it('default planet id is pelagos', () => {
      const pelagos = usePlanetStore.getState().planets.find((p) => p.id === 'pelagos');
      expect(pelagos?.id).toBe('pelagos');
    });

    it('default planet size is medium', () => {
      const pelagos = usePlanetStore.getState().planets.find((p) => p.id === 'pelagos');
      expect(pelagos?.size).toBe('medium');
    });

    it('maintains serializable state', () => {
      expect(() => JSON.stringify(usePlanetStore.getState())).not.toThrow();
    });
  });

  describe('setPlanetSize', () => {
    it('updates size for the target planet', () => {
      usePlanetStore.getState().setPlanetSize('pelagos', 'small');
      const pelagos = usePlanetStore.getState().planets.find((p) => p.id === 'pelagos');
      expect(pelagos?.size).toBe('small');
    });

    it('leaves other fields unchanged', () => {
      const before = usePlanetStore.getState().planets.find((p) => p.id === 'pelagos');
      usePlanetStore.getState().setPlanetSize('pelagos', 'large');
      const after = usePlanetStore.getState().planets.find((p) => p.id === 'pelagos');
      expect(after?.id).toBe(before?.id);
      expect(after?.name).toBe(before?.name);
      expect(after?.currentLocaleId).toBe(before?.currentLocaleId);
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
      const pelagos = usePlanetStore.getState().planets.find((p) => p.id === 'pelagos');
      expect(pelagos?.currentHour).toBe(14);
    });

    it('accepts fractional hours', () => {
      usePlanetStore.getState().setCurrentHour('pelagos', 6.75);
      const pelagos = usePlanetStore.getState().planets.find((p) => p.id === 'pelagos');
      expect(pelagos?.currentHour).toBe(6.75);
    });
  });

  describe('setDayStartTimestamp', () => {
    it('updates dayStartTimestamp', () => {
      usePlanetStore.getState().setDayStartTimestamp('pelagos', 9999);
      const pelagos = usePlanetStore.getState().planets.find((p) => p.id === 'pelagos');
      expect(pelagos?.dayStartTimestamp).toBe(9999);
    });
  });

  describe('setCurrentLocale', () => {
    it('updates currentLocaleId', () => {
      usePlanetStore.getState().setCurrentLocale('pelagos', 'other-locale');
      const pelagos = usePlanetStore.getState().planets.find((p) => p.id === 'pelagos');
      expect(pelagos?.currentLocaleId).toBe('other-locale');
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
      const extra = usePlanetStore.getState().planets.find((p) => p.id === 'extra');
      expect(extra).toBeDefined();
    });
  });

  describe('currentPlanetId', () => {
    it('defaults to the default planet on init', () => {
      expect(usePlanetStore.getState().currentPlanetId).toBe('pelagos');
    });

    it('updates via setCurrentPlanetId', () => {
      usePlanetStore.getState().addPlanet({ ...DEFAULT_PELAGOS, id: 'other', name: 'Other' });
      usePlanetStore.getState().setCurrentPlanetId('other');
      expect(usePlanetStore.getState().currentPlanetId).toBe('other');
    });

    it('does not validate the id against the planets list', () => {
      // setCurrentPlanetId is a plain setter — selectCurrentPlanet is what resolves
      // a currentPlanetId that doesn't match any planet (see below).
      usePlanetStore.getState().setCurrentPlanetId('does-not-exist');
      expect(usePlanetStore.getState().currentPlanetId).toBe('does-not-exist');
    });
  });

  describe('selectCurrentPlanet', () => {
    it('returns the planet matching currentPlanetId', () => {
      expect(selectCurrentPlanet(usePlanetStore.getState())?.id).toBe('pelagos');
    });

    it('returns the newly selected planet after setCurrentPlanetId', () => {
      usePlanetStore.getState().addPlanet({ ...DEFAULT_PELAGOS, id: 'other', name: 'Other', size: 'large' });
      usePlanetStore.getState().setCurrentPlanetId('other');
      expect(selectCurrentPlanet(usePlanetStore.getState())?.id).toBe('other');
    });

    it('returns undefined without throwing when no planet is selected', () => {
      usePlanetStore.getState().setCurrentPlanetId('does-not-exist');
      expect(() => selectCurrentPlanet(usePlanetStore.getState())).not.toThrow();
      expect(selectCurrentPlanet(usePlanetStore.getState())).toBeUndefined();
    });

    it('returns undefined without throwing when the planets list is empty', () => {
      usePlanetStore.getState().removePlanet('pelagos');
      expect(() => selectCurrentPlanet(usePlanetStore.getState())).not.toThrow();
      expect(selectCurrentPlanet(usePlanetStore.getState())).toBeUndefined();
    });
  });
});
