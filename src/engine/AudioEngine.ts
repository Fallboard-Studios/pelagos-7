// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';
import gsap from 'gsap';
import { useLocaleStore } from '../stores/localeStore';
import { getActiveLocaleId } from '../utils/localeHelpers';

import type { NoteDuration, WaveformType, Robot } from '../types/Robot';
import type { OscillatorLayer } from '../types/layeredAudio';
import type { ReverbSettings, DelaySettings, ChorusSettings, FilterSettings, EQ3Settings, CompressorSettings } from '../types/globalAudio';
import { getAvailableNotes, scheduleHarmonyCycle, stopHarmonyCycle } from './harmonySystem';
import { resetBeatClock, subscribeToMeasure, initBeatClock } from './beatClock';
import type { RobotMelodyEvent } from './melodyGenerator';
import { applyRhythmicVariance, applyTonalVariance } from './melodyGenerator';
import { DEV_TUNING, WORLD_WIDTH, MIN_LEAD as CONST_MIN_LEAD } from '../constants';

// MIN_LEAD: prefer project constant, fall back to 0.1s for headless/tests
const MIN_LEAD = CONST_MIN_LEAD ?? 0.1;
import { getRef } from '../utils/refs';
import { swallow } from '../utils/helpers';
import { precomputeDataX } from '../utils/getSeededVal';
import { tryGetLocaleNoiseMap } from '../utils/noiseMaps';

// ========================================
// TYPES
// ========================================
export interface NoteParams {
  robotId: string;
  note: string;
  duration: NoteDuration;
  time?: number;
  velocity?: number;
}

interface MelodyEventEntry {
  robotId: string;
  event: RobotMelodyEvent;
}

// Minimal shape used for test/runtime fallbacks where Tone classes may be absent.
interface MinimalToneNode {
  connect: (target?: unknown) => unknown;
  disconnect?: () => void;
  toDestination?: () => void;
  gain?: { value: number };
  pan?: { value: number };
}

// Lightweight synth shape used for safe typed access to set/oscillator fields
interface SynthWithOscillator {
  set?: (props: unknown) => void;
  oscillator?: {
    detune?: { value: number } | number;
    phase?: { value?: number } | number;
  };
  triggerAttackRelease?: (note: string, dur: string, time?: number, v?: number) => void;
  triggerAttack?: (note: string, time?: number, v?: number) => void;
  triggerRelease?: (time?: number) => void;
  dispose?: () => void;
  connect?: (t?: unknown) => unknown;
}

// ========================================
// CONSTANTS
// ========================================
const MAX_POLYPHONY = 16;
// NOTE: MIN_LEAD is provided from src/constants for consistency across modules
/** Fraction of notes that receive a random velocity offset for organic expressiveness. */
const VELOCITY_VARIANCE_RATE = 0.15;
/** Maximum ± deviation applied to a note's velocity when variance is triggered. */
const VELOCITY_VARIANCE_AMOUNT = 0.25;  // ±25% offset
/** Minimum effective note velocity after clamping (prevents silent notes). */
const VELOCITY_MIN = 0.05;

// Precompute data X positions for seeded noise sampling (module scope — hot path safe)
const VELOCITY_ROLL_X = precomputeDataX('audio.velocityRoll');
const VELOCITY_VARIANCE_X = precomputeDataX('audio.velocityVariance');

// Lightweight record view of Tone to access constructors safely in test/runtime
const toneRecord = Tone as unknown as Record<string, unknown>;

// ========================================
// MODULE STATE
// ========================================
let initialized = false;
// instrumentsLoaded intentionally survives stop()/killAll() — the FX chain
// (compressor, reverb, delay, etc.) is expensive to rebuild and remains valid
// across start/stop cycles. Only a full page reload resets it.
let instrumentsLoaded = false;
// Reservation state
let activeVoices = 0;
// Prefixed with underscore to acknowledge it's intentionally kept for
// potential external inspector/debugging while avoiding unused-var lint.
let _masterCompressor: Tone.Compressor | null = null;

// Global FX chain nodes (nullable; initialized in loadInstruments when Tone is available)
let _globalReverb: Tone.Reverb | null = null;
let _globalDelay: Tone.FeedbackDelay | null = null;
let _globalChorus: Tone.Chorus | null = null;
let _globalEQ: Tone.EQ3 | null = null;
let _globalLPF: Tone.Filter | null = null;
let _globalHPF: Tone.Filter | null = null;
// Master output gain controlling overall volume (used by setMasterVolume/getMasterVolume)
let _masterGain: Tone.Gain | null = null;
let _masterVolume = 1;

/**
 * Cache of the last wet/level values for each FX node — used to restore values
 * when an effect is re-enabled after being bypassed via setEffectBypass().
 */
const _fxParamCache = {
  reverb: { wet: 0.3 },
  delay: { wet: 0.15 },
  chorus: { wet: 0.2 },
  eq3: { low: 0, mid: 0, high: 0 },
  lpf: { frequency: 20000, Q: 1 },
  hpf: { frequency: 20, Q: 1 },
  compressor: { threshold: -18, ratio: 6, attack: 0.003, release: 0.15, knee: 0 },
};

// Step registry: Map<stepNumber (1-16), events at that step>
const stepRegistry = new Map<number, MelodyEventEntry[]>();

let stepCounter = 0;
let scheduledTickId: number | null = null;

// Cache Tone.Transport instance returned by Tone.getTransport() so repeated calls
// return the same mock instance in tests and the same runtime transport in-app.
let _transport: ReturnType<typeof Tone.getTransport> | null = null;
/** Robot masterVolume cache — keyed by robotId to avoid per-note Zustand store scans.
 * Populated on first note for a robot, cleared when its melody is unregistered. */
const robotAttributeCache = new Map<string, { masterVolume: number }>();

// Composite voices (created from LayeredWave descriptors) stored separately
interface CompositeVoice {
  output: Tone.Gain;
  triggerAttackRelease: (note: string, dur: NoteDuration | string, time?: number, velocity?: number) => void;
  set: (params: { layers?: Partial<OscillatorLayer>[]; outputGain?: number }) => void;
  dispose?: () => void;
}

const compositeVoices: Map<string, {
  composite: CompositeVoice;
  panner: Tone.Panner;
  busGain: Tone.Gain;
  busFilter: Tone.Filter;
}> = new Map();

// Per-robot note counter used for deterministic seeded sampling (mod 97)
const robotNoteIndex = new Map<string, number>();


// ========================================
// INTERNAL FUNCTIONS
// ========================================

/**
 * Calculate stereo pan value from robot's X position.
 * Returns −0.5 (left) to +0.5 (right) mapped from world coordinate [0, WORLD_WIDTH].
 * Reduced range keeps voices more centered for a cohesive mix.
 *
 * @param x - Robot X position in world space
 * @returns Pan value in range [−0.5, +0.5]
 */
function calculatePanFromPosition(x: number): number {
  return (x / WORLD_WIDTH) * 1 - 0.5;
}

/**
 * Get the robot's current visual X position from the DOM.
 * Reads the current GSAP-animated x transform value from the SVG element.
 * Falls back to stored state position if ref not found or transform unavailable.
 *
 * @param robotId - Robot ID
 * @returns Current visual X position (from DOM) or stored X position (from state)
 */
function getRobotVisualX(robotId: string): number {
  try {
    const ref = getRef(`robot-${robotId}`);
    if (ref) {
      // Read the current x transform applied by GSAP
      const visualX = gsap.getProperty(ref, 'x') as number;
      if (typeof visualX === 'number' && !isNaN(visualX)) {
        return visualX;
      }
    }
  } catch (err) {
    if (DEV_TUNING) swallow(err, 'AudioEngine.getRobotVisualX');
  }

  // Fallback: read position from state
  try {
    const state = useLocaleStore.getState();
    const robot = state.locales[getActiveLocaleId()]?.robots.find((r) => r.id === robotId);
    return robot?.position.x ?? 960; // Default to center if not found
  } catch (err) {
    if (DEV_TUNING) swallow(err, 'AudioEngine.getRobotVisualX.stateFallback');
    return 960; // Default to center
  }
}

/**
 * Initialize the global FX chain and compressor.
 * All composite voices route through this chain.
 */
async function loadInstruments(): Promise<void> {
  if (instrumentsLoaded) return;

  const compressor = new Tone.Compressor({
    threshold: -18,  // engage earlier to tame FM/AM harmonics before clipping
    ratio: 6,        // softer compression ratio; not a hard limiter
    attack: 0.003,
    release: 0.15,
  });
  _masterCompressor = compressor;

  // ========================================
  // GLOBAL FX CHAIN
  // Build: _masterCompressor → _globalEQ → _globalLPF → _globalHPF
  //          → _globalChorus → _globalDelay → _globalReverb → Destination
  // All nodes guarded with typeof checks for test/headless environments.
  // ========================================
  const ReverbCtor = toneRecord.Reverb as unknown as (new (opts: object) => Tone.Reverb) | undefined;
  const DelayCtor = toneRecord.FeedbackDelay as unknown as (new (opts: object) => Tone.FeedbackDelay) | undefined;
  const ChorusCtor = toneRecord.Chorus as unknown as (new (opts: object) => Tone.Chorus) | undefined;
  const EQ3Ctor = toneRecord.EQ3 as unknown as (new (opts: object) => Tone.EQ3) | undefined;
  const FilterCtor = toneRecord.Filter as unknown as (new (opts: object) => Tone.Filter) | undefined;
  const GainCtorFX = toneRecord.Gain as unknown as (new (v: number) => Tone.Gain) | undefined;

  if (typeof ReverbCtor === 'function') {
    _globalReverb = new ReverbCtor({ decay: 1.5, preDelay: 0.02, wet: 0.3 });
  }
  if (typeof DelayCtor === 'function') {
    _globalDelay = new DelayCtor({ delayTime: 0.25, feedback: 0.2, wet: 0 });
  }
  if (typeof ChorusCtor === 'function') {
    _globalChorus = new ChorusCtor({ rate: 1.5, depth: 0.2, delayTime: 0.012, feedback: 0.1, wet: 0 });
    try { (_globalChorus as unknown as { start(): void }).start(); } catch (err) { if (DEV_TUNING) swallow(err, 'chorus.start'); }
  }
  if (typeof EQ3Ctor === 'function') {
    _globalEQ = new EQ3Ctor({ low: 0, mid: 0, high: 0 });
  }
  if (typeof FilterCtor === 'function') {
    _globalLPF = new FilterCtor({ type: 'lowpass', frequency: 20000, Q: 1 });
    _globalHPF = new FilterCtor({ type: 'highpass', frequency: 20, Q: 1 });
  }
  if (typeof GainCtorFX === 'function') {
    // Master gain sits after the FX chain (or final destination) to control overall volume.
    try {
      _masterGain = new (GainCtorFX as unknown as (new (v: number) => Tone.Gain))(1);
    } catch {
      _masterGain = null;
    }
  }

  // Wire chain: compressor → EQ → LPF → HPF → Chorus → Delay → Reverb → Destination
  // Fall back gracefully: connect compressor directly to destination when nodes are missing.
  const chainNodes = [
    _globalEQ,
    _globalLPF,
    _globalHPF,
    _globalChorus,
    _globalDelay,
    _globalReverb,
  ].filter(Boolean) as Array<{ connect: (t: unknown) => unknown; toDestination?: () => void }>;

  if (chainNodes.length > 0) {
    try {
      // connect compressor → first FX node
      (compressor as unknown as { connect: (t: unknown) => void }).connect(chainNodes[0]);
      // connect each FX node to the next
      for (let i = 0; i < chainNodes.length - 1; i++) {
        chainNodes[i].connect(chainNodes[i + 1]);
      }
      // connect last FX node → Master gain → Destination (masterGain optional)
      try {
        if (_masterGain) {
          chainNodes[chainNodes.length - 1].connect(_masterGain);
          try { _masterGain.toDestination?.(); } catch (err) { if (DEV_TUNING) swallow(err, 'masterGain.toDestination'); }
        } else {
          try { chainNodes[chainNodes.length - 1].toDestination?.(); } catch (err) { if (DEV_TUNING) swallow(err, 'chain.toDestination'); }
        }
      } catch (err) {
        if (DEV_TUNING) swallow(err, 'AudioEngine.fxChain.connect');
        try { compressor.toDestination(); } catch { /* headless */ }
      }
    } catch (err) {
      if (DEV_TUNING) swallow(err, 'AudioEngine.fxChain.topLevel');
      try { compressor.toDestination(); } catch (err) { if (DEV_TUNING) swallow(err, 'compressor.toDestination'); }
    }
  } else {
    // No FX nodes available (test env) — route directly to destination
    try {
      if (_masterGain) {
        (compressor as unknown as { connect: (t: unknown) => void }).connect(_masterGain);
        try { _masterGain.toDestination?.(); } catch { /* headless */ }
      } else {
        compressor.toDestination();
      }
    } catch (err) { if (DEV_TUNING) swallow(err); }
  }

  instrumentsLoaded = true;
  if (DEV_TUNING) console.log('[AudioEngine] FX chain loaded');

  // If robots spawned before AudioEngine initialized, reserve their composite voices now.
  try {
    const store = useLocaleStore.getState();
    const robots = store.locales[getActiveLocaleId()]?.robots ?? [];
    if (store && Array.isArray(robots) && robots.length > 0) {
      if (DEV_TUNING) console.log(`[AudioEngine] Attempting post-load reservations for ${robots.length} robots`);
      robots.forEach((robot: Robot) => {
        try {
          const layers = (robot.audioAttributes as unknown as { layers?: OscillatorLayer[] })?.layers;
          if (Array.isArray(layers) && layers.length > 0) {
            const ok = AudioEngine.reserveVoice(
              robot.id,
              layers,
              robot.audioAttributes?.phase,
              robot.audioAttributes?.detune,
              (robot.audioAttributes as unknown as { layers?: OscillatorLayer[] })?.layers?.[0]?.pulseWidth,
            );
            if (DEV_TUNING) console.log(`[AudioEngine] Post-load reserve for ${robot.id}: ${ok ? 'OK' : 'FAILED'}`);
          }
        } catch (err) {
          if (DEV_TUNING) console.warn('[AudioEngine] Failed post-load reservation for robot', robot.id, err);
        }
      });
    }
  } catch (err) {
    if (DEV_TUNING) console.warn('[AudioEngine] Post-load reservation pass failed', err);
  }
}

/**
 * Schedule voice release at the exact time note ends.
 */
function scheduleVoiceRelease(duration: NoteDuration, time: number): void {
  const durSec = Tone.Time(duration).toSeconds();
  // Use a transport-relative offset ('+N' syntax) so the release fires correctly
  // regardless of when in the AudioContext lifetime the note was scheduled.
  // `time` is an absolute AudioContext timestamp; `Tone.now()` is the current
  // AudioContext time, so their difference is the lookahead until the note fires.
  const delayFromNow = Math.max(0, (time - Tone.now()) + durSec + 0.04);

  try {
    const transport = _transport ?? Tone.getTransport();
    transport.scheduleOnce(() => {
      activeVoices = Math.max(0, activeVoices - 1);
    }, `+${delayFromNow}`);
  } catch (err) {
    if (DEV_TUNING) swallow(err, 'AudioEngine.scheduleVoiceRelease');
    activeVoices = Math.max(0, activeVoices - 1);
    if (DEV_TUNING) console.warn('[AudioEngine] Failed to schedule voice release, immediate fallback', err);
  }
}

/**
 * Update all reserved panners' pan values once per tick to avoid frequent DOM reads
 * and per-trigger panner updates which can cause main-thread jank.
 * Called from the Transport tick with the scheduled `time` for accuracy.
 */
function updateAllPanners(_time?: number): void {
  try {
    for (const [robotId, entry] of compositeVoices.entries()) {
      try {
        const visualX = getRobotVisualX(robotId);
        const panValue = calculatePanFromPosition(visualX);
        entry.panner.pan.value = panValue;
      } catch (err) {
        if (DEV_TUNING) console.warn('[AudioEngine] Failed to update composite panner for', robotId, err);
      }
    }
  } catch (err) {
    if (DEV_TUNING) console.warn('[AudioEngine] updateAllPanners failed', err);
  }
}
/**
 * Trigger note with polyphony cap enforcement.
 * Applies per-robot synth selection and ADSR envelope when provided.
 * Returns true if note was triggered, false if skipped due to cap.
 */
export function triggerWithCap(params: NoteParams): boolean {
  const { robotId, note, duration, time } = params;

  // Check polyphony limit
  if (activeVoices >= MAX_POLYPHONY) {
    if (DEV_TUNING) {
      console.log(
        `[AudioEngine] Polyphony capped: ${activeVoices}/${MAX_POLYPHONY}`
      );
    }
    return false;
  }

  // Enforce audioMode at trigger time as a safety net in case schedule path missed it.
  try {
    const localeId = getActiveLocaleId();
    const store = useLocaleStore.getState();
    const localeRobots = store.locales[localeId]?.robots ?? [];
    if (localeRobots.length > 0) {
      const robotFromStore = localeRobots.find((r) => r.id === robotId);
      if (robotFromStore?.audioMode === 'mute') {
        if (DEV_TUNING) console.log(`[AudioEngine] Robot ${robotId} is muted (trigger); skipping note`);
        return false;
      }
      const anySoloInStore = localeRobots.some((r) => r.audioMode === 'solo');
      if (anySoloInStore && robotFromStore?.audioMode !== 'solo') {
        if (DEV_TUNING) console.log(`[AudioEngine] Robot ${robotId} suppressed due to solo (trigger)`);
        return false;
      }
      // Highlight attenuation is handled in scheduleNote; skip here to avoid double-attenuation.
    }
  } catch (err) {
    if (DEV_TUNING) swallow(err, 'AudioEngine.triggerWithCap.audioMode');
  }

  const scheduleTime = time ?? Tone.now();
  activeVoices++;

  try {
    if (!compositeVoices.has(robotId)) {
      activeVoices = Math.max(0, activeVoices - 1);
      if (DEV_TUNING) console.warn(`[AudioEngine] No composite voice reserved for ${robotId}, skipping note`);
      return false;
    }

    const comp = compositeVoices.get(robotId);
    const synth = comp?.composite ?? null;
    const panner = comp?.panner ?? null;

    if (!synth) {
      activeVoices = Math.max(0, activeVoices - 1);
      if (DEV_TUNING) console.warn('[AudioEngine] No composite voice available, skipping note');
      return false;
    }

    // Validate note string before touching the synth — an invalid note can start
    // an oscillator attack before throwing, leaving voices permanently open.
    const NOTE_RE = /^[A-Ga-g][b#]{0,2}\d+$/;
    if (!NOTE_RE.test(note)) {
      activeVoices = Math.max(0, activeVoices - 1);
      console.warn(`[AudioEngine] Invalid note string "${note}", skipping`);
      return false;
    }

    if (panner) {
      try {
        const visualX = getRobotVisualX(robotId);
        panner.pan.value = calculatePanFromPosition(visualX);
      } catch (err) {
        console.warn('[AudioEngine] Failed to calculate/apply pan:', err);
      }
    }

    synth.triggerAttackRelease(note, duration, scheduleTime, params.velocity ?? 0.8);
    scheduleVoiceRelease(duration, scheduleTime);
    return true;
  } catch (err) {
    console.error('[AudioEngine] Failed to trigger note:', err);
    activeVoices = Math.max(0, activeVoices - 1);
    return false;
  }
}

/**
 * Start the main melody playback loop (8th-note tick).
 * At each 16-step loop completion, apply rhythmic variance to all active robots' melodies
 * and update their state for the next loop iteration.
 */
function startMelodyPlayback(): void {
  if (scheduledTickId !== null) return;

  const transport = _transport ?? Tone.getTransport();

  scheduledTickId = transport.scheduleRepeat((time: number) => {
    // Update panners once per tick to reduce per-note DOM reads and main-thread work.
    updateAllPanners(time);

    const currentStep = (stepCounter % 16) + 1; // 1..16
    const events = stepRegistry.get(currentStep) || [];
    const notes = getAvailableNotes();

    events.forEach(({ robotId, event }) => {
      const noteName = notes[event.noteIndex]; // note name without octave, e.g. "C"

      if (!noteName) {
        if (DEV_TUNING) console.warn(
          `[AudioEngine] Invalid note index ${event.noteIndex} for robot ${robotId}`
        );
        return;
      }

      // Fallback octave of 4 handles stale events that pre-date the octaveRange change.
      const octave = event.octave ?? 4;
      const note = `${noteName}${octave}`; // combine with per-event octave, e.g. "C4"

      AudioEngine.scheduleNote({
        robotId,
        note,
        duration: event.length,
        time: time + MIN_LEAD,
      });
    });

    stepCounter++;

    // ========================================
    // LOOP COMPLETION: Apply rhythmic variance
    // ========================================
    // At loop boundary (16-step loop completed), apply O(robots × registry) variance
    // synchronously — Tone.js transport callbacks run on the main thread, so Zustand
    // reads/writes and stepRegistry mutations are safe here without any deferral.
    if (stepCounter % 16 === 0) {
      if (DEV_TUNING) {
        console.log(`[AudioEngine] Loop boundary reached at step ${stepCounter}`);
      }
      try {
        const store = useLocaleStore.getState();
        const robots = store.locales[getActiveLocaleId()]?.robots ?? [];
        const robotCount = robots.length;
        if (DEV_TUNING) {
          console.log(`[AudioEngine] Checking variance for ${robotCount} robots`);
        }

        robots.forEach((robot) => {
          // Store original data to detect changes
          const originalMelody = robot.melody;
          const originalSteps = originalMelody.map((e) => e.startStep);

          // Apply variance (returns new array or original); both apply independently
          const rhythmicVaried = applyRhythmicVariance(originalMelody as never);
          const variedMelody = applyTonalVariance(rhythmicVaried as never);

          // Detect if any field changed across both passes
          const newSteps = variedMelody.map((e) => e.startStep);
          const newIndices = variedMelody.map((e) => e.noteIndex);
          const originalIndices = originalMelody.map((e) => e.noteIndex);
          const changed =
            originalSteps.some((step, i) => step !== newSteps[i]) ||
            originalIndices.some((idx, i) => idx !== newIndices[i]);

          if (changed) {
            // Update stepRegistry with varied melody for THIS loop's playback only
            // (don't persist to state, so next loop resets to original)
            AudioEngine.unregisterRobotMelody(robot.id);
            AudioEngine.registerRobotMelody(robot.id, variedMelody as never);

            if (DEV_TUNING) {
              const stepShifts = originalSteps
                .map((step, i) => (step !== newSteps[i] ? `step${i}:${step}→${newSteps[i]}` : null))
                .filter((x) => x !== null)
                .join(', ');
              const noteShifts = originalIndices
                .map((idx, i) => (idx !== newIndices[i] ? `note${i}:${idx}→${newIndices[i]}` : null))
                .filter((x) => x !== null)
                .join(', ');
              const summary = [stepShifts, noteShifts].filter(Boolean).join(' | ');
              console.log(
                `[AudioEngine] Variance applied to robot ${robot.id}: ${summary}`
              );
            }
          }
        });
      } catch (err) {
        console.warn('[AudioEngine] Failed to apply rhythmic variance:', err);
      }
    }
  }, '8n');

  if (DEV_TUNING) console.log('[AudioEngine] Melody playback started (8n tick)');
}

// ========================================
// AUDIOENGINE SINGLETON (FUNCTIONAL)
// ========================================

/**
 * Deterministic, locale-seeded velocity computation.
 * Samples the active locale's noise map at precomputed X positions and the
 * per-robot note index (mod 97) to decide whether to apply variance.
 * Falls back to no variance when the noise map is unavailable.
 */
function computeNoteVelocitySeeded(masterVolume: number, robotId?: string): number {
  const localeId = getActiveLocaleId();
  const noiseMap = tryGetLocaleNoiseMap(localeId);
  if (!noiseMap) return Math.min(1, Math.max(VELOCITY_MIN, masterVolume));

  const idx = robotId ? (robotNoteIndex.get(robotId) ?? 0) : 0;
  const noteIndex = idx % 97; // prime period for long non-repeating patterns

  // Determine roll to decide whether to apply variance
  const roll = (noiseMap(VELOCITY_ROLL_X, noteIndex) + 1) / 2; // map [-1,1] -> [0,1]
  if (roll < VELOCITY_VARIANCE_RATE) {
    const raw = noiseMap(VELOCITY_VARIANCE_X, noteIndex); // [-1,1]
    const variance = raw * VELOCITY_VARIANCE_AMOUNT; // signed
    const out = Math.min(1, Math.max(VELOCITY_MIN, masterVolume + variance));
    // increment per-robot counter
    if (robotId) robotNoteIndex.set(robotId, (idx + 1) % 97);
    return out;
  }

  if (robotId) robotNoteIndex.set(robotId, (idx + 1) % 97);
  return Math.min(1, Math.max(VELOCITY_MIN, masterVolume));
}

export const AudioEngine = {
  async start(): Promise<void> {
    if (initialized) return;

    await Tone.start();
    await loadInstruments();

    // Reverb generates its impulse response asynchronously — wait before transport starts
    if (_globalReverb) {
      try { await (_globalReverb as unknown as { ready: Promise<void> }).ready; } catch (err) { if (DEV_TUNING) swallow(err, 'reverb.ready'); }
    }

    const transport = Tone.getTransport();
    _transport = transport;
    // Always start audio transport at 0 so music begins at measure 0 regardless
    // of the world time. Do NOT realign transport.position with store.
    if (transport.state !== 'started') {
      await transport.start();
    }

    initBeatClock(transport);
    // Ensure `currentMeasure` in the ocean store is driven by the BeatClock.
    // This updates visuals (lighting) and allows harmony to derive from measures.
    try {
      subscribeToMeasure((m: number) => {
        useLocaleStore.getState().setLocaleData(getActiveLocaleId(), { currentMeasure: m });
      });
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] subscribeToMeasure failed', err);
    }
    startMelodyPlayback();
    scheduleHarmonyCycle(transport);

    initialized = true;
    if (DEV_TUNING) console.log('[AudioEngine] Started');
  },

  stop(): void {
    const transport = _transport ?? Tone.getTransport();

    if (scheduledTickId !== null) {
      try { transport.clear(scheduledTickId); } catch (err) { if (DEV_TUNING) swallow(err, 'transport.clear'); }
      scheduledTickId = null;
    }

    stopHarmonyCycle();

    try {
      if (transport.state === 'started') {
        try { transport.stop(); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }

    stepCounter = 0;
    activeVoices = 0;
    initialized = false;

    if (DEV_TUNING) console.log('[AudioEngine] Stopped');
  },

  /**
  * Schedule a note using NoteParams. If `adsr` are not provided
  * the robot's current `audioAttributes` are looked up in the store and
   * applied at scheduling time.
   */
  scheduleNote(params: NoteParams): void {
    const { robotId, note, duration, time } = params;
    let effectiveVelocity = params.velocity;

    if (robotId && effectiveVelocity === undefined) {
      const cached = robotAttributeCache.get(robotId);
      if (cached) {
        effectiveVelocity = computeNoteVelocitySeeded(cached.masterVolume, robotId);
      } else {
        try {
          const state = useLocaleStore.getState();
          const robot = state.locales[getActiveLocaleId()]?.robots.find((r) => r.id === robotId);
          if (robot) {
            robotAttributeCache.set(robotId, { masterVolume: robot.masterVolume ?? 0.7 });
            effectiveVelocity = computeNoteVelocitySeeded(robot.masterVolume ?? 0.7, robot.id);
          }
        } catch (err) {
          console.warn('[AudioEngine] Failed to lookup robot masterVolume:', err);
        }
      }
    }

    // Enforce audioMode policies (mute/solo/highlight) at schedule time.
    const localeIdResolved = getActiveLocaleId();
    try {
      const store = useLocaleStore.getState();
      const localeRobots = store.locales[localeIdResolved]?.robots ?? [];
      const robotFromStore = localeRobots.find((r) => r.id === robotId);
      if (robotFromStore?.audioMode === 'mute') {
        if (DEV_TUNING) console.log(`[AudioEngine] Robot ${robotId} is muted; skipping note`);
        return;
      }
      const anySolo = localeRobots.some((r) => r.audioMode === 'solo');
      if (anySolo && robotFromStore?.audioMode !== 'solo') {
        if (DEV_TUNING) console.log(`[AudioEngine] Robot ${robotId} suppressed due to solo`);
        return;
      }
      const anyHighlight = localeRobots.some((r) => r.audioMode === 'highlight');
      if (anyHighlight && robotFromStore?.audioMode !== 'highlight') {
        // Apply ~50% attenuation (~-6dB) to non-highlighted robots
        effectiveVelocity = (effectiveVelocity ?? 1) * 0.5;
      }
    } catch (err) {
      if (DEV_TUNING) swallow(err, 'AudioEngine.scheduleNote.audioMode');
    }

    triggerWithCap({ robotId, note, duration, time, velocity: effectiveVelocity });
  },

  /**
   * Reserve a composite voice for a robot from a LayeredWave descriptor.
   * Creates per-robot bus nodes (panner → gain → filter → compressor).
   * Returns true if reserved, false if creation failed.
   *
   * @param robotId - Robot ID
   * @param descriptor - LayeredWave descriptor from the robot's audioAttributes
   * @param phase - Optional oscillator phase (degrees) applied across all layers
   * @param detune - Optional detune (cents) applied across all layers
   */
  reserveVoice(
    robotId: string,
    descriptor: OscillatorLayer[] | { base?: WaveformType; layers?: OscillatorLayer[] },
    phase?: number,
    detune?: number,
    pulseWidth?: number,
  ): boolean {
    try {
      const composite = AudioEngine.createCompositeVoice(descriptor);

      // Create per-robot bus: panner -> gain -> filter -> master compressor/destination
      const PannerCtor = toneRecord.Panner as unknown as (new (...args: unknown[]) => unknown) | undefined;
      const GainCtorLocal = toneRecord.Gain as unknown as (new (...args: unknown[]) => unknown) | undefined;
      const FilterCtor = toneRecord.Filter as unknown as (new (...args: unknown[]) => unknown) | undefined;

      const panner = typeof PannerCtor === 'function' ? new (PannerCtor as unknown as (new (...args: unknown[]) => Tone.Panner))({ pan: 0 }) as Tone.Panner : ({ connect: () => { }, pan: { value: 0 }, disconnect: () => { } } as MinimalToneNode) as unknown as Tone.Panner;
      const busGain = typeof GainCtorLocal === 'function' ? new (GainCtorLocal as unknown as (new (...args: unknown[]) => Tone.Gain))(1) as Tone.Gain : ({ connect: () => ({}), disconnect: () => { }, gain: { value: 1 }, toDestination: () => { } } as MinimalToneNode) as unknown as Tone.Gain;
      const busFilter = typeof FilterCtor === 'function' ? new (FilterCtor as unknown as (new (...args: unknown[]) => Tone.Filter))({ frequency: 1200, Q: 1 }) as Tone.Filter : ({ connect: () => ({}), disconnect: () => { }, toDestination: () => { } } as MinimalToneNode) as unknown as Tone.Filter;

      // Connect graph: composite.output -> panner -> busGain -> busFilter -> master compressor/destination
      try { composite.output.connect(panner); } catch (e) { if (DEV_TUNING) console.warn('[AudioEngine] composite.output.connect failed', e); }
      try { (panner as unknown as { connect?: (target?: unknown) => unknown }).connect?.(busGain); } catch (e) { if (DEV_TUNING) console.warn('[AudioEngine] panner.connect failed', e); }
      try { (busGain as unknown as { connect?: (target?: unknown) => unknown }).connect?.(busFilter); } catch (e) { if (DEV_TUNING) console.warn('[AudioEngine] busGain.connect failed', e); }
      try {
        if (_masterCompressor) {
          (busFilter as unknown as { connect?: (target?: unknown) => unknown }).connect?.(_masterCompressor);
        } else {
          (busFilter as unknown as { toDestination?: () => unknown }).toDestination?.();
        }
      } catch (e) {
        if (DEV_TUNING) console.warn('[AudioEngine] busFilter connection failed', e);
      }

      compositeVoices.set(robotId, { composite, panner, busGain, busFilter });
      // Apply optional top-level detune/phase/pulseWidth across composite layers when provided
      try {
        if (typeof detune === 'number' || typeof phase === 'number' || typeof pulseWidth === 'number') {
          const effectiveLayers = Array.isArray(descriptor)
            ? descriptor
            : (descriptor.layers && descriptor.layers.length > 0 ? descriptor.layers : [{ type: descriptor.base ?? 'sine', gain: 1, detune: 0, phase: 0 } as OscillatorLayer]);
          const layersParam = effectiveLayers.map((l) => ({
            type: l.type,
            detune: typeof detune === 'number' ? (l.detune ?? 0) + detune : undefined,
            phase: typeof phase === 'number' ? phase : undefined,
            pulseWidth: typeof pulseWidth === 'number' ? pulseWidth : l.pulseWidth,
          }));
          composite.set({ layers: layersParam as Partial<OscillatorLayer>[] });
        }
      } catch (e) {
        if (DEV_TUNING) console.warn('[AudioEngine] Failed to apply composite phase/detune/width at reservation time', e);
      }
      if (DEV_TUNING) console.log(`[AudioEngine] Reserved composite voice for ${robotId}`);
      return true;
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] Failed to create composite voice:', err);
      // Fall back to a minimal, test-friendly composite stub so callers can reserve and trigger safely
      const stubComposite = {
        output: ({ connect: () => { } } as MinimalToneNode) as unknown as Tone.Gain,
        triggerAttackRelease: (_note: string, _dur: NoteDuration | string, _time?: number, _vel?: number) => { },
        set: (_params: unknown) => { },
        dispose: () => { },
      } as unknown as CompositeVoice;
      const panner = ({ connect: () => { }, pan: { value: 0 }, disconnect: () => { } } as MinimalToneNode) as unknown as Tone.Panner;
      const busGain = ({ connect: () => { }, disconnect: () => { }, gain: { value: 1 } } as MinimalToneNode) as unknown as Tone.Gain;
      const busFilter = ({ connect: () => { }, disconnect: () => { }, toDestination: () => { } } as MinimalToneNode) as unknown as Tone.Filter;
      compositeVoices.set(robotId, { composite: stubComposite, panner, busGain, busFilter });
      if (DEV_TUNING) console.log(`[AudioEngine] Reserved stub composite voice for ${robotId}`);
      return true;
    }
  },

  /** Release a robot's composite voice and clean up its bus nodes. */
  releaseVoice(robotId: string): void {
    const comp = compositeVoices.get(robotId);
    if (!comp) return;
    try {
      // call composite dispose to cleanup per-layer synths and internal nodes
      try { comp.composite.dispose?.(); } catch (err) { if (DEV_TUNING) console.warn('[AudioEngine] composite.dispose failed', err); }
      comp.panner.disconnect();
      comp.busGain.disconnect();
      comp.busFilter.disconnect();
      // Tone nodes may implement dispose; call when available
      try { comp.panner.dispose?.(); } catch { if (DEV_TUNING) console.warn('[AudioEngine] Failed disposing panner'); }
      try { comp.busGain.dispose?.(); } catch { if (DEV_TUNING) console.warn('[AudioEngine] Failed disposing busGain'); }
      try { comp.busFilter.dispose?.(); } catch { if (DEV_TUNING) console.warn('[AudioEngine] Failed disposing busFilter'); }
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] Failed to cleanup composite nodes', err);
    }
    compositeVoices.delete(robotId);
    robotAttributeCache.delete(robotId);
    robotNoteIndex.delete(robotId);
    if (DEV_TUNING) console.log(`[AudioEngine] Released composite voice for ${robotId}`);
  },

  /** Return the composite voice reserved for a robot, or null if none. */
  getVoiceForRobot(robotId?: string): CompositeVoice | null {
    if (!robotId) return null;
    return compositeVoices.get(robotId)?.composite ?? null;
  },

  /**
   * Deterministic re-reservation helper used by UI/store updates.
   * Reads the robot's current `audioAttributes` from the locale store,
   * calls `releaseVoice(robotId)` then `reserveVoice(...)` with the
   * freshly-read `phase`, `detune`, and `pulseWidth` values so
   * updates from the store are applied immediately to the reserved voice.
   * Returns true when reservation succeeded.
   */
  reReserveVoice(robotId: string): boolean {
    try {
      const state = useLocaleStore.getState();
      const robot = state.locales[getActiveLocaleId()]?.robots.find((r: { id: string }) => r.id === robotId);
      if (!robot) return false;
      const layers = (robot.audioAttributes as unknown as { layers?: OscillatorLayer[] })?.layers;
      if (!Array.isArray(layers) || layers.length === 0) return false;

      AudioEngine.releaseVoice(robotId);
      return AudioEngine.reserveVoice(
        robotId,
        layers,
        robot.audioAttributes?.phase,
        robot.audioAttributes?.detune,
        (robot.audioAttributes as unknown as { layers?: OscillatorLayer[] })?.layers?.[0]?.pulseWidth,
      );
    } catch (err) {
      if (DEV_TUNING) swallow(err, 'AudioEngine.reReserveVoice');
      return false;
    }
  },

  /**
   * Apply updated continuous-layer parameters to a reserved CompositeVoice
   * without rebuilding the underlying node graph.
   *
   * Two-tier update rule (documented):
   * - Continuous params (gain, detune, phase, pulseWidth): use this method — instant, no gap in audio.
   * - Structural changes (type/waveform, add/delete layer): use `reReserveVoice` — may cause brief silence.
   */
  updateVoiceLayerParams(robotId: string, layers: OscillatorLayer[]): void {
    try {
      const entry = compositeVoices.get(robotId);
      if (!entry) {
        if (DEV_TUNING) console.warn(`[AudioEngine] updateVoiceLayerParams: no composite reserved for ${robotId}`);
        return;
      }

      try {
        // Pass the full layers array as required by the composite.set contract
        entry.composite.set({ layers: layers as Partial<OscillatorLayer>[] });
        if (DEV_TUNING) console.log(`[AudioEngine] updateVoiceLayerParams applied for ${robotId}`);
      } catch (err) {
        if (DEV_TUNING) console.warn('[AudioEngine] Failed to apply layer params on composite', err);
      }
    } catch (err) {
      if (DEV_TUNING) swallow(err, 'AudioEngine.updateVoiceLayerParams');
    }
  },


  /**
   * Create a composite voice made of multiple layers (oscillators and optional noise).
   * The returned object exposes an `output` node which the caller should connect
   * into the global audio graph (panner/effects), plus `triggerAttackRelease` and `set`.
   */
  createCompositeVoice(descriptor: OscillatorLayer[] | { base?: WaveformType; layers?: OscillatorLayer[] }): CompositeVoice {
    const GainCtor = toneRecord.Gain as unknown as (new (...args: unknown[]) => unknown) || undefined;
    const OutGain = GainCtor ? new (GainCtor as unknown as (new (...args: unknown[]) => Tone.Gain))(1) : (() => {
      // Minimal fallback gain node for test environments where Tone.Gain isn't mocked
      const node: MinimalToneNode = {
        gain: { value: 1 },
        connect: function () { return node; },
        disconnect: function () { },
        toDestination: function () { },
      };
      return node as unknown as Tone.Gain;
    })();
    const out = OutGain as unknown as Tone.Gain;

    const layers: OscillatorLayer[] = Array.isArray(descriptor)
      ? descriptor
      : (descriptor.layers && descriptor.layers.length > 0
        ? descriptor.layers
        : (descriptor.base ? [{ type: descriptor.base, gain: 1, detune: 0, phase: 0 } as OscillatorLayer] : []));

    const layerNodes = layers.map((layer) => {
      let synth: Tone.Synth | Tone.NoiseSynth | null;
      let layerGain: Tone.Gain | null = null;
      if (layer.type === 'noise') {
        // Use NoiseSynth if available, otherwise fall back to Synth for tests
        const NoiseCtor = toneRecord.NoiseSynth as unknown as (new (...args: unknown[]) => MinimalToneNode) | undefined;
        const SynthCtor = toneRecord.Synth as unknown as (new (...args: unknown[]) => MinimalToneNode) | undefined;
        const Noise = NoiseCtor ? new NoiseCtor({ volume: -12 }) : (SynthCtor ? new SynthCtor() : null);
        layerGain = (typeof toneRecord.Gain === 'function') ? new (toneRecord.Gain as unknown as (new (...args: unknown[]) => Tone.Gain))(layer.gain ?? 1).connect(out) : (() => {
          const node: MinimalToneNode = { gain: { value: layer.gain ?? 1 }, connect: function () { return node; } };
          return node as unknown as Tone.Gain;
        })();
        if (Noise && typeof Noise.connect === 'function') Noise.connect(layerGain);
        synth = Noise as unknown as Tone.Synth | Tone.NoiseSynth | null;
      } else {
        const oscConfig: Record<string, unknown> = { type: layer.type as WaveformType };
        // Apply per-layer pulse width when provided (meaningful for pulse/square)
        if (typeof layer.pulseWidth === 'number') oscConfig.width = layer.pulseWidth;

        const s = new Tone.Synth({
          oscillator: oscConfig,
          envelope: {
            attack: layer.adsr?.attack ?? 0.01,
            decay: layer.adsr?.decay ?? 0.1,
            sustain: layer.adsr?.sustain ?? 0.8,
            release: layer.adsr?.release ?? 0.5,
          },
        });
        layerGain = (typeof toneRecord.Gain === 'function') ? new (toneRecord.Gain as unknown as (new (...args: unknown[]) => Tone.Gain))(layer.gain ?? 1).connect(out) : (() => {
          const node: MinimalToneNode = { gain: { value: layer.gain ?? 1 }, connect: function () { return node; } };
          return node as unknown as Tone.Gain;
        })();
        if (layerGain && typeof s?.connect === 'function') s.connect(layerGain);
        synth = s;
      }
      // apply detune if present and supported
      try {
        if (layer.detune !== undefined) {
          try {
            const osc = (synth as unknown as { oscillator?: { detune?: { value: number } } })?.oscillator;
            if (osc && osc.detune) {
              osc.detune.value = layer.detune;
            }
          } catch (err) {
            if (DEV_TUNING) console.warn('[AudioEngine] Failed to apply detune on composite layer', err);
          }
        }
        // apply phase if present and supported
        if (layer.phase !== undefined) {
          try {
            const osc = (synth as unknown as { oscillator?: { phase?: number | { value?: number } } })?.oscillator;
            if (osc) {
              // Tone oscillator may accept numeric phase or an object; attempt to set directly
              try {
                // Preferred: set via set({ oscillator: { phase } }) when available
                (synth as unknown as SynthWithOscillator).set?.({ oscillator: { phase: layer.phase } });
              } catch {
                try {
                  const oscPhase = (osc as unknown as { phase?: { value?: number } | number })?.phase;
                  if (typeof oscPhase === 'object' && oscPhase !== null && 'value' in oscPhase) {
                    (oscPhase as { value?: number }).value = layer.phase;
                  } else {
                    (osc as unknown as { phase?: number }).phase = layer.phase;
                  }
                } catch (err) {
                  if (DEV_TUNING) console.warn('[AudioEngine] Failed to apply phase on composite layer', err);
                }
              }
            }
          } catch (err) {
            if (DEV_TUNING) console.warn('[AudioEngine] Failed to apply phase on composite layer', err);
          }
        }
        // apply pulseWidth if present and supported
        if (layer.pulseWidth !== undefined) {
          try {
            const osc = (synth as unknown as { oscillator?: { width?: number | { value?: number } } })?.oscillator;
            if (osc) {
              try { (synth as unknown as SynthWithOscillator).set?.({ oscillator: { width: layer.pulseWidth } }); } catch {
                try {
                  const oscWidth = (osc as unknown as { width?: { value?: number } | number })?.width;
                  if (typeof oscWidth === 'object' && oscWidth !== null && 'value' in oscWidth) {
                    (oscWidth as { value?: number }).value = layer.pulseWidth;
                  } else {
                    (osc as unknown as { width?: number }).width = layer.pulseWidth;
                  }
                } catch (err) {
                  if (DEV_TUNING) console.warn('[AudioEngine] Failed to apply pulseWidth on composite layer', err);
                }
              }
            }
          } catch (err) {
            if (DEV_TUNING) console.warn('[AudioEngine] Failed to apply pulseWidth on composite layer', err);
          }
        }
      } catch (err) {
        if (DEV_TUNING) console.warn('[AudioEngine] Failed to apply detune on composite layer', err);
      }

      return { synth, gainNode: layerGain, layer };
    });

    // Per-layer last-scheduled time tracker. Tone Source nodes (Synth, NoiseSynth) require
    // strictly increasing schedule times. We track the last time used per layer index so we
    // can always advance by at least 1ms even when multiple flurries hit the same composite
    // in the same AudioContext quantum (where Tone.now() returns the same value for all calls).
    const layerLastTime: number[] = layerNodes.map(() => -Infinity);

    const triggerAttackRelease = (note: string, dur: NoteDuration | string, time?: number, velocity?: number) => {
      const requested = (typeof time === 'number' && isFinite(time)) ? time : Tone.now();
      const durStr = String(dur);
      layerNodes.forEach(({ synth, layer }, i) => {
        try {
          // Guarantee strictly increasing time per layer: Tone Source nodes (Synth, NoiseSynth)
          // require each scheduled time to be > the previous one on that same source instance.
          // Multiple flurries in the same AudioContext quantum share the same Tone.now() value,
          // so we advance by at least 1ms beyond both the requested time and the last used time.
          const t = Math.max(requested, Tone.now() + 0.001, layerLastTime[i] + 0.001);
          layerLastTime[i] = t;
          const isNoise = layer.type === 'noise';
          if (synth && typeof (synth as unknown as { triggerAttackRelease?: unknown }).triggerAttackRelease === 'function') {
            if (isNoise) {
              // NoiseSynth API: triggerAttackRelease(duration, time?, velocity?) — no note argument
              (synth as unknown as { triggerAttackRelease?: (d: string, time?: number, v?: number) => void }).triggerAttackRelease?.(durStr, t, velocity ?? 0.8);
            } else {
              (synth as unknown as { triggerAttackRelease?: (n: string, d: string, time?: number, v?: number) => void }).triggerAttackRelease?.(note, durStr, t, velocity ?? 0.8);
            }
          } else if (synth && typeof (synth as unknown as { triggerAttack?: unknown }).triggerAttack === 'function') {
            if (!isNoise) {
              (synth as unknown as { triggerAttack?: (n: string, time?: number, v?: number) => void }).triggerAttack?.(note, t, velocity ?? 0.8);
            } else {
              (synth as unknown as { triggerAttack?: (time?: number, v?: number) => void }).triggerAttack?.(t, velocity ?? 0.8);
            }
            const releaseAt = t + Tone.Time(durStr).toSeconds();
            (synth as unknown as { triggerRelease?: (time?: number) => void }).triggerRelease?.(releaseAt + 0.01);
          }
        } catch (err) {
          if (DEV_TUNING) console.warn('[AudioEngine] Composite layer trigger failed', err);
        }
      });
    };

    const set = (params: { layers?: Partial<OscillatorLayer>[]; outputGain?: number }) => {
      if (params.outputGain !== undefined) out.gain.value = params.outputGain;
      if (params.layers) {
        // Match by index so multi-layer voices with duplicate waveform types are updated correctly.
        params.layers.forEach((p, i) => {
          const node = layerNodes[i];
          if (!node) return;
          const { synth, gainNode } = node;
          if (p.gain !== undefined && gainNode) {
            try {
              gainNode.gain.value = p.gain as number;
            } catch (err) {
              if (DEV_TUNING) console.warn('[AudioEngine] Failed to set layer gain on composite', err);
            }
          }
          if (p.detune !== undefined) {
            try {
              const osc = (synth as unknown as { oscillator?: { detune?: { value: number } } })?.oscillator;
              if (osc && osc.detune) osc.detune.value = p.detune;
            } catch (err) {
              if (DEV_TUNING) console.warn('[AudioEngine] Failed to set detune on composite layer', err);
            }
          }
          if (p.phase !== undefined) {
            try {
              const osc = (synth as unknown as SynthWithOscillator)?.oscillator;
              if (osc) {
                try { (synth as unknown as SynthWithOscillator).set?.({ oscillator: { phase: p.phase } }); } catch {
                  try {
                    const oscPhase = (osc as unknown as { phase?: { value?: number } | number })?.phase;
                    if (typeof oscPhase === 'object' && oscPhase !== null && 'value' in oscPhase) {
                      (oscPhase as { value?: number }).value = p.phase;
                    } else {
                      (osc as unknown as { phase?: number }).phase = p.phase;
                    }
                  } catch (err) {
                    if (DEV_TUNING) console.warn('[AudioEngine] Failed to set phase on composite layer', err);
                  }
                }
              }
            } catch (err) {
              if (DEV_TUNING) console.warn('[AudioEngine] Failed to set phase on composite layer', err);
            }
          }
          if (p.pulseWidth !== undefined) {
            try {
              // Prefer Synth.set when available
              try { (synth as unknown as SynthWithOscillator).set?.({ oscillator: { width: p.pulseWidth } }); } catch {
                const osc = (synth as unknown as { oscillator?: { width?: { value?: number } | number } })?.oscillator;
                if (osc) {
                  try {
                    const oscWidth = (osc as unknown as { width?: { value?: number } | number })?.width;
                    if (typeof oscWidth === 'object' && oscWidth !== null && 'value' in oscWidth) {
                      (oscWidth as { value?: number }).value = p.pulseWidth;
                    } else {
                      (osc as unknown as { width?: number }).width = p.pulseWidth;
                    }
                  } catch (err) {
                    if (DEV_TUNING) console.warn('[AudioEngine] Failed to set pulseWidth on composite layer', err);
                  }
                }
              }
            } catch (err) {
              if (DEV_TUNING) console.warn('[AudioEngine] Failed to set pulseWidth on composite layer', err);
            }
          }
          if (p.adsr && typeof (synth as unknown as { set?: (props: unknown) => void }).set === 'function') {
            try { (synth as unknown as { set?: (props: unknown) => void }).set?.({ envelope: p.adsr }); } catch (err) {
              if (DEV_TUNING) console.warn('[AudioEngine] Failed to set ADSR on composite layer', err);
            }
          }
        });
      }
    };

    const dispose = () => {
      // Disconnect and dispose per-layer synths and gains
      layerNodes.forEach(({ synth, gainNode }) => {
        try {
          try { (synth as unknown as { dispose?: () => void }).dispose?.(); } catch (err) { if (DEV_TUNING) console.warn('[AudioEngine] Error disposing composite layer synth', err); }
        } catch (err) {
          if (DEV_TUNING) console.warn('[AudioEngine] Error disposing composite layer synth', err);
        }
        try { gainNode?.disconnect(); } catch { if (DEV_TUNING) console.warn('[AudioEngine] Failed disconnecting gainNode'); }
        try { (gainNode as unknown as { dispose?: () => void })?.dispose?.(); } catch { if (DEV_TUNING) console.warn('[AudioEngine] Failed disposing gainNode'); }
      });
      try { out.disconnect(); } catch { if (DEV_TUNING) console.warn('[AudioEngine] Failed disconnecting composite output'); }
      try { (out as unknown as { dispose?: () => void })?.dispose?.(); } catch { if (DEV_TUNING) console.warn('[AudioEngine] Failed disposing composite output'); }
    };

    return { output: out, triggerAttackRelease, set, dispose };
  },



  /**
   * Register or replace a robot's melody used by the engine's playback scheduler.
   *
   * Behavior:
   * - Replaces any previously-registered events for `robotId` in the internal
   *   `stepRegistry` so subsequent scheduler ticks will use the new melody.
   * - This method is safe to call from the main thread; it mutates module-scoped
   *   registry data but does not touch the Tone.Transport scheduling directly.
   * - The scheduler reads `stepRegistry` on the transport tick; callers should
   *   expect the new melody to take effect on the next scheduled tick after
   *   registration.
   *
   * @param robotId - Unique robot identifier
   * @param melody - Array of `RobotMelodyEvent` describing start steps and notes
   */
  registerRobotMelody(robotId: string, melody: RobotMelodyEvent[]): void {
    // Purge any existing entries for this robot before adding new ones so this
    // method is idempotent regardless of call site — prevents duplicate triggers.
    stepRegistry.forEach((entries, step) => {
      const filtered = entries.filter((e) => e.robotId !== robotId);
      if (filtered.length !== entries.length) {
        if (filtered.length > 0) {
          stepRegistry.set(step, filtered);
        } else {
          stepRegistry.delete(step);
        }
      }
    });

    melody.forEach((event) => {
      const entries = stepRegistry.get(event.startStep) || [];
      entries.push({ robotId, event });
      stepRegistry.set(event.startStep, entries);
    });

    if (DEV_TUNING) {
      console.log(
        `[AudioEngine] Registered melody for robot ${robotId} (${melody.length} events)`
      );
    }
  },

  unregisterRobotMelody(robotId: string): void {
    robotAttributeCache.delete(robotId);
    robotNoteIndex.delete(robotId);
    let removedCount = 0;

    stepRegistry.forEach((entries, step) => {
      const filtered = entries.filter((e) => e.robotId !== robotId);
      removedCount += entries.length - filtered.length;

      if (filtered.length > 0) {
        stepRegistry.set(step, filtered);
      } else {
        stepRegistry.delete(step);
      }
    });

    if (DEV_TUNING) {
      console.log(
        `[AudioEngine] Unregistered melody for robot ${robotId} (${removedCount} events removed)`
      );
    }
  },

  /**
   * Test helper: return the currently registered melody events for a robot.
   * This exposes a read-only snapshot of the internal `stepRegistry` for tests.
   */
  getRegisteredMelody(robotId: string): RobotMelodyEvent[] {
    const out: RobotMelodyEvent[] = [];
    stepRegistry.forEach((entries) => {
      entries.forEach((e) => {
        if (e.robotId === robotId) out.push(e.event);
      });
    });
    return out;
  },

  /**
   * Test helper: process a single melody step as the transport tick would.
   * Invokes `AudioEngine.scheduleNote` for all registered events whose
   * `startStep` equals `currentStep`.
   *
   * @param currentStep - 1..16 step to process
   * @param time - absolute AudioContext time passed through from transport
   */
  processMelodyStep(currentStep: number, time: number): void {
    const events = stepRegistry.get(currentStep) || [];
    const notes = getAvailableNotes();

    events.forEach(({ robotId, event }) => {
      const noteName = notes[event.noteIndex];
      if (!noteName) return;
      const octave = event.octave ?? 4;
      const note = `${noteName}${octave}`;

      AudioEngine.scheduleNote({ robotId, note, duration: event.length, time: time + MIN_LEAD });
    });
  },



  getPolyphonyStats(): { voices: number; maxVoices: number; step: number } {
    return {
      voices: activeVoices,
      maxVoices: MAX_POLYPHONY,
      step: (stepCounter % 16) + 1,
    };
  },

  /** Returns the current AudioContext time (seconds). Use for note scheduling offsets. */
  now(): number {
    return Tone.now();
  },

  /**
   * Update Tone.Transport BPM. No-op if AudioEngine has not been started
   * (audio context not yet running) to avoid errors in headless environments.
   */
  setBPM(bpm: number): void {
    if (!initialized) return;
    const transport = _transport ?? Tone.getTransport();
    try { transport.bpm.value = bpm; } catch (err) { if (DEV_TUNING) console.warn('[AudioEngine] setBPM failed', err); }
  },

  /** Pause transport without resetting position (soft pause). */
  pause(): void {
    try {
      const transport = _transport ?? Tone.getTransport();
      transport.pause();
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] pause failed', err);
    }
  },

  /** Resume transport from current position. */
  resume(): void {
    try {
      const transport = _transport ?? Tone.getTransport();
      transport.start();
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] resume failed', err);
    }
  },

  /**
   * Hard stop: cancel scheduled transport events, release active voices,
   * stop transport, and reset position to 0.
   */
  killAll(): void {
    try {
      const transport = _transport ?? Tone.getTransport();
      try { transport.cancel(); } catch (err) { if (DEV_TUNING) swallow(err, 'transport.cancel'); }

      stopHarmonyCycle();

      try {
        if (transport.state === 'started') {
          try { transport.stop(); } catch { /* ignore */ }
        }
      } catch { /* ignore */ }

      try {
        try { (transport as unknown as { seconds?: number }).seconds = 0; } catch {
          try { (transport as unknown as { position?: string }).position = '0:0:0'; } catch { /* ignore */ }
        }
      } catch { /* ignore */ }

      if (scheduledTickId !== null) {
        try { transport.clear(scheduledTickId); } catch (err) { if (DEV_TUNING) swallow(err, 'transport.clear'); }
        scheduledTickId = null;
      }

      stepCounter = 0;
      activeVoices = 0;
      initialized = false;
      // Reset beatClock so initBeatClock() re-registers its internal tick on next start.
      // transport.cancel() above cleared the old 16n tick; resetBeatClock() lets it be recreated.
      resetBeatClock();
      if (DEV_TUNING) console.log('[AudioEngine] killAll: transport cancelled, voices released, position reset');
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] killAll failed', err);
    }
  },

  /** Set master volume (clamped to [0,1]). */
  setMasterVolume(volume: number): void {
    const v = Math.max(0, Math.min(1, Number(volume) || 0));
    _masterVolume = v;
    if (_masterGain) {
      try { (_masterGain as unknown as { gain: { value: number } }).gain.value = v; } catch (err) { if (DEV_TUNING) console.warn('[AudioEngine] setMasterVolume failed', err); }
    }
  },

  /** Get the current master volume (0..1). */
  getMasterVolume(): number {
    try {
      if (_masterGain && typeof (_masterGain as unknown as { gain?: { value?: number } }).gain?.value === 'number') {
        return (_masterGain as unknown as { gain?: { value?: number } }).gain!.value ?? _masterVolume;
      }
    } catch { /* ignore */ }
    return _masterVolume;
  },

  // ========================================
  // GLOBAL FX SETTERS
  // ========================================

  setGlobalReverb(params: Partial<ReverbSettings>): void {
    if (params.wet !== undefined) _fxParamCache.reverb.wet = params.wet;
    if (!_globalReverb) return;
    try {
      if (params.wet !== undefined) (_globalReverb as unknown as { wet: { value: number } }).wet.value = params.wet;
      if (params.decay !== undefined) (_globalReverb as unknown as { decay: number }).decay = params.decay;
      if (params.preDelay !== undefined) (_globalReverb as unknown as { preDelay: number }).preDelay = params.preDelay;
      if (params.dampening !== undefined) (_globalReverb as unknown as { dampening: number }).dampening = params.dampening;
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] setGlobalReverb failed', err);
    }
  },

  setGlobalDelay(params: Partial<DelaySettings>): void {
    if (params.wet !== undefined) _fxParamCache.delay.wet = params.wet;
    if (!_globalDelay) return;
    try {
      if (params.wet !== undefined) (_globalDelay as unknown as { wet: { value: number } }).wet.value = params.wet;
      if (params.delayTime !== undefined) (_globalDelay as unknown as { delayTime: { value: number } }).delayTime.value = params.delayTime;
      if (params.feedback !== undefined) (_globalDelay as unknown as { feedback: { value: number } }).feedback.value = params.feedback;
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] setGlobalDelay failed', err);
    }
  },

  setGlobalChorus(params: Partial<ChorusSettings>): void {
    if (params.wet !== undefined) _fxParamCache.chorus.wet = params.wet;
    if (!_globalChorus) return;
    try {
      if (params.wet !== undefined) (_globalChorus as unknown as { wet: { value: number } }).wet.value = params.wet;
      if (params.rate !== undefined) (_globalChorus as unknown as { frequency: { value: number } }).frequency.value = params.rate;
      if (params.depth !== undefined) (_globalChorus as unknown as { depth: number }).depth = params.depth;
      if (params.delayTime !== undefined) (_globalChorus as unknown as { delayTime: number }).delayTime = params.delayTime;
      if (params.feedback !== undefined) (_globalChorus as unknown as { feedback: { value: number } }).feedback.value = params.feedback;
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] setGlobalChorus failed', err);
    }
  },

  setGlobalFilterLPF(params: Partial<FilterSettings>): void {
    if (params.frequency !== undefined) _fxParamCache.lpf.frequency = params.frequency;
    if (params.Q !== undefined) _fxParamCache.lpf.Q = params.Q;
    if (!_globalLPF) return;
    try {
      if (params.frequency !== undefined) (_globalLPF as unknown as { frequency: { value: number } }).frequency.value = params.frequency;
      if (params.Q !== undefined) (_globalLPF as unknown as { Q: { value: number } }).Q.value = params.Q;
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] setGlobalFilterLPF failed', err);
    }
  },

  setGlobalFilterHPF(params: Partial<FilterSettings>): void {
    if (params.frequency !== undefined) _fxParamCache.hpf.frequency = params.frequency;
    if (params.Q !== undefined) _fxParamCache.hpf.Q = params.Q;
    if (!_globalHPF) return;
    try {
      if (params.frequency !== undefined) (_globalHPF as unknown as { frequency: { value: number } }).frequency.value = params.frequency;
      if (params.Q !== undefined) (_globalHPF as unknown as { Q: { value: number } }).Q.value = params.Q;
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] setGlobalFilterHPF failed', err);
    }
  },

  setGlobalEQ(params: Partial<EQ3Settings>): void {
    if (params.low !== undefined) _fxParamCache.eq3.low = params.low;
    if (params.mid !== undefined) _fxParamCache.eq3.mid = params.mid;
    if (params.high !== undefined) _fxParamCache.eq3.high = params.high;
    if (!_globalEQ) return;
    try {
      if (params.low !== undefined) (_globalEQ as unknown as { low: { value: number } }).low.value = params.low;
      if (params.mid !== undefined) (_globalEQ as unknown as { mid: { value: number } }).mid.value = params.mid;
      if (params.high !== undefined) (_globalEQ as unknown as { high: { value: number } }).high.value = params.high;
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] setGlobalEQ failed', err);
    }
  },

  setGlobalCompressor(params: Partial<CompressorSettings>): void {
    if (params.threshold !== undefined) _fxParamCache.compressor.threshold = params.threshold;
    if (params.ratio !== undefined) _fxParamCache.compressor.ratio = params.ratio;
    if (params.attack !== undefined) _fxParamCache.compressor.attack = params.attack;
    if (params.release !== undefined) _fxParamCache.compressor.release = params.release;
    if (params.knee !== undefined) _fxParamCache.compressor.knee = params.knee;
    if (!_masterCompressor) return;
    try {
      if (params.threshold !== undefined) _masterCompressor.threshold.value = params.threshold;
      if (params.ratio !== undefined) _masterCompressor.ratio.value = params.ratio;
      if (params.attack !== undefined) _masterCompressor.attack.value = params.attack;
      if (params.release !== undefined) _masterCompressor.release.value = params.release;
      if (params.knee !== undefined) _masterCompressor.knee.value = params.knee;
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] setGlobalCompressor failed', err);
    }
  },

  /**
   * Short-circuit the entire FX chain.
   * When bypass=true, disconnect _masterCompressor from the FX chain and connect directly to Destination.
   * When bypass=false, reconnect through the FX chain.
   */
  setGlobalBypass(bypass: boolean): void {
    if (DEV_TUNING) console.log('[AudioEngine] global bypass state set to', bypass);
    if (!_masterCompressor) return;
    const comp = _masterCompressor as unknown as { connect: (t: unknown) => void; disconnect: () => void; toDestination: () => void };
    try {
      comp.disconnect();
      if (bypass) {
        comp.toDestination();
        if (DEV_TUNING) console.log('[AudioEngine] Global bypass ON — audio routed direct to destination');
      } else {
        // Reconnect through FX chain (first available node or destination)
        const firstFX = (_globalEQ ?? _globalLPF ?? _globalHPF ?? _globalChorus ?? _globalDelay ?? _globalReverb) as unknown as { connect?: (t: unknown) => void } | null;
        if (firstFX?.connect) {
          comp.connect(firstFX);
        } else {
          comp.toDestination();
        }
        if (DEV_TUNING) console.log('[AudioEngine] Global bypass OFF — audio routed through FX chain');
      }
    } catch (err) {
      if (DEV_TUNING) console.warn('[AudioEngine] setGlobalBypass failed', err);
    }
  },

  /**
   * Enable or disable an individual effect in the chain.
   * For wet effects (reverb, delay, chorus): sets wet=0 to disable, restores cached wet to enable.
   * For dry effects (eq3): zeros all bands to disable, restores cached values to enable.
   * For filters (lpf, hpf): sets frequency to passthrough value to disable, restores cached freq to enable.
   *
   * @param effect - 'reverb' | 'delay' | 'chorus' | 'eq3' | 'lpf' | 'hpf' | 'compressor'
   * @param enabled - true to enable, false to bypass
   */
  setEffectBypass(effect: string, enabled: boolean): void {
    try {
      switch (effect) {
        case 'reverb':
          if (_globalReverb) {
            (_globalReverb as unknown as { wet: { value: number } }).wet.value = enabled ? _fxParamCache.reverb.wet : 0;
          }
          break;
        case 'delay':
          if (_globalDelay) {
            (_globalDelay as unknown as { wet: { value: number } }).wet.value = enabled ? _fxParamCache.delay.wet : 0;
          }
          break;
        case 'chorus':
          if (_globalChorus) {
            (_globalChorus as unknown as { wet: { value: number } }).wet.value = enabled ? _fxParamCache.chorus.wet : 0;
          }
          break;
        case 'eq3':
          if (_globalEQ) {
            const e = _globalEQ as unknown as { low: { value: number }; mid: { value: number }; high: { value: number } };
            e.low.value = enabled ? _fxParamCache.eq3.low : 0;
            e.mid.value = enabled ? _fxParamCache.eq3.mid : 0;
            e.high.value = enabled ? _fxParamCache.eq3.high : 0;
          }
          break;
        case 'lpf':
          if (_globalLPF) {
            (_globalLPF as unknown as { frequency: { value: number } }).frequency.value = enabled ? _fxParamCache.lpf.frequency : 20000;
          }
          break;
        case 'hpf':
          if (_globalHPF) {
            (_globalHPF as unknown as { frequency: { value: number } }).frequency.value = enabled ? _fxParamCache.hpf.frequency : 20;
          }
          break;
        case 'compressor':
          // Compressor bypass: restore or clamp to passthrough (ratio=1, threshold=0)
          if (_masterCompressor) {
            _masterCompressor.ratio.value = enabled ? _fxParamCache.compressor.ratio : 1;
            _masterCompressor.threshold.value = enabled ? _fxParamCache.compressor.threshold : 0;
          }
          break;
        default:
          if (DEV_TUNING) console.warn(`[AudioEngine] setEffectBypass: unknown effect "${effect}"`);
      }
    } catch (err) {
      if (DEV_TUNING) console.warn(`[AudioEngine] setEffectBypass(${effect}, ${enabled}) failed`, err);
    }
  },
};
