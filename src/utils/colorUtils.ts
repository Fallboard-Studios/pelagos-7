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
