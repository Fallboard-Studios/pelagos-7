import { create } from 'zustand';

import type { Planet, PlanetSize } from '../types/planet';
import { PLANET_DURATION_MS } from '../constants/time';
import { derivePlanetSeed, planetInitialHour } from '../utils/seedUtils';
import { getPlanetNoiseMap, evictPlanetNoiseMap, evictLocaleNoiseMap } from '../utils/noiseMaps';
import { devWarn } from '../utils/helpers';

export const DEFAULT_LOCALE_ID = 'pelagos-default';

function makeDayStartTimestamp(planetName: string, size: PlanetSize): number {
  const seed = derivePlanetSeed(planetName);
  const initialHour = planetInitialHour(seed);
  return Date.now() - (initialHour / 24) * PLANET_DURATION_MS[size];
}

export const DEFAULT_PELAGOS: Planet = {
  id: 'pelagos',
  name: 'Pelagos',
  size: 'medium',
  locales: [DEFAULT_LOCALE_ID],
  currentLocaleId: DEFAULT_LOCALE_ID,
  dayStartTimestamp: makeDayStartTimestamp('Pelagos', 'medium'),
  currentHour: 0,
};

getPlanetNoiseMap('pelagos', 'Pelagos');

export interface PlanetStore {
  planets: Planet[];
  currentPlanetId: string;
  addPlanet: (planet: Planet) => boolean;
  removePlanet: (planetId: string) => void;
  setPlanetSize: (planetId: string, size: PlanetSize) => void;
  setDayStartTimestamp: (planetId: string, ts: number) => void;
  setCurrentHour: (planetId: string, hour: number) => void;
  setCurrentLocale: (planetId: string, localeId: string) => void;
  setCurrentPlanetId: (planetId: string) => void;
}

/**
 * Resolve the actively-selected planet from `currentPlanetId`. Returns
 * `undefined` (never throws) if `currentPlanetId` doesn't match any planet
 * in `planets` — e.g. the selected planet was removed, or no planet has
 * been selected yet.
 */
export function selectCurrentPlanet(state: PlanetStore): Planet | undefined {
  return state.planets.find((p) => p.id === state.currentPlanetId);
}

export const usePlanetStore = create<PlanetStore>((set) => ({
  planets: [DEFAULT_PELAGOS],
  currentPlanetId: DEFAULT_PELAGOS.id,

  addPlanet: (planet) => {
    let added = false;
    set((state) => {
      const nameTaken = state.planets.some(
        (p) => p.name.toLowerCase() === planet.name.toLowerCase()
      );
      if (nameTaken) {
        devWarn(
          `[planetStore] addPlanet: planet name "${planet.name}" is already taken. Planet not added.`
        );
        return state;
      }
      const seed = derivePlanetSeed(planet.name);
      const initialHour = planetInitialHour(seed);
      const dayStartTimestamp =
        Date.now() - (initialHour / 24) * PLANET_DURATION_MS[planet.size];
      added = true;
      getPlanetNoiseMap(planet.id, planet.name);
      return { planets: [...state.planets, { ...planet, dayStartTimestamp }] };
    });
    return added;
  },

  removePlanet: (planetId) =>
    set((state) => {
      const planet = state.planets.find((p) => p.id === planetId);
      if (planet) {
        planet.locales.forEach((localeId) => evictLocaleNoiseMap(localeId));
        evictPlanetNoiseMap(planetId);
      }
      return { planets: state.planets.filter((p) => p.id !== planetId) };
    }),

  setPlanetSize: (planetId, size) =>
    set((state) => ({
      planets: state.planets.map((p) =>
        p.id === planetId ? { ...p, size } : p
      ),
    })),

  setDayStartTimestamp: (planetId, ts) =>
    set((state) => ({
      planets: state.planets.map((p) =>
        p.id === planetId ? { ...p, dayStartTimestamp: ts } : p
      ),
    })),

  setCurrentHour: (planetId, hour) =>
    set((state) => ({
      planets: state.planets.map((p) =>
        p.id === planetId ? { ...p, currentHour: hour } : p
      ),
    })),

  setCurrentLocale: (planetId, localeId) =>
    set((state) => ({
      planets: state.planets.map((p) =>
        p.id === planetId ? { ...p, currentLocaleId: localeId } : p
      ),
    })),

  setCurrentPlanetId: (planetId) => set({ currentPlanetId: planetId }),
}));

export default usePlanetStore;

