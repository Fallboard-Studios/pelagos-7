import { create } from 'zustand';

import type { Planet, PlanetSize } from '../types/planet';

export const DEFAULT_LOCALE_ID = 'pelagos-default';

export const DEFAULT_PELAGOS: Planet = {
  id: 'pelagos',
  name: 'Pelagos',
  size: 'medium',
  locales: [DEFAULT_LOCALE_ID],
  currentLocaleId: DEFAULT_LOCALE_ID,
  dayStartTimestamp: Date.now(),
  currentHour: 0,
};

export interface PlanetStore {
  planets: Planet[];
  addPlanet: (planet: Planet) => void;
  removePlanet: (planetId: string) => void;
  setPlanetSize: (planetId: string, size: PlanetSize) => void;
  setDayStartTimestamp: (planetId: string, ts: number) => void;
  setCurrentHour: (planetId: string, hour: number) => void;
  setCurrentLocale: (planetId: string, localeId: string) => void;
}

export const usePlanetStore = create<PlanetStore>((set) => ({
  planets: [DEFAULT_PELAGOS],

  addPlanet: (planet) =>
    set((state) => ({
      planets: [...state.planets, planet],
    })),

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

