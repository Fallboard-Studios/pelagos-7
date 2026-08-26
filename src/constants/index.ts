import type { JobType } from '../types/Robot';

/** Fixed roster size — every locale spawns exactly this many robots once, at load. */
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
 *
 * `rhythmicDensity` is a 0-100% fill rate (not an onset count). `rhythmicMotifLength`
 * and `noteVariance` are both `{ active: boolean; value: number }` — MIN/MAX below
 * bound the nested `value`, 1-8 for both. `active: false` is the sole "off" state for
 * each; `value` itself has no reachable "off"/magic-zero meaning.
 */
export const RHYTHMIC_DENSITY_MIN = 0;
export const RHYTHMIC_DENSITY_MAX = 100;
export const RHYTHMIC_MOTIF_LENGTH_MIN = 1;
export const RHYTHMIC_MOTIF_LENGTH_MAX = 8;
export const NOTE_VARIANCE_MIN = 1;
export const NOTE_VARIANCE_MAX = 8;
export const OCTAVE_RANGE_MIN = 1;
export const OCTAVE_RANGE_MAX = 7;

/**
 * Robot Systems Engine (Roadmap Phase 7) — Battery/Docking/Job lifecycle constants.
 * See docs/specs/ROBOT_SYSTEMS_ENGINE.md and src/systems/robotSystems.ts.
 */

/** Seeded count of robots that start Active (rest start Docked) when a locale's roster is created. */
export const INITIAL_ACTIVE_ROBOTS_MIN = 2;
export const INITIAL_ACTIVE_ROBOTS_MAX = 4;

/** Battery drain, percent per measure, while a robot is Active — before any job surcharge. */
export const BATTERY_DRAIN_BASE = 2;

/** Additional percent-per-measure drain while Active, on top of BATTERY_DRAIN_BASE, by job type. */
export const JOB_BATTERY_DRAIN_SURCHARGE: Record<JobType, number> = {
  ventExtraction: 1,
  acousticSurvey: 3,
  structuralInspection: 5,
  fluidMonitoring: 7,
};

/** Battery recharge, percent per measure, while a robot is Docked — flat, same for every robot. */
export const BATTERY_RECHARGE_RATE = 5;

/** Active robot at or below this battery level begins Departing (recall to dock). */
export const BATTERY_CRITICAL_THRESHOLD = 10;
/** Docked robot at or above this battery level begins Docking (redeploy-eligible). */
export const BATTERY_FULL_THRESHOLD = 100;

/** Fraction of a robot's melody events whose pitch (noteIndex only) re-rolls each time it lands on Docked. */
export const DOCKED_PITCH_DRIFT_RATIO = 0.25;

/** Roster-balancing cap: at most this many robots may hold the same job type at once. */
export const JOB_MAX_ROBOTS_PER_TYPE = 3;