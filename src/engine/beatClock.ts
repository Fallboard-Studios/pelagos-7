// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';

// ========================================
// CONSTANTS
// ========================================
const BEATS_PER_MEASURE = 4;

// ========================================
// INTERNAL STATE
// ========================================
let currentBeat = 0;
let currentMeasure = 0;
let initialized = false;

// ========================================
// BEATCLOCK API
// ========================================

/**
 * Initializes beat tracking. Should be called after Transport starts.
 */
export function initBeatClock(): void {
  if (initialized) return;
  const transport = Tone.getTransport();
  transport.scheduleRepeat(() => {
    // Calculate current beat and measure from Transport position
    // Defensive: fallback to 0 if not started
    const pos = String(transport.position).split(':');
    const measure = parseInt(pos[0], 10) || 0;
    const beat = parseInt(pos[1], 10) || 0;
    const sixteenths = parseInt(pos[2], 10) || 0;
    currentBeat = measure * BEATS_PER_MEASURE + beat + sixteenths / 4;
    currentMeasure = measure;
  }, '16n');
  initialized = true;
  // eslint-disable-next-line no-console
  console.log('BeatClock initialized');
}

/**
 * Returns the current beat (float, 0-based)
 */
export function getCurrentBeat(): number {
  return currentBeat;
}

/**
 * Returns the current measure (integer, 0-based)
 */
export function getCurrentMeasure(): number {
  return currentMeasure;
}

/**
 * Stub: schedule a callback at a specific beat (logs only)
 */
export function scheduleAtBeat(beat: number, callback: () => void): string {
  // eslint-disable-next-line no-console
  console.log('[BeatClock] scheduleAtBeat (stub):', beat, callback);
  return 'stub-id';
}

/**
 * Stub: schedule a repeating callback (logs only)
 */
export function scheduleRepeat(interval: string, callback: () => void): string {
  // eslint-disable-next-line no-console
  console.log('[BeatClock] scheduleRepeat (stub):', interval, callback);
  return 'stub-id';
}
