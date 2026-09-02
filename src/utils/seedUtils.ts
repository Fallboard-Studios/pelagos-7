// ========================================
// IMPORTS
// ========================================
// (none — pure string/math utilities)

// ========================================
// FUNCTIONS
// ========================================

/**
 * Derive a stable Attenuation Style seed string from its display name.
 * Lowercases, strips any character that is not a-z or 0-9.
 * E.g. "Pelagos 7!" → "pelagos7"
 */
export function deriveAttenuationStyleSeed(name: string): string {
  // If a global override is set, prefer that (sanitised at set time).
  if (GLOBAL_ATTENUATION_STYLE_SEED_OVERRIDE) return GLOBAL_ATTENUATION_STYLE_SEED_OVERRIDE;
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Module-level override that, when set, causes `deriveAttenuationStyleSeed`
// to return the override for every Attenuation Style. This is intentionally
// simple so existing callers don't need to change imports.
let GLOBAL_ATTENUATION_STYLE_SEED_OVERRIDE: string | null = null;

// Initialize override from a global var or the URL `?seed=` param (browser only).
if (typeof window !== 'undefined') {
  const bootOverride = (globalThis as unknown as { __GLOBAL_ATTENUATION_STYLE_SEED__?: string }).__GLOBAL_ATTENUATION_STYLE_SEED__ ?? null;
  const qsOverride = new URLSearchParams(window.location.search).get('seed');
  const initial = (typeof bootOverride === 'string' && bootOverride) ? bootOverride : qsOverride;
  if (initial) {
    GLOBAL_ATTENUATION_STYLE_SEED_OVERRIDE = String(initial).toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}

/**
 * Set or clear the global Attenuation Style seed override.
 * Pass `null` to clear the override.
 */
export function setGlobalAttenuationStyleSeedOverride(seed: string | null): void {
  GLOBAL_ATTENUATION_STYLE_SEED_OVERRIDE = seed
    ? seed.toLowerCase().replace(/[^a-z0-9]/g, '')
    : null;
}

/**
 * Return the current global Attenuation Style seed override, or `null` if none.
 */
export function getGlobalAttenuationStyleSeedOverride(): string | null {
  return GLOBAL_ATTENUATION_STYLE_SEED_OVERRIDE;
}

/**
 * Generate a fresh random alphanumeric Attenuation Style name (lowercase
 * a-z0-9, 8 chars). No lore/flavor generation yet — nothing in the UI
 * displays the raw name today; a lore-style generator can replace this
 * later (Sector Settings, roadmap Phase 5) without changing this function's
 * callers.
 */
export function generateRandomAttenuationStyleName(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * A random integer coordinate — one axis of a locale coordinate pair. No
 * seed/reproducibility contract applies to locale coordinates the way
 * `resolveDefaultAttenuationStyleName`'s override does for the Attenuation
 * Style name: coordinates are already a freely user-driven axis everywhere
 * else in the app (Sector Settings' own "Random" coordinate button has
 * always called exactly this, ungated by any seed override), so the
 * default locale's own starting coordinates follow the same rule. Range is
 * arbitrary but generous enough to feel like "a different plot," not a
 * variation on the current one.
 */
export function randomCoordinate(): number {
  return Math.round((Math.random() - 0.5) * 400);
}

/**
 * Resolve the name to use for the app's default Attenuation Style on load.
 *
 * If a global seed override is active (`?seed=`,
 * `window.__GLOBAL_ATTENUATION_STYLE_SEED__`, or
 * `setGlobalAttenuationStyleSeedOverride`), returns that override
 * deterministically — preserving the override's documented purpose of
 * reproducible bug reports/screenshots end-to-end, not just for downstream
 * data-key hashing. Otherwise returns a fresh random name each call.
 */
export function resolveDefaultAttenuationStyleName(): string {
  const override = getGlobalAttenuationStyleSeedOverride();
  return override ?? generateRandomAttenuationStyleName();
}
