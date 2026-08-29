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
  // If a global override is set, prefer that (sanitised at set time).
  if (GLOBAL_PLANET_SEED_OVERRIDE) return GLOBAL_PLANET_SEED_OVERRIDE;
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Module-level override that, when set, causes `derivePlanetSeed` to
// return the override for all planets. This is intentionally simple so
// existing callers don't need to change imports.
let GLOBAL_PLANET_SEED_OVERRIDE: string | null = null;

// Initialize override from a global var or the URL `?seed=` param (browser only).
if (typeof window !== 'undefined') {
  const bootOverride = (globalThis as unknown as { __GLOBAL_PLANET_SEED__?: string }).__GLOBAL_PLANET_SEED__ ?? null;
  const qsOverride = new URLSearchParams(window.location.search).get('seed');
  const initial = (typeof bootOverride === 'string' && bootOverride) ? bootOverride : qsOverride;
  if (initial) {
    GLOBAL_PLANET_SEED_OVERRIDE = String(initial).toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}

/**
 * Set or clear a global planet seed override.
 * Pass `null` to clear the override.
 */
export function setGlobalPlanetSeedOverride(seed: string | null): void {
  GLOBAL_PLANET_SEED_OVERRIDE = seed
    ? seed.toLowerCase().replace(/[^a-z0-9]/g, '')
    : null;
}

/**
 * Return the current global planet seed override, or `null` if none.
 */
export function getGlobalPlanetSeedOverride(): string | null {
  return GLOBAL_PLANET_SEED_OVERRIDE;
}

/**
 * Generate a fresh random alphanumeric planet name (lowercase a-z0-9, 8
 * chars). No lore/flavor generation yet — nothing in the UI displays the
 * planet name today; a lore-style generator can replace this later
 * (Sector Settings, roadmap Phase 5) without changing this function's
 * callers.
 */
export function generateRandomPlanetName(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Resolve the name to use for the app's default planet on load.
 *
 * If a global seed override is active (`?seed=`, `window.__GLOBAL_PLANET_SEED__`,
 * or `setGlobalPlanetSeedOverride`), returns that override deterministically —
 * preserving the override's documented purpose of reproducible bug
 * reports/screenshots end-to-end, not just for downstream data-key hashing.
 * Otherwise returns a fresh random name each call.
 */
export function resolveDefaultPlanetName(): string {
  const override = getGlobalPlanetSeedOverride();
  return override ?? generateRandomPlanetName();
}
