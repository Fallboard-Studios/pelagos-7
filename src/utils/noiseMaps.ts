// ========================================
// IMPORTS
// ========================================
import alea from 'alea';
import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';

import { derivePlanetSeed, getGlobalPlanetSeedOverride } from './seedUtils';

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
 * The locale seed is derived directly from the locale's own coordinates —
 * `alea(`${x}:${y}`)` — with no dependency on any planet. Two locales with
 * identical coordinates will have IDENTICAL noise maps regardless of which
 * planet either one is on. This is a deliberate reversal of the old
 * planet-coupled derivation (see docs/PROCEDURAL_GENERATION.md) and, as a
 * side effect, structurally eliminates the old dead-zone bug: because
 * derivation never samples simplex noise AT (x, y) — it only hashes the
 * coordinate pair as a string, the same way derivePlanetSeed hashes a
 * planet name — there is no lattice-alignment geometry left to collapse.
 *
 * `x` and `y` are two independent inputs for the caller to reason about,
 * but they are concatenated into exactly ONE seed value here — never fed
 * as two separate dimensions. The `:` separator is required, not
 * stylistic: bare concatenation (`${x}${y}`) would let two different
 * coordinate pairs collide onto the same string (x=1,y=23 and x=12,y=3
 * both stringify to "123").
 */
export function getLocaleNoiseMap(
  localeId: string,
  x: number,
  y: number,
): NoiseFunction2D {
  if (!localeMaps.has(localeId)) {
    const global = getGlobalPlanetSeedOverride();
    const key = global ? `${global}:${x}:${y}` : `${x}:${y}`;
    localeMaps.set(localeId, createNoise2D(alea(key)));
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
