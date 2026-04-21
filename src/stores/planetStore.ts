import { create } from 'zustand';

import type { Planet, PlanetSize } from '../types/planet';
import { PLANET_DURATION_MS } from '../constants/time';
import { derivePlanetSeed, planetInitialHour } from '../utils/seedUtils';

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

export interface PlanetStore {
  planets: Planet[];
  addPlanet: (planet: Planet) => boolean;
  removePlanet: (planetId: string) => void;
  setPlanetSize: (planetId: string, size: PlanetSize) => void;
  setDayStartTimestamp: (planetId: string, ts: number) => void;
  setCurrentHour: (planetId: string, hour: number) => void;
  setCurrentLocale: (planetId: string, localeId: string) => void;
}

export const usePlanetStore = create<PlanetStore>((set) => ({
  planets: [DEFAULT_PELAGOS],

  addPlanet: (planet) => {
    let added = false;
    set((state) => {
      const nameTaken = state.planets.some(
        (p) => p.name.toLowerCase() === planet.name.toLowerCase()
      );
      if (nameTaken) {
        console.warn(
          `[planetStore] addPlanet: planet name "${planet.name}" is already taken. Planet not added.`
        );
        return state;
      }
      const seed = derivePlanetSeed(planet.name);
      const initialHour = planetInitialHour(seed);
      const dayStartTimestamp =
        Date.now() - (initialHour / 24) * PLANET_DURATION_MS[planet.size];
      added = true;
      return { planets: [...state.planets, { ...planet, dayStartTimestamp }] };
    });
    return added;
  },

  removePlanet: (planetId) =>
    set((state) => ({
      planets: state.planets.filter((p) => p.id !== planetId),
    })),

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
}));

export default usePlanetStore;

