import { create } from 'zustand';

import type { Planet } from '../types/planet';
import { resolveDefaultPlanetName } from '../utils/seedUtils';
import { getPlanetNoiseMap, evictPlanetNoiseMap, evictLocaleNoiseMap } from '../utils/noiseMaps';
import { devWarn } from '../utils/helpers';

export const DEFAULT_LOCALE_ID = 'pelagos-default';

// The default planet's *id* stays a stable literal — nothing downstream keys
// off the name (localeStore.ts, WorldView.tsx, etc. all reference the id).
// The *name* is what actually feeds the procedural seed (derivePlanetSeed),
// so it's resolved once per module load: random unless a debug seed override
// is active, in which case the override pins it deterministically (see
// resolveDefaultPlanetName's doc comment). Exported so localeStore.ts's own
// noise-map priming call uses the same name instead of a second hardcoded
// literal that could silently drift from this one.
export const DEFAULT_PLANET_NAME = resolveDefaultPlanetName();

export const DEFAULT_PELAGOS: Planet = {
  id: 'pelagos',
  name: DEFAULT_PLANET_NAME,
  locales: [DEFAULT_LOCALE_ID],
  currentLocaleId: DEFAULT_LOCALE_ID,
};

getPlanetNoiseMap('pelagos', DEFAULT_PLANET_NAME);

export interface PlanetStore {
  planets: Planet[];
  currentPlanetId: string;
  addPlanet: (planet: Planet) => boolean;
  removePlanet: (planetId: string) => void;
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
      added = true;
      getPlanetNoiseMap(planet.id, planet.name);
      return { planets: [...state.planets, planet] };
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

  setCurrentLocale: (planetId, localeId) =>
    set((state) => ({
      planets: state.planets.map((p) =>
        p.id === planetId ? { ...p, currentLocaleId: localeId } : p
      ),
    })),

  setCurrentPlanetId: (planetId) => set({ currentPlanetId: planetId }),
}));

export default usePlanetStore;

