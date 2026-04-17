import type { Actor } from './Actor';
import type { Robot } from './Robot';

export interface LocaleCoordinates {
  x: number;
  y: number;
}

export interface Locale {
  id: string;
  planetId: string;
  name: string;
  coordinates: LocaleCoordinates;
  robots: Robot[];
  actors: Actor[];
  settings: Record<string, any>;
  currentMeasure: number;
}

export interface LocaleState {
  locales: Record<string, Locale>;
  addLocale: (planetId: string, locale: Locale) => void;
  setLocaleData: (localeId: string, partial: Partial<Locale>) => void;
  removeLocale: (localeId: string) => void;
  getLocaleById: (localeId: string) => Locale | undefined;
}
