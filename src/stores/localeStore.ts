import { create } from 'zustand';

import type { Locale, LocaleState } from '../types/locale';
import { DEFAULT_LOCALE_ID, DEFAULT_PLANET_NAME } from './planetStore';
import { usePlanetStore } from './planetStore';
import { getLocaleNoiseMap, evictLocaleNoiseMap } from '../utils/noiseMaps';
import { AudioEngine } from '../engine/AudioEngine';
import {
  DEV_TUNING,
  RHYTHMIC_DENSITY_MIN,
  RHYTHMIC_DENSITY_MAX,
  RHYTHMIC_MOTIF_LENGTH_MIN,
  RHYTHMIC_MOTIF_LENGTH_MAX,
  NOTE_VARIANCE_MIN,
  NOTE_VARIANCE_MAX,
  OCTAVE_RANGE_MIN,
  OCTAVE_RANGE_MAX,
} from '../constants';
import { swallow } from '../utils/helpers';

const DEFAULT_LOCALE: Locale = {
  id: DEFAULT_LOCALE_ID,
  planetId: 'pelagos',
  name: 'Pelagos Ocean',
  // NOT (0, 0), and NOT any other "clean" short-decimal point — simplex
  // noise collapses to a low-entropy (sometimes exactly 0) result at
  // integer AND half-integer-style aligned coordinates for every seed
  // (verified against 8 different alea seeds: (0,0) gave 1 unique value,
  // (0.5,0.5) gave 3, (1,1) gave 5 — vs. 8/8 unique at a higher-precision,
  // non-aligned point like this one). That made this locale's noise map
  // invariant (or near-invariant) to the planet seed regardless of which
  // planet name was chosen. See docs/roadmap/roadmap.md § 5 "Known Issue" —
  // the same dead-zone class applies to any locale's coordinates, and
  // matters more for Phase 5's coordinate-entry UI than just this default.
  coordinates: { x: 12.3456, y: 67.891 },
  robots: [],
  actors: [],
  settings: { bpm: 60, maxRobots: 12, minRobots: 2, autoSpawn: true, spawnFrequency: 4 },
  currentMeasure: 0,
};

// Must reuse planetStore.ts's DEFAULT_PLANET_NAME, not its own literal —
// getPlanetNoiseMap caches by planetId and only honors the *name* argument
// on first creation, so a second, independently-hardcoded name here would
// silently be ignored (or worse, win a module-evaluation-order race) if it
// ever diverged from planetStore.ts's. Same reasoning for the coordinates:
// reuse DEFAULT_LOCALE.coordinates rather than a second hardcoded x/y pair
// that could silently drift back onto the (0, 0) dead zone above.
getLocaleNoiseMap(DEFAULT_LOCALE_ID, 'pelagos', DEFAULT_PLANET_NAME, DEFAULT_LOCALE.coordinates.x, DEFAULT_LOCALE.coordinates.y);

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locales: { [DEFAULT_LOCALE_ID]: DEFAULT_LOCALE },

  addLocale: (planetId, locale) => {
    const toAdd: Locale = { ...locale, planetId };

    set((state) => ({ locales: { ...state.locales, [toAdd.id]: toAdd } }));
    const planet = usePlanetStore.getState().planets.find((p) => p.id === planetId);
    if (planet) {
      getLocaleNoiseMap(toAdd.id, planetId, planet.name, toAdd.coordinates.x, toAdd.coordinates.y);
    }
  },

  setLocaleData: (localeId, partial) => {
    const cloned = { ...partial } as Partial<Locale>;

    set((state) => {
      const existing = state.locales[localeId];
      if (!existing) return state;
      return {
        locales: {
          ...state.locales,
          [localeId]: { ...existing, ...cloned },
        },
      };
    });
  },

  removeLocale: (localeId) => {
    set((state) => {
      const next = { ...state.locales };
      delete next[localeId];
      return { locales: next };
    });
    evictLocaleNoiseMap(localeId);
  },

  getLocaleById: (localeId) => get().locales[localeId],
  // Robot helpers
  addRobot: (localeId, robot) => {
    set((state) => {
      const existing = state.locales[localeId];
      if (!existing) return state;
      const updated: Locale = { ...existing, robots: [...(existing.robots || []), robot] };
      return { locales: { ...state.locales, [localeId]: updated } };
    });
  },

  updateRobot: (localeId, robotId, updates) => {
    set((state) => {
      const existing = state.locales[localeId];
      if (!existing) return state;

      // Validate and clamp well-known numeric robot fields at store entry point.
      const normalized = { ...updates } as Partial<import('../types/Robot').Robot>;
      if (typeof normalized.rhythmicDensity === 'number') {
        normalized.rhythmicDensity = Math.max(RHYTHMIC_DENSITY_MIN, Math.min(RHYTHMIC_DENSITY_MAX, Math.trunc(normalized.rhythmicDensity)));
      }
      if (typeof normalized.rhythmicMotifLength === 'number') {
        normalized.rhythmicMotifLength = Math.max(RHYTHMIC_MOTIF_LENGTH_MIN, Math.min(RHYTHMIC_MOTIF_LENGTH_MAX, Math.trunc(normalized.rhythmicMotifLength)));
      }
      if (typeof normalized.noteVariance === 'number') {
        normalized.noteVariance = Math.max(NOTE_VARIANCE_MIN, Math.min(NOTE_VARIANCE_MAX, Math.trunc(normalized.noteVariance)));
      }
      if (Array.isArray(normalized.octaveRange) && normalized.octaveRange.length === 2) {
        let [minO, maxO] = (normalized.octaveRange as unknown[]).map((v: unknown) => Number(v));
        if (!Number.isFinite(minO) || !Number.isFinite(maxO)) {
          delete normalized.octaveRange;
        } else {
          minO = Math.max(OCTAVE_RANGE_MIN, Math.min(OCTAVE_RANGE_MAX, Math.trunc(minO)));
          maxO = Math.max(OCTAVE_RANGE_MIN, Math.min(OCTAVE_RANGE_MAX, Math.trunc(maxO)));
          if (maxO < minO) {
            const tmp = minO; minO = maxO; maxO = tmp;
          }
          normalized.octaveRange = [minO, maxO];
        }
      }

      const nextRobots = (existing.robots || []).map((r) => (r.id === robotId ? { ...r, ...normalized } : r));
      return { locales: { ...state.locales, [localeId]: { ...existing, robots: nextRobots } } };
    });
  },

  removeRobot: (localeId, robotId) => {
    // Centralized audio cleanup: release reserved voice and unregister any
    // registered melody for this robot before removing it from the store.
    try {
      AudioEngine.releaseVoice(robotId);
    } catch (err) {
      if (DEV_TUNING) swallow(err, 'AudioEngine.releaseVoice');
    }
    try {
      AudioEngine.unregisterRobotMelody(robotId);
    } catch (err) {
      if (DEV_TUNING) swallow(err, 'AudioEngine.unregisterRobotMelody');
    }

    set((state) => {
      const existing = state.locales[localeId];
      if (!existing) return state;
      const nextRobots = (existing.robots || []).filter((r) => r.id !== robotId);
      return { locales: { ...state.locales, [localeId]: { ...existing, robots: nextRobots } } };
    });
  },

  getRobotById: (localeId, robotId) => get().locales[localeId]?.robots?.find((r) => r.id === robotId),
}));

export default useLocaleStore;
export { DEFAULT_LOCALE };
export { DEFAULT_LOCALE_ID };
