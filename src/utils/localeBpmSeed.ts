// ========================================
// IMPORTS
// ========================================
import { getLocaleNoiseMap } from './noiseMaps';
import { getSeededVal } from './getSeededVal';

// ========================================
// FUNCTIONS
// ========================================

/**
 * BPM's own seeded-default range — [40, 100] as integer BPM, a slower/
 * contemplative band fitting the ambient ocean soundscape, confirmed
 * directly with the user. docs/specs/BPM_CONTROL.md §1.2. Freely draggable
 * across the wider [20, 200] Audio Rig slider range afterward (§1.4).
 */
export const LOCALE_BPM_SEED_RANGE = { min: 40, max: 100 };

/**
 * Generate the deterministic audio BPM for a locale, sampled from that
 * locale's own noise map (getLocaleNoiseMap — coordinate-derived, no
 * Attenuation Style dependency, per LOCALE_SEED_DECOUPLING.md). Rounded to
 * the nearest integer — BPM precision is integer-only (docs/specs/
 * BPM_CONTROL.md §1.2). A pure function: never stored on the Locale object
 * itself, called fresh at each of the two seeding call sites
 * (docs/specs/BPM_CONTROL.md §1.3).
 */
export function generateLocaleBpm(localeId: string, x: number, y: number): number {
  const noiseMap = getLocaleNoiseMap(localeId, x, y);
  const raw = getSeededVal(noiseMap, 'locale.bpm', 0, LOCALE_BPM_SEED_RANGE.min, LOCALE_BPM_SEED_RANGE.max);
  return Math.round(raw);
}
