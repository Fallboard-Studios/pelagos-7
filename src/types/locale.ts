import type { Actor } from './Actor';
import type { Robot } from './Robot';
import type { Company } from './Company';

export interface LocaleCoordinates {
  x: number;
  y: number;
}

export interface Locale {
  id: string;
  planetId: string;
  name: string;
  coordinates: LocaleCoordinates;
  /** Wall-clock timestamp this locale's in-world day began. Computed once at
   *  build time from the locale's own x coordinate — see
   *  docs/specs/ATTENUATION_STYLE.md §1.1. Moved here from Planet. */
  dayStartTimestamp: number;
  robots: Robot[];
  actors: Actor[];
  companies: Company[];
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
  // Company helpers (Roadmap Phase 10) — mirrors the Robot helpers' shape exactly.
  addCompany: (localeId: string, company: Company) => void;
  updateCompany: (localeId: string, companyId: string, updates: Partial<Company>) => void;
  /** Clears companyId on every former member (they become Freelance) before removing the
   *  company itself — mirrors removeLocale's per-robot-cleanup-before-removal shape. */
  removeCompany: (localeId: string, companyId: string) => void;
  getCompanyById: (localeId: string, companyId: string) => Company | undefined;
  getCompanyMembers: (localeId: string, companyId: string) => Robot[];
  /** One atomic transition: moves a robot between companies (or to/from Freelance when
   *  companyId is null), updating the robot's own companyId and both the old and new
   *  company's robotIds together — not composed from separate updateRobot/updateCompany
   *  calls at the call site. */
  assignRobotToCompany: (localeId: string, robotId: string, companyId: string | null) => void;
}
