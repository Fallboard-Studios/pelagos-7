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
  maxRobots?: number;
  minRobots?: number;
  /** Whether robots spawn automatically on a timer. Default: true. */
  autoSpawn?: boolean;
  /** Spawn frequency in measures. Default: 4. */
  spawnFrequency?: number;
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
  /**
   * Link a child robot to a parent robot. Both must be in the same locale.
   * Rejects cross-locale links and cycles. Returns false if the link would
   * create a cycle or if either robot is not found.
   */
  linkRobot: (localeId: string, childId: string, parentId: string) => boolean;
  /**
   * Unlink a child robot from its parent. The child keeps its last inherited
   * values as its new standalone state.
   */
  unlinkRobot: (localeId: string, childId: string) => void;
}
