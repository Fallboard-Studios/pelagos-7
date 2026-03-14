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

interface SynthPool {
  default: Tone.PolySynth;
  fm: Tone.PolySynth;
  am: Tone.PolySynth;
  membrane: Tone.PolySynth;
  duo: Tone.PolySynth;
  pluck: Tone.PolySynth;
}

// ========================================
// CONSTANTS
// ========================================
const MAX_POLYPHONY = 16;
const MIN_LEAD = 0.05; // 50ms lookahead for scheduling

// ========================================
// MODULE STATE
// ========================================
let initialized = false;
let instrumentsLoaded = false;
let synthPool: SynthPool | null = null;
let activeVoices = 0;

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

  // Helper to try constructing a PolySynth for a voice constructor, with
  // a fallback to a simpler Synth voice if the voice class is not present
  // in the loaded Tone.js build or throws at construction time.
  const createPolyWithFallback = (voiceCtor: unknown, fallbackCtor: unknown) => {
    try {
      // Some Tone builds may not export all synths; guard against that.
      if (!voiceCtor) throw new Error('voiceCtor not available');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (new (Tone.PolySynth as any)(voiceCtor as any)).connect(compressor);
    } catch (err) {
      console.warn('[AudioEngine] Failed to construct PolySynth for voice, falling back:', err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new (Tone.PolySynth as any)(fallbackCtor || Tone.Synth).connect(compressor);
    }
  };

  // Construct pool entries defensively — log and fallback when necessary so
  // AudioEngine.start() doesn't throw in browsers with different Tone builds.
  synthPool = {
    default: new Tone.PolySynth(Tone.Synth).connect(compressor),
    fm: createPolyWithFallback(Tone.FMSynth, Tone.Synth),
    am: createPolyWithFallback(Tone.AMSynth, Tone.Synth),
    membrane: createPolyWithFallback(Tone.MembraneSynth, Tone.Synth),
    duo: createPolyWithFallback((Tone as unknown as Record<string, unknown>).DuoSynth, Tone.FMSynth),
    pluck: createPolyWithFallback((Tone as unknown as Record<string, unknown>).PluckSynth, Tone.Synth),
    // Note: NoiseSynth removed from pool by design (not used for melodic robots)
  } as SynthPool;

  instrumentsLoaded = true;
  console.log('[AudioEngine] Synth pool loaded');
}

/**
 * Schedule voice release at the exact time note ends.
 */
function scheduleVoiceRelease(duration: NoteDuration, time: number): void {
  const durSec = Tone.Time(duration).toSeconds();
  const releaseTime = time + durSec + 0.04;

  try {
    Tone.getTransport().scheduleOnce(() => {
      activeVoices = Math.max(0, activeVoices - 1);

      // if (DEV_TUNING) {
      //   console.log(
      //     `[AudioEngine] Voice released: ${activeVoices}/${MAX_POLYPHONY}`
      //   );
      // }
    }, releaseTime);
  } catch (err) {
    console.warn('[AudioEngine] Failed to schedule voice release:', err);
    activeVoices = Math.max(0, activeVoices - 1);
  }
}

/**
 * Trigger note with polyphony cap enforcement.
 * Returns true if note was triggered, false if skipped due to cap.
 */
/**
 * Trigger note with polyphony cap enforcement.
 * Applies per-robot synth selection and ADSR envelope when provided.
 * Returns true if note was triggered, false if skipped due to cap.
 */
export function triggerWithCap(params: NoteParams): boolean {
  const { note, duration, time, velocity, synthType, adsr } = params;

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
    // Select synth from pool using tolerant mapping between store values
      const synth = AudioEngine.getSynth(synthType) ?? synthPool.default;

    // Apply per-note ADSR if provided (shared synths; set() is cheap)
    if (adsr && typeof synth.set === 'function') {
      try {
        synth.set({ envelope: adsr });
      } catch (err) {
        console.warn('[AudioEngine] Failed to apply ADSR to synth:', err);
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

    initBeatClock();
    startMelodyPlayback();
    scheduleHarmonyCycle();

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

    if (!type) return synthPool.default;

    const t = (type || '').toString().toLowerCase();

    switch (t) {
      case 'polysynth':
      case 'default':
        return synthPool.default;
      case 'fmsynth':
      case 'fm':
        return synthPool.fm;
      case 'amsynth':
      case 'am':
        return synthPool.am;
      case 'membranesynth':
      case 'membrane':
        return synthPool.membrane;
      case 'duosynth':
      case 'duo':
        return synthPool.duo;
      case 'pluck':
      case 'plucksynth':
        return synthPool.pluck;
      default:
        return synthPool.default;
    }
  },

  getPolyphonyStats(): { voices: number; maxVoices: number; step: number } {
    return {
      voices: activeVoices,
      maxVoices: MAX_POLYPHONY,
      step: (stepCounter % 16) + 1,
    };
  },
};
