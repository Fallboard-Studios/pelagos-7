// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';
import gsap from 'gsap';
import { useLocaleStore } from '../stores/localeStore';
import { getActiveLocaleId } from '../utils/localeHelpers';

import type { NoteDuration, WaveformType, Robot } from '../types/Robot';
import type { OscillatorLayer } from '../types/layeredAudio';
import type { RobotLfoTargetId } from '../types/lfo';
import { getAvailableNotes, scheduleHarmonyCycle, stopHarmonyCycle } from './harmonySystem';
import { resetBeatClock, subscribeToMeasure, initBeatClock } from './beatClock';
import type { RobotMelodyEvent } from './melodyGenerator';
import { applyRhythmicVariance, applyTonalVariance } from './melodyGenerator';
import { DEV_TUNING, MIN_LEAD as CONST_MIN_LEAD } from '../constants';

import { getRef } from '../utils/refs';
import { precomputeDataX } from '../utils/getSeededVal';
import { tryGetLocaleNoiseMap } from '../utils/noiseMaps';
import { devLog, devWarn } from '../utils/helpers';
import { calculatePanFromPosition } from './audioEngine/panning';
import { getToneCtor, type MinimalToneNode, type ModulationTarget } from './audioEngine/toneHelpers';
import { createCompositeVoice, type CompositeVoice } from './audioEngine/compositeVoice';
import {
  buildGlobalFxChain,
  getMasterCompressor,
  waitForGlobalReverbReady,
  setMasterVolume,
  getMasterVolume,
  setGlobalReverb,
  setGlobalDelay,
  setGlobalChorus,
  setGlobalFilterLPF,
  setGlobalFilterHPF,
  setGlobalEQ,
  setGlobalCompressor,
  setGlobalBypass,
  setEffectBypass,
  getGlobalModulationTarget,
} from './audioEngine/globalFx';

// MIN_LEAD: prefer project constant, fall back to 0.1s for headless/tests
const MIN_LEAD = CONST_MIN_LEAD ?? 0.1;

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
// Global FX chain (master compressor, reverb/delay/chorus/EQ/filters, master
// gain) lives in src/engine/audioEngine/globalFx.ts as its own module state.
// Unsubscribe handle for the BeatClock measure listener; prevents duplicate
// listeners if start() is called more than once without an intervening killAll().
let _unsubscribeMeasure: (() => void) | null = null;

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

// Composite voices (created from LayeredWave descriptors, src/engine/audioEngine/compositeVoice.ts) stored separately
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

/** Robots in the currently active locale (empty array if locale/robots are absent). */
function getActiveLocaleRobots(): Robot[] {
  const store = useLocaleStore.getState();
  return store.locales[getActiveLocaleId()]?.robots ?? [];
}

/** Find a robot by id within the currently active locale. */
function findActiveRobot(robotId: string): Robot | undefined {
  return getActiveLocaleRobots().find((r) => r.id === robotId);
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
    devWarn('[AudioEngine] getRobotVisualX failed', err);
  }

  // Fallback: read position from state
  try {
    const robot = findActiveRobot(robotId);
    return robot?.position.x ?? 960; // Default to center if not found
  } catch (err) {
    devWarn('[AudioEngine] getRobotVisualX.stateFallback failed', err);
    return 960; // Default to center
  }
}

/**
 * Initialize the global FX chain and compressor.
 * All composite voices route through this chain.
 */
async function loadInstruments(): Promise<void> {
  if (instrumentsLoaded) return;

  // Master compressor + global FX chain construction/wiring lives in
  // src/engine/audioEngine/globalFx.ts.
  buildGlobalFxChain();

  instrumentsLoaded = true;

  // If robots spawned before AudioEngine initialized, reserve their composite voices now.
  try {
    const robots = getActiveLocaleRobots();
    if (robots.length > 0) {
      devLog(`[AudioEngine] Attempting post-load reservations for ${robots.length} robots`);
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
            devLog(`[AudioEngine] Post-load reserve for ${robot.id}: ${ok ? 'OK' : 'FAILED'}`);
          }
        } catch (err) {
          devWarn('[AudioEngine] Failed post-load reservation for robot', robot.id, err);
        }
      });
    }
  } catch (err) {
    devWarn('[AudioEngine] Post-load reservation pass failed', err);
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
    devWarn('[AudioEngine] scheduleVoiceRelease failed', err);
    activeVoices = Math.max(0, activeVoices - 1);
    devWarn('[AudioEngine] Failed to schedule voice release, immediate fallback', err);
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
        devWarn('[AudioEngine] Failed to update composite panner for', robotId, err);
      }
    }
  } catch (err) {
    devWarn('[AudioEngine] updateAllPanners failed', err);
  }
}
/**
 * Trigger note with polyphony cap enforcement.
 * Applies per-robot synth selection and ADSR envelope when provided.
 * Returns true if note was triggered, false if skipped due to cap.
 */
export function triggerWithCap(params: NoteParams): boolean {
  const { robotId, note, duration, time } = params;

  if (activeVoices >= MAX_POLYPHONY) {
    devLog(`[AudioEngine] Polyphony capped: ${activeVoices}/${MAX_POLYPHONY}`);
    return false;
  }

  // Enforce audioMode at trigger time as a safety net in case schedule path missed it.
  try {
    const localeRobots = getActiveLocaleRobots();
    if (localeRobots.length > 0) {
      const robotFromStore = localeRobots.find((r) => r.id === robotId);
      if (robotFromStore?.audioMode === 'mute') {
        devLog(`[AudioEngine] Robot ${robotId} is muted (trigger); skipping note`);
        return false;
      }
      const anySoloInStore = localeRobots.some((r) => r.audioMode === 'solo');
      if (anySoloInStore && robotFromStore?.audioMode !== 'solo') {
        devLog(`[AudioEngine] Robot ${robotId} suppressed due to solo (trigger)`);
        return false;
      }
      // Highlight attenuation is handled in scheduleNote; skip here to avoid double-attenuation.
    }
  } catch (err) {
    devWarn('[AudioEngine] triggerWithCap.audioMode failed', err);
  }

  const scheduleTime = time ?? Tone.now();
  activeVoices++;

  try {
    if (!compositeVoices.has(robotId)) {
      activeVoices = Math.max(0, activeVoices - 1);
      devWarn(`[AudioEngine] No composite voice reserved for ${robotId}, skipping note`);
      return false;
    }

    const comp = compositeVoices.get(robotId);
    const synth = comp?.composite ?? null;
    const panner = comp?.panner ?? null;

    if (!synth) {
      activeVoices = Math.max(0, activeVoices - 1);
      devWarn('[AudioEngine] No composite voice available, skipping note');
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
 * Start the main melody playback loop (16th-note tick — 16 steps = 1 measure,
 * matching melodyGenerator's own subdivision model).
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
        devWarn(
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
      devLog(`[AudioEngine] Loop boundary reached at step ${stepCounter}`);
      try {
        const robots = getActiveLocaleRobots();
        const robotCount = robots.length;
        devLog(`[AudioEngine] Checking variance for ${robotCount} robots`);

        robots.forEach((robot) => {
          const originalMelody = robot.melody;
          const originalSteps = originalMelody.map((e) => e.startStep);

          // Apply variance (returns new array or original); both apply independently
          const rhythmicVaried = applyRhythmicVariance(originalMelody as never);
          const variedMelody = applyTonalVariance(rhythmicVaried as never);

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
  }, '16n');

  devLog('[AudioEngine] Melody playback started (16n tick)');
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

  const roll = (noiseMap(VELOCITY_ROLL_X, noteIndex) + 1) / 2; // map [-1,1] -> [0,1]
  if (roll < VELOCITY_VARIANCE_RATE) {
    const raw = noiseMap(VELOCITY_VARIANCE_X, noteIndex); // [-1,1]
    const variance = raw * VELOCITY_VARIANCE_AMOUNT; // signed
    const out = Math.min(1, Math.max(VELOCITY_MIN, masterVolume + variance));
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
    await waitForGlobalReverbReady();

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
      _unsubscribeMeasure?.();
      _unsubscribeMeasure = subscribeToMeasure((m: number) => {
        useLocaleStore.getState().setLocaleData(getActiveLocaleId(), { currentMeasure: m });
      });
    } catch (err) {
      devWarn('[AudioEngine] subscribeToMeasure failed', err);
    }
    startMelodyPlayback();
    scheduleHarmonyCycle(transport);

    initialized = true;
    devLog('[AudioEngine] Started');
  },

  stop(): void {
    const transport = _transport ?? Tone.getTransport();

    if (scheduledTickId !== null) {
      try { transport.clear(scheduledTickId); } catch (err) { devWarn('[AudioEngine] transport.clear failed', err); }
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

    devLog('[AudioEngine] Stopped');
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
          const robot = findActiveRobot(robotId);
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
    try {
      const localeRobots = getActiveLocaleRobots();
      const robotFromStore = localeRobots.find((r) => r.id === robotId);
      if (robotFromStore?.audioMode === 'mute') {
        devLog(`[AudioEngine] Robot ${robotId} is muted; skipping note`);
        return;
      }
      const anySolo = localeRobots.some((r) => r.audioMode === 'solo');
      if (anySolo && robotFromStore?.audioMode !== 'solo') {
        devLog(`[AudioEngine] Robot ${robotId} suppressed due to solo`);
        return;
      }
      const anyHighlight = localeRobots.some((r) => r.audioMode === 'highlight');
      if (anyHighlight && robotFromStore?.audioMode !== 'highlight') {
        // Apply ~50% attenuation (~-6dB) to non-highlighted robots
        effectiveVelocity = (effectiveVelocity ?? 1) * 0.5;
      }
    } catch (err) {
      devWarn('[AudioEngine] scheduleNote.audioMode failed', err);
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

      const PannerCtor = getToneCtor<Tone.Panner>('Panner');
      const GainCtorLocal = getToneCtor<Tone.Gain>('Gain');
      const FilterCtor = getToneCtor<Tone.Filter>('Filter');

      const panner = PannerCtor ? new PannerCtor({ pan: 0 }) : ({ connect: () => { }, pan: { value: 0 }, disconnect: () => { } } as MinimalToneNode) as unknown as Tone.Panner;
      const busGain = GainCtorLocal ? new GainCtorLocal(1) : ({ connect: () => ({}), disconnect: () => { }, gain: { value: 1 }, toDestination: () => { } } as MinimalToneNode) as unknown as Tone.Gain;
      const busFilter = FilterCtor ? new FilterCtor({ frequency: 1200, Q: 1 }) : ({ connect: () => ({}), disconnect: () => { }, toDestination: () => { } } as MinimalToneNode) as unknown as Tone.Filter;

      // Connect graph: composite.output -> panner -> busGain -> busFilter -> master compressor/destination
      try { composite.output.connect(panner); } catch (e) { devWarn('[AudioEngine] composite.output.connect failed', e); }
      try { (panner as unknown as { connect?: (target?: unknown) => unknown }).connect?.(busGain); } catch (e) { devWarn('[AudioEngine] panner.connect failed', e); }
      try { (busGain as unknown as { connect?: (target?: unknown) => unknown }).connect?.(busFilter); } catch (e) { devWarn('[AudioEngine] busGain.connect failed', e); }
      try {
        const masterCompressor = getMasterCompressor();
        if (masterCompressor) {
          (busFilter as unknown as { connect?: (target?: unknown) => unknown }).connect?.(masterCompressor);
        } else {
          (busFilter as unknown as { toDestination?: () => unknown }).toDestination?.();
        }
      } catch (e) {
        devWarn('[AudioEngine] busFilter connection failed', e);
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
        devWarn('[AudioEngine] Failed to apply composite phase/detune/width at reservation time', e);
      }
      devLog(`[AudioEngine] Reserved composite voice for ${robotId}`);
      return true;
    } catch (err) {
      devWarn('[AudioEngine] Failed to create composite voice:', err);
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
      devLog(`[AudioEngine] Reserved stub composite voice for ${robotId}`);
      return false;
    }
  },

  /** Release a robot's composite voice and clean up its bus nodes. */
  releaseVoice(robotId: string): void {
    const comp = compositeVoices.get(robotId);
    if (!comp) return;
    try {
      try { comp.composite.dispose?.(); } catch (err) { devWarn('[AudioEngine] composite.dispose failed', err); }
      comp.panner.disconnect();
      comp.busGain.disconnect();
      comp.busFilter.disconnect();
      // Tone nodes may implement dispose; call when available
      try { comp.panner.dispose?.(); } catch { devWarn('[AudioEngine] Failed disposing panner'); }
      try { comp.busGain.dispose?.(); } catch { devWarn('[AudioEngine] Failed disposing busGain'); }
      try { comp.busFilter.dispose?.(); } catch { devWarn('[AudioEngine] Failed disposing busFilter'); }
    } catch (err) {
      devWarn('[AudioEngine] Failed to cleanup composite nodes', err);
    }
    compositeVoices.delete(robotId);
    robotAttributeCache.delete(robotId);
    robotNoteIndex.delete(robotId);
    devLog(`[AudioEngine] Released composite voice for ${robotId}`);
  },

  /** Return the composite voice reserved for a robot, or null if none. */
  getVoiceForRobot(robotId?: string): CompositeVoice | null {
    if (!robotId) return null;
    return compositeVoices.get(robotId)?.composite ?? null;
  },

  /**
   * Resolve the live, connectable Tone Signal/Param for a robot-level LFO
   * modulation target (docs/tasks/LFO_INTEGRATION_PLAN.md Task 9). Returns
   * null — never throws — for: an unreserved robotId, an out-of-range layer
   * index, 'layerN.phase' (Tone.js has no live Signal for oscillator phase;
   * handled via a manual-polling fallback at the lfoEngine layer, Task 12),
   * and 'layerN.pulseWidth' when that layer's type isn't 'pulse' (only
   * PulseOscillator exposes a connectable width Signal — 'square' has no
   * adjustable width in Tone.js at all, independent of anything built here).
   */
  getRobotModulationTarget(robotId: string, target: RobotLfoTargetId): ModulationTarget | null {
    try {
      const voice = AudioEngine.getVoiceForRobot(robotId);
      if (!voice) return null;

      if (target === 'volume') {
        const gain = (voice.output as unknown as { gain?: unknown })?.gain;
        return (gain as ModulationTarget | undefined) ?? null;
      }

      const match = /^layer(\d+)\.(gain|detune|phase|pulseWidth)$/.exec(target);
      if (!match) return null;
      const layerEntry = voice.layers?.[Number(match[1])];
      if (!layerEntry) return null;
      const field = match[2];

      if (field === 'gain') {
        const gain = (layerEntry.gainNode as unknown as { gain?: unknown })?.gain;
        return (gain as ModulationTarget | undefined) ?? null;
      }
      if (field === 'detune') {
        const osc = (layerEntry.synth as unknown as { oscillator?: { detune?: unknown } })?.oscillator;
        return (osc?.detune as ModulationTarget | undefined) ?? null;
      }
      if (field === 'phase') {
        return null;
      }
      if (field === 'pulseWidth') {
        if (layerEntry.layer.type !== 'pulse') return null;
        const osc = (layerEntry.synth as unknown as { oscillator?: { width?: unknown } })?.oscillator;
        return (osc?.width as ModulationTarget | undefined) ?? null;
      }
      return null;
    } catch (err) {
      devWarn('[AudioEngine] getRobotModulationTarget failed', err);
      return null;
    }
  },

  /**
   * Resolve the live, connectable Tone Signal/Param for a global-chain LFO
   * modulation target. Implementation lives in
   * src/engine/audioEngine/globalFx.ts — this is a direct reference to that
   * module's export, kept on the public AudioEngine surface.
   */
  getGlobalModulationTarget,

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
      const robot = findActiveRobot(robotId);
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
      devWarn('[AudioEngine] reReserveVoice failed', err);
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
        devWarn(`[AudioEngine] updateVoiceLayerParams: no composite reserved for ${robotId}`);
        return;
      }

      try {
        // Pass the full layers array as required by the composite.set contract
        entry.composite.set({ layers: layers as Partial<OscillatorLayer>[] });
        devLog(`[AudioEngine] updateVoiceLayerParams applied for ${robotId}`);
      } catch (err) {
        devWarn('[AudioEngine] Failed to apply layer params on composite', err);
      }
    } catch (err) {
      devWarn('[AudioEngine] updateVoiceLayerParams failed', err);
    }
  },

  /**
   * Create a composite voice made of multiple layers (oscillators and optional noise).
   * Construction itself lives in src/engine/audioEngine/compositeVoice.ts — this is a
   * direct reference to that module's export, kept on the public AudioEngine surface
   * so every existing call site (AudioEngine.createCompositeVoice(...)) still works.
   */
  createCompositeVoice,

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

    devLog(`[AudioEngine] Registered melody for robot ${robotId} (${melody.length} events)`);
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

    devLog(`[AudioEngine] Unregistered melody for robot ${robotId} (${removedCount} events removed)`);
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
    try { transport.bpm.value = bpm; } catch (err) { devWarn('[AudioEngine] setBPM failed', err); }
  },

  /** Pause transport without resetting position (soft pause). */
  pause(): void {
    try {
      const transport = _transport ?? Tone.getTransport();
      transport.pause();
    } catch (err) {
      devWarn('[AudioEngine] pause failed', err);
    }
  },

  /** Resume transport from current position. */
  resume(): void {
    try {
      const transport = _transport ?? Tone.getTransport();
      transport.start();
    } catch (err) {
      devWarn('[AudioEngine] resume failed', err);
    }
  },

  /**
   * Hard stop: cancel scheduled transport events, release active voices,
   * stop transport, and reset position to 0.
   */
  killAll(): void {
    try {
      const transport = _transport ?? Tone.getTransport();
      try { transport.cancel(); } catch (err) { devWarn('[AudioEngine] transport.cancel failed', err); }

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
        try { transport.clear(scheduledTickId); } catch (err) { devWarn('[AudioEngine] transport.clear failed', err); }
        scheduledTickId = null;
      }

      stepCounter = 0;
      activeVoices = 0;
      initialized = false;
      // Reset beatClock so initBeatClock() re-registers its internal tick on next start.
      // transport.cancel() above cleared the old 16n tick; resetBeatClock() lets it be recreated.
      resetBeatClock();
      _unsubscribeMeasure = null; // resetBeatClock cleared the listener array; drop the stale ref
      devLog('[AudioEngine] killAll: transport cancelled, voices released, position reset');
    } catch (err) {
      devWarn('[AudioEngine] killAll failed', err);
    }
  },

  // ========================================
  // GLOBAL FX CHAIN — direct references to src/engine/audioEngine/globalFx.ts's
  // exports, kept on the public AudioEngine surface so every existing call
  // site (AudioEngine.setGlobalReverb(...), etc.) still works unchanged.
  // ========================================
  setMasterVolume,
  getMasterVolume,
  setGlobalReverb,
  setGlobalDelay,
  setGlobalChorus,
  setGlobalFilterLPF,
  setGlobalFilterHPF,
  setGlobalEQ,
  setGlobalCompressor,
  setGlobalBypass,
  setEffectBypass,
};
