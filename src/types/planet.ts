export type PlanetSize = 'small' | 'medium' | 'large';

export interface Planet {
  id: string;
  name: string;
  size: PlanetSize;
  locales: string[];
  currentLocaleId?: string;
  dayStartTimestamp: number;
}

export interface PlanetState {
  planets: Planet[];
  addPlanet: (p: Planet) => void;
  setPlanetSize: (planetId: string, size: PlanetSize) => void;
  setDayStartTimestamp: (planetId: string, ts: number) => void;
  setCurrentLocale: (planetId: string, localeId: string) => void;
}
