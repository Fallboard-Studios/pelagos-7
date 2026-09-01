// ========================================
// IMPORTS
// ========================================
import { create } from 'zustand';

// ========================================
// CONSTANTS
// ========================================

/** Widest rolling window any debug readout needs — currently the
 *  Skipped Notes counter's 16-measure average (src/components/debug/
 *  SkippedNotesCounter.tsx). `skippedNotesHistory` is capped at this many
 *  entries; the 4-measure average is just the last 4 of the same array. */
export const SKIPPED_NOTES_HISTORY_MEASURES = 16;

// ========================================
// TYPES
// ========================================

export interface DebugStore {
  /** One entry per measure — how many notes AudioEngine's polyphony cap
   *  (triggerWithCap) skipped that measure. Oldest first, capped at the
   *  last SKIPPED_NOTES_HISTORY_MEASURES entries. Written by AudioEngine's
   *  own subscribeToMeasure callback (src/engine/AudioEngine.ts), read by
   *  SkippedNotesCounter. */
  skippedNotesHistory: number[];
  /** Append one measure's skipped-note count, evicting the oldest entry
   *  once the window exceeds SKIPPED_NOTES_HISTORY_MEASURES. */
  recordSkippedNotesForMeasure: (count: number) => void;
}

// ========================================
// STORE
// ========================================

export const useDebugStore = create<DebugStore>((set) => ({
  skippedNotesHistory: [],

  recordSkippedNotesForMeasure: (count) => {
    set((state) => ({
      skippedNotesHistory: [...state.skippedNotesHistory, count].slice(-SKIPPED_NOTES_HISTORY_MEASURES),
    }));
  },
}));
