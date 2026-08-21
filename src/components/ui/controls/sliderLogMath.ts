/**
 * Logarithmic-scale mapping for SliderLog, resolving docs/tasks/
 * ARCHITECTURE_AND_COMPONENTS_PLAN.md Task 10. A pure `value = min *
 * (max/min)^t` exponential is undefined at `min = 0` (Attack/Decay/Release
 * all start at 0s), so this uses an epsilon-floor curve instead: t = 0 maps
 * to exactly min (including min = 0), otherwise the value follows a genuine
 * log curve from a small floor up to max.
 */

export const LOG_EPSILON = 0.001;

function getFloor(min: number): number {
  return Math.max(min, LOG_EPSILON);
}

/** value -> t. value <= min maps to exactly t = 0. */
export function sliderLogValueToT(value: number, min: number, max: number): number {
  if (value <= min) return 0;
  const floor = getFloor(min);
  return Math.log(value / floor) / Math.log(max / floor);
}

/** t -> value. t <= 0 maps to exactly min (including the min = 0 case). */
export function sliderLogTToValue(t: number, min: number, max: number): number {
  if (t <= 0) return min;
  const floor = getFloor(min);
  return floor * Math.pow(max / floor, t);
}
