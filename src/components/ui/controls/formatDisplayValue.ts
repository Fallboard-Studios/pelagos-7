/**
 * Round a control's displayed value to at most 3 decimal places — used by
 * every primitive that shows a raw number next to a slider/stepper
 * (SliderLinear, SliderLog, SliderCenteredZero, Stepper). Rounds rather than
 * truncates or pads: a whole number still shows as "5", not "5.000" — this
 * exists to hide floating-point noise (log-scale math, repeated range
 * conversions) that can otherwise surface as e.g. "4999.999999999999Hz",
 * not to force every value onto a fixed-width decimal format.
 *
 * Display-only: the underlying value passed to onChange/stored in Zustand
 * stays full precision. Only the human-readable label is capped.
 */
export function formatDisplayValue(value: number): number {
  return Math.round(value * 1000) / 1000;
}
