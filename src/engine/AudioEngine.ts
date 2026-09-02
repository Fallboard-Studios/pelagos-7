// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';
import gsap from 'gsap';
import { useLocaleStore } from '../stores/localeStore';
import { useDebugStore } from '../stores/debugStore';
import { getActiveLocaleId } from '../utils/localeHelpers';
import { lfoEngine } from './lfoEngine';

import type { ADSREnvelope, MelodyEvent, NoteDuration, WaveformType, Robot } from '../types/Robot';
import type { OscillatorLayer } from '../types/layeredAudio';
import { GLOBAL_LFO_TARGET_IDS, type RobotLfoTargetId } from '../types/lfo';
import { getAvailableNotes, scheduleHarmonyCycle, stopHarmonyCycle } from './harmonySystem';
import { resetBeatClock, subscribeToMeasure, initBeatClock } from './beatClock';
import { applyRhythmicVariance, applyTonalVariance } from './melodyGenerator';
import { buildClickTrackMelody } from './clickTrack';
import { DEV_TUNING, MIN_LEAD, MAX_POLYPHONY } from '../constants';

import { getRef } from '../utils/refs';
import { precomputeDataX } from '../utils/getSeededVal';
import { tryGetLocaleNoiseMap } from '../utils/noiseMaps';
import { devLog, devWarn } from '../utils/helpers';
import { calculatePanFromPosition } from './audioEngine/panning';
import { volumePositionToGain } from './audioEngine/volumeTaper';
import { getToneCtor, type MinimalToneNode, type ModulationTarget } from './audioEngine/toneHelpers';
import { createCompositeVoice, type CompositeVoice } from './audioEngine/compositeVoice';
import {
  buildGlobalFxChain,
  getGlobalChainEntry,
  waitForGlobalReverbReady,
  setMasterVolume,
  getMasterVolume,
  setGlobalReverb,
  setGlobalDelay,
  setGlobalFilterLPF,
  setGlobalFilterHPF,
  setGlobalEQ,
  setGlobalCompressor,
  setGlobalLimiter,
  setGlobalBypass,
  setEffectBypass,
  getGlobalModulationTarget,
} from './audioEngine/globalFx';

// ========================================
// TYPES
// ========================================
export interface NoteParams {
  robotId: string;
  note: string;
  duration: NoteDuration;
  time?: number;
  velocity?: number;
  /** Multiplies the resolved velocity (before clamping to 1). Used for the
   * motif-group accent — see GROUP_ACCENT_MULTIPLIER. */
  accentMultiplier?: number;
}

interface MelodyEventEntry {
  robotId: string;
  event: MelodyEvent;
  /** True when this event is the earliest `startStep` within its motif-tiling
   * repeat window (computed once at registration — see registerRobotMelody). */
  isGroupAccent?: boolean;
}

// ========================================
// CONSTANTS
// ========================================
// NOTE: MAX_POLYPHONY and MIN_LEAD are provided from src/constants for consistency across modules
/** Fraction of notes that receive a random velocity offset for organic expressiveness. */
const VELOCITY_VARIANCE_RATE = 0.15;
/** Maximum ± deviation applied to a note's velocity when variance is triggered. */
const VELOCITY_VARIANCE_AMOUNT = 0.25;  // ±25% offset
/** Minimum effective note velocity after clamping (prevents silent notes). */
const VELOCITY_MIN = 0.05;
/**
 * Velocity multiplier applied to the earliest event in each motif-tiling
 * repeat window, when a robot's rhythmicMotifLength toggle is active — an
 * accent on the "downbeat" of each tiled group. No effect in scatter mode
 * (rhythmicMotifLength.active === false), since there are no groups to accent.
 */
const GROUP_ACCENT_MULTIPLIER = 1.25;
/** Ramp duration for a live updateRobotMasterVolume change — short enough to feel instant, long
 *  enough to avoid an audible click on the underlying AudioParam. */
const VOLUME_RAMP_SECONDS = 0.05;

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
// Notes rejected by the polyphony cap (triggerWithCap) so far this measure —
// snapshotted into useDebugStore.skippedNotesHistory and reset to 0 on every
// measure boundary (see the subscribeToMeasure callback in start()). Feeds
// the Skipped Notes debug counter (src/components/debug/SkippedNotesCounter.tsx).
let skippedNotesThisMeasure = 0;
// Global FX chain (compressor, reverb/delay/limiter/EQ/filters, master
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
 * Excludes any layer with `active === false` from a reserveVoice descriptor — Roadmap Phase 9's
 * "mute, don't delete" model for Coaxial/Harmonic. A layer with no `active` field at all is
 * treated as active (`!== false`, not a strict truthy check), so callers/fixtures that predate
 * the field keep their existing audible behavior rather than silently going quiet.
 */
function filterActiveLayers(
  descriptor: OscillatorLayer[] | { base?: WaveformType; layers?: OscillatorLayer[] },
): OscillatorLayer[] | { base?: WaveformType; layers?: OscillatorLayer[] } {
  if (Array.isArray(descriptor)) {
    return descriptor.filter((l) => l.active !== false);
  }
  if (descriptor.layers) {
    return { ...descriptor, layers: descriptor.layers.filter((l) => l.active !== false) };
  }
  return descriptor;
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
              robot.audioAttributes.adsr,
              robot.audioAttributes?.phase,
              robot.audioAttributes?.detune,
              (robot.audioAttributes as unknown as { layers?: OscillatorLayer[] })?.layers?.[0]?.pulseWidth,
              robot.masterVolume,
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
 *
 * Uses `Tone.getContext().setTimeout` — a real-seconds, AudioContext-clock-based
 * timeout — NOT `transport.scheduleOnce`. `transport.scheduleOnce`'s `'+N'` offset
 * resolves against the TRANSPORT's own tick timeline (`Transport.scheduleOnce` ->
 * `TransportTimeClass(...).toTicks()`), converting the real-seconds delay into a
 * fixed tick position using the tempo in effect at schedule time. If BPM changes
 * before that tick position is reached (docs/specs/BPM_CONTROL.md's live Tempo
 * slider makes this routine now), the real time it takes to reach that fixed tick
 * shifts — releases fire late (bpm decreased) or early (bpm increased). Enough
 * skew strands `activeVoices` at `MAX_POLYPHONY`, silently blocking every new
 * trigger ("plays a few more notes, then nothing"). `context.setTimeout` is
 * genuinely tempo-independent: it fires `delayFromNow` real seconds later
 * regardless of anything `Transport.bpm` does in between.
 */
function scheduleVoiceRelease(duration: NoteDuration, time: number): void {
  const durSec = Tone.Time(duration).toSeconds();
  // `time` is an absolute AudioContext timestamp; `Tone.now()` is the current
  // AudioContext time, so their difference is the lookahead until the note fires.
  const delayFromNow = Math.max(0, (time - Tone.now()) + durSec + 0.04);

  try {
    Tone.getContext().setTimeout(() => {
      activeVoices = Math.max(0, activeVoices - 1);
    }, delayFromNow);
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

  // Enforce audioMode (mute/solo) here — this is the sole enforcement point,
  // not a backup: scheduleNote's own audioMode block only handles highlight
  // attenuation. Checked before the polyphony cap below so a muted/non-solo
  // robot's note never counts against skippedNotesThisMeasure just because
  // the cap happens to be full at the same time — that note was never going
  // to play either way, unlike every reason the cap check below counts. No
  // devLog on the mute/solo branches below — muted/non-solo robots hit this
  // on every note attempt, and that's routine, intended behavior, not
  // something worth logging per-note.
  try {
    const localeRobots = getActiveLocaleRobots();
    if (localeRobots.length > 0) {
      const robotFromStore = localeRobots.find((r) => r.id === robotId);
      if (robotFromStore?.audioMode === 'mute') {
        return false;
      }
      const anySoloInStore = localeRobots.some((r) => r.audioMode === 'solo');
      if (anySoloInStore && robotFromStore?.audioMode !== 'solo') {
        return false;
      }
      // Highlight attenuation is handled in scheduleNote; skip here to avoid double-attenuation.
    }
  } catch (err) {
    devWarn('[AudioEngine] triggerWithCap.audioMode failed', err);
  }

  if (activeVoices >= MAX_POLYPHONY) {
    devLog(`[AudioEngine] Polyphony capped: ${activeVoices}/${MAX_POLYPHONY}`);
    skippedNotesThisMeasure++;
    return false;
  }

  const scheduleTime = time ?? Tone.now();
  activeVoices++;

  try {
    if (!compositeVoices.has(robotId)) {
      activeVoices = Math.max(0, activeVoices - 1);
      devWarn(`[AudioEngine] No composite voice reserved for ${robotId}, skipping note`);
      skippedNotesThisMeasure++;
      return false;
    }

    const comp = compositeVoices.get(robotId);
    const synth = comp?.composite ?? null;
    const panner = comp?.panner ?? null;

    if (!synth) {
      activeVoices = Math.max(0, activeVoices - 1);
      devWarn('[AudioEngine] No composite voice available, skipping note');
      skippedNotesThisMeasure++;
      return false;
    }

    // Validate note string before touching the synth — an invalid note can start
    // an oscillator attack before throwing, leaving voices permanently open.
    const NOTE_RE = /^[A-Ga-g][b#]{0,2}\d+$/;
    if (!NOTE_RE.test(note)) {
      activeVoices = Math.max(0, activeVoices - 1);
      console.warn(`[AudioEngine] Invalid note string "${note}", skipping`);
      skippedNotesThisMeasure++;
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
    skippedNotesThisMeasure++;
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
      // Each event is isolated in its own try/catch — an uncaught exception from
      // one robot's scheduleNote call must not abort the forEach and silently
      // drop every remaining event in this same step.
      try {
        const noteName = notes[event.noteIndex]; // note name without octave, e.g. "C"

        if (!noteName) {
          devWarn(
            `[AudioEngine] Invalid note index ${event.noteIndex} for robot ${robotId}`
          );
          skippedNotesThisMeasure++;
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
      } catch (err) {
        devWarn(`[AudioEngine] Failed to schedule note for robot ${robotId}`, err);
        skippedNotesThisMeasure++;
      }
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
 * Neutral per-note velocity baseline. Roadmap Phase 9 moved overall robot loudness off per-note
 * velocity and onto each robot's own live bus gain (see reserveVoice's masterVolume parameter and
 * updateRobotMasterVolume) — a robot's masterVolume no longer feeds this at all, avoiding
 * double-applying the same scaling twice. This baseline is just where the small performance-level
 * variance below jitters around; it isn't itself a volume control.
 */
const NOTE_VELOCITY_BASELINE = 1;

/**
 * Deterministic, locale-seeded velocity computation.
 * Samples the active locale's noise map at precomputed X positions and the
 * per-robot note index (mod 97) to decide whether to apply variance.
 * Falls back to no variance when the noise map is unavailable.
 */
function computeNoteVelocitySeeded(robotId?: string): number {
  const localeId = getActiveLocaleId();
  const noiseMap = tryGetLocaleNoiseMap(localeId);
  if (!noiseMap) return Math.min(1, Math.max(VELOCITY_MIN, NOTE_VELOCITY_BASELINE));

  const idx = robotId ? (robotNoteIndex.get(robotId) ?? 0) : 0;
  const noteIndex = idx % 97; // prime period for long non-repeating patterns

  const roll = (noiseMap(VELOCITY_ROLL_X, noteIndex) + 1) / 2; // map [-1,1] -> [0,1]
  if (roll < VELOCITY_VARIANCE_RATE) {
    const raw = noiseMap(VELOCITY_VARIANCE_X, noteIndex); // [-1,1]
    const variance = raw * VELOCITY_VARIANCE_AMOUNT; // signed
    const out = Math.min(1, Math.max(VELOCITY_MIN, NOTE_VELOCITY_BASELINE + variance));
    if (robotId) robotNoteIndex.set(robotId, (idx + 1) % 97);
    return out;
  }

  if (robotId) robotNoteIndex.set(robotId, (idx + 1) % 97);
  return Math.min(1, Math.max(VELOCITY_MIN, NOTE_VELOCITY_BASELINE));
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

    // Prime lfoEngine from the current globalLfo state and connect+start
    // already-active targets — this is the one point guaranteed to run after
    // Tone.start()/transport.start() have succeeded, so it's the only safe
    // place to construct the underlying Tone.LFO nodes. AS-sync's
    // regenerateGlobalLfoFromSeed (audioStore.ts) is deliberately data-only
    // for exactly this reason — it runs before any user gesture.
    // Dynamic import, deliberately: audioStore.ts's GLOBAL_SETTER reads
    // AudioEngine.setGlobal* eagerly at its own module scope, so a top-level
    // `import { useAudioStore } from '../stores/audioStore'` here would force
    // audioStore.ts to evaluate mid-way through AudioEngine.ts's own module
    // evaluation, before the `AudioEngine` export exists yet (verified: this
    // threw "Cannot read properties of undefined (reading 'setGlobalCompressor')"
    // when tried as a static import).
    try {
      const { useAudioStore, applyGlobalAudioToEngine } = await import('../stores/audioStore');
      const { globalAudio, globalLfo } = useAudioStore.getState();
      // buildGlobalFxChain() (above) just constructed every FX node from its
      // own hardcoded literal defaults — not whatever's already seeded in
      // globalAudio. regenerateGlobalAudioFromSeed's own push (AS-sync,
      // module load) ran long before these nodes existed, so it landed as a
      // no-op; re-apply the current state now that real nodes exist. Must
      // run before the LFO priming loop below: connectLfoTarget's swing math
      // reads each target's CURRENT value, so EQ/filter values need to be
      // correct first.
      applyGlobalAudioToEngine(globalAudio);
      for (const target of GLOBAL_LFO_TARGET_IDS) {
        const settings = globalLfo[target];
        lfoEngine.setLfoShape(target, settings.shape);
        lfoEngine.setLfoRate(target, settings.rate);
        lfoEngine.setLfoDepth(target, settings.depth);
        if (settings.active && lfoEngine.connectLfoTarget(target)) {
          lfoEngine.start(target);
        }
      }
    } catch (err) {
      devWarn('[AudioEngine] priming global LFOs failed', err);
    }

    initBeatClock(transport);
    // Ensure `currentMeasure` in the ocean store is driven by the BeatClock.
    // This updates visuals (lighting) and allows harmony to derive from measures.
    try {
      _unsubscribeMeasure?.();
      _unsubscribeMeasure = subscribeToMeasure((m: number) => {
        useLocaleStore.getState().setLocaleData(getActiveLocaleId(), { currentMeasure: m });
        // Snapshot this measure's polyphony-cap skips into the debug history,
        // then reset the counter for the next measure.
        useDebugStore.getState().recordSkippedNotesForMeasure(skippedNotesThisMeasure);
        skippedNotesThisMeasure = 0;
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
    skippedNotesThisMeasure = 0;
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
      // No masterVolume lookup needed here anymore — overall robot loudness is the live bus gain's
      // job (reserveVoice's masterVolume parameter, updateRobotMasterVolume), not per-note velocity.
      effectiveVelocity = computeNoteVelocitySeeded(robotId);
    }

    if (params.accentMultiplier !== undefined && effectiveVelocity !== undefined) {
      effectiveVelocity = Math.min(1, effectiveVelocity * params.accentMultiplier);
    }

    // Enforce audioMode policies (mute/solo/highlight) at schedule time.
    try {
      const localeRobots = getActiveLocaleRobots();
      const robotFromStore = localeRobots.find((r) => r.id === robotId);
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
   * @param descriptor - LayeredWave descriptor from the robot's audioAttributes. Any layer with
   *   `active === false` (Roadmap Phase 9 — Coaxial/Harmonic muted, not deleted) is excluded from
   *   the composite voice actually built: no synth node is created for it, though its full config
   *   stays in `Robot` state untouched. A layer with no `active` field at all is treated as
   *   active, for backward compatibility with fixtures/callers that predate the field.
   * @param adsr - The robot's one shared ADSR envelope (Roadmap Phase 9), applied identically to
   *   every included layer's synth at construction — the same "one shared value applied across
   *   every layer" role `phase`/`detune`/`pulseWidth` play below.
   * @param phase - Optional oscillator phase (degrees) applied across all layers
   * @param detune - Optional detune (cents) applied across all layers
   * @param pulseWidth - Optional pulse width (0..1) applied across all layers
   * @param masterVolume - The robot's Volume slider position (0..1, Roadmap Phase 9's live-fader
   *   fix), defaulting to 1 when omitted. Passed through `volumePositionToGain` (a perceptual
   *   taper, not a raw pass-through — see volumeTaper.ts) before being applied as the initial
   *   value of the robot's live per-robot bus gain. Unlike `adsr`/`phase`/`detune`, this is not
   *   baked into any note's own trigger — it's a continuously-live AudioParam on the bus every
   *   note from this robot passes through, updatable afterward via `updateRobotMasterVolume`
   *   without re-reserving.
   */
  reserveVoice(
    robotId: string,
    descriptor: OscillatorLayer[] | { base?: WaveformType; layers?: OscillatorLayer[] },
    adsr: ADSREnvelope,
    phase?: number,
    detune?: number,
    pulseWidth?: number,
    masterVolume?: number,
  ): boolean {
    try {
      const activeDescriptor = filterActiveLayers(descriptor);
      const composite = AudioEngine.createCompositeVoice(activeDescriptor, adsr);

      const PannerCtor = getToneCtor<Tone.Panner>('Panner');
      const GainCtorLocal = getToneCtor<Tone.Gain>('Gain');
      const FilterCtor = getToneCtor<Tone.Filter>('Filter');

      const initialBusGain = volumePositionToGain(masterVolume ?? 1);
      const panner = PannerCtor ? new PannerCtor({ pan: 0 }) : ({ connect: () => { }, pan: { value: 0 }, disconnect: () => { } } as MinimalToneNode) as unknown as Tone.Panner;
      const busGain = GainCtorLocal ? new GainCtorLocal(initialBusGain) : ({ connect: () => ({}), disconnect: () => { }, gain: { value: initialBusGain }, toDestination: () => { } } as MinimalToneNode) as unknown as Tone.Gain;
      const busFilter = FilterCtor ? new FilterCtor({ frequency: 1200, Q: 1 }) : ({ connect: () => ({}), disconnect: () => { }, toDestination: () => { } } as MinimalToneNode) as unknown as Tone.Filter;

      // Connect graph: composite.output -> panner -> busGain -> busFilter -> master compressor/destination
      try { composite.output.connect(panner); } catch (e) { devWarn('[AudioEngine] composite.output.connect failed', e); }
      try { (panner as unknown as { connect?: (target?: unknown) => unknown }).connect?.(busGain); } catch (e) { devWarn('[AudioEngine] panner.connect failed', e); }
      try { (busGain as unknown as { connect?: (target?: unknown) => unknown }).connect?.(busFilter); } catch (e) { devWarn('[AudioEngine] busGain.connect failed', e); }
      try {
        const chainEntry = getGlobalChainEntry();
        if (chainEntry) {
          (busFilter as unknown as { connect?: (target?: unknown) => unknown }).connect?.(chainEntry);
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
          // Must match activeDescriptor (what createCompositeVoice actually built), not the raw
          // descriptor, so this index-matched application lands on the right layer.
          const effectiveLayers = Array.isArray(activeDescriptor)
            ? activeDescriptor
            : (activeDescriptor.layers && activeDescriptor.layers.length > 0 ? activeDescriptor.layers : [{ type: activeDescriptor.base ?? 'sine', gain: 1, detune: 0, phase: 0, active: true } as OscillatorLayer]);
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
      const busGain = ({ connect: () => { }, disconnect: () => { }, gain: { value: volumePositionToGain(masterVolume ?? 1) } } as MinimalToneNode) as unknown as Tone.Gain;
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
        robot.audioAttributes.adsr,
        robot.audioAttributes?.phase,
        robot.audioAttributes?.detune,
        (robot.audioAttributes as unknown as { layers?: OscillatorLayer[] })?.layers?.[0]?.pulseWidth,
        robot.masterVolume,
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
   * Apply an updated shared ADSR envelope to every active layer's live synth, without rebuilding
   * the underlying node graph (Roadmap Phase 9 — Ping Contour drawer's live edits).
   *
   * Reuses the exact same continuous-update path `updateVoiceLayerParams` already uses: rebuilds
   * the layers-patch from the composite's already-exposed `layers` (each entry's own current
   * config, since only `active` layers were ever given a synth in the first place) with the new
   * `adsr` stamped onto every entry, then calls `composite.set({ layers })` — the same
   * `p.adsr → synth.set({ envelope: p.adsr })` path `compositeVoice.ts` already applies for a
   * continuous param edit. No structural change, no audio gap.
   */
  updateVoiceEnvelope(robotId: string, adsr: ADSREnvelope): void {
    try {
      const entry = compositeVoices.get(robotId);
      if (!entry?.composite.layers) {
        devWarn(`[AudioEngine] updateVoiceEnvelope: no composite reserved for ${robotId}`);
        return;
      }
      try {
        const patched = entry.composite.layers.map(({ layer }) => ({ ...layer, adsr }));
        entry.composite.set({ layers: patched });
        devLog(`[AudioEngine] updateVoiceEnvelope applied for ${robotId}`);
      } catch (err) {
        devWarn('[AudioEngine] Failed to apply envelope on composite', err);
      }
    } catch (err) {
      devWarn('[AudioEngine] updateVoiceEnvelope failed', err);
    }
  },

  /**
   * Immediately updates a robot's live per-robot bus gain (Robot Options' RobotDisplaySection
   * Volume slider) — a continuously-live AudioParam, not a value baked into each note's own
   * trigger, so this affects anything currently sounding through the bus (an already-ringing
   * note's release tail included), not just the next note this robot happens to play. `masterVolume`
   * is the 0..1 slider position, passed through `volumePositionToGain` first — a linear position
   * applied directly as gain would feel almost flat across most of the fader (human loudness
   * perception is roughly logarithmic), so the actual gain follows a perceptual taper instead;
   * see volumeTaper.ts. Ramps over a short duration when the live Tone.Gain param supports it, to
   * avoid an audible click; falls back to a direct value assignment in headless/test environments
   * where it doesn't. A safe no-op (with a devWarn, matching updateVoiceLayerParams/
   * updateVoiceEnvelope's existing pattern) when no composite voice is reserved for the robot.
   */
  updateRobotMasterVolume(robotId: string, masterVolume: number): void {
    const entry = compositeVoices.get(robotId);
    if (!entry) {
      devWarn(`[AudioEngine] updateRobotMasterVolume: no composite reserved for ${robotId}`);
      return;
    }
    try {
      const targetGain = volumePositionToGain(masterVolume);
      const gain = entry.busGain.gain as unknown as { rampTo?: (value: number, rampTime: number) => void; value: number };
      if (typeof gain.rampTo === 'function') {
        gain.rampTo(targetGain, VOLUME_RAMP_SECONDS);
      } else {
        gain.value = targetGain;
      }
    } catch (err) {
      devWarn('[AudioEngine] updateRobotMasterVolume failed', err);
    }
  },

  /**
   * Create a composite voice made of multiple oscillator layers.
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
   * - When the robot's own `clickTrackActive` flag (Robot.ts) is true, `melody` is ignored
   *   entirely and the fixed click-track pattern (src/engine/clickTrack.ts) is registered
   *   instead — enforced *here*, the one funnel every melody-registration call site shares
   *   (spawn, Reset Melody, Density/Motif/Note Variance edits, docking's pitch-drift reroll,
   *   this file's own per-loop rhythmic/tonal variance), rather than trusting each call site to
   *   remember to check the flag itself. See docs/MELODY_SYSTEM.md's Click Track note.
   *
   * @param robotId - Unique robot identifier
   * @param melody - Array of `MelodyEvent` describing start steps and notes; superseded by
   *   the click-track pattern while this robot's `clickTrackActive` is true.
   */
  registerRobotMelody(robotId: string, melody: MelodyEvent[]): void {
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

    const robot = findActiveRobot(robotId);
    const effectiveMelody = robot?.clickTrackActive
      ? buildClickTrackMelody(robot.octaveRange[0])
      : melody;

    // Motif-group accent: computed once here (not per-tick) so it stays off the
    // scheduling hot path. Only meaningful when the robot's Motif Length toggle
    // is active — scatter mode has no repeat windows to accent. Skipped entirely for the
    // click track — it's a flat, unaccented test pulse, not the robot's own motif structure.
    const motif = robot?.rhythmicMotifLength;
    const accentedStartSteps = new Set<number>();
    if (motif?.active && !robot?.clickTrackActive) {
      const windowLength = Math.max(1, motif.value);
      const earliestInWindow = new Map<number, number>(); // window index -> earliest startStep
      effectiveMelody.forEach((event) => {
        const windowIndex = Math.floor((event.startStep - 1) / windowLength);
        const current = earliestInWindow.get(windowIndex);
        if (current === undefined || event.startStep < current) {
          earliestInWindow.set(windowIndex, event.startStep);
        }
      });
      earliestInWindow.forEach((step) => accentedStartSteps.add(step));
    }

    effectiveMelody.forEach((event) => {
      const entries = stepRegistry.get(event.startStep) || [];
      entries.push({ robotId, event, isGroupAccent: accentedStartSteps.has(event.startStep) });
      stepRegistry.set(event.startStep, entries);
    });

    devLog(`[AudioEngine] Registered melody for robot ${robotId} (${effectiveMelody.length} events)`);
  },

  unregisterRobotMelody(robotId: string): void {
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
  getRegisteredMelody(robotId: string): MelodyEvent[] {
    const out: MelodyEvent[] = [];
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

    events.forEach(({ robotId, event, isGroupAccent }) => {
      // Mirrors startMelodyPlayback's own per-event isolation (this function
      // documents itself as "process a single melody step as the transport
      // tick would" — keep the two in sync).
      try {
        const noteName = notes[event.noteIndex];
        if (!noteName) {
          devWarn(`[AudioEngine] Invalid note index ${event.noteIndex} for robot ${robotId}`);
          skippedNotesThisMeasure++;
          return;
        }
        const octave = event.octave ?? 4;
        const note = `${noteName}${octave}`;

        AudioEngine.scheduleNote({
          robotId,
          note,
          duration: event.length,
          time: time + MIN_LEAD,
          accentMultiplier: isGroupAccent ? GROUP_ACCENT_MULTIPLIER : undefined,
        });
      } catch (err) {
        devWarn(`[AudioEngine] Failed to schedule note for robot ${robotId}`, err);
        skippedNotesThisMeasure++;
      }
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
   *
   * Deliberately an instant assignment, not a ramp. BPM/tempo isn't a
   * continuously-summed audio signal like Gain — it only governs when
   * future notes get scheduled, so an instant change doesn't produce a
   * click the way an instant Gain jump does; there's nothing here for a
   * ramp to protect against. Worse, a ramp actively hurts: the Audio Rig
   * Tempo slider's onChange fires continuously during a drag (Radix's
   * onValueChange, not onValueCommit), far more often than any short ramp
   * could complete — each call would cancel the previous still-in-flight
   * ramp and restart a new one (Tone.Param.rampTo's own
   * cancelAndHoldAtTime behavior), so the tempo would never actually
   * settle for the whole drag gesture. That's exactly what surfaced as a
   * real, reported bug: the beat became audibly unstable ("wishy-washy",
   * no locatable downbeat) while dragging, not just "different." Standard
   * DAW behavior — and this function's own original pre-ramp shape —
   * applies tempo changes instantly for the same reason.
   */
  setBPM(bpm: number): void {
    if (!initialized) return;
    const transport = _transport ?? Tone.getTransport();
    try {
      transport.bpm.value = bpm;
    } catch (err) { devWarn('[AudioEngine] setBPM failed', err); }
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
      skippedNotesThisMeasure = 0;
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
  setGlobalFilterLPF,
  setGlobalFilterHPF,
  setGlobalEQ,
  setGlobalCompressor,
  setGlobalLimiter,
  setGlobalBypass,
  setEffectBypass,
};
