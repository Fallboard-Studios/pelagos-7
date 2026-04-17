import { usePlanetStore } from '@/stores/planetStore';

export function getActiveLocaleId(): string {
  const planetState = usePlanetStore.getState();
  const p = planetState.planets[0];
  // Return empty string when no active locale is available; callers should handle this.
  return p?.currentLocaleId ?? '';
}
