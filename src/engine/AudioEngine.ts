// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';
import { useOceanStore } from '../stores/oceanStore';

import type { NoteDuration, ADSREnvelope, SynthType } from '../types/Robot';
import { getAvailableNotes, scheduleHarmonyCycle, stopHarmonyCycle } from './harmonySystem';
import { initBeatClock } from './beatClock';
import type { RobotMelodyEvent } from './melodyGenerator';
import { DEV_TUNING } from '../constants';

// ========================================
// TYPES
// ========================================
export interface NoteParams {
  robotId: string;
  note: string;
  duration: NoteDuration;
  time?: number;
  velocity?: number;
  synthType?: SynthType | string;
  adsr?: ADSREnvelope;
}

interface MelodyEventEntry {
  robotId: string;
  event: RobotMelodyEvent;
}

type SynthPool = Record<string, Tone.PolySynth[]>;

// ========================================
// CONSTANTS
// ========================================
const MAX_POLYPHONY = 16;
const MIN_LEAD = 0.05; // 50ms lookahead for scheduling
// (single shared pool per synth type)

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

// ========================================
// INTERNAL FUNCTIONS
// ========================================

/**
 * Load synth pool with 4 types for timbral variety.
 * All synths share a global compressor to prevent clipping.
 */
async function loadInstruments(): Promise<void> {
  if (instrumentsLoaded) return;

  const compressor = new Tone.Compressor({
    threshold: -18,
    ratio: 8,
    attack: 0.003,
    release: 0.25,
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
      return new PolySynthCtor(voiceCtor).connect(compressor);
    } catch (err) {
      console.warn('[AudioEngine] Failed to construct PolySynth for voice, falling back:', err);
      if (typeof PolySynthCtor !== 'function') throw err;
      return new PolySynthCtor(fallbackCtor || (toneRecord.Synth ?? null)).connect(compressor);
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
  reservedSlots = {};

  for (const [type, count] of Object.entries(POOL_SIZING)) {
    const arr: Tone.PolySynth[] = [];
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
      // `createPolyWithFallback` already connects voices to the compressor.
      arr.push(poly);
    }
    synthPool[type] = arr;
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
  const { robotId, note, duration, time, velocity, synthType, adsr } = params;

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
    // Select synth from the tolerant synth mapping (single shared pool per type)
    // Prefer reserved synth slot for this robot when present
    const reserved = AudioEngine.getVoiceForRobot(robotId);
    const synth: Tone.PolySynth | null = reserved ?? (AudioEngine.getSynth(synthType) ?? (synthPool ? (synthPool['default']?.[0] ?? null) : null));

    if (!synth) {
      // No synth available — restore voice counter and skip note
      activeVoices = Math.max(0, activeVoices - 1);
      if (DEV_TUNING) console.warn('[AudioEngine] No synth available, skipping note');
      return false;
    }

    // Log which synth we're using (for debugging/dev tuning)
    if (DEV_TUNING) {
      let resolvedType = 'unknown';
      if (synthPool) {
        for (const [t, arr] of Object.entries(synthPool)) {
          if (arr.includes(synth)) {
            resolvedType = t;
            break;
          }
        }
      }
      const ctorName = (synth as unknown as { constructor?: { name?: string } }).constructor?.name || 'UnknownCtor';
      console.log(`[AudioEngine] Trigger: robot=${robotId} requested=${synthType ?? 'none'} resolved=${resolvedType} ctor=${ctorName} note=${note}`);
    }

    // Apply per-note ADSR if provided (shared synths; set() is cheap)
    if (adsr) {
      const maybeSetter = synth as unknown as { set?: (props: unknown) => void };
      if (typeof maybeSetter.set === 'function') {
        try {
          maybeSetter.set({ envelope: adsr });
        } catch (err) {
          console.warn('[AudioEngine] Failed to apply ADSR to synth:', err);
        }
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
 */
function startMelodyPlayback(): void {
  if (scheduledTickId !== null) return;

  const transport = Tone.getTransport();

  scheduledTickId = transport.scheduleRepeat((time) => {
    const currentStep = (stepCounter % 16) + 1; // 1..16
    const events = stepRegistry.get(currentStep) || [];
    const notes = getAvailableNotes();

    events.forEach(({ robotId, event }) => {
      const note = notes[event.noteIndex]; // Map index → pitch

      if (!note) {
        console.warn(
          `[AudioEngine] Invalid note index ${event.noteIndex} for robot ${robotId}`
        );
        return;
      }

      AudioEngine.scheduleNote({
        robotId,
        note,
        duration: event.length,
        time: time + MIN_LEAD,
      });
    });

    stepCounter++;
  }, '8n');

  console.log('[AudioEngine] Melody playback started (8n tick)');
}

// ========================================
// AUDIOENGINE SINGLETON (FUNCTIONAL)
// ========================================

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
    const { robotId, note, duration, time, velocity } = params;

    let synthType = params.synthType;
    let adsr = params.adsr;

    if (robotId && (!synthType || !adsr)) {
      try {
        const state = useOceanStore.getState();
        const robot = state.robots.find((r) => r.id === robotId);

        if (robot && robot.audioAttributes) {
          if (!synthType) synthType = robot.audioAttributes.synthType as SynthType | string;
          if (!adsr) adsr = robot.audioAttributes.adsr;
        }
      } catch (err) {
        console.warn('[AudioEngine] Failed to lookup robot audioAttributes:', err);
      }
    }

    triggerWithCap({ robotId, note, duration, time, velocity, synthType, adsr });
  },

  /** Reserve a slot for a robot. Returns true if reserved, false if pool exhausted. */
  reserveVoice(robotId: string, synthType: string): boolean {
    if (!synthPool || !reservedSlots) return false;

    const typeKey = (synthType || 'default').toString().toLowerCase();
    const slots = reservedSlots[typeKey];
    if (!slots) return false;

    const freeIndex = slots.findIndex((s) => s === null);
    if (freeIndex === -1) return false;

    slots[freeIndex] = robotId;
    reservedVoices.set(robotId, { type: typeKey, index: freeIndex, reservedAt: Date.now() });
    if (DEV_TUNING) console.log(`[AudioEngine] Reserved ${typeKey}[${freeIndex}] for ${robotId}`);
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
    melody.forEach((event) => {
      const entries = stepRegistry.get(event.startStep) || [];
      entries.push({ robotId, event });
      stepRegistry.set(event.startStep, entries);
    });

    console.log(
      `[AudioEngine] Registered melody for robot ${robotId} (${melody.length} events)`
    );
  },

  unregisterRobotMelody(robotId: string): void {
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

    console.log(
      `[AudioEngine] Unregistered melody for robot ${robotId} (${removedCount} events removed)`
    );
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
