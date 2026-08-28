/** Fixed real-world duration of one in-world day, universal — replaces the
 *  old three-entry (small/medium/large) PLANET_DURATION_MS table now that
 *  PlanetSize no longer exists. */
export const DAY_DURATION_MS = 6 * 60_000;

/**
 * Derive a locale's current in-world hour (float, 0-24) directly from its
 * own dayStartTimestamp. Pure function — no store read required. Replaces
 * computePlanetHour (no size parameter — there is only one duration now)
 * and folds in what computeLocalTime's longitude-offset composition used to
 * do separately: the x-dependency is already baked into dayStartTimestamp
 * at locale-build time (see worldTransition.ts's buildLocale), so there is
 * no second offset step left to apply.
 */
export function computeLocaleHour(dayStartTimestamp: number): number {
  const elapsed = Date.now() - dayStartTimestamp;
  return ((elapsed / DAY_DURATION_MS) * 24 % 24 + 24) % 24;
}
