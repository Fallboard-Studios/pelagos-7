// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useLocaleStore, DEFAULT_LOCALE, DEFAULT_LOCALE_ID } from './localeStore';
import { AudioEngine } from '../engine/AudioEngine';
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

    it('default locale coordinates are integers — CoordsInput.tsx and SectorSettingsDrawer.tsx both assume coordinates are integers system-wide (docs/specs/SECTOR_SETTINGS.md); a decimal default renders as a multi-decimal value on first load, before any user edit rounds it', () => {
      expect(Number.isInteger(DEFAULT_LOCALE.coordinates.x)).toBe(true);
      expect(Number.isInteger(DEFAULT_LOCALE.coordinates.y)).toBe(true);
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

    describe('rhythmicDensity clamping (0-100% fill rate)', () => {
      it('clamps a value above 100 down to 100', () => {
        useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
        useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, 'r1', { rhythmicDensity: 150 });
        expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].rhythmicDensity).toBe(100);
      });

      it('clamps a negative value up to 0', () => {
        useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
        useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, 'r1', { rhythmicDensity: -10 });
        expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].rhythmicDensity).toBe(0);
      });

      it('passes an in-range value through untouched', () => {
        useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
        useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, 'r1', { rhythmicDensity: 42 });
        expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].rhythmicDensity).toBe(42);
      });
    });

    describe('rhythmicMotifLength / noteVariance clamping ({ active, value } toggles, value 1-8)', () => {
      it('clamps rhythmicMotifLength.value above 8 down to 8 and preserves active', () => {
        useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
        useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, 'r1', { rhythmicMotifLength: { active: true, value: 20 } });
        expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].rhythmicMotifLength).toEqual({ active: true, value: 8 });
      });

      it('clamps rhythmicMotifLength.value below 1 up to 1', () => {
        useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
        useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, 'r1', { rhythmicMotifLength: { active: false, value: -3 } });
        expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].rhythmicMotifLength).toEqual({ active: false, value: 1 });
      });

      it('clamps noteVariance.value above 8 down to 8', () => {
        useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
        useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, 'r1', { noteVariance: { active: true, value: 99 } });
        expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].noteVariance).toEqual({ active: true, value: 8 });
      });

      it('coerces a non-boolean active to a real boolean', () => {
        useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
        useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, 'r1', {
          // @ts-expect-error — intentionally malformed to test coercion at the store boundary
          noteVariance: { active: 'yes', value: 4 },
        });
        expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].noteVariance).toEqual({ active: true, value: 4 });
      });

      it('rejects a bare-number payload (the old shape) instead of silently mis-clamping it', () => {
        useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
        useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, 'r1', {
          // @ts-expect-error — intentionally the old (pre-refactor) shape
          rhythmicMotifLength: 12,
        });
        // Neither silently clamped as if 12 were a `.value` under some implicit
        // shape, nor stored verbatim as a bare number — dropped entirely.
        expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].rhythmicMotifLength).toBeUndefined();
      });

      it('passes an in-range { active, value } payload through untouched', () => {
        useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
        useLocaleStore.getState().updateRobot(DEFAULT_LOCALE_ID, 'r1', { rhythmicMotifLength: { active: true, value: 5 } });
        expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots[0].rhythmicMotifLength).toEqual({ active: true, value: 5 });
      });
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

    it('releases every robot\'s AudioEngine voice and melody before removing the locale', () => {
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r2'));
      const releaseVoiceSpy = vi.spyOn(AudioEngine, 'releaseVoice');
      const unregisterMelodySpy = vi.spyOn(AudioEngine, 'unregisterRobotMelody');

      useLocaleStore.getState().removeLocale(DEFAULT_LOCALE_ID);

      expect(releaseVoiceSpy).toHaveBeenCalledWith('r1');
      expect(releaseVoiceSpy).toHaveBeenCalledWith('r2');
      expect(unregisterMelodySpy).toHaveBeenCalledWith('r1');
      expect(unregisterMelodySpy).toHaveBeenCalledWith('r2');

      releaseVoiceSpy.mockRestore();
      unregisterMelodySpy.mockRestore();
    });

    it('removing a locale with zero robots calls no AudioEngine cleanup and does not throw', () => {
      const releaseVoiceSpy = vi.spyOn(AudioEngine, 'releaseVoice');

      expect(() => useLocaleStore.getState().removeLocale(DEFAULT_LOCALE_ID)).not.toThrow();
      expect(releaseVoiceSpy).not.toHaveBeenCalled();

      releaseVoiceSpy.mockRestore();
    });

    it('one robot\'s cleanup throwing does not block cleanup of the rest or the removal itself', () => {
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r1'));
      useLocaleStore.getState().addRobot(DEFAULT_LOCALE_ID, makeRobot('r2'));
      const releaseVoiceSpy = vi.spyOn(AudioEngine, 'releaseVoice').mockImplementation((id) => {
        if (id === 'r1') throw new Error('simulated failure');
      });
      const unregisterMelodySpy = vi.spyOn(AudioEngine, 'unregisterRobotMelody');

      expect(() => useLocaleStore.getState().removeLocale(DEFAULT_LOCALE_ID)).not.toThrow();
      expect(unregisterMelodySpy).toHaveBeenCalledWith('r1');
      expect(unregisterMelodySpy).toHaveBeenCalledWith('r2');
      expect(useLocaleStore.getState().locales[DEFAULT_LOCALE_ID]).toBeUndefined();

      releaseVoiceSpy.mockRestore();
      unregisterMelodySpy.mockRestore();
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
