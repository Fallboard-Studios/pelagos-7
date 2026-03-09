// ========================================
// LINEAR INTERPOLATION
// ========================================

/**
 * Linear interpolation between two values.
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0-1)
 * @returns Interpolated value between a and b
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
