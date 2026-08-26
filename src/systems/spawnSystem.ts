// ========================================
// IMPORTS
// ========================================
import alea from 'alea';
import type { NoiseFunction2D } from 'simplex-noise';
import type { Vec2 } from '../types/Vec2';
import type { AudioAttributes, WaveformType, Robot } from '../types/Robot';
import { RobotState, DockingState } from '../types/Robot';
import {
  generateMelodyForRobot,
  DEFAULT_RHYTHMIC_DENSITY,
  DEFAULT_RHYTHMIC_MOTIF_LENGTH,
  DEFAULT_NOTE_VARIANCE,
} from '../engine/melodyGenerator';
import type { ToggleValue } from '../engine/melodyGenerator';
import { AudioEngine } from '../engine/AudioEngine';
import type { OscillatorLayer } from '../types/layeredAudio';
import { DEV_TUNING, MAX_ROBOTS, INITIAL_ACTIVE_ROBOTS_MIN, INITIAL_ACTIVE_ROBOTS_MAX } from '../constants';
import useLocaleStore from '../stores/localeStore';
import { initRobotIdleCounter } from './idleSystem';
import { getLocaleNoiseMap } from '../utils/noiseMaps';
import { getSeededVal } from '../utils/getSeededVal';
import type { RobotLfoTargetId, LfoSettings } from '../types/lfo';
import { ROBOT_LFO_TARGET_IDS, LFO_SHAPES, LFO_RATE_MIN, LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX } from '../types/lfo';

// ========================================
// CONSTANTS
// ========================================
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
 * Probability threshold rhythmicMotifLength.active's seed draw ([0, 1]) must
 * clear to seed `true` — 85% chance. A fresh robot tiles a repeating motif
 * far more often than it scatters freely.
 */
const RHYTHMIC_MOTIF_LENGTH_ACTIVE_THRESHOLD = 0.15;
/**
 * Probability threshold noteVariance.active's seed draw ([0, 1]) must clear
 * to seed `true` — 85% chance, matching RHYTHMIC_MOTIF_LENGTH_ACTIVE_THRESHOLD.
 * Kept as its own named constant (not merged back into one shared value) so
 * the two toggles stay independently tunable even though they currently agree.
 */
const NOTE_VARIANCE_ACTIVE_THRESHOLD = 0.15;

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
 * Create and add a single robot with randomized attributes, registering its
 * melody with AudioEngine. The roster is fixed-size now (see
 * spawnInitialRoster) — this no longer enforces any max/min bounce; callers
 * decide how many robots to create and with what starting docking/battery.
 *
 * @param options.docking Starting DockingState. Default: Active — matches
 *   this function's pre-lifecycle behavior (every spawned robot was
 *   immediately visible/audible), so existing single-call-site callers and
 *   tests are unaffected unless they opt into a different starting state.
 * @param options.batteryLevel Starting battery (0-100). Default: 100.
 */
export function spawnRobot(localeId: string, options?: { docking?: DockingState; batteryLevel?: number }): void {
  const docking = options?.docking ?? DockingState.Active;
  const batteryLevel = options?.batteryLevel ?? 100;

  const locale = useLocaleStore.getState().getLocaleById(localeId);
  const robots = locale?.robots ?? [];

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
      active: motifActiveRaw >= RHYTHMIC_MOTIF_LENGTH_ACTIVE_THRESHOLD,
      value: Math.min(8, Math.floor(motifValueRaw)),
    };

    const noteVarianceActiveRaw = noiseMap
      ? getSeededVal(noiseMap, 'robot.noteVariance.active', spawnCount, 0, 1)
      : alea(`${localeId}:${spawnCount}:nvActive`)();
    const noteVarianceValueRaw = noiseMap
      ? getSeededVal(noiseMap, 'robot.noteVariance.value', spawnCount, 1, 9)
      : 1 + alea(`${localeId}:${spawnCount}:nvValue`)() * 8;
    spawnNoteVariance = {
      active: noteVarianceActiveRaw >= NOTE_VARIANCE_ACTIVE_THRESHOLD,
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
    // Mute is expressed via audioMode (the same toggle Robot Options exposes,
    // so a user can independently override it), not by withholding voice
    // reservation/melody registration below — those happen unconditionally.
    audioMode: docking === DockingState.Active ? 'none' : 'mute',
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
    docking,
    batteryLevel,
  };

  // Add to locale store
  useLocaleStore.getState().addRobot(localeId, robot);

  // Seed the idle counter to this robot's spawn index so its noise-sampled
  // destinations are phase-shifted away from other robots in the same locale.
  initRobotIdleCounter(robot.id, spawnCount);

  // Every robot gets a reserved voice and registered melody, regardless of
  // docking state — mute is enforced by AudioEngine reading `audioMode` at
  // schedule time (see scheduleNote), not by withholding registration. This
  // is what makes a Docked robot's mute genuinely overridable from Robot
  // Options: the synth and melody are already live, so flipping audioMode
  // back to 'none' there is enough to hear it despite still being docked.
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
    console.log(`[Spawn] Robot ${robot.id} spawned (${docking}) with ${robot.melody.length} melody events`);
  }
}

/**
 * Create the full fixed-size roster (MAX_ROBOTS robots) once, at locale load.
 * A seeded count within [INITIAL_ACTIVE_ROBOTS_MIN, INITIAL_ACTIVE_ROBOTS_MAX]
 * start Active (full battery); the rest start Docked with varied seeded
 * starting battery so they don't all finish recharging in lockstep. Does
 * NOT assign jobs — worldTransition.ts's initializeLocale does that for the
 * initially-Active robots immediately after this returns (see
 * docs/specs/ROBOT_SYSTEMS_ENGINE.md's Architecture Decisions on why job
 * assignment isn't done here: avoids an import cycle with robotSystems.ts).
 */
export function spawnInitialRoster(localeId: string): void {
  const locale = useLocaleStore.getState().getLocaleById(localeId);
  const noiseMap = locale ? getLocaleNoiseMap(localeId, locale.coordinates.x, locale.coordinates.y) : null;

  const activeCount = INITIAL_ACTIVE_ROBOTS_MIN + Math.floor(
    noiseMap
      ? getSeededVal(noiseMap, 'roster.activeCount', 0, 0, INITIAL_ACTIVE_ROBOTS_MAX - INITIAL_ACTIVE_ROBOTS_MIN + 1)
      : alea(`${localeId}:activeCount`)() * (INITIAL_ACTIVE_ROBOTS_MAX - INITIAL_ACTIVE_ROBOTS_MIN + 1)
  );

  for (let i = 0; i < MAX_ROBOTS; i++) {
    if (i < activeCount) {
      spawnRobot(localeId, { docking: DockingState.Active, batteryLevel: 100 });
    } else {
      const dockedBattery = Math.floor(
        noiseMap
          ? getSeededVal(noiseMap, 'roster.dockedBattery', i, 0, 100)
          : alea(`${localeId}:dockedBattery:${i}`)() * 100
      );
      spawnRobot(localeId, { docking: DockingState.Docked, batteryLevel: dockedBattery });
    }
  }
}

/**
 * Re-register every robot's audio with AudioEngine after a power-on.
 * `AudioEngine.killAll()` (called on power-off) tears down every reserved
 * voice regardless of docking state; every robot survives the power cycle
 * now (nothing is ever removed), and every robot — Docked included — keeps
 * its voice reserved and melody registered so `audioMode` alone governs
 * whether it's actually heard (see spawnRobot/robotSystems.ts's landing
 * effects). So every robot needs re-registering here, not just Active ones.
 */
export function reRegisterAllRobotsAudio(localeId: string): void {
  const robots = useLocaleStore.getState().getLocaleById(localeId)?.robots || [];
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
  if (DEV_TUNING) console.log(`[SpawnSystem] reRegisterAllRobotsAudio: re-registered ${robots.length} robots`);
}
