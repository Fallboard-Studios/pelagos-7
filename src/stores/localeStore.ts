import { create } from 'zustand';

import type { Locale, LocaleState } from '../types/locale';
import { DEFAULT_LOCALE_ID } from './planetStore';

const DEFAULT_LOCALE: Locale = {
  id: DEFAULT_LOCALE_ID,
  planetId: 'pelagos',
  name: 'Pelagos Ocean',
  coordinates: { x: 0, y: 0 },
  robots: [],
  actors: [],
  settings: { bpm: 240, maxRobots: 12, minRobots: 2 },
  currentMeasure: 0,
};

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locales: { [DEFAULT_LOCALE_ID]: DEFAULT_LOCALE },

  addLocale: (planetId, locale) => {
    const toAdd: Locale = { ...locale, planetId };
    set((state) => ({ locales: { ...state.locales, [toAdd.id]: toAdd } }));
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
  },

  getLocaleById: (localeId) => get().locales[localeId],
}));

export default useLocaleStore;
export { DEFAULT_LOCALE };
export { DEFAULT_LOCALE_ID };
