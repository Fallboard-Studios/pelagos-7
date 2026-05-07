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