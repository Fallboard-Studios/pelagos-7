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
 * Convert an HSL object into a CSS `hsl()` string.
 *
 * @param hsl - the HSL value to serialize
 * @returns a string suitable for use as a fill/style value e.g. `"hsl(180, 50%, 20%)"`
 */
export function hslToString(hsl: HSL): string {
  const { h, s, l } = hsl;
  return `hsl(${h}, ${s}%, ${l}%)`;
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
