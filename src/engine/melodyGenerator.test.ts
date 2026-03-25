import { describe, it, expect } from 'vitest';
import { applyRhythmicVariance, pickRandomIndices } from './melodyGenerator';
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
