import { describe, it, expect } from 'vitest';
import alea from 'alea';
import {
  applyRhythmicVariance,
  applyTonalVariance,
  pickRandomIndices,
  buildMotifOnsets,
  gridUnitsToDuration,
  pickDurationForGap,
  generateMelodyForRobot,
  reRollMelodyPitches,
  DEFAULT_SUBDIVISIONS,
  DEFAULT_RHYTHMIC_DENSITY,
  DEFAULT_RHYTHMIC_MOTIF_LENGTH,
  DEFAULT_NOTE_VARIANCE,
} from './melodyGenerator';
import type { RobotMelodyEvent } from './melodyGenerator';

// ========================================
// HELPERS
// ========================================

/**
 * Create a test melody event with sensible defaults.
 */
function createMelodyEvent(overrides: Partial<RobotMelodyEvent> = {}): RobotMelodyEvent {
  return {
    id: 'test-event-1',
    startStep: 1,
    length: '8n',
    noteIndex: 0,
    octave: 4,
    ...overrides,
  };
}

// ========================================
// TEST SUITE: pickRandomIndices
// ========================================

describe('pickRandomIndices', () => {
  it('picks exact count from array', () => {
    const arr = [1, 2, 3, 4, 5];
    const indices = pickRandomIndices(arr, 2);
    expect(indices).toHaveLength(2);
    // All indices should be valid and unique
    expect(new Set(indices).size).toBe(2);
    expect(indices.every((i) => i >= 0 && i < arr.length)).toBe(true);
  });

  it('returns empty array when count is 0', () => {
    const arr = [1, 2, 3];
    const indices = pickRandomIndices(arr, 0);
    expect(indices).toEqual([]);
  });

  it('returns all indices when count > array length', () => {
    const arr = [1, 2, 3];
    const indices = pickRandomIndices(arr, 10);
    expect(indices).toHaveLength(3);
    expect(new Set(indices).size).toBe(3);
  });

  it('respects custom RNG for determinism', () => {
    const arr = [1, 2, 3, 4, 5];
    let _callCount = 0;
    const mockRand = () => {
      _callCount++;
      return 0.5; // Fixed RNG
    };

    const indices1 = pickRandomIndices(arr, 2, mockRand);
    _callCount = 0;
    const indices2 = pickRandomIndices(arr, 2, mockRand);

    // With same RNG, should pick same indices
    expect(indices1).toEqual(indices2);
  });
});

// ========================================
// TEST SUITE: applyRhythmicVariance
// ========================================

describe('applyRhythmicVariance', () => {
  it('returns unchanged melody when probability triggers false', () => {
    const melody = [
      createMelodyEvent({ startStep: 1 }),
      createMelodyEvent({ startStep: 5 }),
      createMelodyEvent({ startStep: 9 }),
    ];

    // RNG always returns > probability (never triggers)
    const noOpRand = () => 1.0;

    const result = applyRhythmicVariance(melody, 0.5, noOpRand);
    expect(result).toEqual(melody);
  });

  it('applies variance when probability triggers true', () => {
    const melody = [
      createMelodyEvent({ startStep: 5 }),
      createMelodyEvent({ startStep: 7 }),
      createMelodyEvent({ startStep: 9 }),
    ];

    // RNG that always triggers variance and varies shifts
    let _callCount = 0;
    const alwaysApplyRand = () => {
      _callCount++;
      // First call: probability check (always trigger)
      if (_callCount === 1) return 0.0;
      // Subsequent calls: mix of different RNG values to vary shifts
      return (_callCount * 0.37) % 1.0; // pseudo-random but deterministic
    };

    const result = applyRhythmicVariance(melody, 0.5, alwaysApplyRand);

    // At least some events should have shifted startStep
    const unchanged = result.filter(
      (e, i) => e.startStep === melody[i].startStep
    );
    expect(unchanged.length).toBeLessThan(melody.length);
  });

  it('clamps shifted steps to 1-16 range', () => {
    const melody = [
      createMelodyEvent({ startStep: 1, id: 'near-min' }),
      createMelodyEvent({ startStep: 16, id: 'near-max' }),
    ];

    let callCount = 0;
    const alwaysNegativeShiftRand = () => {
      callCount++;
      // First call: probability check (trigger variance)
      // Subsequent calls: select events and deltas
      // Make sure we always get -2 shift
      if (callCount === 1) return 0.0; // trigger
      if (callCount % 6 === 0) return 0.0; // always pick -2 shift
      return 0.5;
    };

    const result = applyRhythmicVariance(melody, 0.5, alwaysNegativeShiftRand);

    // All steps should be >= 1
    result.forEach((event) => {
      expect(event.startStep).toBeGreaterThanOrEqual(1);
      expect(event.startStep).toBeLessThanOrEqual(16);
    });
  });

  it('does not mutate noteIndex, length, octave when applying variance', () => {
    const original = createMelodyEvent({
      startStep: 8,
      noteIndex: 3,
      length: '4n',
      octave: 5,
      id: 'immutable-test',
    });

    const melody = [original];

    let callCount = 0;
    const alwaysApplyRand = () => {
      callCount++;
      return callCount === 1 ? 0.0 : 0.5; // trigger on first call
    };

    const result = applyRhythmicVariance(melody, 0.5, alwaysApplyRand);
    const varied = result[0];

    // These fields must not change
    expect(varied.noteIndex).toBe(original.noteIndex);
    expect(varied.length).toBe(original.length);
    expect(varied.octave).toBe(original.octave);
    expect(varied.id).toBe(original.id);
  });

  it('preserves event IDs across variance', () => {
    const melody = [
      createMelodyEvent({ id: 'id-1', startStep: 1 }),
      createMelodyEvent({ id: 'id-2', startStep: 5 }),
      createMelodyEvent({ id: 'id-3', startStep: 9 }),
    ];

    const alwaysApplyRand = () => 0.0;

    const result = applyRhythmicVariance(melody, 0.5, alwaysApplyRand);

    result.forEach((event, i) => {
      expect(event.id).toBe(melody[i].id);
    });
  });

  it('shifts at most 2 events per application', () => {
    const melody = Array.from({ length: 8 }, (_, i) =>
      createMelodyEvent({ id: `event-${i}`, startStep: (i * 2) + 1 })
    );

    let _callCount = 0;
    const alwaysApplyRand = () => {
      _callCount++;
      return 0.0; // always trigger
    };

    const result = applyRhythmicVariance(melody, 0.5, alwaysApplyRand);

    // Count how many events had their startStep changed
    const shiftedCount = result.filter((e, i) => e.startStep !== melody[i].startStep).length;

    expect(shiftedCount).toBeLessThanOrEqual(2);
  });

  it('handles single-event melodies', () => {
    const melody = [createMelodyEvent({ startStep: 8 })];

    const alwaysApplyRand = () => 0.0;

    const result = applyRhythmicVariance(melody, 0.5, alwaysApplyRand);

    expect(result).toHaveLength(1);
    expect(result[0].startStep).toBeGreaterThanOrEqual(1);
    expect(result[0].startStep).toBeLessThanOrEqual(16);
  });

  it('handles empty melody gracefully', () => {
    const melody: RobotMelodyEvent[] = [];

    const alwaysApplyRand = () => 0.0;

    const result = applyRhythmicVariance(melody, 0.5, alwaysApplyRand);

    expect(result).toEqual([]);
  });

  it('respects probability parameter', () => {
    const melody = [
      createMelodyEvent({ startStep: 1 }),
      createMelodyEvent({ startStep: 5 }),
    ];

    // RNG that returns predictable values
    let callIndex = 0;
    const probProbeRand = () => {
      callIndex++;
      // First call checks probability
      if (callIndex === 1) return 0.99; // probability check fails, no variance
      return 0.5;
    };

    const result = applyRhythmicVariance(melody, 0.1, probProbeRand);

    // Should return unchanged because probability triggered false
    expect(result).toEqual(melody);
  });

  it('does not apply variance twice in one call', () => {
    const melody = [
      createMelodyEvent({ startStep: 1, id: 'event-1' }),
      createMelodyEvent({ startStep: 5, id: 'event-2' }),
      createMelodyEvent({ startStep: 9, id: 'event-3' }),
    ];

    let _callCount = 0;
    const alwaysApplyRand = () => {
      _callCount++;
      return 0.0; // always apply
    };

    const result = applyRhythmicVariance(melody, 0.5, alwaysApplyRand);

    // Variance applies at most once and shifts at most 2 events
    // So we should have at most 2 modified events
    const modifiedCount = result.filter((e, i) => e.startStep !== melody[i].startStep).length;
    expect(modifiedCount).toBeLessThanOrEqual(2);
  });

  it('handles edge case: step already at min/max before shift', () => {
    // Event at step 2, with -2 shift should clamp to 1 (not go to 0)
    const melody = [createMelodyEvent({ startStep: 2 })];

    let _callCount = 0;
    const controlledShiftRand = () => {
      _callCount++;
      if (_callCount === 1) return 0.0; // probability: apply
      if (_callCount === 2) return 0.1; // numToShift: pick 1
      if (_callCount === 3) return 0.99; // pickRandomIndices: always pick index 0
      if (_callCount === 4) return 0.0; // shift delta: pick SHIFT_OPTIONS[0] = -2
      return 0.5;
    };

    const result = applyRhythmicVariance(melody, 0.5, controlledShiftRand);

    // Should clamp to 1 from (2 - 2 = 0 → clamp to 1)
    expect(result[0].startStep).toBe(1);
  });

  it('handles edge case: step already at max/min before shift', () => {
    // Event at step 16, with +2 shift should clamp to 16 (not go beyond)
    const melody = [createMelodyEvent({ startStep: 16 })];

    let callCount = 0;
    const maxShiftRand = () => {
      callCount++;
      if (callCount === 1) return 0.0; // probability: apply
      // Try to get +2 shift (need to cycle through indices)
      const val = (callCount / 10) % 1;
      return val < 0.25 ? 0.75 : 0.5; // aim for +2 range
    };

    const result = applyRhythmicVariance(melody, 0.5, maxShiftRand);

    // Should clamp to 16, not go beyond
    expect(result[0].startStep).toBeLessThanOrEqual(16);
  });
});

// ========================================
// TEST SUITE: applyTonalVariance
// ========================================

describe('applyTonalVariance', () => {
  it('returns unchanged melody when probability triggers false', () => {
    const melody = [
      createMelodyEvent({ noteIndex: 2 }),
      createMelodyEvent({ noteIndex: 4 }),
      createMelodyEvent({ noteIndex: 6 }),
    ];

    // RNG always returns > probability (never triggers)
    const noOpRand = () => 1.0;

    const result = applyTonalVariance(melody, 0.5, noOpRand);
    expect(result).toEqual(melody);
  });

  it('applies variance when probability triggers true', () => {
    const melody = [
      createMelodyEvent({ noteIndex: 3 }),
      createMelodyEvent({ noteIndex: 4 }),
      createMelodyEvent({ noteIndex: 5 }),
    ];

    // RNG that always triggers variance
    let callCount = 0;
    const alwaysApplyRand = () => {
      callCount++;
      // First call: probability check (always trigger)
      if (callCount === 1) return 0.0;
      // Subsequent calls: mix of different RNG values
      return (callCount * 0.37) % 1.0;
    };

    const result = applyTonalVariance(melody, 0.5, alwaysApplyRand);

    // At least some events should have shifted noteIndex
    const unchanged = result.filter((e, i) => e.noteIndex === melody[i].noteIndex);
    expect(unchanged.length).toBeLessThan(melody.length);
  });

  it('clamps shifted noteIndex to 0-7 range', () => {
    const melody = [
      createMelodyEvent({ noteIndex: 0, id: 'at-min' }),
      createMelodyEvent({ noteIndex: 7, id: 'at-max' }),
    ];

    let callCount = 0;
    const alwaysApplyRand = () => {
      callCount++;
      // First call: probability check (trigger variance)
      // Make shifts always negative then positive to test clamping
      if (callCount === 1) return 0.0; // trigger
      return 0.5; // mixed shifts
    };

    const result = applyTonalVariance(melody, 0.5, alwaysApplyRand);

    // All noteIndex values should be in range 0-7
    result.forEach((event) => {
      expect(event.noteIndex).toBeGreaterThanOrEqual(0);
      expect(event.noteIndex).toBeLessThanOrEqual(7);
    });
  });

  it('does not mutate startStep, length, octave when applying variance', () => {
    const original = createMelodyEvent({
      noteIndex: 4,
      startStep: 5,
      length: '8n',
      octave: 3,
      id: 'immutable-tonal-test',
    });

    const melody = [original];

    let callCount = 0;
    const alwaysApplyRand = () => {
      callCount++;
      return callCount === 1 ? 0.0 : 0.5; // trigger on first call
    };

    const result = applyTonalVariance(melody, 0.5, alwaysApplyRand);
    const varied = result[0];

    // These fields must not change
    expect(varied.startStep).toBe(original.startStep);
    expect(varied.length).toBe(original.length);
    expect(varied.octave).toBe(original.octave);
    expect(varied.id).toBe(original.id);
  });

  it('preserves event IDs across variance', () => {
    const melody = [
      createMelodyEvent({ id: 'tonal-id-1', noteIndex: 0 }),
      createMelodyEvent({ id: 'tonal-id-2', noteIndex: 3 }),
      createMelodyEvent({ id: 'tonal-id-3', noteIndex: 6 }),
    ];

    const alwaysApplyRand = () => 0.0;

    const result = applyTonalVariance(melody, 0.5, alwaysApplyRand);

    result.forEach((event, i) => {
      expect(event.id).toBe(melody[i].id);
    });
  });

  it('shifts at most 2 events per application', () => {
    const melody = Array.from({ length: 8 }, (_, i) =>
      createMelodyEvent({ id: `tonal-event-${i}`, noteIndex: i % 8 })
    );

    let _callCount = 0;
    const alwaysApplyRand = () => {
      _callCount++;
      return 0.0; // always trigger
    };

    const result = applyTonalVariance(melody, 0.5, alwaysApplyRand);

    // Count how many events had their noteIndex changed
    const shiftedCount = result.filter((e, i) => e.noteIndex !== melody[i].noteIndex).length;

    expect(shiftedCount).toBeLessThanOrEqual(2);
  });

  it('handles single-event melodies', () => {
    const melody = [createMelodyEvent({ noteIndex: 3 })];

    const alwaysApplyRand = () => 0.0;

    const result = applyTonalVariance(melody, 0.5, alwaysApplyRand);

    expect(result).toHaveLength(1);
    expect(result[0].noteIndex).toBeGreaterThanOrEqual(0);
    expect(result[0].noteIndex).toBeLessThanOrEqual(7);
  });

  it('handles empty melody gracefully', () => {
    const melody: RobotMelodyEvent[] = [];

    const alwaysApplyRand = () => 0.0;

    const result = applyTonalVariance(melody, 0.5, alwaysApplyRand);

    expect(result).toEqual([]);
  });

  it('respects probability parameter', () => {
    const melody = [
      createMelodyEvent({ noteIndex: 2 }),
      createMelodyEvent({ noteIndex: 5 }),
    ];

    // RNG that returns > probability (no variance)
    let callIndex = 0;
    const probProbeRand = () => {
      callIndex++;
      // First call checks probability
      if (callIndex === 1) return 0.99; // probability check fails, no variance
      return 0.5;
    };

    const result = applyTonalVariance(melody, 0.1, probProbeRand);

    // Should return unchanged because probability triggered false
    expect(result).toEqual(melody);
  });

  it('boundary clamp: noteIndex 0 shifting down stays at 0', () => {
    const melody = [createMelodyEvent({ noteIndex: 0 })];

    let callCount = 0;
    const alwaysNegativeShiftRand = () => {
      callCount++;
      if (callCount === 1) return 0.0; // probability: apply
      if (callCount === 2) return 0.1; // numToShift: pick 1
      if (callCount === 3) return 0.99; // pickRandomIndices: always pick index 0
      if (callCount === 4) return 0.0; // shift delta: pick -1
      return 0.5;
    };

    const result = applyTonalVariance(melody, 0.5, alwaysNegativeShiftRand);

    // Should clamp to 0, not go negative
    expect(result[0].noteIndex).toBe(0);
  });

  it('boundary clamp: noteIndex 7 shifting up stays at 7', () => {
    const melody = [createMelodyEvent({ noteIndex: 7 })];

    let callCount = 0;
    const alwaysPositiveShiftRand = () => {
      callCount++;
      if (callCount === 1) return 0.0; // probability: apply
      if (callCount === 2) return 0.1; // numToShift: pick 1
      if (callCount === 3) return 0.99; // pickRandomIndices: always pick index 0
      if (callCount === 4) return 0.99; // shift delta: pick +1
      return 0.5;
    };

    const result = applyTonalVariance(melody, 0.5, alwaysPositiveShiftRand);

    // Should clamp to 7, not go beyond
    expect(result[0].noteIndex).toBe(7);
  });

  it('fires independently from rhythmic variance', () => {
    const melody = [
      createMelodyEvent({ noteIndex: 3, startStep: 5, id: 'independence-test' }),
      createMelodyEvent({ noteIndex: 4, startStep: 7, id: 'independence-test-2' }),
    ];

    // Apply tonal variance
    const tonalResult = applyTonalVariance(melody, 0.5, () => 0.0);

    // Apply rhythmic variance separately
    const rhythmicResult = applyRhythmicVariance(melody, 0.5, () => 0.0);

    // Tonal should only change noteIndex
    const tonalChanged = tonalResult.some(
      (e, i) => e.noteIndex !== melody[i].noteIndex && e.startStep === melody[i].startStep
    );
    expect(tonalChanged).toBe(true);

    // Rhythmic should only change startStep
    const rhythmicChanged = rhythmicResult.some(
      (e, i) => e.startStep !== melody[i].startStep && e.noteIndex === melody[i].noteIndex
    );
    expect(rhythmicChanged).toBe(true);
  });

  it('does not apply variance twice in one call', () => {
    const melody = [
      createMelodyEvent({ noteIndex: 2, id: 'event-1' }),
      createMelodyEvent({ noteIndex: 4, id: 'event-2' }),
      createMelodyEvent({ noteIndex: 6, id: 'event-3' }),
    ];

    let _callCount = 0;
    const alwaysApplyRand = () => {
      _callCount++;
      return 0.0; // always apply
    };

    const result = applyTonalVariance(melody, 0.5, alwaysApplyRand);

    // Variance applies at most once and shifts at most 2 events
    const modifiedCount = result.filter((e, i) => e.noteIndex !== melody[i].noteIndex).length;
    expect(modifiedCount).toBeLessThanOrEqual(2);
  });

  it('shifts can be +1 or -1 only (not larger deltas)', () => {
    // Test with a controlled RNG that triggers variance and picks specific deltas
    const melody = [
      createMelodyEvent({ noteIndex: 4, id: 'event-1' }),
      createMelodyEvent({ noteIndex: 4, id: 'event-2' }),
    ];

    let _callCount = 0;
    const controlledRand = () => {
      _callCount++;
      // 1st call: probability check → apply
      // 2nd call: numToShift → pick 1
      // 3-4th calls: pickRandomIndices RNG
      // 5th+ calls: shift delta selection (alternating -1 and +1)
      if (_callCount === 1) return 0.0; // trigger
      if (_callCount === 2) return 0.1; // numToShift = 1
      if (_callCount < 5) return 0.5; // pickRandomIndices internal calls
      if (_callCount === 5) return 0.0; // shift delta: -1
      return 0.99; // shift delta: +1
    };

    const result = applyTonalVariance(melody, 0.5, controlledRand);

    // Check that any shifts are exactly ±1
    result.forEach((event, i) => {
      const diff = event.noteIndex - melody[i].noteIndex;
      // Only shifted events should have diff of ±1, unshifted should be 0
      expect([0, -1, 1]).toContain(diff);
    });
  });
});

// ========================================
// TEST SUITE: buildMotifOnsets
// ========================================

describe('buildMotifOnsets', () => {
  const fixedRand = () => 0.5;

  it('returns sorted unique onset positions in [0, subdivisions)', () => {
    const onsets = buildMotifOnsets(8, 8, DEFAULT_SUBDIVISIONS, fixedRand);
    expect(onsets.length).toBeGreaterThan(0);
    expect(new Set(onsets).size).toBe(onsets.length); // unique
    onsets.forEach((o) => {
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThan(DEFAULT_SUBDIVISIONS);
    });
    // sorted ascending
    for (let i = 1; i < onsets.length; i++) {
      expect(onsets[i]).toBeGreaterThan(onsets[i - 1]);
    }
  });

  it('short motifLength (<=subdivisions/2) produces repeating pattern across the measure', () => {
    // motifLength=4, subdivisions=16 → 4 repeats of the same base motif
    // With a fixed RNG the base motif should tile: offsets 0, 4, 8, 12
    const onsets = buildMotifOnsets(4, 4, 16, fixedRand);
    // With 4 repeats and density 4: K=1 onset per motif, R=0 → exactly 4 onsets
    expect(onsets).toHaveLength(4);
    // Each onset should be in a different repeat window
    const windows = onsets.map((o) => Math.floor(o / 4));
    expect(new Set(windows).size).toBe(4); // one per window
  });

  it('motifLength === subdivisions falls back to non-repeating unique positions', () => {
    const density = 8;
    const onsets = buildMotifOnsets(density, DEFAULT_SUBDIVISIONS, DEFAULT_SUBDIVISIONS, fixedRand);
    expect(onsets).toHaveLength(density);
    expect(new Set(onsets).size).toBe(density);
  });

  it('motifLength > subdivisions is clamped to subdivisions (non-repeating)', () => {
    const density = 4;
    const onsets = buildMotifOnsets(density, 999, DEFAULT_SUBDIVISIONS, fixedRand);
    expect(onsets).toHaveLength(density);
    onsets.forEach((o) => expect(o).toBeLessThan(DEFAULT_SUBDIVISIONS));
  });

  it('density is capped at subdivisions (never more onsets than grid cells)', () => {
    const onsets = buildMotifOnsets(99, 8, DEFAULT_SUBDIVISIONS, fixedRand);
    expect(onsets.length).toBeLessThanOrEqual(DEFAULT_SUBDIVISIONS);
    expect(new Set(onsets).size).toBe(onsets.length);
  });

  it('deterministic with the same RNG', () => {
    // Build with a stateless fixed-value rand — same inputs → same output
    const a = buildMotifOnsets(6, 4, 16, () => 0.3);
    const b = buildMotifOnsets(6, 4, 16, () => 0.3);
    expect(a).toEqual(b);
  });

  it('never returns more onsets than rhythmicDensity, even with a very short motif', () => {
    // motifLength=1, subdivisions=16 → repeats=16, far more windows than density=4.
    // K floors to 1 per window (16 raw onsets) before being trimmed back to density.
    const onsets = buildMotifOnsets(4, 1, 16, fixedRand);
    expect(onsets).toHaveLength(4);
    expect(new Set(onsets).size).toBe(4);
    onsets.forEach((o) => {
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThan(16);
    });
  });

  it('never returns more onsets than rhythmicDensity for a moderately short motif', () => {
    // motifLength=2, subdivisions=16 → repeats=8, still more than density=4.
    const onsets = buildMotifOnsets(4, 2, 16, fixedRand);
    expect(onsets).toHaveLength(4);
    expect(new Set(onsets).size).toBe(4);
  });

  it('distributes remainder onsets to first R repeat copies', () => {
    // density=5, motifLength=8, subdivisions=16 → repeats=2, K=2, R=1
    // First repeat should have 3 onsets, second repeat should have 2
    const onsets = buildMotifOnsets(5, 8, 16, fixedRand);
    expect(onsets).toHaveLength(5);
    const inFirstHalf = onsets.filter((o) => o < 8).length;
    const inSecondHalf = onsets.filter((o) => o >= 8).length;
    expect(inFirstHalf).toBe(3);
    expect(inSecondHalf).toBe(2);
  });
});

// ========================================
// TEST SUITE: gridUnitsToDuration
// ========================================

describe('gridUnitsToDuration', () => {
  it('1 unit → 16n', () => expect(gridUnitsToDuration(1)).toBe('16n'));
  it('0 units → 16n', () => expect(gridUnitsToDuration(0)).toBe('16n'));
  it('2 units → 8n', () => expect(gridUnitsToDuration(2)).toBe('8n'));
  it('3 units → 8n', () => expect(gridUnitsToDuration(3)).toBe('8n'));
  it('4 units → 4n', () => expect(gridUnitsToDuration(4)).toBe('4n'));
  it('6 units → 4n', () => expect(gridUnitsToDuration(6)).toBe('4n'));
  it('7 units → 2n', () => expect(gridUnitsToDuration(7)).toBe('2n'));
  it('16 units → 2n', () => expect(gridUnitsToDuration(16)).toBe('2n'));
});

// ========================================
// TEST SUITE: pickDurationForGap
// ========================================

describe('pickDurationForGap', () => {
  it('never returns a duration longer than the available gap', () => {
    // grid units: 16n=1, 8n=2, 4n=4, 2n=8
    const maxUnitsFor: Record<string, number> = { '16n': 1, '8n': 2, '4n': 4, '2n': 8 };
    for (let gap = 1; gap <= 16; gap++) {
      for (let i = 0; i < 20; i++) {
        const duration = pickDurationForGap(gap, () => i / 20);
        expect(maxUnitsFor[duration]).toBeLessThanOrEqual(gap);
      }
    }
  });

  it('gap of 1 always returns 16n (only candidate)', () => {
    expect(pickDurationForGap(1, () => 0)).toBe('16n');
    expect(pickDurationForGap(1, () => 0.999)).toBe('16n');
  });

  it('gap of 2 only ever returns 16n or 8n', () => {
    for (let i = 0; i < 10; i++) {
      const duration = pickDurationForGap(2, () => i / 10);
      expect(['16n', '8n']).toContain(duration);
    }
  });

  it('is deterministic for a given rand function', () => {
    const a = pickDurationForGap(8, () => 0.42);
    const b = pickDurationForGap(8, () => 0.42);
    expect(a).toBe(b);
  });

  it('favors longer durations over many samples with a large gap', () => {
    const counts: Record<string, number> = { '16n': 0, '8n': 0, '4n': 0, '2n': 0 };
    for (let i = 0; i < 2000; i++) {
      counts[pickDurationForGap(8, Math.random)]++;
    }
    // Weighted by unit value (1/2/4/8 of 15 total) — 16n should be the rarest by far.
    expect(counts['16n']).toBeLessThan(counts['2n']);
    expect(counts['16n']).toBeLessThan(counts['4n']);
    expect(counts['16n']).toBeLessThan(counts['8n']);
  });
});

// ========================================
// TEST SUITE: generateMelodyForRobot (new-style opts)
// ========================================

describe('generateMelodyForRobot — GenerateMelodyForRobotOptions', () => {
  it('rhythmicDensity=100 with motif inactive fills the entire 16-step measure', () => {
    const melody = generateMelodyForRobot({
      rhythmicDensity: 100,
      rhythmicMotifLength: { active: false, value: 8 },
      octaveMin: 3,
      octaveMax: 5,
      seed: 1,
    });
    expect(melody).toHaveLength(16);
  });

  it('rhythmicDensity=50 with motif inactive fills half the measure', () => {
    const melody = generateMelodyForRobot({
      rhythmicDensity: 50,
      rhythmicMotifLength: { active: false, value: 8 },
      octaveMin: 3,
      octaveMax: 4,
      seed: 2,
    });
    expect(melody).toHaveLength(8);
  });

  it('rhythmicDensity=25 with motif inactive rounds to the nearest onset count', () => {
    const melody = generateMelodyForRobot({
      rhythmicDensity: 25,
      rhythmicMotifLength: { active: false, value: 4 }, // value is inert while inactive
      octaveMin: 3,
      octaveMax: 4,
      seed: 7,
    });
    expect(melody).toHaveLength(4); // round(0.25 * 16)
  });

  it('rhythmicDensity=0 with motif inactive never produces a silent (empty) melody', () => {
    const melody = generateMelodyForRobot({
      rhythmicDensity: 0,
      rhythmicMotifLength: { active: false, value: 8 },
      octaveMin: 3,
      octaveMax: 4,
      seed: 3,
    });
    expect(melody.length).toBeGreaterThanOrEqual(1);
  });

  it('rhythmicDensity=0 with motif active never produces a silent melody', () => {
    const melody = generateMelodyForRobot({
      rhythmicDensity: 0,
      rhythmicMotifLength: { active: true, value: 4 },
      octaveMin: 3,
      octaveMax: 4,
      seed: 4,
    });
    expect(melody.length).toBeGreaterThanOrEqual(1);
  });

  it('rhythmicDensity=100 with motif active (value=4) fully fills and tiles the 4-step cell', () => {
    const melody = generateMelodyForRobot({
      rhythmicDensity: 100,
      rhythmicMotifLength: { active: true, value: 4 },
      octaveMin: 3,
      octaveMax: 4,
      seed: 5,
    });
    // 4 onsets/cell (100% of a 4-step cell) * 4 repeats (16/4) = fully dense measure
    expect(melody).toHaveLength(16);
    expect(new Set(melody.map((e) => e.startStep)).size).toBe(16);
  });

  it('motif active tiles an identical onset count across each repeat window', () => {
    // motif.value=4, subdivisions=16 → 4 repeat windows of 4 steps each;
    // 50% density → 2 onsets per cell, identically in every window (no remainder skew)
    const melody = generateMelodyForRobot({
      rhythmicDensity: 50,
      rhythmicMotifLength: { active: true, value: 4 },
      octaveMin: 3,
      octaveMax: 4,
      seed: 6,
    });
    const steps = melody.map((e) => e.startStep - 1); // 0-indexed
    const windowCounts = [0, 1, 2, 3].map(
      (w) => steps.filter((s) => s >= w * 4 && s < (w + 1) * 4).length
    );
    windowCounts.forEach((count) => expect(count).toBe(2));
  });

  it('all noteIndex values are in [0, 7]', () => {
    const melody = generateMelodyForRobot({ rhythmicDensity: 75, octaveMin: 2, octaveMax: 6, seed: 42 });
    melody.forEach((e) => {
      expect(e.noteIndex).toBeGreaterThanOrEqual(0);
      expect(e.noteIndex).toBeLessThanOrEqual(7);
    });
  });

  it('all octave values are within [octaveMin, octaveMax]', () => {
    const melody = generateMelodyForRobot({ rhythmicDensity: 50, octaveMin: 3, octaveMax: 5, seed: 7 });
    melody.forEach((e) => {
      expect(e.octave).toBeGreaterThanOrEqual(3);
      expect(e.octave).toBeLessThanOrEqual(5);
    });
  });

  it('octaveMin === octaveMax pins all events to that octave', () => {
    const melody = generateMelodyForRobot({ rhythmicDensity: 40, octaveMin: 4, octaveMax: 4, seed: 99 });
    melody.forEach((e) => expect(e.octave).toBe(4));
  });

  it('swapped octaveMin/octaveMax is normalised (no events out of range)', () => {
    const melody = generateMelodyForRobot({ rhythmicDensity: 40, octaveMin: 5, octaveMax: 3, seed: 5 });
    melody.forEach((e) => {
      expect(e.octave).toBeGreaterThanOrEqual(3);
      expect(e.octave).toBeLessThanOrEqual(5);
    });
  });

  it('all startStep values are in [1, 16]', () => {
    const melody = generateMelodyForRobot({ rhythmicDensity: 50, octaveMin: 3, octaveMax: 4, seed: 10 });
    melody.forEach((e) => {
      expect(e.startStep).toBeGreaterThanOrEqual(1);
      expect(e.startStep).toBeLessThanOrEqual(16);
    });
  });

  it('noteVariance inactive produces unweighted note selection, not the weighted default', () => {
    // A dense, motif-inactive melody gives a large sample. Weighted selection
    // (NOTE_INDEX_WEIGHTS = [0.35, 0.2, ...]) would collapse heavily toward index
    // 0; unweighted selection should spread across noticeably more of the 8 indices.
    const melody = generateMelodyForRobot({
      rhythmicDensity: 100,
      rhythmicMotifLength: { active: false, value: 8 },
      noteVariance: { active: false, value: 1 },
      octaveMin: 3,
      octaveMax: 4,
      seed: 123,
    });
    const indices = melody.map((e) => e.noteIndex);
    expect(new Set(indices).size).toBeGreaterThan(4);
  });

  it('noteVariance active with value=3 prefers new unique notes until the set fills (deterministic)', () => {
    const value = 3;
    const melody = generateMelodyForRobot({
      rhythmicDensity: 100,
      rhythmicMotifLength: { active: false, value: 8 },
      octaveMin: 3,
      octaveMax: 4,
      seed: 11,
      noteVariance: { active: true, value },
    });
    const seen = new Set<number>();
    for (let i = 0; i < melody.length; i++) {
      const idx = melody[i].noteIndex;
      if (seen.size < value) {
        expect(seen.has(idx)).toBe(false);
      }
      seen.add(idx);
    }
    expect(seen.size).toBeLessThanOrEqual(value);
  });

  it('noteVariance active with value=8 draws without replacement until all 8 notes used', () => {
    const melody = generateMelodyForRobot({
      rhythmicDensity: 100,
      rhythmicMotifLength: { active: false, value: 8 },
      octaveMin: 3,
      octaveMax: 5,
      seed: 7,
      noteVariance: { active: true, value: 8 },
    });
    const indices = melody.map((e) => e.noteIndex);
    const uniq = new Set(indices);
    expect(uniq.size).toBe(8);
  });

  it('is deterministic with the same seed', () => {
    const opts = { rhythmicDensity: 50, octaveMin: 3, octaveMax: 5, seed: 77 };
    const a = generateMelodyForRobot(opts);
    const b = generateMelodyForRobot(opts);
    expect(a.map((e) => e.startStep)).toEqual(b.map((e) => e.startStep));
    expect(a.map((e) => e.noteIndex)).toEqual(b.map((e) => e.noteIndex));
    expect(a.map((e) => e.octave)).toEqual(b.map((e) => e.octave));
  });

  it('each event has a valid length (16n | 8n | 4n | 2n)', () => {
    const melody = generateMelodyForRobot({ rhythmicDensity: 50, octaveMin: 3, octaveMax: 4, seed: 6 });
    const valid = new Set(['16n', '8n', '4n', '2n']);
    melody.forEach((e) => expect(valid.has(e.length)).toBe(true));
  });

  it('each event has a unique id', () => {
    const melody = generateMelodyForRobot({ rhythmicDensity: 50, octaveMin: 3, octaveMax: 4, seed: 8 });
    const ids = melody.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('onsetCount is no longer a recognized option', () => {
    // @ts-expect-error — onsetCount was removed from GenerateMelodyForRobotOptions
    generateMelodyForRobot({ onsetCount: 4, octaveMin: 3, octaveMax: 4, seed: 1 });
  });

  it('applies behavior-preserving defaults when rhythmicDensity/rhythmicMotifLength/noteVariance are omitted', () => {
    expect(DEFAULT_RHYTHMIC_DENSITY).toBe(50);
    expect(DEFAULT_RHYTHMIC_MOTIF_LENGTH).toEqual({ active: true, value: 8 });
    expect(DEFAULT_NOTE_VARIANCE).toEqual({ active: false, value: 1 });
    const melody = generateMelodyForRobot({ octaveMin: 3, octaveMax: 4, seed: 9 });
    expect(melody.length).toBeGreaterThanOrEqual(1);
  });
});

// ========================================
// TEST SUITE: reRollMelodyPitches
// ========================================

describe('reRollMelodyPitches', () => {
  /** 8-event melody with distinct, easily-diffable startStep/noteIndex/octave per event. */
  function makeEightEventMelody(): RobotMelodyEvent[] {
    return Array.from({ length: 8 }, (_, i) =>
      createMelodyEvent({ id: `e${i}`, startStep: i + 1, length: '16n', noteIndex: i % 8, octave: 3 + (i % 3) })
    );
  }

  it('changes exactly round(length * ratio) events at a 25% ratio on an 8-event melody', () => {
    const melody = makeEightEventMelody();
    const rand = alea('reroll-seed-1');
    const result = reRollMelodyPitches(melody, 0.25, { rand });

    const changedCount = result.filter((e, i) => e.noteIndex !== melody[i].noteIndex).length;
    expect(changedCount).toBe(2); // round(8 * 0.25) = 2
  });

  it('leaves startStep, length, and octave unchanged on every event, including changed ones', () => {
    const melody = makeEightEventMelody();
    const rand = alea('reroll-seed-2');
    const result = reRollMelodyPitches(melody, 0.25, { rand });

    expect(result.map((e) => e.startStep)).toEqual(melody.map((e) => e.startStep));
    expect(result.map((e) => e.length)).toEqual(melody.map((e) => e.length));
    expect(result.map((e) => e.octave)).toEqual(melody.map((e) => e.octave));
  });

  it('leaves unchanged events\' noteIndex byte-identical to the input', () => {
    const melody = makeEightEventMelody();
    const rand = alea('reroll-seed-3');
    const result = reRollMelodyPitches(melody, 0.25, { rand });

    result.forEach((e, i) => {
      const isChanged = e.noteIndex !== melody[i].noteIndex;
      if (!isChanged) expect(e.noteIndex).toBe(melody[i].noteIndex);
    });
  });

  it('floors at 1 changed event even when round(length * ratio) would be 0', () => {
    const melody = [createMelodyEvent({ id: 'only', startStep: 1, noteIndex: 5, octave: 4 })];
    const rand = alea('reroll-seed-4');
    const result = reRollMelodyPitches(melody, 0.25, { rand });

    // A 1-event melody at 25% floors to "change 1", not "change 0".
    expect(result).toHaveLength(1);
    // Can't assert the new value differs from a possible-by-chance identical re-roll,
    // but the function must have gone through the re-roll path (index 0 is always selected
    // when count >= length), not a same-reference pass-through.
    expect(result[0]).not.toBe(melody[0]);
  });

  it('noteVariance inactive (or absent) produces unweighted picks in the valid 0-7 range', () => {
    const melody = makeEightEventMelody();
    const rand = alea('reroll-seed-5');
    const result = reRollMelodyPitches(melody, 1, { rand }); // ratio 1 -> every event re-rolled
    result.forEach((e) => {
      expect(e.noteIndex).toBeGreaterThanOrEqual(0);
      expect(e.noteIndex).toBeLessThan(8);
    });
  });

  it('noteVariance active produces picks within the valid 0-7 range (weighted selection)', () => {
    const melody = makeEightEventMelody();
    const rand = alea('reroll-seed-6');
    const result = reRollMelodyPitches(melody, 1, { noteVariance: { active: true, value: 8 }, rand });
    result.forEach((e) => {
      expect(e.noteIndex).toBeGreaterThanOrEqual(0);
      expect(e.noteIndex).toBeLessThan(8);
    });
  });

  it('is deterministic — same rand sequence in, same output out', () => {
    const melodyA = makeEightEventMelody();
    const melodyB = makeEightEventMelody();
    const resultA = reRollMelodyPitches(melodyA, 0.25, { rand: alea('reroll-determinism') });
    const resultB = reRollMelodyPitches(melodyB, 0.25, { rand: alea('reroll-determinism') });
    expect(resultA.map((e) => e.noteIndex)).toEqual(resultB.map((e) => e.noteIndex));
  });

  it('does not mutate the input melody array or its events', () => {
    const melody = makeEightEventMelody();
    const snapshot = melody.map((e) => ({ ...e }));
    reRollMelodyPitches(melody, 0.25, { rand: alea('reroll-seed-7') });
    expect(melody).toEqual(snapshot);
  });
});
