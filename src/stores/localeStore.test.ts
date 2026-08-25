// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach } from 'vitest';

import { useLocaleStore, DEFAULT_LOCALE, DEFAULT_LOCALE_ID } from './localeStore';
import type { Locale } from '../types/locale';
import type { Robot } from '../types/Robot';
import { RobotState } from '../types/Robot';

// ========================================
// HELPERS
// ========================================

const makeRobot = (id: string): Robot => ({
  id,
  state: RobotState.Idle,
  direction: 'right',
  position: { x: 0, y: 0 },
  destination: null,
  melody: [],
  audioAttributes: {
    waveform: 'sine',
    adsr: { attack: 0, decay: 0, sustain: 0, release: 0 },
    filterFreq: 0,
  },
  octaveRange: [3, 4],
  createdAt: Date.now(),
  masterVolume: 0.7,
});

// ========================================
// TESTS
// ========================================

describe('localeStore', () => {
  beforeEach(() => {
    useLocaleStore.setState({ locales: { [DEFAULT_LOCALE_ID]: { ...DEFAULT_LOCALE } } });
  });

  describe('initial state', () => {
    it('has the default locale on init', () => {
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID]).toBeDefined();
    });

    it('default locale planetId is pelagos', () => {
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].planetId).toBe('pelagos');
    });

    it('robots starts as empty array', () => {
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots).toEqual([]);
    });

    it('actors starts as empty array', () => {
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].actors).toEqual([]);
    });

    it('maintains serializable state', () => {
      expect(() => JSON.stringify(useLocaleStore.getState())).not.toThrow();
    });

    it('default locale coordinates still avoid the old (0, 0) default — kept for continuity, though no coordinate is unsafe anymore now that getLocaleNoiseMap hashes (x, y) directly instead of sampling simplex noise at the point (see docs/specs/LOCALE_SEED_DECOUPLING.md)', () => {
      expect(DEFAULT_LOCALE.coordinates).not.toEqual({ x: 0, y: 0 });
    });

    // Note: this tests getPlanetNoiseMap directly, not locale generation —
    // getLocaleNoiseMap no longer derives from the planet map at all (see
    // docs/specs/LOCALE_SEED_DECOUPLING.md), so this assertion is unaffected
    // by that change; it's still true and still worth asserting on its own.
    it('sampling the planet noise map at the default locale\'s coordinates varies by planet seed', async () => {
      const { getPlanetNoiseMap } = await import('../utils/noiseMaps');
      const mapA = getPlanetNoiseMap('locale-dead-zone-check-a', 'seed-alpha');
      const mapB = getPlanetNoiseMap('locale-dead-zone-check-b', 'seed-beta');
      const { x, y } = DEFAULT_LOCALE.coordinates;
      expect(mapA(x, y)).not.toBe(mapB(x, y));
    });
  });

  describe('addRobot', () => {
    it('adds a robot to the locale', () => {
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots).toHaveLength(1);
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].id).toBe('r1');
    });

    it('appends without overwriting existing robots', () => {
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r2'));
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots).toHaveLength(2);
    });
  });

  describe('removeRobot', () => {
    it('removes a robot by id', () => {
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
      useLocaleStore.getState().removeRobot(DEFAULT_LOCALE_ID, 'r1');
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots).toHaveLength(0);
    });

    it('does not affect other robots', () => {
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r2'));
      useLocaleStore.getState().removeRobot(DEFAULT_LOCALE_ID, 'r1');
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].id).toBe('r2');
    });
  });

  describe('updateRobot', () => {
    it('updates a field on the robot', () => {
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
      useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, 'r1', { masterVolume: 0.5 });
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].masterVolume).toBe(0.5);
    });

    it('leaves other robot fields unchanged', () => {
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
      useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, 'r1', { masterVolume: 0.1 });
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].id).toBe('r1');
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].state).toBe(RobotState.Idle);
    });
  });

  describe('setLocaleData', () => {
    it('updates currentMeasure', () => {
      useLocaleStore.getState().setLocaleData(DEFAULT_LOCALE_ID, { currentMeasure: 42 });
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].currentMeasure).toBe(42);
    });

    it('merges partial data without overwriting unrelated fields', () => {
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
      useLocaleStore.getState().setLocaleData(DEFAULT_LOCALE_ID, { currentMeasure: 10 });
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots).toHaveLength(1);
    });
  });

  describe('addLocale / removeLocale', () => {
    const newLocale: Locale = { ...DEFAULT_LOCALE, id: 'locale-2', name: 'Locale Two' };

    it('adds a locale to the map', () => {
      useLocaleStore.getState().addLocale('pelagos', newLocale);
      expect(useLocaleStore.getState().locales['locale-2']).toBeDefined();
    });

    it('removes a locale from the map', () => {
      useLocaleStore.getState().addLocale('pelagos', newLocale);
      useLocaleStore.getState().removeLocale('locale-2');
      expect(useLocaleStore.getState().locales['locale-2']).toBeUndefined();
    });

    it('removing default locale leaves map empty', () => {
      useLocaleStore.getState().removeLocale(DEFAULT_LOCALE_ID);
      expect(Object.keys(useLocaleStore.getState().locales)).toHaveLength(0);
    });
  });

  describe('getLocaleById', () => {
    it('returns the locale for a known id', () => {
      expect(useLocaleStore.getState().getLocaleById(DEFAULT_LOCALE_ID)?.id).toBe(DEFAULT_LOCALE_ID);
    });

    it('returns undefined for an unknown id', () => {
      expect(useLocaleStore.getState().getLocaleById('nonexistent')).toBeUndefined();
    });
  });
});
