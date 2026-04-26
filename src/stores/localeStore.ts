import { create } from 'zustand';

import type { Locale, LocaleState } from '../types/locale';
import { DEFAULT_LOCALE_ID } from './planetStore';
import { usePlanetStore } from './planetStore';
import { getLocaleNoiseMap, evictLocaleNoiseMap } from '../utils/noiseMaps';

const DEFAULT_LOCALE: Locale = {
  id: DEFAULT_LOCALE_ID,
  planetId: 'pelagos',
  name: 'Pelagos Ocean',
  coordinates: { x: 0, y: 0 },
  robots: [],
  actors: [],
  settings: { bpm: 240, maxRobots: 12, minRobots: 2, autoSpawn: true, spawnFrequency: 4 },
  currentMeasure: 0,
};

getLocaleNoiseMap(DEFAULT_LOCALE_ID, 'pelagos', 'Pelagos', 0, 0);

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
    set((state) => {
      const existing = state.locales[localeId];
      if (!existing) return state;
      return {
        locales: {
          ...state.locales,
          [localeId]: { ...existing, ...partial },
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
      const normalized = { ...updates } as any;
      if (typeof normalized.rhythmicDensity === 'number') {
        // valid range: 4..12
        normalized.rhythmicDensity = Math.max(4, Math.min(12, Math.trunc(normalized.rhythmicDensity)));
      }
      if (typeof normalized.rhythmicMotifLength === 'number') {
        // valid range: 1..16
        normalized.rhythmicMotifLength = Math.max(1, Math.min(16, Math.trunc(normalized.rhythmicMotifLength)));
      }
      if (Array.isArray(normalized.octaveRange) && normalized.octaveRange.length === 2) {
        let [minO, maxO] = normalized.octaveRange.map((v: any) => Number(v));
        if (!Number.isFinite(minO) || !Number.isFinite(maxO)) {
          // ignore invalid octaveRange
          delete normalized.octaveRange;
        } else {
          minO = Math.max(1, Math.min(7, Math.trunc(minO)));
          maxO = Math.max(1, Math.min(7, Math.trunc(maxO)));
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
