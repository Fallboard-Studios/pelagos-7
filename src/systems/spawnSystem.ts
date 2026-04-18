// ========================================
// IMPORTS
// ========================================
import type { Vec2 } from '../types/Vec2';
import type { Robot, AudioAttributes, SynthType, WaveformType } from '../types/Robot';
import { RobotState } from '../types/Robot';
import { generateMelodyForRobot } from '../engine/melodyGenerator';
import { AudioEngine } from '../engine/AudioEngine';
import type { LayeredWave, LayerDescriptor } from '../types/layeredAudio';
import { scheduleRepeat, cancelSchedule } from '../engine/beatClock';
import { DEV_TUNING } from '../constants';
import useLocaleStore from '../stores/localeStore';
import type { LocaleSettings } from '../types/locale';
import { removeRobotWithExit } from './removeSystem';

// ========================================
// CONSTANTS
// ========================================
/** Spawn interval range in measures; a value is chosen randomly on each scheduler start. */
const SPAWN_INTERVAL_MIN = 2;
const SPAWN_INTERVAL_MAX = 8;

const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
/** Distance outside the SVG viewBox where robots spawn before swimming on-screen. */
const OFFSCREEN_OFFSET = 150;

// ADSR ranges (typical synth values)
const ATTACK_RANGE = { min: 0.01, max: 0.5 };
const DECAY_RANGE = { min: 0.1, max: 1.5 };
const SUSTAIN_RANGE = { min: 0.3, max: 0.9 };
const RELEASE_RANGE = { min: 0.2, max: 1.2 };

// M7.4: Layered presets and normalization constants
const MAX_LAYERS = 3;
const ADSR_MAX = { attack: 2, decay: 2, sustain: 1, release: 5 };

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

// Waveform types — even distribution gives ~25% each
const WAVEFORMS: WaveformType[] = ['sine', 'square', 'triangle', 'sawtooth'];

// Simple word lists for deterministic-looking robot names
const ADJECTIVES = ['Iron', 'Null', 'Silent', 'Drift', 'Azure', 'Rust', 'Neon', 'Glass', 'Solar', 'Tidal'];
const NOUNS = ['Drifter', 'Tide', 'Warden', 'Seeker', 'Courier', 'Wisp', 'Beacon', 'Nomad', 'Rover', 'Pilot'];

function generateRobotName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a} ${n}`;
}

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
export function startSpawnScheduler(localeId: string): void {
  if (spawnScheduleId !== null) {
    if (DEV_TUNING) console.log('[SpawnSystem] Scheduler already running, skipping start');
    return;
  }

  const interval =
    SPAWN_INTERVAL_MIN + Math.floor(Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN + 1));

  spawnScheduleId = scheduleRepeat(`${interval}m`, () => {
    spawnRobot(localeId);
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


  // Random waveform — evenly distributed (~25% each)
  const waveform = WAVEFORMS[Math.floor(Math.random() * WAVEFORMS.length)];

  // Derive a compact visualAudioMap to store on the robot at spawn time.
  // ---
  // M7.4: Generate layered presets (1..MAX_LAYERS layers), each with gain and ADSR.
  // The mapping and normalization logic below is critical for visual/audio consistency:
  // - Each layer gets randomized ADSR and gain.
  // - Gain-weighted averaging and normalization (by ADSR_MAX) is used to produce a single averaged ADSR.
  // - These normalized values are mapped to ShapeParams for visuals.
  // If you change the mapping, update docs and robotVisualMapper accordingly.
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const numLayers = 1 + Math.floor(Math.random() * MAX_LAYERS); // 1..MAX_LAYERS
  const layers: LayeredWave['layers'] = [];
  for (let i = 0; i < numLayers; i++) {
    const isNoise = Math.random() < 0.18; // small chance of noise layer
    const layerWave: LayerDescriptor = {
      type: isNoise ? 'noise' : WAVEFORMS[Math.floor(Math.random() * WAVEFORMS.length)],
      gain: 0.2 + Math.random() * 1.0, // 0.2 .. 1.2
      detune: (Math.random() - 0.5) * 4, // -20 .. +20 cents
      adsr: {
        attack: ATTACK_RANGE.min + Math.random() * (ATTACK_RANGE.max - ATTACK_RANGE.min),
        decay: DECAY_RANGE.min + Math.random() * (DECAY_RANGE.max - DECAY_RANGE.min),
        sustain: SUSTAIN_RANGE.min + Math.random() * (SUSTAIN_RANGE.max - SUSTAIN_RANGE.min),
        release: RELEASE_RANGE.min + Math.random() * (RELEASE_RANGE.max - RELEASE_RANGE.min),
      },
    };
    layers.push(layerWave);
  }

  // Compute gain-weighted normalized ADSR (normalize by ADSR_MAX), then convert back
  // to seconds for averagedADSR while keeping a normalized copy for mapping.
  // ---
  // This ensures that the visual mapping (scale, roundness, detail) is always in 0..1 range
  // and reflects the actual audio envelope shape.
  let totalGain = 0;
  for (const l of layers) totalGain += l.gain ?? 1;
  if (totalGain <= 0) totalGain = layers.length || 1;

  const normSum = layers.reduce(
    (acc, l) => {
      const g = l.gain ?? 1;
      acc.attack += (l.adsr?.attack ?? 0) / ADSR_MAX.attack * g;
      acc.decay += (l.adsr?.decay ?? 0) / ADSR_MAX.decay * g;
      acc.sustain += (l.adsr?.sustain ?? 0) / ADSR_MAX.sustain * g;
      acc.release += (l.adsr?.release ?? 0) / ADSR_MAX.release * g;
      return acc;
    },
    { attack: 0, decay: 0, sustain: 0, release: 0 }
  );

  const averagedNorm = {
    attack: normSum.attack / totalGain,
    decay: normSum.decay / totalGain,
    sustain: normSum.sustain / totalGain,
    release: normSum.release / totalGain,
  };

  const averagedADSR = {
    attack: averagedNorm.attack * ADSR_MAX.attack,
    decay: averagedNorm.decay * ADSR_MAX.decay,
    sustain: averagedNorm.sustain * ADSR_MAX.sustain,
    release: averagedNorm.release * ADSR_MAX.release,
  };

  const averagedGain = (layers.reduce((s, l) => s + (l.gain ?? 1), 0) / layers.length) || 1;

  // Map averaged normalized ADSR into simple ShapeParams (0..1)
  // Mapping rules:
  //   - scale: larger when attack is shorter (snappier envelope → bigger robot)
  //   - roundness: mapped from sustain (higher sustain → rounder shape)
  //   - detail: mapped from release (longer release → more detail/greebles)
  // If you adjust these, update robotVisualMapper and docs for consistency.
  const scale = clamp(0.25 + (1 - averagedNorm.attack) * 0.75);
  const roundness = clamp(averagedNorm.sustain);
  const detail = clamp(averagedNorm.release);

  const visualAudioMap = {
    layeredWave: { base: waveform, layers },
    averagedADSR,
    averagedGain,
    shapeParams: { scale, roundness, detail },
    layerVisuals: layers.map((l) => ({ color: undefined, scale: clamp((l.gain ?? 1) / 1.2,), offset: { x: 0, y: 0 } })),
  };

  // Phase: 0..360 degrees (used for oscillator phase)
  const phase = Math.floor(Math.random() * 361);
  // Detune: default 0 cents (fine pitch adjustment)
  const detune = 0;

  return { synthType, adsr, pitchRange, filterFreq, waveform, visualAudioMap, phase, detune };
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
export function spawnRobot(localeId: string): void {
  const locale = useLocaleStore.getState().getLocaleById(localeId);
  const robots = locale?.robots ?? [];
  const settings = (locale?.settings as LocaleSettings) ?? { maxRobots: 12, minRobots: 2 };

  // Resolve explicit max/min with safe defaults when settings omit them.
  const maxRobots = settings.maxRobots ?? 12;
  const minRobots = settings.minRobots ?? 2;

  // If at or above max, remove oldest robot instead of spawning.
  // This causes the population to "bounce" between min and max limits.
  if (robots.length >= maxRobots) {
    if (robots.length > minRobots) {
      // find the oldest robot by creation timestamp
      let oldest = robots[0];
      for (const r of robots) {
        if (r.createdAt < oldest.createdAt) {
          oldest = r;
        }
      }
      // Animate the oldest robot offscreen, then remove it
      removeRobotWithExit(localeId, oldest.id);
      if (DEV_TUNING) console.log(`[SpawnSystem] Max robots reached, removed oldest ${oldest.id}`);
    } else {
      if (DEV_TUNING) console.log(`[SpawnSystem] At minRobots (${minRobots}); no removal performed`);
    }
    return;
  }

  // Generate audio attributes first so octaveRange can be derived and passed to melody generator
  const audioAttributes = generateAudioAttributes();
  const octaveRange = pickOctaveRange(audioAttributes.pitchRange);

  const robot: Robot = {
    id: crypto.randomUUID(),
    name: generateRobotName(),
    state: RobotState.Idle,
    position: generateSpawnPosition(),
    destination: null,
    direction: 'right', // Default facing direction (will be updated by idleSystem)
    melody: generateMelodyForRobot({ octaveRange }),
    audioAttributes,
    octaveRange,
    masterVolume: MASTER_VOLUME_MIN + Math.random() * (MASTER_VOLUME_MAX - MASTER_VOLUME_MIN),
    createdAt: Date.now(),
    persistent: true,
  };

  // Add to locale store
  useLocaleStore.getState().addRobot(localeId, robot);

  // Register melody with AudioEngine
  // Unregister first to guard against duplicate entries if robot id is reused.
  AudioEngine.unregisterRobotMelody(robot.id);
  // Reserve a voice for this robot (best-effort) so its timbre/adsr are isolated.
  // Waveform is applied once here on the idle slot — no mid-playback oscillator rebuilds.
  try {
    const layered = (robot.audioAttributes as unknown as { visualAudioMap?: { layeredWave?: LayeredWave } })?.visualAudioMap?.layeredWave as LayeredWave | undefined;
    if (layered) {
      AudioEngine.reserveVoice(robot.id, layered, undefined, undefined, robot.audioAttributes.phase, robot.audioAttributes.detune);
    } else {
      AudioEngine.reserveVoice(
        robot.id,
        robot.audioAttributes.synthType as string,
        robot.audioAttributes.waveform,
        robot.audioAttributes.adsr,
        robot.audioAttributes.phase,
        robot.audioAttributes.detune,
      );
    }
  } catch (err) {
    if (DEV_TUNING) console.warn('[SpawnSystem] reserveVoice failed', err);
  }
  AudioEngine.registerRobotMelody(robot.id, robot.melody);

  if (DEV_TUNING) {
    console.log(`[Spawn] Robot ${robot.id} spawned with ${robot.melody.length} melody events`);
  }
}

/**
 * Re-register persistent robots with the AudioEngine after a power-on.
 * Releases any stale voice reservation, re-reserves with the robot's
 * original audio attributes, and re-registers its melody.
 * Non-persistent robots are not present in the store at this point
 * (removed by removeNonPersistentRobots on power-off).
 */
export function reRegisterAllRobotsAudio(localeId: string): void {
  const robots = (useLocaleStore.getState().getLocaleById(localeId)?.robots || []).filter((r) => r.persistent);
  robots.forEach((robot) => {
    AudioEngine.releaseVoice(robot.id);
    try {
      const layered = (robot.audioAttributes as unknown as { visualAudioMap?: { layeredWave?: LayeredWave } })?.visualAudioMap?.layeredWave as LayeredWave | undefined;
      if (layered) {
        AudioEngine.reserveVoice(robot.id, layered, undefined, undefined, robot.audioAttributes.phase, robot.audioAttributes.detune);
      } else {
        AudioEngine.reserveVoice(
          robot.id,
          robot.audioAttributes.synthType as string,
          robot.audioAttributes.waveform,
          robot.audioAttributes.adsr,
          robot.audioAttributes.phase,
          robot.audioAttributes.detune,
        );
      }
    } catch (err) {
      if (DEV_TUNING) console.warn('[SpawnSystem] reRegisterAllRobotsAudio: reserveVoice failed for', robot.id, err);
    }
    AudioEngine.unregisterRobotMelody(robot.id);
    AudioEngine.registerRobotMelody(robot.id, robot.melody);
  });
  if (DEV_TUNING) console.log(`[SpawnSystem] reRegisterAllRobotsAudio: re-registered ${robots.length} persistent robots`);
}

/**
 * Remove all non-persistent robots from the store and release their audio resources.
 * Call on power-off. Persistent robots (robot.persistent === true) are kept.
 */
export function removeNonPersistentRobots(localeId: string): void {
  const robots = (useLocaleStore.getState().getLocaleById(localeId)?.robots || []).filter((r) => !r.persistent);
  robots.forEach((robot) => {
    useLocaleStore.getState().removeRobot(localeId, robot.id);
  });
  if (DEV_TUNING) console.log(`[SpawnSystem] removeNonPersistentRobots: removed ${robots.length} robots`);
}

// Backwards-compatible defaults (deprecated) — prefer explicit localeId.
// (no default wrappers) callers must provide explicit localeId
