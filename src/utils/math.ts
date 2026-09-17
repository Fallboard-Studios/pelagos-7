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

// ========================================
// STEP QUANTIZATION
// ========================================

/**
 * Rounds a value to the nearest point on the min + n*step grid.
 * @param value - Value to quantize
 * @param min - Grid origin
 * @param step - Grid spacing
 * @returns Nearest value on the grid
 */
export function quantizeToStep(value: number, min: number, step: number): number {
  return min + Math.round((value - min) / step) * step;
}
