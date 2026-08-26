// ========================================
// IMPORTS
// ========================================
import alea from 'alea';
import type { NoiseFunction2D } from 'simplex-noise';
import type { Vec2 } from '../types/Vec2';
import type { AudioAttributes, WaveformType, Robot } from '../types/Robot';
import { RobotState } from '../types/Robot';
import {
  generateMelodyForRobot,
  DEFAULT_RHYTHMIC_DENSITY,
  DEFAULT_RHYTHMIC_MOTIF_LENGTH,
  DEFAULT_NOTE_VARIANCE,
} from '../engine/melodyGenerator';
import type { ToggleValue } from '../engine/melodyGenerator';
import { AudioEngine } from '../engine/AudioEngine';
import type { OscillatorLayer } from '../types/layeredAudio';
import { scheduleRepeat, cancelSchedule } from '../engine/beatClock';
import { DEV_TUNING } from '../constants';
import useLocaleStore from '../stores/localeStore';
import type { LocaleSettings } from '../types/locale';
import { removeRobotWithExit } from './removeSystem';
import { initRobotIdleCounter } from './idleSystem';
import { getLocaleNoiseMap } from '../utils/noiseMaps';
import { getSeededVal } from '../utils/getSeededVal';
import { swallow } from '../utils/helpers';
import type { RobotLfoTargetId, LfoSettings } from '../types/lfo';
import { ROBOT_LFO_TARGET_IDS, LFO_SHAPES, LFO_RATE_MIN, LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX } from '../types/lfo';

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
const ATTACK_RANGE = { min: 0.01, max: 2.0 };
const DECAY_RANGE = { min: 0.05, max: 2.0 };
const SUSTAIN_RANGE = { min: 0.0, max: 1.0 };
const RELEASE_RANGE = { min: 0.1, max: 5.0 };

// Layered presets and normalization constants
const MAX_LAYERS = 4;
const ADSR_MAX = { attack: 2, decay: 2, sustain: 1, release: 5 };

// Octave registers — seed directly without Hz indirection
// [min, max] inclusive; 3 tiers: bass, mid, treble
const OCTAVE_REGISTERS = [
  [1, 3],  // Bass (large robots)
  [2, 4],
  [3, 5],  // Mid  (normal robots)
  [4, 6],
  [5, 7],  // Treble (small robots)
] as const;

// Filter frequency range
const FILTER_FREQ_RANGE = { min: 400, max: 2500 };

// Master volume range: keep robots below full saturation
const MASTER_VOLUME_MIN = 0.65;
const MASTER_VOLUME_MAX = 0.85;

/**
 * Probability threshold rhythmicMotifLength.active/noteVariance.active seed
 * draws ([0, 1]) must clear to seed `true` — ~66% chance, mirroring the
 * shipped LFO_ACTIVE_THRESHOLD pattern (generateGlobalLfoSettings) rather
 * than an even 50/50 split.
 */
const TOGGLE_ACTIVE_THRESHOLD = 0.34;

// Waveform types — even distribution gives ~20% each (includes pulse)
const WAVEFORMS: WaveformType[] = ['sine', 'square', 'triangle', 'sawtooth', 'pulse'];

// Simple word lists for deterministic-looking robot names
const ADJECTIVES = ['Iron', 'Null', 'Silent', 'Drift', 'Azure', 'Rust', 'Neon', 'Glass', 'Solar', 'Tidal'];
const NOUNS = ['Drifter', 'Tide', 'Warden', 'Seeker', 'Courier', 'Wisp', 'Beacon', 'Nomad', 'Rover', 'Pilot'];

function generateRobotName(noiseMap: NoiseFunction2D, offset: number): string {
  const a = ADJECTIVES[Math.floor(getSeededVal(noiseMap, 'robot.name.adj', offset, 0, ADJECTIVES.length))];
  const n = NOUNS[Math.floor(getSeededVal(noiseMap, 'robot.name.noun', offset, 0, NOUNS.length))];
  return `${a} ${n}`;
}

/**
 * Deterministic, human-legible robot ID — reuses the existing locale noise-map
 * seeding mechanism (same as every other spawn-time attribute) rather than
 * crypto.randomUUID(). Uniqueness is structural, not actively checked: `spawnCount`
 * is a monotonic per-locale counter, embedded directly in the ID string, and
 * `getSeededVal`'s 'robot.id' dataId gives this field its own row in the noise
 * map distinct from every other seeded field. Required so Session Storage
 * (Phase 11) can reapply Robot Options overrides by ID after the roster
 * regenerates from a reload or shared link — the same coordinates always
 * replay the same spawnCount sequence and therefore the same ID sequence.
 */
function generateRobotId(noiseMap: NoiseFunction2D, spawnCount: number): string {
  const idSeed = getSeededVal(noiseMap, 'robot.id', spawnCount, 0, 1);
  return `robot-${spawnCount}-${idSeed.toString(36).slice(2, 10)}`;
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
  const schedulerNoiseMap = locale
    ? getLocaleNoiseMap(localeId, locale.coordinates.x, locale.coordinates.y)
    : null;
  const interval = SPAWN_INTERVAL_MIN + Math.floor(
    schedulerNoiseMap
      ? getSeededVal(schedulerNoiseMap, 'spawn.interval', spawnCounters.get(localeId) ?? 0, 0, SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN + 1)
      : alea(localeId)() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN + 1)
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
  // Seeded ADSR envelope
  const adsr = {
    attack: getSeededVal(noiseMap, 'robot.audio.attack', offset, ATTACK_RANGE.min, ATTACK_RANGE.max),
    decay: getSeededVal(noiseMap, 'robot.audio.decay', offset, DECAY_RANGE.min, DECAY_RANGE.max),
    sustain: getSeededVal(noiseMap, 'robot.audio.sustain', offset, SUSTAIN_RANGE.min, SUSTAIN_RANGE.max),
    release: getSeededVal(noiseMap, 'robot.audio.release', offset, RELEASE_RANGE.min, RELEASE_RANGE.max),
  };

  // Seeded octave register — direct [min, max] tuple, no Hz indirection
  const octaveRange = OCTAVE_REGISTERS[Math.min(OCTAVE_REGISTERS.length - 1, Math.floor(getSeededVal(noiseMap, 'robot.audio.register', offset, 0, OCTAVE_REGISTERS.length)))] as [number, number];

  // Seeded filter frequency (determines detail level)
  const filterFreq = getSeededVal(noiseMap, 'robot.audio.filterFreq', offset, FILTER_FREQ_RANGE.min, FILTER_FREQ_RANGE.max);

  // Seeded waveform — evenly distributed (~20% each)
  const waveform = WAVEFORMS[Math.min(WAVEFORMS.length - 1, Math.floor(getSeededVal(noiseMap, 'robot.audio.waveform', offset, 0, WAVEFORMS.length)))];

  // Derive a compact visualAudioMap to store on the robot at spawn time.
  // ---
  // Generate layered presets (1..MAX_LAYERS layers), each with gain and ADSR.
  // The mapping and normalization logic below is critical for visual/audio consistency:
  // - Each layer gets randomized ADSR and gain.
  // - Gain-weighted averaging and normalization (by ADSR_MAX) is used to produce a single averaged ADSR.
  // - These normalized values are mapped to ShapeParams for visuals.
  // If you change the mapping, update docs and robotVisualMapper accordingly.
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const numLayers = 1 + Math.floor(getSeededVal(noiseMap, 'robot.audio.numLayers', offset, 0, MAX_LAYERS)); // 1..MAX_LAYERS
  const layers: OscillatorLayer[] = [];
  for (let i = 0; i < numLayers; i++) {
    const layerOffset = offset * 10 + i;
    const isNoise = getSeededVal(noiseMap, 'robot.audio.layer.isNoise', layerOffset, 0, 1) < 0.18;
    const layerWave: OscillatorLayer = {
      type: isNoise ? 'noise' : WAVEFORMS[Math.floor(getSeededVal(noiseMap, 'robot.audio.layer.waveform', layerOffset, 0, WAVEFORMS.length))],
      gain: getSeededVal(noiseMap, 'robot.audio.layer.gain', layerOffset, 0.2, 1.2),
      detune: getSeededVal(noiseMap, 'robot.audio.layer.detune', layerOffset, -2, 2),
      phase: Math.floor(getSeededVal(noiseMap, 'robot.audio.layer.phase', layerOffset, 0, 361)) || 0,
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
    averagedADSR,
    averagedGain,
    shapeParams: { scale, roundness, detail },
    layerVisuals: layers.map((l) => ({ color: undefined, scale: clamp((l.gain ?? 1) / 1.2,), offset: { x: 0, y: 0 } })),
  };

  // Phase: 0..360 degrees (used for oscillator phase)
  const phase = Math.floor(getSeededVal(noiseMap, 'robot.audio.phase', offset, 0, 361));
  // Detune: default 0 cents (fine pitch adjustment)
  const detune = Math.round(getSeededVal(noiseMap, 'robot.audio.detune', offset, -5, 5));
  // Pulse width: meaningful for pulse/square waves. Default ~0.5 (50% duty).
  const rawPulse = getSeededVal(noiseMap, 'robot.audio.pulseWidth', offset, 0.05, 0.95);
  const pulseWidth = Math.max(0.01, Math.min(0.99, rawPulse));

  // Include `layers` as the canonical audio description. Flat fields are left for compatibility.
  return { adsr, octaveRange, filterFreq, waveform, visualAudioMap, phase, detune, pulseWidth, layers } as AudioAttributes;
}

/**
 * Generate seeded LfoSettings for all 13 RobotLfoTargetId modulation targets,
 * the same way as the rest of a robot's audio personality (generateAudioAttributes
 * above) — per docs/tasks/LFO_INTEGRATION_PLAN.md Task 13. Each target gets its
 * own dot-namespaced dataId ('robot.lfo.<target>.<field>'), so a single shared
 * `offset` naturally yields distinct values per target without needing the
 * per-index offset multiplier the oscillator-layer loop above uses (that's only
 * needed when multiple items share one dataId string).
 */
export function generateRobotLfoSettings(noiseMap: NoiseFunction2D, offset: number): Record<RobotLfoTargetId, LfoSettings> {
  const entries = ROBOT_LFO_TARGET_IDS.map((target) => {
    const shapeIdx = Math.min(
      LFO_SHAPES.length - 1,
      Math.floor(getSeededVal(noiseMap, `robot.lfo.${target}.shape`, offset, 0, LFO_SHAPES.length))
    );
    const settings: LfoSettings = {
      shape: LFO_SHAPES[shapeIdx],
      rate: getSeededVal(noiseMap, `robot.lfo.${target}.rate`, offset, LFO_RATE_MIN, LFO_RATE_MAX),
      depth: getSeededVal(noiseMap, `robot.lfo.${target}.depth`, offset, LFO_DEPTH_MIN, LFO_DEPTH_MAX),
    };
    return [target, settings] as const;
  });
  return Object.fromEntries(entries) as Record<RobotLfoTargetId, LfoSettings>;
}

/**
 * Spawn a new robot with randomized attributes
 * Enforces MAX_ROBOTS limit and registers melody with AudioEngine
 */
export function spawnRobot(localeId: string): void {
  const locale = useLocaleStore.getState().getLocaleById(localeId);
  const robots = locale?.robots ?? [];
  const settings = (locale?.settings as LocaleSettings) ?? { maxRobots: 12, minRobots: 2 };

  const maxRobots = settings.maxRobots ?? 12;
  const minRobots = settings.minRobots ?? 2;

  // If at or above max, remove oldest robot instead of spawning.
  // This causes the population to "bounce" between min and max limits.
  if (robots.length >= maxRobots) {
    // Choose from non-persisting robots only — robots with `persists === true` must never be removed.
    const removable = robots.filter((r) => !r.persists);
    if (removable.length > 0) {
      if (robots.length > minRobots) {
        let oldest = removable[0];
        for (const r of removable) {
          if (r.createdAt < oldest.createdAt) {
            oldest = r;
          }
        }
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
  const noiseMap = locale
    ? getLocaleNoiseMap(localeId, locale.coordinates.x, locale.coordinates.y)
    : null;

  // Monotonically incrementing offset for this locale — ensures each robot is distinct
  const spawnCount = getAndIncrementSpawnCount(localeId);

  // 30% seeded chance to copy an existing robot's audio personality instead of generating fresh.
  // Copied robots inherit: audioAttributes, octaveRange, rhythmicDensity, rhythmicMotifLength,
  // noteVariance, lfoSettings. Always fresh: id, name, position, direction, melody (regenerated
  // from the copied octaveRange/rhythmicDensity/rhythmicMotifLength/noteVariance).
  const copyRoll = noiseMap
    ? getSeededVal(noiseMap, 'robot.copyChance', spawnCount, 0, 1)
    : alea(`${localeId}:${spawnCount}:copy`)();
  const shouldCopy = copyRoll < 0.30 && robots.length > 0;

  let audioAttributes: ReturnType<typeof generateAudioAttributes>;
  let octaveRange: [number, number];
  let spawnRhythmicDensity: number;
  let spawnRhythmicMotifLength: ToggleValue;
  let spawnNoteVariance: ToggleValue;
  let spawnLfoSettings: ReturnType<typeof generateRobotLfoSettings>;

  if (shouldCopy) {
    const srcIdx = Math.min(
      robots.length - 1,
      Math.floor(
        noiseMap
          ? getSeededVal(noiseMap, 'robot.copySource', spawnCount, 0, robots.length)
          : alea(`${localeId}:${spawnCount}:src`)() * robots.length
      )
    );
    const source = robots[srcIdx];
    audioAttributes = source.audioAttributes as ReturnType<typeof generateAudioAttributes>;
    octaveRange = source.octaveRange;
    spawnRhythmicDensity = source.rhythmicDensity ?? DEFAULT_RHYTHMIC_DENSITY;
    spawnRhythmicMotifLength = source.rhythmicMotifLength ?? DEFAULT_RHYTHMIC_MOTIF_LENGTH;
    spawnNoteVariance = source.noteVariance ?? DEFAULT_NOTE_VARIANCE;
    spawnLfoSettings = source.lfoSettings ?? generateRobotLfoSettings(noiseMap ?? ((_x: number, _y: number) => 0 as number), spawnCount);
    if (DEV_TUNING) console.log(`[SpawnSystem] Robot copying audio personality from ${source.id}`);
  } else {
    // Generate audio attributes — octaveRange is seeded directly inside generateAudioAttributes
    audioAttributes = noiseMap
      ? generateAudioAttributes(noiseMap, spawnCount)
      : generateAudioAttributes((_x: number, _y: number) => 0 as number, spawnCount);
    octaveRange = audioAttributes.octaveRange ?? [2, 4] as [number, number];
    spawnLfoSettings = noiseMap
      ? generateRobotLfoSettings(noiseMap, spawnCount)
      : generateRobotLfoSettings((_x: number, _y: number) => 0 as number, spawnCount);

    spawnRhythmicDensity = Math.round(
      noiseMap
        ? getSeededVal(noiseMap, 'robot.rhythmicDensity', spawnCount, 0, 100)
        : alea(`${localeId}:${spawnCount}:density`)() * 100
    );

    const motifActiveRaw = noiseMap
      ? getSeededVal(noiseMap, 'robot.rhythmicMotifLength.active', spawnCount, 0, 1)
      : alea(`${localeId}:${spawnCount}:motifActive`)();
    const motifValueRaw = noiseMap
      ? getSeededVal(noiseMap, 'robot.rhythmicMotifLength.value', spawnCount, 1, 9)
      : 1 + alea(`${localeId}:${spawnCount}:motifValue`)() * 8;
    spawnRhythmicMotifLength = {
      active: motifActiveRaw >= TOGGLE_ACTIVE_THRESHOLD,
      value: Math.min(8, Math.floor(motifValueRaw)),
    };

    const noteVarianceActiveRaw = noiseMap
      ? getSeededVal(noiseMap, 'robot.noteVariance.active', spawnCount, 0, 1)
      : alea(`${localeId}:${spawnCount}:nvActive`)();
    const noteVarianceValueRaw = noiseMap
      ? getSeededVal(noiseMap, 'robot.noteVariance.value', spawnCount, 1, 9)
      : 1 + alea(`${localeId}:${spawnCount}:nvValue`)() * 8;
    spawnNoteVariance = {
      active: noteVarianceActiveRaw >= TOGGLE_ACTIVE_THRESHOLD,
      value: Math.min(8, Math.floor(noteVarianceValueRaw)),
    };
  }

  // Seeded melody — always fresh from the robot's octaveRange/rhythmicDensity/
  // rhythmicMotifLength/noteVariance (copied or generated)
  let melodyCallIndex = 0;
  const melodyRand = noiseMap
    ? () => getSeededVal(noiseMap, 'melody.rand', spawnCount * 100 + melodyCallIndex++)
    : Math.random;

  const spawnMelody = generateMelodyForRobot({
    octaveMin: octaveRange[0],
    octaveMax: octaveRange[1],
    rhythmicDensity: spawnRhythmicDensity,
    rhythmicMotifLength: spawnRhythmicMotifLength,
    noteVariance: spawnNoteVariance,
    rand: melodyRand,
  });

  const position = noiseMap ? generateSpawnPosition(noiseMap, spawnCount) : generateSpawnPosition((_x: number, _y: number) => 0 as number, spawnCount);
  const spawnDirection: 'left' | 'right' = position.x < (WORLD_WIDTH / 2) ? 'left' : 'right';

  const robot: Robot = {
    id: noiseMap ? generateRobotId(noiseMap, spawnCount) : generateRobotId((_x: number, _y: number) => 0 as number, spawnCount),
    name: noiseMap ? generateRobotName(noiseMap, spawnCount) : generateRobotName((_x: number, _y: number) => 0 as number, spawnCount),
    state: RobotState.Idle,
    position,
    destination: null,
    direction: spawnDirection,
    melody: spawnMelody,
    audioAttributes,
    octaveRange,
    audioMode: 'none',
    rhythmicDensity: spawnRhythmicDensity,
    rhythmicMotifLength: spawnRhythmicMotifLength,
    noteVariance: spawnNoteVariance,
    lfoSettings: spawnLfoSettings,
    masterVolume: (() => {
      const seeded = noiseMap
        ? getSeededVal(noiseMap, 'robot.masterVolume', spawnCount, MASTER_VOLUME_MIN, MASTER_VOLUME_MAX)
        : MASTER_VOLUME_MIN + alea(`${localeId}:${spawnCount}:mv`)() * (MASTER_VOLUME_MAX - MASTER_VOLUME_MIN);
      // Bass robots are louder, treble robots quieter. Register mid [1..5], neutral ~3.5.
      const registerMid = (octaveRange[0] + octaveRange[1]) / 2;
      const registerBias = (4.5 - registerMid) * 0.05;
      return Math.max(0.5, Math.min(0.95, seeded + registerBias));
    })(),
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
    const layers = (robot.audioAttributes as unknown as { layers?: OscillatorLayer[] })?.layers;
    if (Array.isArray(layers) && layers.length > 0) {
      AudioEngine.reserveVoice(robot.id, layers, robot.audioAttributes.phase, robot.audioAttributes.detune, layers[0]?.pulseWidth);
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
  const robots = (useLocaleStore.getState().getLocaleById(localeId)?.robots || []).filter((r) => r.persists);
  robots.forEach((robot) => {
    AudioEngine.releaseVoice(robot.id);
    try {
      const layers = (robot.audioAttributes as unknown as { layers?: OscillatorLayer[] })?.layers;
      if (Array.isArray(layers) && layers.length > 0) {
        AudioEngine.reserveVoice(robot.id, layers, robot.audioAttributes.phase, robot.audioAttributes.detune, layers[0]?.pulseWidth);
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
 * Call on power-off. Persistent robots (robot.persists === true) are kept.
 */
export function removeNonPersistentRobots(localeId: string): void {
  const robots = (useLocaleStore.getState().getLocaleById(localeId)?.robots || []).filter((r) => !r.persists);
  robots.forEach((robot) => {
    try {
      AudioEngine.releaseVoice(robot.id);
    } catch (err) {
      if (DEV_TUNING) swallow(err, 'AudioEngine.releaseVoice');
    }
    AudioEngine.unregisterRobotMelody(robot.id);

    useLocaleStore.getState().removeRobot(localeId, robot.id);
  });
  if (DEV_TUNING) console.log(`[SpawnSystem] removeNonPersistentRobots: removed ${robots.length} non-persisting robots`);
}
