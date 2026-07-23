import { usePlanetStore } from '@/stores/planetStore';

export function getActiveLocaleId(): string {
  const planetState = usePlanetStore.getState();
  const p = planetState.planets[0];
  return p?.currentLocaleId ?? '';
}
