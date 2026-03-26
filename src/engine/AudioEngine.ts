// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';
import gsap from 'gsap';
import { useOceanStore } from '../stores/oceanStore';

import type { NoteDuration, ADSREnvelope, SynthType, WaveformType } from '../types/Robot';
import { getAvailableNotes, scheduleHarmonyCycle, stopHarmonyCycle } from './harmonySystem';
import { initBeatClock } from './beatClock';
import type { RobotMelodyEvent } from './melodyGenerator';
import { applyRhythmicVariance } from './melodyGenerator';
import { DEV_TUNING, WORLD_WIDTH } from '../constants';
import { getRef } from '../utils/refs';

// ========================================
// TYPES
// ========================================
export interface NoteParams {
  robotId: string;
  note: string;
  duration: NoteDuration;
  time?: number;
  velocity?: number;
  fatCount?: number;
  fatSpread?: number;
  synthType?: SynthType | string;
  adsr?: ADSREnvelope;
  waveform?: WaveformType;
}

interface MelodyEventEntry {
  robotId: string;
  event: RobotMelodyEvent;
}

type SynthPool = Record<string, Tone.PolySynth[]>;
type PannerPool = Record<string, Tone.Panner[]>;

// ========================================
// CONSTANTS
// ========================================
const MAX_POLYPHONY = 16;
const MIN_LEAD = 0.05; // 50ms lookahead for scheduling
/** Fraction of notes that receive a random velocity offset for organic expressiveness. */
const VELOCITY_VARIANCE_RATE = 0.15;
/** Maximum ± deviation applied to a note's velocity when variance is triggered. */
const VELOCITY_VARIANCE_AMOUNT = 0.25;  // ±25% offset
/** Minimum effective note velocity after clamping (prevents silent notes). */
const VELOCITY_MIN = 0.05;

// ========================================
// MODULE STATE
// ========================================
let initialized = false;
let instrumentsLoaded = false;
let synthPool: SynthPool | null = null;
// Reservation state
const reservedVoices: Map<string, { type: string; index: number; reservedAt: number }> = new Map();
let reservedSlots: Record<string, Array<string | null>> | null = null;
let activeVoices = 0;
// Prefixed with underscore to acknowledge it's intentionally kept for
// potential external inspector/debugging while avoiding unused-var lint.
let _masterCompressor: Tone.Compressor | null = null;

// Step registry: Map<stepNumber (1-16), events at that step>
const stepRegistry = new Map<number, MelodyEventEntry[]>();

let stepCounter = 0;
let scheduledTickId: number | null = null;

// Panner pool: each synth instance has its own panner for independent position control
let pannerPool: PannerPool | null = null;
/** Robot audio attribute cache — keyed by robotId to avoid per-note Zustand store scans.
 * Populated on first note for a robot, cleared when its melody is unregistered.
 * Audio attributes are immutable after spawn so this cache never goes stale. */
const robotAttributeCache = new Map<string, {
  synthType: string;
  adsr: ADSREnvelope;
  waveform?: WaveformType;
  masterVolume: number;
}>();

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
    // Silently fall through to state position fallback
    if (DEV_TUNING) console.warn('[AudioEngine] Failed to read visual X from DOM:', err);
  }

  // Fallback: read position from state
  try {
    const state = useOceanStore.getState();
    const robot = state.robots.find((r) => r.id === robotId);
    return robot?.position.x ?? 960; // Default to center if not found
  } catch (err) {
    if (DEV_TUNING) console.warn('[AudioEngine] Failed to read state position:', err);
    return 960; // Default to center
  }
}

/**
 * Get the synth and its corresponding panner from the pool.
 * Used to ensure each synth trigger updates the correct panner for that voice.
 *
 * @param type - Synth type (e.g., 'fm', 'am')
 * @returns { synth, panner } or { synth: null, panner: null } if not found
 */
function getSynthAndPanner(type?: string): { synth: Tone.PolySynth | null; panner: Tone.Panner | null } {
  if (!synthPool || !pannerPool) {
    return { synth: null, panner: null };
  }

  const t = (type || '').toString().toLowerCase();
  let synthArr: Tone.PolySynth[] | undefined;
  let pannerArr: Tone.Panner[] | undefined;

  switch (t) {
    case 'fmsynth':
    case 'fm':
      synthArr = synthPool['fm'];
      pannerArr = pannerPool['fm'];
      break;
    case 'amsynth':
    case 'am':
      synthArr = synthPool['am'];
      pannerArr = pannerPool['am'];
      break;
    case 'duosynth':
    case 'duo':
      synthArr = synthPool['duo'];
      pannerArr = pannerPool['duo'];
      break;
    default:
      synthArr = synthPool['default'];
      pannerArr = pannerPool['default'];
  }

  const synth = synthArr && synthArr.length > 0 ? synthArr[0] : null;
  const panner = pannerArr && pannerArr.length > 0 ? pannerArr[0] : null;

  return { synth, panner };
}

/**
 * Load synth pool with 4 types for timbral variety.
 * All synths route through individual panners to the compressor for position-based panning.
 */
async function loadInstruments(): Promise<void> {
  if (instrumentsLoaded) return;

  const compressor = new Tone.Compressor({
    threshold: -18,  // engage earlier to tame FM/AM harmonics before clipping
    ratio: 6,        // softer compression ratio; not a hard limiter
    attack: 0.003,
    release: 0.15,
  }).toDestination();
  _masterCompressor = compressor;

  // Helper to try constructing a PolySynth for a voice constructor, with
  // a fallback to a simpler Synth voice if the voice class is not present
  // in the loaded Tone.js build or throws at construction time.
  const PolySynthCtor = Tone.PolySynth as unknown as { new(voiceCtor: unknown): Tone.PolySynth };
  const toneRecord = Tone as unknown as Record<string, unknown>;
  const createPolyWithFallback = (voiceCtor: unknown, fallbackCtor: unknown): Tone.PolySynth => {
    try {
      if (!voiceCtor) throw new Error('voiceCtor not available');
      if (typeof PolySynthCtor !== 'function') throw new Error('PolySynth constructor not available');
      return new PolySynthCtor(voiceCtor);
    } catch (err) {
      console.warn('[AudioEngine] Failed to construct PolySynth for voice, falling back:', err);
      if (typeof PolySynthCtor !== 'function') throw err;
      return new PolySynthCtor(fallbackCtor || (toneRecord.Synth ?? null));
    }
  };

  // pool sizing per type (sum should be <= MAX_POLYPHONY)
  const POOL_SIZING: Record<string, number> = {
    default: 5,
    fm: 3,
    am: 3,
    poly: 2,
    duo: 3,
  };

  synthPool = {} as SynthPool;
  pannerPool = {} as PannerPool;
  reservedSlots = {};

  for (const [type, count] of Object.entries(POOL_SIZING)) {
    const synthArr: Tone.PolySynth[] = [];
    const pannerArr: Tone.Panner[] = [];
    for (let i = 0; i < count; i++) {
      let poly: Tone.PolySynth;
      switch (type) {
        case 'fm':
          poly = createPolyWithFallback(toneRecord.FMSynth, toneRecord.Synth);
          break;
        case 'am':
          poly = createPolyWithFallback(toneRecord.AMSynth, toneRecord.Synth);
          break;
        case 'duo':
          poly = createPolyWithFallback(toneRecord.DuoSynth, toneRecord.Synth);
          break;
        default:
          poly = createPolyWithFallback(toneRecord.Synth, toneRecord.Synth);
      }
      // Pull back hot synth types before the compressor.
      // FM/AM synthesis produces loud harmonics; attenuate to prevent clipping.
      if (type === 'fm' || type === 'am') {
        poly.volume.value = -10;
      } else {
        poly.volume.value = -6;
      }

      // Create individual panner for this synth: synth → panner → compressor
      const panner = new Tone.Panner({ pan: 0 }).connect(compressor);
      poly.connect(panner);

      synthArr.push(poly);
      pannerArr.push(panner);
    }
    synthPool[type] = synthArr;
    pannerPool[type] = pannerArr;
    reservedSlots[type] = new Array(count).fill(null);
  }

  instrumentsLoaded = true;
  console.log('[AudioEngine] Synth pool loaded');
}

/**
 * Schedule voice release at the exact time note ends.
 */
function scheduleVoiceRelease(duration: NoteDuration, time: number): void {
  const durSec = Tone.Time(duration).toSeconds();
  const noteEnd = time + durSec;
  const releaseTime = noteEnd + 0.04;

  try {
    const transport = Tone.getTransport();
    transport.scheduleOnce(() => {
      activeVoices = Math.max(0, activeVoices - 1);
      if (DEV_TUNING) {
        console.log(`[AudioEngine] Voice released: ${activeVoices}/${MAX_POLYPHONY}`);
      }
    }, releaseTime);
  } catch (err) {
    // Fallback: immediate release
    activeVoices = Math.max(0, activeVoices - 1);
    if (DEV_TUNING) console.warn('[AudioEngine] Failed to schedule voice release, immediate fallback', err);
  }
}
/**
 * Trigger note with polyphony cap enforcement.
 * Applies per-robot synth selection and ADSR envelope when provided.
 * Returns true if note was triggered, false if skipped due to cap.
 */
export function triggerWithCap(params: NoteParams): boolean {
  const { robotId, note, duration, time, velocity, synthType, adsr, waveform } = params;

  if (!synthPool) {
    console.warn('[AudioEngine] Synth pool not loaded');
    return false;
  }

  // Check polyphony limit
  if (activeVoices >= MAX_POLYPHONY) {
    if (DEV_TUNING) {
      console.log(
        `[AudioEngine] Polyphony capped: ${activeVoices}/${MAX_POLYPHONY}`
      );
    }
    return false;
  }

  const scheduleTime = time ?? Tone.now();

  // Increment voice counter BEFORE triggering
  activeVoices++;

  try {
    // Select synth and corresponding panner from the pool
    // Prefer reserved synth slot for this robot when present
    const reserved = AudioEngine.getVoiceForRobot(robotId);
    let synth: Tone.PolySynth | null;
    let panner: Tone.Panner | null;

    if (reserved) {
      synth = reserved;
      // Use stored type+index for O(1) panner lookup — avoids indexOf scan on every trigger.
      panner = null;
      const reservation = reservedVoices.get(robotId);
      if (reservation && pannerPool) {
        panner = pannerPool[reservation.type]?.[reservation.index] ?? null;
      }
    } else {
      // Use getSynthAndPanner to get both synth and its corresponding panner
      const { synth: selectedSynth, panner: selectedPanner } = getSynthAndPanner(synthType);
      synth = selectedSynth;
      panner = selectedPanner;

      // Fallback to default synth if still nothing available
      if (!synth && synthPool) {
        const defaultArr = synthPool['default'];
        const defaultPannerArr = pannerPool ? pannerPool['default'] : undefined;
        synth = defaultArr?.[0] ?? null;
        panner = defaultPannerArr?.[0] ?? null;
      }
    }

    if (!synth) {
      // No synth available — restore voice counter and skip note
      activeVoices = Math.max(0, activeVoices - 1);
      if (DEV_TUNING) console.warn('[AudioEngine] No synth available, skipping note');
      return false;
    }

    // Apply ADSR only on shared (non-reserved) synths. Reserved voices have ADSR applied
    // once at reserveVoice() time — reapplying every note is wasted work inside the Transport tick.
    if (adsr && !reserved) {
      const maybeSetter = synth as unknown as { set?: (props: unknown) => void };
      if (typeof maybeSetter.set === 'function') {
        try {
          maybeSetter.set({ envelope: adsr });
        } catch (err) {
          console.warn('[AudioEngine] Failed to apply ADSR to synth:', err);
        }
      }
    }

    // Waveform is applied once at reserveVoice() time, not per-trigger.
    // Mid-playback oscillator rebuilds on a shared synth kill in-flight voices.

    // Validate note string before touching the synth — an invalid note can start
    // an oscillator attack before throwing, leaving voices permanently open.
    const NOTE_RE = /^[A-Ga-g][b#]{0,2}\d+$/;
    if (!NOTE_RE.test(note)) {
      activeVoices = Math.max(0, activeVoices - 1);
      console.warn(`[AudioEngine] Invalid note string "${note}", skipping`);
      return false;
    }

    // ========================================
    // PAN CALCULATION & UPDATE
    // ========================================
    // Look up robot's current visual X position (from DOM animation) and calculate stereo pan.
    // Reads the GSAP-animated x transform for real-time panning that tracks visual movement.
    // Falls back to stored position if DOM ref not available.
    // Update the synth's individual panner before note trigger (synchronous, cheap).
    if (robotId && panner) {
      try {
        const visualX = getRobotVisualX(robotId);
        const panValue = calculatePanFromPosition(visualX);
        panner.pan.value = panValue;

      } catch (err) {
        console.warn('[AudioEngine] Failed to calculate/apply pan:', err);
      }
    }

    synth.triggerAttackRelease(note, duration, scheduleTime, velocity ?? 0.8);
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

  const transport = Tone.getTransport();

  scheduledTickId = transport.scheduleRepeat((time) => {
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
    // At loop boundary (16-step loop completed), defer the O(robots × registry) variance
    // work via queueMicrotask so the Transport tick completes before we mutate state.
    if (stepCounter % 16 === 0) {
      if (DEV_TUNING) {
        console.log(`[AudioEngine] Loop boundary reached at step ${stepCounter}`);
      }
      queueMicrotask(() => {
        try {
          const store = useOceanStore.getState();
          const robotCount = store.robots.length;
          if (DEV_TUNING) {
            console.log(`[AudioEngine] Checking variance for ${robotCount} robots`);
          }

          store.robots.forEach((robot) => {
            // Store original data to detect changes
            const originalMelody = robot.melody;
            const originalSteps = originalMelody.map((e) => e.startStep);

            // Apply variance (returns new array or original)
            const variedMelody = applyRhythmicVariance(originalMelody as never);

            // Detect if any startStep actually changed
            const newSteps = variedMelody.map((e) => e.startStep);
            const changed = originalSteps.some((step, i) => step !== newSteps[i]);

            if (changed) {
              // Update stepRegistry with varied melody for THIS loop's playback only
              // (don't persist to state, so next loop resets to original)
              AudioEngine.unregisterRobotMelody(robot.id);
              AudioEngine.registerRobotMelody(robot.id, variedMelody as never);

              if (DEV_TUNING) {
                const shifts = originalSteps
                  .map((step, i) => (step !== newSteps[i] ? `event${i}:${step}→${newSteps[i]}` : null))
                  .filter((x) => x !== null)
                  .join(', ');
                console.log(
                  `[AudioEngine] Rhythmic variance applied to robot ${robot.id}: ${shifts}`
                );
              }
            } else if (DEV_TUNING) {
              console.log(`[AudioEngine] No variance triggered for robot ${robot.id} (probability)`);
            }
          });
        } catch (err) {
          console.warn('[AudioEngine] Failed to apply rhythmic variance:', err);
        }
      });
    }
  }, '8n');

  console.log('[AudioEngine] Melody playback started (8n tick)');
}

// ========================================
// AUDIOENGINE SINGLETON (FUNCTIONAL)
// ========================================

/**
 * Compute an effective note velocity from a robot's `masterVolume`.
 * 15% of calls apply a random ±25% offset, producing organic expressiveness.
 * All results are clamped to [VELOCITY_MIN, 1.0] and are never stored in state.
 *
 * @param masterVolume - Base velocity (0–1) from the robot's state
 * @returns Effective velocity clamped to [VELOCITY_MIN, 1.0]
 */
export function computeNoteVelocity(masterVolume: number): number {
  if (Math.random() < VELOCITY_VARIANCE_RATE) {
    const variance = Math.random() * 2 * VELOCITY_VARIANCE_AMOUNT - VELOCITY_VARIANCE_AMOUNT;
    return Math.min(1, Math.max(VELOCITY_MIN, masterVolume + variance));
  }
  return Math.min(1, Math.max(VELOCITY_MIN, masterVolume));
}

export const AudioEngine = {
  async start(): Promise<void> {
    if (initialized) return;

    await Tone.start();
    await loadInstruments();

    const transport = Tone.getTransport();
    // Always start audio transport at 0 so music begins at measure 0 regardless
    // of the world time. Do NOT realign transport.position with store.
    if (transport.state !== 'started') {
      await transport.start();
    }

    initBeatClock(transport);
    startMelodyPlayback();
    scheduleHarmonyCycle(transport);

    initialized = true;
    console.log('[AudioEngine] Started');
  },

  stop(): void {
    const transport = Tone.getTransport();

    if (scheduledTickId !== null) {
      transport.clear(scheduledTickId);
      scheduledTickId = null;
    }

    stopHarmonyCycle();

    if (transport.state === 'started') {
      transport.stop();
    }

    stepCounter = 0;
    activeVoices = 0;
    initialized = false;

    console.log('[AudioEngine] Stopped');
  },

  /**
   * Schedule a note using NoteParams. If `synthType`/`adsr` are not provided
   * the robot's current `audioAttributes` are looked up in the store and
   * applied at scheduling time.
   */
  scheduleNote(params: NoteParams): void {
    const { robotId, note, duration, time } = params;

    let synthType = params.synthType;
    let adsr = params.adsr;
    let waveform = params.waveform;
    let effectiveVelocity = params.velocity;

    if (robotId && (!synthType || !adsr || effectiveVelocity === undefined)) {
      // Check attribute cache first — avoids a per-note Zustand store scan inside the Transport tick.
      const cached = robotAttributeCache.get(robotId);
      if (cached) {
        if (!synthType) synthType = cached.synthType;
        if (!adsr) adsr = cached.adsr;
        if (!waveform) waveform = cached.waveform;
        if (effectiveVelocity === undefined) {
          effectiveVelocity = computeNoteVelocity(cached.masterVolume);
        }
      } else {
        try {
          const state = useOceanStore.getState();
          const robot = state.robots.find((r) => r.id === robotId);

          if (robot) {
            if (robot.audioAttributes) {
              if (!synthType) synthType = robot.audioAttributes.synthType as SynthType | string;
              if (!adsr) adsr = robot.audioAttributes.adsr;
              if (!waveform) waveform = robot.audioAttributes.waveform;
              // Populate cache — audio attributes are immutable after spawn.
              robotAttributeCache.set(robotId, {
                synthType: robot.audioAttributes.synthType,
                adsr: robot.audioAttributes.adsr,
                waveform: robot.audioAttributes.waveform,
                masterVolume: robot.masterVolume ?? 0.7,
              });
            }
            if (effectiveVelocity === undefined) {
              effectiveVelocity = computeNoteVelocity(robot.masterVolume ?? 0.7);
            }
          }
        } catch (err) {
          console.warn('[AudioEngine] Failed to lookup robot audioAttributes:', err);
        }
      }
    }

    triggerWithCap({ robotId, note, duration, time, velocity: effectiveVelocity, synthType, adsr, waveform });
  },

  /**
   * Reserve a dedicated synth slot for a robot and apply its waveform once at
   * reservation time — the safe moment when the synth has no in-flight voices.
   * Returns true if reserved, false if pool exhausted.
   *
   * @param robotId - Robot ID
   * @param synthType - Synth type key (e.g. 'FMSynth')
   * @param waveform - Optional oscillator type to apply immediately on the idle slot
   */
  reserveVoice(
    robotId: string,
    synthType: string,
    waveform?: string,
    adsr?: ADSREnvelope,
  ): boolean {
    if (!synthPool || !reservedSlots) return false;

    const typeKey = (synthType || 'default').toString().toLowerCase();
    const slots = reservedSlots[typeKey];
    if (!slots) return false;

    const freeIndex = slots.findIndex((s) => s === null);
    if (freeIndex === -1) return false;

    slots[freeIndex] = robotId;
    reservedVoices.set(robotId, { type: typeKey, index: freeIndex, reservedAt: Date.now() });

    // Apply waveform and ADSR once on the now-dedicated, idle synth — safe because no
    // notes are in flight on this slot yet. Avoids mid-playback oscillator rebuilds and
    // eliminates redundant synth.set() calls on every note trigger.
    const dedicatedSynth = synthPool[typeKey]?.[freeIndex];
    const maybeSetter = dedicatedSynth as unknown as { set?: (props: unknown) => void } | undefined;
    if (maybeSetter && typeof maybeSetter.set === 'function') {
      if (waveform) {
        try {
          maybeSetter.set({ oscillator: { type: waveform } });
        } catch (err) {
          console.warn('[AudioEngine] Failed to apply waveform at reservation time:', err);
        }
      }
      if (adsr) {
        try {
          maybeSetter.set({ envelope: adsr });
        } catch (err) {
          console.warn('[AudioEngine] Failed to apply ADSR at reservation time:', err);
        }
      }
    }

    if (DEV_TUNING) console.log(`[AudioEngine] Reserved ${typeKey}[${freeIndex}] for ${robotId}${waveform ? ` (waveform: ${waveform})` : ''}${adsr ? ' (adsr applied)' : ''}`);
    return true;
  },

  /** Release a previously reserved slot for the given robotId. */
  releaseVoice(robotId: string): void {
    if (!synthPool || !reservedSlots) return;
    const entry = reservedVoices.get(robotId);
    if (!entry) return;
    const slots = reservedSlots[entry.type];
    if (!slots) {
      reservedVoices.delete(robotId);
      return;
    }
    slots[entry.index] = null;
    reservedVoices.delete(robotId);
    if (DEV_TUNING) console.log(`[AudioEngine] Released ${entry.type}[${entry.index}] from ${robotId}`);
  },

  /** Return the synth instance reserved for a robot, or null if none. */
  getVoiceForRobot(robotId?: string): Tone.PolySynth | null {
    if (!synthPool || !reservedSlots || !robotId) return null;
    const entry = reservedVoices.get(robotId);
    if (!entry) return null;
    const pool = synthPool[entry.type];
    if (!pool || !pool[entry.index]) return null;
    return pool[entry.index];
  },



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
      console.debug(
        `[AudioEngine] Registered melody for robot ${robotId} (${melody.length} events)`
      );
    }
  },

  unregisterRobotMelody(robotId: string): void {
    robotAttributeCache.delete(robotId);
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
      console.debug(
        `[AudioEngine] Unregistered melody for robot ${robotId} (${removedCount} events removed)`
      );
    }
  },



  /**
   * Return a synth from the pool using a tolerant mapping for different
   * synth type identifiers used across the codebase.
   */
  getSynth(type?: string): Tone.PolySynth | null {
    if (!synthPool) {
      console.warn('[AudioEngine] Synth pool not loaded');
      return null;
    }

    const firstOf = (arr?: Tone.PolySynth[]) => (arr && arr.length > 0 ? arr[0] : null);

    if (!type) return firstOf(synthPool['default']);

    const t = (type || '').toString().toLowerCase();

    switch (t) {
      case 'fmsynth':
      case 'fm':
        return firstOf(synthPool['fm']);
      case 'amsynth':
      case 'am':
        return firstOf(synthPool['am']);
      case 'duosynth':
      case 'duo':
        return firstOf(synthPool['duo']);
      default:
        return firstOf(synthPool['default']);
    }
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
};
