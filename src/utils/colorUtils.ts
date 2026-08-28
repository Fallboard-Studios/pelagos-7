// ========================================
// TYPES
// ========================================

/**
 * Hue/Saturation/Lightness representation used throughout the app.
 * All values are percentages except hue which is 0..360.
 */
export interface HSL {
  h: number; // 0..360
  s: number; // 0..100
  l: number; // 0..100
}

/**
 * Per-instance color shift values applied to base colors.
 * Generated deterministically at spawn time using variant's colorRanges.
 */
export interface ColorShift {
  hueShift: number;   // Degrees to shift hue (-180 to +180 typical)
  satShift: number;   // Percentage points to shift saturation (-100 to +100)
}

// ========================================
// HELPERS
// ========================================

/**
 * Convert an HSL object into a CSS `hsl()`/`hsla()` string.
 *
 * @param hsl - the HSL value to serialize
 * @param alpha - optional opacity (0..1). Omitted entirely (not just falsy) keeps the existing
 *   `hsl()` format byte-identical for every existing caller — only a supplied alpha switches to
 *   `hsla()`. Useful for glow/box-shadow colors that need transparency.
 * @returns a string suitable for use as a fill/style value e.g. `"hsl(180, 50%, 20%)"` or
 *   `"hsla(180, 50%, 20%, 0.6)"`
 */
export function hslToString(hsl: HSL, alpha?: number): string {
  const { h, s, l } = hsl;
  return alpha === undefined ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
}

/**
 * Clamp a number to the inclusive range [min, max]. Useful when
 * adjusting saturation/brightness so values never escape 0..100.
 *
 * @param value - input value
 * @param min - minimum allowed
 * @param max - maximum allowed
 * @returns the clamped result
 */
export function clamp(value: number, min: number, max: number): number {
  // support inverted bounds by swapping them so the caller doesn't have
  // to check order manually.  This makes clamp(5,10,0) behave like
  // clamp(5,0,10).
  if (min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * Apply hue and saturation shift to an HSL color, returning a new HSL object.
 * Lightness is untouched — callers apply lightness multipliers separately.
 *
 * @param base - Base HSL color to shift
 * @param shift - Hue and saturation deltas
 * @returns A new HSL with shifted h and s values
 */
export function shiftHSL(base: HSL, shift: ColorShift): HSL {
  return {
    h: (base.h + shift.hueShift + 360) % 360,
    s: clamp(base.s + shift.satShift, 0, 100),
    l: base.l,
  };
}

/**
 * Add a flat lightness delta to an HSL color, clamped to [0, 100]. Hue and
 * saturation are untouched — pure lightness nudge, new object (never
 * mutates `base`).
 *
 * Distinct from shiftHSL/applyColorShift's own lightness handling
 * (multiplicative, applied by the caller separately) — this is an additive
 * delta, for callers that need to brighten/dim a color by a fixed amount
 * rather than scale it. Currently used by Factory.tsx to boost the AS's
 * (Attenuation Style's) contribution to a factory wall's base lightness, so
 * a hue shift stays legible even on a dark base color — see
 * docs/specs/ATTENUATION_STYLE.md §1.2.
 *
 * @param base  - Base HSL color
 * @param boost - Lightness delta in percentage points (positive brightens,
 *                negative dims)
 * @returns A new HSL object with `l` adjusted and clamped
 */
export function boostLightness(base: HSL, boost: number): HSL {
  return { ...base, l: clamp(base.l + boost, 0, 100) };
}

/**
 * Apply color shift and lightness multiplier to a base HSL color.
 * Used for per-instance factory color variation and day/night lighting.
 *
 * @param base - Base HSL color from variant config
 * @param shift - Hue and saturation shifts (deterministic per actor)
 * @param lMultiplier - Lightness multiplier (0-1 for darkening, >1 for brightening)
 * @returns CSS hsl() string ready for use in SVG fill/stroke
 */
export function applyColorShift(
  base: HSL,
  shift: ColorShift,
  lMultiplier: number,
): string {
  const h = (base.h + shift.hueShift + 360) % 360;

  const s = clamp(base.s + shift.satShift, 0, 100);

  // Apply lightness multiplier (e.g., 0.8 for darkening, 1.2 for brightening)
  const l = base.l * lMultiplier;

  return hslToString({ h, s, l });
}
