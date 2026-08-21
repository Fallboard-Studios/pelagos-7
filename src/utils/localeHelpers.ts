import { usePlanetStore, selectCurrentPlanet } from '@/stores/planetStore';

export function getActiveLocaleId(): string {
  const planetState = usePlanetStore.getState();
  const p = selectCurrentPlanet(planetState);
  return p?.currentLocaleId ?? '';
}
