export const PLANET_DURATION_MS: Record<'small' | 'medium' | 'large', number> = {
  small: 3 * 60_000,
  medium: 6 * 60_000,
  large: 9 * 60_000,
};

/**
 * Derive a planet's current in-world hour directly from wall-clock time.
 * Pure function — no store read required. Safe to call on any planet at any
 * time regardless of whether it is currently mounted or "active".
 */
export function computePlanetHour(dayStartTimestamp: number, size: 'small' | 'medium' | 'large'): number {
  const elapsed = Date.now() - dayStartTimestamp;
  return (elapsed / PLANET_DURATION_MS[size]) * 24 % 24;
}

/**
 * Compute a locale's local time given a planet hour and longitude X (degrees).
 * Offset hours = longitudeX / 15 (15 degrees per hour).
 */
export function computeLocalTime(planetHour: number, longitudeX: number): number {
  const offsetHours = longitudeX / 15;
  const local = (planetHour + offsetHours + 24) % 24;
  return local;
}
