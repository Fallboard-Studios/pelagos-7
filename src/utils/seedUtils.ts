// ========================================
// IMPORTS
// ========================================
// (none — pure string/math utilities)

// ========================================
// FUNCTIONS
// ========================================

/**
 * Derive a stable planet seed string from the planet's display name.
 * Lowercases, strips any character that is not a-z or 0-9.
 * E.g. "Pelagos 7!" → "pelagos7"
 */
export function derivePlanetSeed(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Compute the planet's deterministic initial in-world hour (integer 0–23)
 * from the planet seed.
 *
 * Algorithm: convert each letter in the seed to its 0-based index (a=0 … z=25),
 * take the floor of the average. If the result is outside [0, 23] (possible if
 * all characters are digits), fall back to 0.
 */
export function planetInitialHour(seed: string): number {
  const letters = seed.replace(/[^a-z]/g, '');
  if (!letters.length) return 0;
  const avg =
    letters.split('').reduce((sum, ch) => sum + (ch.charCodeAt(0) - 97), 0) /
    letters.length;
  const hour = Math.floor(avg);
  return hour >= 0 && hour <= 23 ? hour : 0;
}

/**
 * Convert a locale's (x, y) integer coordinates into a unique seed integer.
 *
 * Coordinates are assumed to be integers in the range -179…179.
 * The total number of distinct (x, y) pairs is 359 × 359 = 128,881.
 * Using 360 × 360 = 129,600 as the upper-bound constant is safe and
 * slightly conservative (128,881 < 129,600).
 *
 * The resulting integer is then passed to `alea()` to seed the locale
 * noise map via `createNoise2D(alea(localeCoordSeed(x, y)))`.
 */
export function localeCoordSeed(x: number, y: number): number {
  return (x + 180) * 360 + (y + 180); // 0 … 129,599
}
