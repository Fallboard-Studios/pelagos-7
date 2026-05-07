// ========================================
// IMPORTS
// ========================================
import alea from 'alea';
import type { NoiseFunction2D } from 'simplex-noise';
import { getGlobalPlanetSeedOverride } from './seedUtils';

// ========================================
// FUNCTIONS
// ========================================

/**
 * Convert a stable dataId string into a deterministic float in [0, 1].
 * This is the x-axis value passed to a noise map for a given data key.
 *
 * **Hot-path callers (e.g. AudioEngine scheduling) must call this ONCE at
 * module scope and cache the result.** `alea(dataId)()` involves string
 * hashing — calling it hundreds of times per second is measurably slower
 * than Math.random() and can delay the Tone.js scheduling callback.
 *
 * Pattern for audio hot paths:
 *   // module scope — computed once at import time:
 *   const MY_KEY_X = precomputeDataX('my.data.key');
 *
 *   // inside the hot path:
 *   const value = noiseMap(MY_KEY_X, offset);
 */
export function precomputeDataX(dataId: string): number {
  const global = getGlobalPlanetSeedOverride();
  const key = global ? `${global}:${dataId}` : dataId;
  return alea(key)();
}

/**
 * Sample a locale noise map at a deterministic (dataId, offset) position
 * and map the [-1, 1] result to [min, max].
 *
 * **Do not call this on the audio scheduling hot path.** Use
 * `precomputeDataX` to cache the x value at module scope and call
 * `noiseMap(x, offset)` directly inside the scheduling callback.
 *
 * @param noiseMap  The locale's 2D noise function (from noiseMaps registry)
 * @param dataId    A stable, unique string key — use the Zustand state key path
 *                  (e.g. 'robots.audioAttributes.waveform') so values are
 *                  consistent across app instances
 * @param offset    Array index for per-element variation (e.g. robot spawn order); default 0
 * @param min       Output range minimum; default 0
 * @param max       Output range maximum; default 1
 */
export function getSeededVal(
  noiseMap: NoiseFunction2D,
  dataId: string,
  offset = 0,
  min = 0,
  max = 1,
): number {
  const x = precomputeDataX(dataId);
  const raw = noiseMap(x, offset); // simplex noise in [-1, 1]
  return min + ((raw + 1) / 2) * (max - min);
}
