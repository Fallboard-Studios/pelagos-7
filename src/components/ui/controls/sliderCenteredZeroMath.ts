/**
 * Zero-anchored fill math for SliderCenteredZero, resolving docs/tasks/
 * ARCHITECTURE_AND_COMPONENTS_PLAN.md Task 11. Radix's own Slider.Range
 * fills from the track start, not from a center zero-point, so this
 * computes a custom fill rectangle spanning from the zero point to the
 * thumb's position instead. The zero point is computed generally —
 * `(0 - min) / (max - min) * 100%` — not hardcoded to 50%, so it still
 * works for asymmetric bounds (e.g. -20/+50).
 *
 * These percentages are axis-agnostic (docs/specs/VERTICAL_SLIDERS.md §1.3):
 * 0% is always schema.min, 100% is always schema.max, regardless of which
 * screen axis the value travels along. SliderCenteredZero.tsx reuses the
 * same { left, width } numbers unchanged for the vertical orientation,
 * applying them as bottom/height instead — no separate vertical variant of
 * this math exists or is needed.
 */

export interface FillRect {
  /** Left edge of the fill, as a percentage of track width (0-100). */
  left: number;
  /** Width of the fill, as a percentage of track width (0-100). */
  width: number;
}

/** The zero point's track position, as a percentage of track width (0-100). */
export function zeroPointPercent(min: number, max: number): number {
  return ((0 - min) / (max - min)) * 100;
}

/** A value's track position, as a percentage of track width (0-100). */
export function valuePercent(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100;
}

/** The fill rectangle spanning from the zero point to the value's position. */
export function computeFillRect(value: number, min: number, max: number): FillRect {
  const zero = zeroPointPercent(min, max);
  const at = valuePercent(value, min, max);
  return {
    left: Math.min(zero, at),
    width: Math.abs(at - zero),
  };
}
