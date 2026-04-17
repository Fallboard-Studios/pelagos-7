export type PlanetSize = 'small' | 'medium' | 'large';

export interface Planet {
  id: string;
  name: string;
  size: PlanetSize;
  locales: string[];
  currentLocaleId?: string;
  dayStartTimestamp: number;
  currentHour?: number;
}

export interface PlanetState {
  planets: Planet[];
  addPlanet: (p: Planet) => void;
  removePlanet: (planetId: string) => void;
  setPlanetSize: (planetId: string, size: PlanetSize) => void;
  setDayStartTimestamp: (planetId: string, ts: number) => void;
  setCurrentHour: (planetId: string, hour: number) => void;
  setCurrentLocale: (planetId: string, localeId: string) => void;
}
