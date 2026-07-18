export const MAX_ROBOTS = 12;

/**
 * World dimensions (SVG viewBox)
 */
export const WORLD_WIDTH = 1920;
export const WORLD_HEIGHT = 1080;

/**
 * Development tuning flag for verbose logging
 * Logs spawn events, melody registration, and other debug info
 */
export const DEV_TUNING = import.meta.env.DEV;

/**
 * Default scheduling lookahead applied when scheduling notes (seconds).
 * Typical values: 0.05–0.1 (50–100ms). AudioEngine defaults to 0.1s.
 */
export const MIN_LEAD = 0.1;

/**
 * Mapping from planet size to real-world milliseconds per full in-world day.
 * Small: 3 minutes, Medium: 6 minutes, Large: 9 minutes.
 */
export { PLANET_DURATION_MS, computeLocalTime } from './time';

/**
 * Valid ranges for robot melody-generation parameters. Shared source of truth
 * for melodyGenerator.ts's clamping, localeStore.ts's updateRobot validation,
 * and the Robot Audio editor's sliders — keep these in sync across all three.
 */
export const RHYTHMIC_DENSITY_MIN = 4;
export const RHYTHMIC_DENSITY_MAX = 12;
export const RHYTHMIC_MOTIF_LENGTH_MIN = 1;
export const RHYTHMIC_MOTIF_LENGTH_MAX = 16;
export const NOTE_VARIANCE_MIN = 0;
export const NOTE_VARIANCE_MAX = 8;
export const OCTAVE_RANGE_MIN = 1;
export const OCTAVE_RANGE_MAX = 7;