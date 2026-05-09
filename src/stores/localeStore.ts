import { create } from 'zustand';

import type { Locale, LocaleState } from '../types/locale';
import type { Robot } from '../types/Robot';
import { DEFAULT_LOCALE_ID } from './planetStore';
import { usePlanetStore } from './planetStore';
import { getLocaleNoiseMap, evictLocaleNoiseMap } from '../utils/noiseMaps';
import { AudioEngine } from '../engine/AudioEngine';
import { DEV_TUNING } from '../constants';
import { swallow } from '../utils/helpers';

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

/**
 * Pure cycle-detection helper. Returns true if linking `childId` → `parentId`
 * would introduce a cycle (i.e. `childId` is already an ancestor of `parentId`).
 * Exported for unit testing.
 */
export function hasCycle(robots: Robot[], childId: string, parentId: string): boolean {
  const robotMap = new Map(robots.map((r) => [r.id, r]));
  let current: string | null | undefined = parentId;
  while (current) {
    if (current === childId) return true;
    current = robotMap.get(current)?.linkedRobotId;
  }
  return false;
}

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
        // valid range: 4..12
        normalized.rhythmicDensity = Math.max(4, Math.min(12, Math.trunc(normalized.rhythmicDensity)));
      }
      if (typeof normalized.rhythmicMotifLength === 'number') {
        // valid range: 1..16
        normalized.rhythmicMotifLength = Math.max(1, Math.min(16, Math.trunc(normalized.rhythmicMotifLength)));
      }
      if (typeof normalized.noteVariance === 'number') {
        // valid range: 0..8
        normalized.noteVariance = Math.max(0, Math.min(8, Math.trunc(normalized.noteVariance)));
      }
      if (Array.isArray(normalized.octaveRange) && normalized.octaveRange.length === 2) {
        let [minO, maxO] = (normalized.octaveRange as unknown[]).map((v: unknown) => Number(v));
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
      // Remove the robot, and unlink any children that pointed to it.
      // Children keep their last inherited values (linkedRobotId is cleared to null).
      const nextRobots = (existing.robots || [])
        .filter((r) => r.id !== robotId)
        .map((r) => r.linkedRobotId === robotId ? { ...r, linkedRobotId: null } : r);
      return { locales: { ...state.locales, [localeId]: { ...existing, robots: nextRobots } } };
    });
  },

  getRobotById: (localeId, robotId) => get().locales[localeId]?.robots?.find((r) => r.id === robotId),

  linkRobot: (localeId, childId, parentId) => {
    if (childId === parentId) return false;
    const locale = get().locales[localeId];
    if (!locale) return false;
    const robots = locale.robots ?? [];
    // Both robots must exist in this locale
    if (!robots.some((r) => r.id === childId)) return false;
    if (!robots.some((r) => r.id === parentId)) return false;
    // Cycle check: walk up the parent chain from parentId — if we reach childId, reject
    if (hasCycle(robots, childId, parentId)) return false;
    set((state) => {
      const existing = state.locales[localeId];
      if (!existing) return state;
      const nextRobots = existing.robots.map((r) =>
        r.id === childId ? { ...r, linkedRobotId: parentId } : r
      );
      return { locales: { ...state.locales, [localeId]: { ...existing, robots: nextRobots } } };
    });
    return true;
  },

  unlinkRobot: (localeId, childId) => {
    set((state) => {
      const existing = state.locales[localeId];
      if (!existing) return state;
      const nextRobots = existing.robots.map((r) =>
        r.id === childId ? { ...r, linkedRobotId: null } : r
      );
      return { locales: { ...state.locales, [localeId]: { ...existing, robots: nextRobots } } };
    });
  },
}));

export default useLocaleStore;
export { DEFAULT_LOCALE };
export { DEFAULT_LOCALE_ID };
