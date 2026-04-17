export const PLANET_DURATION_MS: Record<'small' | 'medium' | 'large', number> = {
  small: 3 * 60_000,
  medium: 6 * 60_000,
  large: 9 * 60_000,
};

/**
 * Compute a locale's local time given a planet hour and longitude X (degrees).
 * Offset hours = longitudeX / 15 (15 degrees per hour).
 */
export function computeLocalTime(planetHour: number, longitudeX: number): number {
  const offsetHours = longitudeX / 15;
  const local = (planetHour + offsetHours + 24) % 24;
  return local;
}
