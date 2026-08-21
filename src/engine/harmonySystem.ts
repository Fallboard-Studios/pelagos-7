// ========================================
// IMPORTS
// ========================================
import { getCurrentHour } from './beatClock';
import { devLog, devWarn } from '../utils/helpers';

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
// provided by `selectCurrentPlanet(usePlanetStore.getState())?.currentHour` (float 0..24).
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
  devLog('[HarmonySystem] Palette manually set:', notes);
}

/**
 * Initialize automatic palette updates synchronized to Transport.
 * Checks every 2 measures if the derived hour has changed.
 * Call once after Transport starts.
 */
export function scheduleHarmonyCycle(transport: TransportLike): void {
  if (scheduledEventId !== null) {
    devWarn('[HarmonySystem] Harmony cycle already scheduled');
    return;
  }

  transportInstance = transport;
  scheduledEventId = transportInstance.scheduleRepeat(() => {
    try {
      const paletteIndex = Math.floor(getCurrentHour()) % Object.keys(TIME_PITCHES).length;

      if (paletteIndex !== lastPaletteIndex) {
        lastPaletteIndex = paletteIndex;
        availableNotes = TIME_PITCHES[paletteIndex] ?? TIME_PITCHES[0];
        devLog(`[HarmonySystem] Palette changed to index ${paletteIndex}:`, availableNotes);
      }
    } catch (err) {
      devWarn('[HarmonySystem] palette cycle callback threw', err);
    }
  }, '2m');

  devLog('[HarmonySystem] Harmony cycle scheduled (updates every 2 measures)');
}

/**
 * Stop the harmony cycle (for cleanup/testing).
 */
export function stopHarmonyCycle(): void {
  if (scheduledEventId !== null) {
    transportInstance?.clear(scheduledEventId);
    scheduledEventId = null;
    transportInstance = null;
    devLog('[HarmonySystem] Harmony cycle stopped');
  }
}