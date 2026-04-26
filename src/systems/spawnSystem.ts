// ========================================
// IMPORTS
// ========================================
import type { NoiseFunction2D } from 'simplex-noise';
import type { Vec2 } from '../types/Vec2';
import type { Robot, AudioAttributes, SynthType, WaveformType } from '../types/Robot';
import { RobotState } from '../types/Robot';
import { generateMelodyForRobot } from '../engine/melodyGenerator';
import { AudioEngine } from '../engine/AudioEngine';
import type { LayeredWave, LayerDescriptor } from '../types/layeredAudio';
import { scheduleRepeat, cancelSchedule } from '../engine/beatClock';
import { DEV_TUNING } from '../constants';
import useLocaleStore from '../stores/localeStore';
import { usePlanetStore } from '../stores/planetStore';
import type { LocaleSettings } from '../types/locale';
import { removeRobotWithExit } from './removeSystem';
import { initRobotIdleCounter } from './idleSystem';
import { getLocaleNoiseMap } from '../utils/noiseMaps';
import { getSeededVal } from '../utils/getSeededVal';

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

function generateRobotName(noiseMap: NoiseFunction2D, offset: number): string {
  const a = ADJECTIVES[Math.floor(getSeededVal(noiseMap, 'robot.name.adj', offset, 0, ADJECTIVES.length))];
  const n = NOUNS[Math.floor(getSeededVal(noiseMap, 'robot.name.noun', offset, 0, NOUNS.length))];
  return `${a} ${n}`;
}

// ========================================
// MODULE STATE
// ========================================
let spawnScheduleId: string | null = null;

/** Per-locale spawn counters — used as deterministic offset for noise sampling. Not stored in Zustand. */
const spawnCounters = new Map<string, number>();

function getAndIncrementSpawnCount(localeId: string): number {
  const count = spawnCounters.get(localeId) ?? 0;
  spawnCounters.set(localeId, count + 1);
  return count;
}

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

  const locale = useLocaleStore.getState().getLocaleById(localeId);
  const planet = locale ? usePlanetStore.getState().planets.find((p) => p.id === locale.planetId) : undefined;
  const schedulerNoiseMap = locale && planet
    ? getLocaleNoiseMap(localeId, locale.planetId, planet.name, locale.coordinates.x, locale.coordinates.y)
    : null;
  const interval = SPAWN_INTERVAL_MIN + Math.floor(
    schedulerNoiseMap
      ? getSeededVal(schedulerNoiseMap, 'spawn.interval', spawnCounters.get(localeId) ?? 0, 0, SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN + 1)
      : Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN + 1)
  );

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
export function generateSpawnPosition(noiseMap: NoiseFunction2D, offset: number): Vec2 {
  const edge = Math.floor(getSeededVal(noiseMap, 'spawn.pos.edge', offset, 0, 4)); // 0=top, 1=right, 2=bottom, 3=left

  switch (edge) {
    case 0: // Top edge — spawn above the scene
      return {
        x: getSeededVal(noiseMap, 'spawn.pos.x', offset, 0, WORLD_WIDTH),
        y: -OFFSCREEN_OFFSET - getSeededVal(noiseMap, 'spawn.pos.y', offset, 0, 50),
      };
    case 1: // Right edge — spawn to the right of the scene
      return {
        x: WORLD_WIDTH + OFFSCREEN_OFFSET + getSeededVal(noiseMap, 'spawn.pos.x', offset, 0, 50),
        y: getSeededVal(noiseMap, 'spawn.pos.y', offset, 0, WORLD_HEIGHT),
      };
    case 2: // Bottom edge — spawn below the scene
      return {
        x: getSeededVal(noiseMap, 'spawn.pos.x', offset, 0, WORLD_WIDTH),
        y: WORLD_HEIGHT + OFFSCREEN_OFFSET + getSeededVal(noiseMap, 'spawn.pos.y', offset, 0, 50),
      };
    case 3: // Left edge — spawn to the left of the scene
    default:
      return {
        x: -OFFSCREEN_OFFSET - getSeededVal(noiseMap, 'spawn.pos.x', offset, 0, 50),
        y: getSeededVal(noiseMap, 'spawn.pos.y', offset, 0, WORLD_HEIGHT),
      };
  }
}

/**
 * Generate random audio attributes
 * Controls both sound synthesis and visual appearance
 */
export function generateAudioAttributes(noiseMap: NoiseFunction2D, offset: number): AudioAttributes {
  // Seeded synth type
  const synthType = SYNTH_TYPES[Math.floor(getSeededVal(noiseMap, 'robot.audio.synthType', offset, 0, SYNTH_TYPES.length))];

  // Seeded ADSR envelope
  const adsr = {
    attack: getSeededVal(noiseMap, 'robot.audio.attack', offset, ATTACK_RANGE.min, ATTACK_RANGE.max),
    decay: getSeededVal(noiseMap, 'robot.audio.decay', offset, DECAY_RANGE.min, DECAY_RANGE.max),
    sustain: getSeededVal(noiseMap, 'robot.audio.sustain', offset, SUSTAIN_RANGE.min, SUSTAIN_RANGE.max),
    release: getSeededVal(noiseMap, 'robot.audio.release', offset, RELEASE_RANGE.min, RELEASE_RANGE.max),
  };

  // Seeded pitch range (determines visual scale)
  const pitchRange = PITCH_RANGES[Math.floor(getSeededVal(noiseMap, 'robot.audio.pitchRange', offset, 0, PITCH_RANGES.length))];

  // Seeded filter frequency (determines detail level)
  const filterFreq = getSeededVal(noiseMap, 'robot.audio.filterFreq', offset, FILTER_FREQ_RANGE.min, FILTER_FREQ_RANGE.max);

  // Seeded waveform — evenly distributed (~25% each)
  const waveform = WAVEFORMS[Math.floor(getSeededVal(noiseMap, 'robot.audio.waveform', offset, 0, WAVEFORMS.length))];

  // Derive a compact visualAudioMap to store on the robot at spawn time.
  // ---
  // M7.4: Generate layered presets (1..MAX_LAYERS layers), each with gain and ADSR.
  // The mapping and normalization logic below is critical for visual/audio consistency:
  // - Each layer gets randomized ADSR and gain.
  // - Gain-weighted averaging and normalization (by ADSR_MAX) is used to produce a single averaged ADSR.
  // - These normalized values are mapped to ShapeParams for visuals.
  // If you change the mapping, update docs and robotVisualMapper accordingly.
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const numLayers = 1 + Math.floor(getSeededVal(noiseMap, 'robot.audio.numLayers', offset, 0, MAX_LAYERS)); // 1..MAX_LAYERS
  const layers: LayeredWave['layers'] = [];
  for (let i = 0; i < numLayers; i++) {
    const layerOffset = offset * 10 + i;
    const isNoise = getSeededVal(noiseMap, 'robot.audio.layer.isNoise', layerOffset, 0, 1) < 0.18;
    const layerWave: LayerDescriptor = {
      type: isNoise ? 'noise' : WAVEFORMS[Math.floor(getSeededVal(noiseMap, 'robot.audio.layer.waveform', layerOffset, 0, WAVEFORMS.length))],
      gain: getSeededVal(noiseMap, 'robot.audio.layer.gain', layerOffset, 0.2, 1.2),
      detune: getSeededVal(noiseMap, 'robot.audio.layer.detune', layerOffset, -2, 2),
      adsr: {
        attack: getSeededVal(noiseMap, 'robot.audio.layer.attack', layerOffset, ATTACK_RANGE.min, ATTACK_RANGE.max),
        decay: getSeededVal(noiseMap, 'robot.audio.layer.decay', layerOffset, DECAY_RANGE.min, DECAY_RANGE.max),
        sustain: getSeededVal(noiseMap, 'robot.audio.layer.sustain', layerOffset, SUSTAIN_RANGE.min, SUSTAIN_RANGE.max),
        release: getSeededVal(noiseMap, 'robot.audio.layer.release', layerOffset, RELEASE_RANGE.min, RELEASE_RANGE.max),
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
  const phase = Math.floor(getSeededVal(noiseMap, 'robot.audio.phase', offset, 0, 361));
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
    // Choose from non-persisting robots only — robots with `persists === true` must never be removed.
    const removable = robots.filter((r) => !r.persists);
    if (removable.length > 0) {
      if (robots.length > minRobots) {
        // find the oldest non-persisting robot by creation timestamp
        let oldest = removable[0];
        for (const r of removable) {
          if (r.createdAt < oldest.createdAt) {
            oldest = r;
          }
        }
        // Animate the oldest robot offscreen, then remove it
        removeRobotWithExit(localeId, oldest.id);
        if (DEV_TUNING) console.log(`[SpawnSystem] Max robots reached, removed oldest non-persisting ${oldest.id}`);
      } else {
        if (DEV_TUNING) console.log(`[SpawnSystem] At minRobots (${minRobots}); no removal performed`);
      }
    } else {
      if (DEV_TUNING) console.log('[SpawnSystem] Max robots reached but all robots persist; skipping spawn to avoid removing persisted robots');
    }
    return;
  }

  // Resolve locale noise map for deterministic attribute generation
  const planet = locale ? usePlanetStore.getState().planets.find((p) => p.id === locale.planetId) : undefined;
  const noiseMap = locale && planet
    ? getLocaleNoiseMap(localeId, locale.planetId, planet.name, locale.coordinates.x, locale.coordinates.y)
    : null;

  // Monotonically incrementing offset for this locale — ensures each robot is distinct
  const spawnCount = getAndIncrementSpawnCount(localeId);

  // Generate audio attributes first so octaveRange can be derived and passed to melody generator
  const audioAttributes = noiseMap
    ? generateAudioAttributes(noiseMap, spawnCount)
    : generateAudioAttributes({
      // fallback: create a trivial noise-like map from Math.random
      // This path is only hit if locale/planet data is missing (should not happen in production)
    } as unknown as NoiseFunction2D, spawnCount);
  const octaveRange = pickOctaveRange(audioAttributes.pitchRange);

  // Seeded melody: each rand() call uses a unique offset within this robot's spawn slot
  let melodyCallIndex = 0;
  const melodyRand = noiseMap
    ? () => getSeededVal(noiseMap, 'melody.rand', spawnCount * 100 + melodyCallIndex++)
    : Math.random;

  const spawnMelody = generateMelodyForRobot({ octaveRange, rand: melodyRand });

  const robot: Robot = {
    id: crypto.randomUUID(),
    name: noiseMap ? generateRobotName(noiseMap, spawnCount) : generateRobotName({ x: 0, y: 0 } as unknown as NoiseFunction2D, spawnCount),
    state: RobotState.Idle,
    position: noiseMap ? generateSpawnPosition(noiseMap, spawnCount) : generateSpawnPosition({ x: 0, y: 0 } as unknown as NoiseFunction2D, spawnCount),
    destination: null,
    direction: 'right', // Default facing direction (will be updated by idleSystem)
    melody: spawnMelody,
    audioAttributes,
    octaveRange,
    audioMode: 'none',
    rhythmicDensity: spawnMelody.length,
    rhythmicMotifLength: 8,
    noteVariance: 0,
    masterVolume: noiseMap
      ? getSeededVal(noiseMap, 'robot.masterVolume', spawnCount, MASTER_VOLUME_MIN, MASTER_VOLUME_MAX)
      : MASTER_VOLUME_MIN + Math.random() * (MASTER_VOLUME_MAX - MASTER_VOLUME_MIN),
    createdAt: Date.now(),
    // Persisting robots survive power-off cycles; default to false.
    persists: false,
  };

  // Add to locale store
  useLocaleStore.getState().addRobot(localeId, robot);

  // Seed the idle counter to this robot's spawn index so its noise-sampled
  // destinations are phase-shifted away from other robots in the same locale.
  initRobotIdleCounter(robot.id, spawnCount);

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
  // Re-register robots that are marked to persist across power cycles.
  const robots = (useLocaleStore.getState().getLocaleById(localeId)?.robots || []).filter((r) => r.persists);
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
  if (DEV_TUNING) console.log(`[SpawnSystem] reRegisterAllRobotsAudio: re-registered ${robots.length} persisted robots`);
}

/**
 * Remove all non-persistent robots from the store and release their audio resources.
 * Call on power-off. Persistent robots (robot.persistent === true) are kept.
 */
export function removeNonPersistentRobots(localeId: string): void {
  // Remove robots that are not marked to persist (persists === true are kept).
  const robots = (useLocaleStore.getState().getLocaleById(localeId)?.robots || []).filter((r) => !r.persists);
  robots.forEach((robot) => {
    useLocaleStore.getState().removeRobot(localeId, robot.id);
  });
  if (DEV_TUNING) console.log(`[SpawnSystem] removeNonPersistentRobots: removed ${robots.length} non-persisting robots`);
}

// Backwards-compatible defaults (deprecated) — prefer explicit localeId.
// (no default wrappers) callers must provide explicit localeId
