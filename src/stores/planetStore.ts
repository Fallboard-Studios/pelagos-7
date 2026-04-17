import { create } from 'zustand';
import type { Planet, PlanetState } from '../types/planet';

const DEFAULT_LOCALE_ID = 'pelagos-default-locale';

export const DEFAULT_PELAGOS: Planet = {
  id: 'pelagos',
  name: 'Pelagos',
  size: 'medium',
  locales: [DEFAULT_LOCALE_ID],
  currentLocaleId: DEFAULT_LOCALE_ID,
  dayStartTimestamp: Date.now(),
};

export const usePlanetStore = create<PlanetState>((set) => ({
  planets: [DEFAULT_PELAGOS],
  addPlanet: (p) => set((s) => ({ planets: [...s.planets, p] })),
  setPlanetSize: (planetId, size) =>
    set((s) => ({
      planets: s.planets.map((p) => (p.id === planetId ? { ...p, size } : p)),
    })),
  setDayStartTimestamp: (planetId, ts) =>
    set((s) => ({
      planets: s.planets.map((p) => (p.id === planetId ? { ...p, dayStartTimestamp: ts } : p)),
    })),
  setCurrentLocale: (planetId, localeId) =>
    set((s) => ({
      planets: s.planets.map((p) => (p.id === planetId ? { ...p, currentLocaleId: localeId } : p)),
    })),
}));
