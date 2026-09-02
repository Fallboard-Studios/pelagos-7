// ========================================
// IMPORTS
// ========================================
import { describe, it, expect, beforeEach } from 'vitest';

import { useDebugStore, SKIPPED_NOTES_HISTORY_MEASURES } from './debugStore';

// ========================================
// TESTS
// ========================================

describe('useDebugStore - skippedNotesHistory / recordSkippedNotesForMeasure', () => {
  beforeEach(() => {
    useDebugStore.setState({ skippedNotesHistory: [] });
  });

  it('starts empty', () => {
    expect(useDebugStore.getState().skippedNotesHistory).toEqual([]);
  });

  it('appends one entry per call, oldest first', () => {
    useDebugStore.getState().recordSkippedNotesForMeasure(2);
    useDebugStore.getState().recordSkippedNotesForMeasure(0);
    useDebugStore.getState().recordSkippedNotesForMeasure(5);
    expect(useDebugStore.getState().skippedNotesHistory).toEqual([2, 0, 5]);
  });

  it(`caps the window at the last ${SKIPPED_NOTES_HISTORY_MEASURES} measures, evicting the oldest`, () => {
    for (let i = 0; i < SKIPPED_NOTES_HISTORY_MEASURES + 5; i++) {
      useDebugStore.getState().recordSkippedNotesForMeasure(i);
    }
    const history = useDebugStore.getState().skippedNotesHistory;
    expect(history).toHaveLength(SKIPPED_NOTES_HISTORY_MEASURES);
    // The first 5 entries (0..4) were evicted; the window starts at 5.
    expect(history[0]).toBe(5);
    expect(history[history.length - 1]).toBe(SKIPPED_NOTES_HISTORY_MEASURES + 4);
  });

  it('remains JSON-serializable', () => {
    useDebugStore.getState().recordSkippedNotesForMeasure(3);
    expect(() => JSON.stringify(useDebugStore.getState().skippedNotesHistory)).not.toThrow();
  });
});
