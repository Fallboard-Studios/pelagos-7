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

// ADSR ranges. Roadmap Phase 9: unified to one flat 0-5s range for attack/decay/release
// (previously mismatched per-field maxes of 2/2/5) — kept deliberately narrower than the Ping
// Contour drawer's 0-10s edit range, the same "generation range narrower than what a user can
// dial to by hand" relationship every other seeded field in this phase has.
const ATTACK_RANGE = { min: 0.0, max: 5.0 };
const DECAY_RANGE = { min: 0.0, max: 5.0 };
const SUSTAIN_RANGE = { min: 0.0, max: 1.0 };
const RELEASE_RANGE = { min: 0.0, max: 5.0 };

// Signature Array is a fixed 3-slot layer array (Roadmap Phase 9) — Baseline/Coaxial/Harmonic,
// replacing the old variable 1..MAX_LAYERS count. ADSR_MAX is a separate normalization constant
// for mapping the shared adsr into 0..1 shape params below — unrelated to the generation ranges
// above, unchanged by this phase.
const LAYER_COUNT = 3;
const ADSR_MAX = { attack: 2, decay: 2, sustain: 1, release: 5 };
/** Probability threshold Coaxial's/Harmonic's active seed draw ([0, 1]) must clear to seed
 *  `true` — a plain 50/50 coin flip. No product requirement pinned a specific bias; this is the
 *  least-presumptuous default for "each independently seeded active or inactive." */
const LAYER_ACTIVE_THRESHOLD = 0.5;

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
 * Generate a spawn position just outside the visible SVG viewBox, below the
 * bottom edge. Robots are invisible here (SVG clips to viewBox) and swim
 * inward on their first idle tick, creating a natural "surfacing from below"
 * entrance. Every robot enters and exits exclusively via the bottom of the
 * world view — this is also what robotSystems.ts's landOnDocked reuses to
 * reposition a robot once it's actually docked, so a robot's off-screen
 * resting spot is always south too, never to the sides or above.
 */
export function generateSpawnPosition(noiseMap: NoiseFunction2D, offset: number): Vec2 {
  return {
    x: getSeededVal(noiseMap, 'spawn.pos.x', offset, 0, WORLD_WIDTH),
    y: WORLD_HEIGHT + OFFSCREEN_OFFSET + getSeededVal(noiseMap, 'spawn.pos.y', offset, 0, 50),
  };
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
  // Generate the fixed 3-layer Signature Array (Baseline/Coaxial/Harmonic, Roadmap Phase 9).
  // There is no per-layer ADSR anymore — every layer shares the one `adsr` envelope above; shape
  // params are mapped directly from it (normalized by ADSR_MAX), not a gain-weighted average
  // across layers. If you change the mapping, update docs and robotVisualMapper accordingly.
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const layers: OscillatorLayer[] = [];
  for (let i = 0; i < LAYER_COUNT; i++) {
    const layerOffset = offset * 10 + i;
    // Baseline (layers[0]) is always active; Coaxial/Harmonic (layers[1]/[2]) are each
    // independently seeded — muting one doesn't discard its configuration (see AudioEngine.ts's
    // filterActiveLayers), so an inactive layer still gets a full, ready-to-resume config here.
    const active = i === 0
      ? true
      : getSeededVal(noiseMap, 'robot.audio.layer.active', layerOffset, 0, 1) >= LAYER_ACTIVE_THRESHOLD;
    const layerWave: OscillatorLayer = {
      type: WAVEFORMS[Math.floor(getSeededVal(noiseMap, 'robot.audio.layer.waveform', layerOffset, 0, WAVEFORMS.length))],
      gain: getSeededVal(noiseMap, 'robot.audio.layer.gain', layerOffset, 0.2, 1.2),
      detune: getSeededVal(noiseMap, 'robot.audio.layer.detune', layerOffset, -2, 2),
      phase: Math.floor(getSeededVal(noiseMap, 'robot.audio.layer.phase', layerOffset, 0, 361)) || 0,
      active,
    };
    layers.push(layerWave);
  }

  const averagedGain = (layers.reduce((s, l) => s + (l.gain ?? 1), 0) / layers.length) || 1;

  // Map the shared adsr (normalized by ADSR_MAX) into simple ShapeParams (0..1)
  // Mapping rules:
  //   - scale: larger when attack is shorter (snappier envelope → bigger robot)
  //   - roundness: mapped from sustain (higher sustain → rounder shape)
  //   - detail: mapped from release (longer release → more detail/greebles)
  // If you adjust these, update robotVisualMapper and docs for consistency.
  const scale = clamp(0.25 + (1 - adsr.attack / ADSR_MAX.attack) * 0.75);
  const roundness = clamp(adsr.sustain / ADSR_MAX.sustain);
  const detail = clamp(adsr.release / ADSR_MAX.release);

  const visualAudioMap = {
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
 * Probability threshold an LFO target's active seed draw ([0, 1]) must clear to seed `true` — a
 * plain 50/50 coin flip, matching LAYER_ACTIVE_THRESHOLD's rationale (no product requirement
 * pinned a specific bias for "each independently seeded active or inactive").
 */
const LFO_ACTIVE_THRESHOLD = 0.5;

/**
 * Generate seeded LfoSettings for all 13 RobotLfoTargetId modulation targets,
 * the same way as the rest of a robot's audio personality (generateAudioAttributes
 * above) — per docs/tasks/LFO_INTEGRATION_PLAN.md Task 13. Each target gets its
 * own dot-namespaced dataId ('robot.lfo.<target>.<field>'), so a single shared
 * `offset` naturally yields distinct values per target without needing the
 * per-index offset multiplier the oscillator-layer loop above uses (that's only
 * needed when multiple items share one dataId string). `active` is seeded per
 * target too (Roadmap Phase 9), mirroring how the global Audio Rig chain already
 * seeds some effects' LFOs already-on per planet — a freshly-spawned robot can
 * have real modulation already audible before anything is touched.
 */
export function generateRobotLfoSettings(noiseMap: NoiseFunction2D, offset: number): Record<RobotLfoTargetId, LfoSettings & { active: boolean }> {
  const entries = ROBOT_LFO_TARGET_IDS.map((target) => {
    const shapeIdx = Math.min(
      LFO_SHAPES.length - 1,
      Math.floor(getSeededVal(noiseMap, `robot.lfo.${target}.shape`, offset, 0, LFO_SHAPES.length))
    );
    const settings: LfoSettings & { active: boolean } = {
      shape: LFO_SHAPES[shapeIdx],
      rate: getSeededVal(noiseMap, `robot.lfo.${target}.rate`, offset, LFO_RATE_MIN, LFO_RATE_MAX),
      depth: getSeededVal(noiseMap, `robot.lfo.${target}.depth`, offset, LFO_DEPTH_MIN, LFO_DEPTH_MAX),
      active: getSeededVal(noiseMap, `robot.lfo.${target}.active`, offset, 0, 1) >= LFO_ACTIVE_THRESHOLD,
    };
    return [target, settings] as const;
  });
  return Object.fromEntries(entries) as Record<RobotLfoTargetId, LfoSettings & { active: boolean }>;
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
      AudioEngine.reserveVoice(robot.id, layers, robot.audioAttributes.adsr, robot.audioAttributes.phase, robot.audioAttributes.detune, layers[0]?.pulseWidth, robot.masterVolume);
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
 * This release-then-reserve pass predates this phase and was already
 * unconditional on `killAll()` for whichever robots it covered — this phase
 * just widened *which* robots that is: every robot now keeps its voice
 * reserved and melody registered across a dock cycle (mute is `audioMode`
 * alone, see spawnRobot/robotSystems.ts's landing effects), not just the old
 * `persists`-flagged ones, so every robot needs re-registering here now, not
 * a filtered subset.
 *
 * Note: `AudioEngine.killAll()` itself does not touch the `compositeVoices`
 * map (confirmed by reading it) — voices are not actually known to be
 * invalidated by a power cycle. This re-registration may be unnecessary
 * defensive work carried over from before this phase; left as-is rather than
 * removed, since that's a separate, unverified behavior change this phase
 * didn't set out to make.
 */
export function reRegisterAllRobotsAudio(localeId: string): void {
  const robots = useLocaleStore.getState().getLocaleById(localeId)?.robots || [];
  robots.forEach((robot) => {
    AudioEngine.releaseVoice(robot.id);
    try {
      const layers = (robot.audioAttributes as unknown as { layers?: OscillatorLayer[] })?.layers;
      if (Array.isArray(layers) && layers.length > 0) {
        AudioEngine.reserveVoice(robot.id, layers, robot.audioAttributes.adsr, robot.audioAttributes.phase, robot.audioAttributes.detune, layers[0]?.pulseWidth, robot.masterVolume);
      }
    } catch (err) {
      if (DEV_TUNING) console.warn('[SpawnSystem] reRegisterAllRobotsAudio: reserveVoice failed for', robot.id, err);
    }
    AudioEngine.unregisterRobotMelody(robot.id);
    AudioEngine.registerRobotMelody(robot.id, robot.melody);
  });
  if (DEV_TUNING) console.log(`[SpawnSystem] reRegisterAllRobotsAudio: re-registered ${robots.length} robots`);
}
