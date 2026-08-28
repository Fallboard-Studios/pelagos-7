export interface Planet {
  id: string;
  name: string;
  locales: string[];
  currentLocaleId?: string;
}

export interface PlanetState {
  planets: Planet[];
  addPlanet: (p: Planet) => void;
  removePlanet: (planetId: string) => void;
  setCurrentLocale: (planetId: string, localeId: string) => void;
}
