import { create } from 'zustand';
import type { LocaleState, Locale } from '../types/locale';

export const DEFAULT_LOCALE_ID = 'pelagos-default-locale';

export const DEFAULT_LOCALE: Locale = {
  id: DEFAULT_LOCALE_ID,
  planetId: 'pelagos',
  name: 'Pelagos - Default Locale',
  coordinates: { x: 0, y: 0 },
  robots: [],
  actors: [],
  settings: {},
  currentMeasure: 0,
};

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locales: { [DEFAULT_LOCALE_ID]: DEFAULT_LOCALE },
  addLocale: (planetId, locale) => {
    const toAdd = { ...locale, planetId };
    set((s) => ({ locales: { ...s.locales, [toAdd.id]: toAdd } }));
  },
  setLocaleData: (localeId, partial) =>
    set((s) => ({ locales: { ...s.locales, [localeId]: { ...s.locales[localeId], ...partial } } })),
  removeLocale: (localeId) =>
    set((s) => {
      const copy = { ...s.locales };
      delete copy[localeId];
      return { locales: copy };
    }),
  getLocaleById: (localeId) => get().locales[localeId],
}));
