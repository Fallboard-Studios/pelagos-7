// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';

// ========================================
// TYPES
// ========================================
// (Add NoteParams type here if needed in future milestones)

// ========================================
// CONSTANTS
// ========================================
// (No constants needed for this milestone)

// ========================================
// AUDIOENGINE SINGLETON (FUNCTIONAL)
// ========================================

let initialized = false;

export const AudioEngine = {
  async start(): Promise<void> {
    if (initialized) return;
    await Tone.start();
    const transport = Tone.getTransport();
    if (transport.state !== 'started') {
      await transport.start();
    }
    initialized = true;
  },
  stop(): void {
    const transport = Tone.getTransport();
    if (transport.state === 'started') {
      transport.stop();
    }
    initialized = false;
  },
  scheduleNote(params: unknown): void {
    // Stub: log params to console (no audio yet)
    // eslint-disable-next-line no-console
    console.log('[AudioEngine] scheduleNote called with:', params);
  },
};
