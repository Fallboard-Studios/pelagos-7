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
  settings: LocaleSettings;
  currentMeasure: number;
}

export interface LocaleSettings {
  bpm?: number;
  [key: string]: unknown;
}

export interface LocaleState {
  locales: Record<string, Locale>;
  addLocale: (planetId: string, locale: Locale) => void;
  setLocaleData: (localeId: string, partial: Partial<Locale>) => void;
  removeLocale: (localeId: string) => void;
  getLocaleById: (localeId: string) => Locale | undefined;
  // Robot helpers
  addRobot: (localeId: string, robot: Robot) => void;
  updateRobot: (localeId: string, robotId: string, updates: Partial<Robot>) => void;
  removeRobot: (localeId: string, robotId: string) => void;
  getRobotById: (localeId: string, robotId: string) => Robot | undefined;
}
