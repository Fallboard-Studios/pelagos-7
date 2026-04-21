// ========================================
// IMPORTS
// ========================================
import alea from 'alea';
import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';

import { derivePlanetSeed } from './seedUtils';

// ========================================
// REGISTRY (module-level, non-serialisable — must NOT be stored in Zustand)
// ========================================
const planetMaps = new Map<string, NoiseFunction2D>();
const localeMaps = new Map<string, NoiseFunction2D>();

// ========================================
// FUNCTIONS
// ========================================

/** Create (or return cached) the 2D noise map for a planet, keyed by planet ID. */
export function getPlanetNoiseMap(planetId: string, planetName: string): NoiseFunction2D {
  if (!planetMaps.has(planetId)) {
    const seed = derivePlanetSeed(planetName);
    planetMaps.set(planetId, createNoise2D(alea(seed)));
  }
  return planetMaps.get(planetId)!;
}

/**
 * Create (or return cached) the 2D noise map for a locale.
 *
 * The locale seed is derived by:
 *   1. Sampling the planet's noise map at the locale's coordinates (returns [-1, 1])
 *   2. Mapping that float to an integer in [0, 129,599] via localeCoordSeed
 *   3. Seeding createNoise2D with alea(integer)
 *
 * Two locales with identical coordinates on different planets will have
 * different noise maps because step 1 samples a planet-specific noise function.
 */
export function getLocaleNoiseMap(
  localeId: string,
  planetId: string,
  planetName: string,
  x: number,
  y: number,
): NoiseFunction2D {
  if (!localeMaps.has(localeId)) {
    const planetMap = getPlanetNoiseMap(planetId, planetName);
    const rawSeed = planetMap(x, y); // -1 to 1
    const intSeed = Math.round(((rawSeed + 1) / 2) * (360 * 360 - 1)); // 0–129,599
    localeMaps.set(localeId, createNoise2D(alea(intSeed)));
  }
  return localeMaps.get(localeId)!;
}

/**
 * Non-throwing getter for a locale noise map. Returns `null` if not present.
 * Useful for hot-path callers that must not crash when a locale isn't registered (e.g. AudioEngine).
 */
export function tryGetLocaleNoiseMap(localeId: string): NoiseFunction2D | null {
  return localeMaps.get(localeId) ?? null;
}

/** Remove a planet noise map from the registry (call when a planet is removed). */
export function evictPlanetNoiseMap(planetId: string): void {
  planetMaps.delete(planetId);
}

/** Remove a locale noise map from the registry (call when a locale is removed). */
export function evictLocaleNoiseMap(localeId: string): void {
  localeMaps.delete(localeId);
}
