// ========================================
// IMPORTS
// ========================================
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
// Require exactly 8 note strings per hour-equivalent (derived from measure position for palette lookup, not stored).
// Hour is calculated as Math.floor((currentMeasure % 96) / 4) where 96 measures = 1 full day cycle.
export type EighthNotes = [string, string, string, string, string, string, string, string];

// ========================================
// CONSTANTS
// ========================================
const TIME_PITCHES: Record<number, EighthNotes> = {
  0: ['C4', 'G4', 'E4', 'D4', 'B4', 'C5', 'E5', 'G5'],
  1: ['C4', 'G4', 'F4', 'D4', 'A4', 'C5', 'F5', 'F5'],
  2: ['D4', 'A4', 'F4', 'D4', 'A4', 'C5', 'F5', 'D5'],
  3: ['F4', 'G4', 'B4', 'D4', 'G4', 'D5', 'G5', 'G5'],
  4: ['G4', 'D4', 'B4', 'A4', 'B4', 'D5', 'A5', 'G5'],
  5: ['A4', 'D4', 'C4', 'G4', 'E4', 'C5', 'A5', 'E5'],
  6: ['Bb4', 'D4', 'C4', 'G4', 'F4', 'C5', 'Bb5', 'F5'],
  7: ['Bb4', 'Eb4', 'C4', 'G4', 'F4', 'D5', 'Bb5', 'Eb5'],
  8: ['Ab4', 'Eb4', 'C4', 'G4', 'Ab4', 'D5', 'Ab5', 'Eb5'],
  9: ['Db4', 'F4', 'C4', 'Ab4', 'Bb4', 'Db5', 'Ab5', 'F5'],
  10: ['B4', 'F#4', 'D#4', 'C#4', 'A4', 'B5', 'D#5', 'F#5'],
  11: ['E4', 'C4', 'G#4', 'D4', 'Bb4', 'E5', 'G#5', 'B5'],
  12: ['C4', 'G4', 'E4', 'D4', 'B4', 'C5', 'E5', 'G5'],
  13: ['C4', 'G4', 'F4', 'D4', 'A4', 'C5', 'F5', 'F5'],
  14: ['D4', 'A4', 'F4', 'D4', 'A4', 'C5', 'F5', 'D5'],
  15: ['F4', 'G4', 'B4', 'D4', 'G4', 'D5', 'G5', 'G5'],
  16: ['G4', 'D4', 'B4', 'A4', 'B4', 'D5', 'A5', 'G5'],
  17: ['A4', 'D4', 'C4', 'G4', 'E4', 'C5', 'A5', 'E5'],
  18: ['Bb4', 'D4', 'C4', 'G4', 'F4', 'C5', 'Bb5', 'F5'],
  19: ['Bb4', 'Eb4', 'C4', 'G4', 'F4', 'D5', 'Bb5', 'Eb5'],
  20: ['Ab4', 'Eb4', 'C4', 'G4', 'Ab4', 'D5', 'Ab5', 'Eb5'],
  21: ['Db4', 'F4', 'C4', 'Ab4', 'Bb4', 'Db5', 'Ab5', 'F5'],
  22: ['B4', 'F#4', 'D#4', 'C#4', 'A4', 'B5', 'D#5', 'F#5'],
  23: ['E4', 'C4', 'G#4', 'D4', 'Bb4', 'E5', 'G#5', 'B5'],
};

// ========================================
// MODULE STATE
// ========================================
let availableNotes: EighthNotes = TIME_PITCHES[0];
let lastHour = 0;
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
 * Manually set the harmony palette (for testing or custom harmonies).
 */
export function setAvailableNotes(notes: EighthNotes): void {
  availableNotes = notes;
  console.log('[HarmonySystem] Palette manually set:', notes);
}

/**
 * Initialize automatic palette updates synchronized to Transport.
 * Checks every 4 measures if the derived hour has changed.
 * Call once after Transport starts.
 */
export function scheduleHarmonyCycle(transport: TransportLike): void {
  if (scheduledEventId !== null) {
    console.warn('[HarmonySystem] Harmony cycle already scheduled');
    return;
  }

  transportInstance = transport;
  scheduledEventId = transportInstance.scheduleRepeat(() => {
    const currentHour = getCurrentHour();

    if (currentHour !== lastHour) {
      lastHour = currentHour;
      availableNotes = TIME_PITCHES[currentHour] ?? TIME_PITCHES[0];
      console.log(`[HarmonySystem] Palette changed to hour ${currentHour}:`, availableNotes);
    }
  }, '4m');

  console.log('[HarmonySystem] Harmony cycle scheduled (updates every 4 measures)');
}

/**
 * Stop the harmony cycle (for cleanup/testing).
 */
export function stopHarmonyCycle(): void {
  if (scheduledEventId !== null && transportInstance) {
    transportInstance.clear(scheduledEventId);
    scheduledEventId = null;
    transportInstance = null;
    console.log('[HarmonySystem] Harmony cycle stopped');
  }
}