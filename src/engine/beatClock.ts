// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';

// ========================================
// CONSTANTS
// ========================================
const BEATS_PER_MEASURE = 4;
const MEASURES_PER_CYCLE = 96;
const MEASURES_PER_HOUR = 4;

// ========================================
// INTERNAL STATE
// ========================================
let currentBeat = 0;
let currentMeasure = 0;
let lastNotifiedMeasure = -1;
let initialized = false;
const scheduleMap = new Map<string, string>();  // Track scheduled event IDs
const measureListeners: Array<(measure: number) => void> = [];

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
    // Fire measure listeners once per measure change
    if (currentMeasure !== lastNotifiedMeasure) {
      lastNotifiedMeasure = currentMeasure;
      const wrappedMeasure = currentMeasure % MEASURES_PER_CYCLE;
      measureListeners.forEach(fn => fn(wrappedMeasure));
    }
  }, '16n');
  initialized = true;
  console.log('BeatClock initialized');
}

/**
 * Register a callback to be fired once per measure change.
 * The callback receives the wrapped measure (0–95).
 * Safe to call before or after initialization.
 *
 * @param callback - Called with the new wrapped measure on each measure tick.
 */
export function subscribeToMeasure(callback: (measure: number) => void): void {
  measureListeners.push(callback);
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
 * Returns the derived hour (0-23) from current measure position.
 * 96 measures = 1 full day cycle, 4 measures = 1 hour equivalent.
 */
export function getCurrentHour(): number {
  const derivedHour = Math.floor((currentMeasure % MEASURES_PER_CYCLE) / MEASURES_PER_HOUR);
  return Math.max(0, Math.min(23, derivedHour));
}

/**
 * Stub: schedule a callback at a specific beat (logs only)
 */
export function scheduleAtBeat(beat: number, callback: () => void): string {
  console.log('[BeatClock] scheduleAtBeat (stub):', beat, callback);
  return 'stub-id';
}

/**
 * Stub: schedule a repeating callback (logs only)
 */
export function scheduleRepeat(interval: string, callback: () => void): string {
  const transport = Tone.getTransport();
  // Generate unique ID for this scheduled event
  const scheduleId = `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Schedule with Transport; treat callback return value as the new ID
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const transportId = transport.scheduleRepeat((time) => {
    callback();
  }, interval);

  // Store mapping for potential cancellation later
  scheduleMap.set(scheduleId, String(transportId));

  if (console && console.log) {
    console.log('[BeatClock] scheduleRepeat:', interval, 'id:', scheduleId);
  }

  return scheduleId;
}
