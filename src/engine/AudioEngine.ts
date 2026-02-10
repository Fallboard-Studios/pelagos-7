// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';

import { getAvailableNotes } from './harmonySystem';
import type { RobotMelodyEvent } from './melodyGenerator';

// ========================================
// TYPES
// ========================================
export interface NoteParams {
  robotId: string;
  note: string;
  duration: '8n' | '4n' | '2n';
  time?: number;
  velocity?: number;
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
}

// ========================================
// CONSTANTS
// ========================================
const MAX_POLYPHONY = 12;
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

  synthPool = {
    default: new Tone.PolySynth(Tone.Synth).connect(compressor),
    fm: new Tone.PolySynth(Tone.FMSynth).connect(compressor),
    am: new Tone.PolySynth(Tone.AMSynth).connect(compressor),
    membrane: new Tone.PolySynth(Tone.MembraneSynth).connect(compressor),
  };

  instrumentsLoaded = true;
  console.log('[AudioEngine] Synth pool loaded');
}

/**
 * Schedule voice release at the exact time note ends.
 */
function scheduleVoiceRelease(duration: string, time: number): void {
  const durSec = Tone.Time(duration).toSeconds();
  const releaseTime = time + durSec + 0.04;

  try {
    Tone.getTransport().scheduleOnce(() => {
      activeVoices = Math.max(0, activeVoices - 1);
    }, releaseTime);
  } catch (err) {
    console.warn('[AudioEngine] Failed to schedule voice release:', err);
    activeVoices = Math.max(0, activeVoices - 1);
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
    if (transport.state !== 'started') {
      await transport.start();
    }

    startMelodyPlayback();

    initialized = true;
    console.log('[AudioEngine] Started');
  },

  stop(): void {
    const transport = Tone.getTransport();

    if (scheduledTickId !== null) {
      transport.clear(scheduledTickId);
      scheduledTickId = null;
    }

    if (transport.state === 'started') {
      transport.stop();
    }

    stepCounter = 0;
    activeVoices = 0;
    initialized = false;

    console.log('[AudioEngine] Stopped');
  },

  scheduleNote(params: NoteParams): void {
    if (!synthPool) {
      console.warn('[AudioEngine] Synth pool not loaded');
      return;
    }

    // Polyphony cap: skip note if limit exceeded
    if (activeVoices >= MAX_POLYPHONY) {
      console.log(
        `[AudioEngine] Polyphony capped: ${activeVoices}/${MAX_POLYPHONY}, skipping note`
      );
      return;
    }

    const { note, duration, time, velocity } = params;
    const scheduleTime = time ?? Tone.now();

    try {
      // Use default synth for now (per-robot synth types in future milestone)
      const synth = synthPool.default;

      activeVoices++;
      synth.triggerAttackRelease(note, duration, scheduleTime, velocity ?? 0.8);
      scheduleVoiceRelease(duration, scheduleTime);
    } catch (err) {
      console.error('[AudioEngine] Failed to trigger note:', err);
      activeVoices = Math.max(0, activeVoices - 1);
    }
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
};
