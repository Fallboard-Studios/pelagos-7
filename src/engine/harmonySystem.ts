// ========================================
// IMPORTS
// ========================================
import { DEV_TUNING } from '../constants';
import { useOceanStore } from '../stores/oceanStore';
import { swallow } from '../utils/helpers';
import { getCurrentHour } from './beatClock';

// Minimal transport-like interface to avoid importing Tone.js here.
interface TransportLike {
  scheduleRepeat(callback: (time?: unknown) => void, interval: string, startTime?: unknown): unknown;
  clear(id: unknown): void;
  // position may be present on some transport implementations; accept unknown
  position?: unknown;
}

// Transport instance provided by AudioEngine at startup
let transportInstance: TransportLike | null = null;

// ========================================
// TYPES
// ========================================
// Exactly 8 note-name strings (no octave digit) per hour-equivalent.
// Octave is determined per-robot at spawn time; melody events store note index + octave separately.
// Hour is now derived from the world time-of-day (driven by planet size),
// provided by `useOceanStore.getState().currentHour` (float 0..24).
export type EighthNotes = [string, string, string, string, string, string, string, string];

// ========================================
// CONSTANTS
// ========================================
const TIME_PITCHES: Record<number, EighthNotes> = {
  0: ['C', 'G', 'E', 'D', 'B', 'C', 'E', 'G'],
  1: ['C', 'G', 'F', 'D', 'A', 'C', 'F', 'F'],
  2: ['D', 'A', 'F', 'D', 'A', 'C', 'F', 'D'],
  3: ['F', 'G', 'B', 'D', 'G', 'D', 'G', 'G'],
  4: ['G', 'D', 'B', 'A', 'B', 'D', 'A', 'G'],
  5: ['A', 'D', 'C', 'G', 'E', 'C', 'A', 'E'],
  6: ['Bb', 'D', 'C', 'G', 'F', 'C', 'Bb', 'F'],
  7: ['Bb', 'Eb', 'C', 'G', 'F', 'D', 'Bb', 'Eb'],
  8: ['Ab', 'Eb', 'C', 'G', 'Ab', 'D', 'Ab', 'Eb'],
  9: ['Db', 'F', 'C', 'Ab', 'Bb', 'Db', 'Ab', 'F'],
  10: ['B', 'F#', 'D#', 'C#', 'A', 'B', 'D#', 'F#'],
  11: ['E', 'C', 'G#', 'D', 'Bb', 'E', 'G#', 'B'],
  12: ['C', 'G', 'E', 'D', 'B', 'C', 'E', 'G'],
  13: ['C', 'G', 'F', 'D', 'A', 'C', 'F', 'F'],
  14: ['D', 'A', 'F', 'D', 'A', 'C', 'F', 'D'],
  15: ['F', 'G', 'B', 'D', 'G', 'D', 'G', 'G'],
  16: ['G', 'D', 'B', 'A', 'B', 'D', 'A', 'G'],
  17: ['A', 'D', 'C', 'G', 'E', 'C', 'A', 'E'],
  18: ['Bb', 'D', 'C', 'G', 'F', 'C', 'Bb', 'F'],
  19: ['Bb', 'Eb', 'C', 'G', 'F', 'D', 'Bb', 'Eb'],
  20: ['Ab', 'Eb', 'C', 'G', 'Ab', 'D', 'Ab', 'Eb'],
  21: ['Db', 'F', 'C', 'Ab', 'Bb', 'Db', 'Ab', 'F'],
  22: ['B', 'F#', 'D#', 'C#', 'A', 'B', 'D#', 'F#'],
  23: ['E', 'C', 'G#', 'D', 'Bb', 'E', 'G#', 'B'],
};

// ========================================
// MODULE STATE
// ========================================
let availableNotes: EighthNotes = TIME_PITCHES[0];
let lastPaletteIndex = 0;
let scheduledEventId: unknown | null = null;

// ========================================
// EXPORTS
// ========================================

/**
 * Returns a copy of the current 8-note palette.
 * Safe for iteration without mutation risk.
 */
export function getAvailableNotes(): string[] {
  return [...availableNotes];
}

/**
 * Reset the harmony palette to hour 0 (start of the day cycle).
 * Call on power-on so music resumes from the beginning of the chord progression.
 */
export function resetHarmony(): void {
  availableNotes = TIME_PITCHES[0];
  lastPaletteIndex = 0;
}

/**
 * Manually set the harmony palette (for testing or custom harmonies).
 */
export function setAvailableNotes(notes: EighthNotes): void {
  availableNotes = notes;
  if (DEV_TUNING) {
    console.log('[HarmonySystem] Palette manually set:', notes);
  }
}

/**
 * Initialize automatic palette updates synchronized to Transport.
 * Checks every 4 measures if the derived hour has changed.
 * Call once after Transport starts.
 */
export function scheduleHarmonyCycle(transport: TransportLike): void {
  if (scheduledEventId !== null) {
    if (DEV_TUNING) {

      console.warn('[HarmonySystem] Harmony cycle already scheduled');
    }
    return;
  }

  // Advance palette every 2 measures. Compute palette index from currentMeasure
  // so harmony is driven by the beat clock independent of planetSize/time-of-day.
  transportInstance = transport;
  scheduledEventId = transportInstance.scheduleRepeat(() => {
    // Prefer hour-based palette index when beatClock.getCurrentHour is available
    // (keeps existing tests/behavior stable). Fall back to measure-driven
    // stepping (2-measure steps) when hour function is not present.
    let paletteIndex: number | null = null;
    try {
      const hour = typeof getCurrentHour === 'function' ? getCurrentHour() : undefined;
      if (typeof hour === 'number') {
        paletteIndex = Math.floor(hour) % Object.keys(TIME_PITCHES).length;
      }
    } catch (err) {
      if (DEV_TUNING) swallow(err, '[HarmonySystem] getCurrentHour threw in palette cycle check');
    }

    if (paletteIndex === null) {
      const measure = useOceanStore.getState().currentMeasure ?? 0;
      const step = Math.floor((measure % 96) / 2);
      paletteIndex = step % Object.keys(TIME_PITCHES).length;
    }

    if (paletteIndex !== lastPaletteIndex) {
      lastPaletteIndex = paletteIndex;
      availableNotes = TIME_PITCHES[paletteIndex as number] ?? TIME_PITCHES[0];
      if (DEV_TUNING) {
        console.log(`[HarmonySystem] Palette changed to index ${paletteIndex}:`, availableNotes);
      }
    }
  }, '2m');

  if (DEV_TUNING) {
    console.log('[HarmonySystem] Harmony cycle scheduled (updates every 4 measures)');
  }
}

/**
 * Stop the harmony cycle (for cleanup/testing).
 */
export function stopHarmonyCycle(): void {
  if (scheduledEventId !== null && transportInstance) {
    transportInstance.clear(scheduledEventId);
    scheduledEventId = null;
    transportInstance = null;
    if (DEV_TUNING) {

      console.log('[HarmonySystem] Harmony cycle stopped');
    }
  }
}