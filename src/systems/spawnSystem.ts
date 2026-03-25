// ========================================
// IMPORTS
// ========================================
import type { Vec2 } from '../types/Vec2';
import type { Robot, AudioAttributes, SynthType } from '../types/Robot';
import { RobotState } from '../types/Robot';
import { generateMelodyForRobot } from '../engine/melodyGenerator';
import { AudioEngine } from '../engine/AudioEngine';
import { scheduleRepeat, cancelSchedule } from '../engine/beatClock';
import { DEV_TUNING } from '../constants';
import { useOceanStore } from '../stores/oceanStore';

// ========================================
// CONSTANTS
// ========================================
/** Spawn interval range in measures; a value is chosen randomly on each scheduler start. */
const SPAWN_INTERVAL_MIN = 32;
const SPAWN_INTERVAL_MAX = 48;

const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
/** Distance outside the SVG viewBox where robots spawn before swimming on-screen. */
const OFFSCREEN_OFFSET = 150;

// ADSR ranges (typical synth values)
const ATTACK_RANGE = { min: 0.01, max: 0.5 };
const DECAY_RANGE = { min: 0.1, max: 1.5 };
const SUSTAIN_RANGE = { min: 0.3, max: 0.9 };
const RELEASE_RANGE = { min: 0.2, max: 1.2 };

// Pitch ranges (Hz) - determines robot scale
const PITCH_RANGES = [
  { min: 80, max: 150 },   // Low (large robots)
  { min: 250, max: 450 },  // Mid (normal robots)
  { min: 700, max: 900 },  // High (small robots)
];

// Filter frequency range
const FILTER_FREQ_RANGE = { min: 400, max: 2500 };

// Master volume range: keep robots below full saturation
const MASTER_VOLUME_MIN = 0.65;
const MASTER_VOLUME_MAX = 0.85;

// Synth types
const SYNTH_TYPES: SynthType[] = [
  'AMSynth',
  'FMSynth',
  'PolySynth',
  'DuoSynth',
];

// ========================================
// MODULE STATE
// ========================================
let spawnScheduleId: string | null = null;

// ========================================
// EXPORTS
// ========================================

/**
 * Start the periodic robot spawn scheduler.
 * Picks a random interval between SPAWN_INTERVAL_MIN and SPAWN_INTERVAL_MAX measures,
 * then schedules a repeating callback via BeatClock. Idempotent — safe to call
 * multiple times; only one schedule will be active at a time.
 */
export function startSpawnScheduler(): void {
  if (spawnScheduleId !== null) {
    if (DEV_TUNING) console.log('[SpawnSystem] Scheduler already running, skipping start');
    return;
  }

  const interval =
    SPAWN_INTERVAL_MIN + Math.floor(Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN + 1));

  spawnScheduleId = scheduleRepeat(`${interval}m`, () => {
    spawnRobot();
  });

  if (DEV_TUNING) console.log(`[SpawnSystem] Scheduler started with interval ${interval}m`);
}

/**
 * Stop the periodic robot spawn scheduler.
 * Cancels the active BeatClock schedule and clears the stored ID.
 * Idempotent — safe to call when no scheduler is running.
 */
export function stopSpawnScheduler(): void {
  if (spawnScheduleId === null) {
    if (DEV_TUNING) console.log('[SpawnSystem] Scheduler not running, nothing to stop');
    return;
  }

  cancelSchedule(spawnScheduleId);
  spawnScheduleId = null;

  if (DEV_TUNING) console.log('[SpawnSystem] Scheduler stopped');
}

/**
 * Generate a spawn position just outside the visible SVG viewBox.
 * Robots are invisible here (SVG clips to viewBox) and swim inward on their
 * first idle tick, creating a natural "swimming on-screen" entrance.
 */
export function generateSpawnPosition(): Vec2 {
  const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left

  switch (edge) {
    case 0: // Top edge — spawn above the scene
      return {
        x: Math.random() * WORLD_WIDTH,
        y: -OFFSCREEN_OFFSET - Math.random() * 50,
      };
    case 1: // Right edge — spawn to the right of the scene
      return {
        x: WORLD_WIDTH + OFFSCREEN_OFFSET + Math.random() * 50,
        y: Math.random() * WORLD_HEIGHT,
      };
    case 2: // Bottom edge — spawn below the scene
      return {
        x: Math.random() * WORLD_WIDTH,
        y: WORLD_HEIGHT + OFFSCREEN_OFFSET + Math.random() * 50,
      };
    case 3: // Left edge — spawn to the left of the scene
    default:
      return {
        x: -OFFSCREEN_OFFSET - Math.random() * 50,
        y: Math.random() * WORLD_HEIGHT,
      };
  }
}

/**
 * Generate random audio attributes
 * Controls both sound synthesis and visual appearance
 */
export function generateAudioAttributes(): AudioAttributes {
  // Random synth type
  const synthType = SYNTH_TYPES[Math.floor(Math.random() * SYNTH_TYPES.length)];

  // Random ADSR envelope
  const adsr = {
    attack: ATTACK_RANGE.min + Math.random() * (ATTACK_RANGE.max - ATTACK_RANGE.min),
    decay: DECAY_RANGE.min + Math.random() * (DECAY_RANGE.max - DECAY_RANGE.min),
    sustain: SUSTAIN_RANGE.min + Math.random() * (SUSTAIN_RANGE.max - SUSTAIN_RANGE.min),
    release: RELEASE_RANGE.min + Math.random() * (RELEASE_RANGE.max - RELEASE_RANGE.min),
  };

  // Random pitch range (determines visual scale)
  const pitchRange = PITCH_RANGES[Math.floor(Math.random() * PITCH_RANGES.length)];

  // Random filter frequency (determines detail level)
  const filterFreq =
    FILTER_FREQ_RANGE.min +
    Math.random() * (FILTER_FREQ_RANGE.max - FILTER_FREQ_RANGE.min);

  // Random reverb amount
  const reverb = Math.random();

  return {
    synthType,
    adsr,
    pitchRange,
    filterFreq,
    reverb,
  };
}

/**
 * Pick an octave range [min, max] for a robot based on its pitch bucket.
 * Low  robots (< 150 Hz) → [2, 3] — bass register
 * Mid  robots (< 450 Hz) → [3, 4] — mid register
 * High robots (≥ 450 Hz) → [4, 5] — treble register
 */
export function pickOctaveRange(pitchRange: { min: number; max: number }): [number, number] {
  if (pitchRange.max < 150) return [2, 3];
  if (pitchRange.max < 450) return [3, 4];
  return [4, 5];
}

/**
 * Spawn a new robot with randomized attributes
 * Enforces MAX_ROBOTS limit and registers melody with AudioEngine
 */
export function spawnRobot(): void {
  const { robots, settings } = useOceanStore.getState();

  // If at or above max, remove oldest robot instead of spawning.
  // This causes the population to "bounce" between min and max limits.
  if (robots.length >= settings.maxRobots) {
    if (robots.length > settings.minRobots) {
      // find the oldest robot by creation timestamp
      let oldest = robots[0];
      for (const r of robots) {
        if (r.createdAt < oldest.createdAt) {
          oldest = r;
        }
      }
      useOceanStore.getState().removeRobot(oldest.id);
      if (DEV_TUNING) {
        console.log(`[SpawnSystem] Max robots reached, removed oldest ${oldest.id}`);
      }
    } else {
      if (DEV_TUNING) {
        console.log(`[SpawnSystem] At minRobots (${settings.minRobots}); no removal performed`);
      }
    }
    return;
  }

  // Generate audio attributes first so octaveRange can be derived and passed to melody generator
  const audioAttributes = generateAudioAttributes();
  const octaveRange = pickOctaveRange(audioAttributes.pitchRange);

  const robot: Robot = {
    id: crypto.randomUUID(),
    state: RobotState.Idle,
    position: generateSpawnPosition(),
    destination: null,
    direction: 'right', // Default facing direction (will be updated by idleSystem)
    melody: generateMelodyForRobot({ octaveRange }),
    audioAttributes,
    octaveRange,
    masterVolume: MASTER_VOLUME_MIN + Math.random() * (MASTER_VOLUME_MAX - MASTER_VOLUME_MIN),
    createdAt: Date.now(),
  };

  // Add to store
  useOceanStore.getState().addRobot(robot);

  // Register melody with AudioEngine
  // Reserve a voice for this robot (best-effort) so its timbre/adsr are isolated
  try {
    AudioEngine.reserveVoice(robot.id, robot.audioAttributes.synthType as string);
  } catch (err) {
    if (DEV_TUNING) console.warn('[SpawnSystem] reserveVoice failed', err);
  }
  AudioEngine.registerRobotMelody(robot.id, robot.melody);

  if (DEV_TUNING) {
    console.log(`[Spawn] Robot ${robot.id} spawned with ${robot.melody.length} melody events`);
  }
}
