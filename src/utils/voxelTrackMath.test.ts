import { describe, it, expect } from 'vitest';

import {
  VOXEL_TRACK_MIN_BOX_COUNT,
  VOXEL_STRADDLE_MIN_SIZE_FRACTION,
  computeFittedBoxCount,
  computeVoxelTrackLength,
  computeVoxelBoxStates,
  computeVoxelBoxPopDistance,
  computeVoxelBoxZIndex,
  computeVoxelTrackTrailingReserve,
  computeVoxelFillBackground,
  computeVoxelStraddleSizeFraction,
} from './voxelTrackMath';
import { VOXEL_TRACK_POP_DISTANCE, VOXEL_TRACK_POP_DISTANCE_MIN_RATIO } from './cabinetGeometry';

describe('VOXEL_TRACK_MIN_BOX_COUNT', () => {
  it('is 3', () => {
    expect(VOXEL_TRACK_MIN_BOX_COUNT).toBe(3);
  });
});

describe('computeFittedBoxCount', () => {
  it('fits exactly N boxes when the available length is exactly N*(boxSize+gap) - gap', () => {
    // 5 boxes of 40px with 4 gaps of 10px: 5*40 + 4*10 = 240px, exactly.
    expect(computeFittedBoxCount(240, 40, 10)).toBe(5);
  });

  it('floors to N-1 boxes when short by exactly one gap of the space the Nth box would need', () => {
    // 230px is 10px (one gap) short of the 240px 5 boxes need; 4 boxes need
    // only 190px, so 4 is still the largest count that fits.
    expect(computeFittedBoxCount(230, 40, 10)).toBe(4);
  });

  it('fits a generous number of boxes without overflowing', () => {
    // 20 boxes need 20*40 + 19*10 = 990px (fits in 1000); 21 would need 1040px (doesn't).
    expect(computeFittedBoxCount(1000, 40, 10)).toBe(20);
  });

  it('returns the 3-box minimum when boxSize is zero', () => {
    expect(computeFittedBoxCount(1000, 0, 10)).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
  });

  it('returns the 3-box minimum when boxSize is negative', () => {
    expect(computeFittedBoxCount(1000, -5, 10)).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
  });

  it('clamps to the 3-box minimum, never fewer, when the space is too small even for 3 boxes', () => {
    // 3 boxes of 48px with 2 gaps of 12px need 168px; 10px isn't remotely enough.
    expect(computeFittedBoxCount(10, 48, 12)).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
  });

  it('clamps to the 3-box minimum for zero available length', () => {
    expect(computeFittedBoxCount(0, 48, 12)).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
  });
});

describe('computeVoxelTrackLength', () => {
  it('never overflows the available length the fitted count was computed against', () => {
    const boxSize = 40;
    const gap = 10;
    const availableLength = 1000;
    const fitted = computeFittedBoxCount(availableLength, boxSize, gap);
    expect(computeVoxelTrackLength(fitted, boxSize, gap)).toBeLessThanOrEqual(availableLength);
  });

  it('never overflows for a second representative (boxSize, gap) pair', () => {
    const boxSize = 48;
    const gap = 12;
    const availableLength = 777;
    const fitted = computeFittedBoxCount(availableLength, boxSize, gap);
    expect(computeVoxelTrackLength(fitted, boxSize, gap)).toBeLessThanOrEqual(availableLength);
  });

  it('equals exactly boxSize at boxCount 1 — no gap term with only one box', () => {
    expect(computeVoxelTrackLength(1, 48, 12)).toBe(48);
  });

  it('sums N box sizes and N-1 gaps for a hand-derived case', () => {
    // 3 boxes of 32px with 2 gaps of 8px: 3*32 + 2*8 = 112px.
    expect(computeVoxelTrackLength(3, 32, 8)).toBe(112);
  });
});

describe('computeVoxelBoxStates', () => {
  it('at value === min: box 0 straddles at 0% fill, every other box is flat and empty', () => {
    const states = computeVoxelBoxStates(0, 0, 100, 5);
    expect(states).toEqual([
      { fillPercent: 0, popT: 1, isStraddling: true },
      { fillPercent: 0, popT: 0, isStraddling: false },
      { fillPercent: 0, popT: 0, isStraddling: false },
      { fillPercent: 0, popT: 0, isStraddling: false },
      { fillPercent: 0, popT: 0, isStraddling: false },
    ]);
  });

  it('at value === max: the last box straddles fully popped, every prior filled box is also popT: 1, and no box reports 0% fill', () => {
    const states = computeVoxelBoxStates(100, 0, 100, 5);
    expect(states).toEqual([
      { fillPercent: 100, popT: 1, isStraddling: false },
      { fillPercent: 100, popT: 1, isStraddling: false },
      { fillPercent: 100, popT: 1, isStraddling: false },
      { fillPercent: 100, popT: 1, isStraddling: false },
      { fillPercent: 100, popT: 1, isStraddling: true },
    ]);
    expect(states.every((s) => s.fillPercent > 0)).toBe(true);
  });

  it('hand-derives the exact per-box array for a mid-range value against a small box count', () => {
    // min=0, max=100, boxCount=4, value=62.5 → t=0.625, rawPosition=2.5,
    // straddlingIndex=2, localFraction=0.5 → box 2 straddles at 50% fill.
    const states = computeVoxelBoxStates(62.5, 0, 100, 4);
    expect(states).toEqual([
      { fillPercent: 100, popT: 1, isStraddling: false },
      { fillPercent: 100, popT: 1, isStraddling: false },
      { fillPercent: 50, popT: 1, isStraddling: true },
      { fillPercent: 0, popT: 0, isStraddling: false },
    ]);
  });

  it('exactly one box is isStraddling: true, for a variety of representative values — popT alone can\'t distinguish the straddling box from an ordinary filled one (both are popT: 1), so this is asserted directly, not inferred', () => {
    for (const value of [0, 1, 25, 50, 62.5, 99, 100]) {
      const states = computeVoxelBoxStates(value, 0, 100, 7);
      const straddlingCount = states.filter((s) => s.isStraddling).length;
      expect(straddlingCount).toBe(1);
    }
  });

  it('does not throw and returns the t=0 shape when min === max', () => {
    expect(() => computeVoxelBoxStates(50, 50, 50, 4)).not.toThrow();
    const states = computeVoxelBoxStates(50, 50, 50, 4);
    expect(states).toEqual([
      { fillPercent: 0, popT: 1, isStraddling: true },
      { fillPercent: 0, popT: 0, isStraddling: false },
      { fillPercent: 0, popT: 0, isStraddling: false },
      { fillPercent: 0, popT: 0, isStraddling: false },
    ]);
  });

  it('clamps a value below min to the same t=0 shape as value === min', () => {
    expect(computeVoxelBoxStates(-50, 0, 100, 5)).toEqual(computeVoxelBoxStates(0, 0, 100, 5));
  });

  it('clamps a value above max to the same t=1 shape as value === max', () => {
    expect(computeVoxelBoxStates(150, 0, 100, 5)).toEqual(computeVoxelBoxStates(100, 0, 100, 5));
  });

  it('boxCount 1 always renders the single box as the fully-popped straddler', () => {
    expect(computeVoxelBoxStates(25, 0, 100, 1)).toEqual([{ fillPercent: 25, popT: 1, isStraddling: true }]);
  });
});

describe('computeVoxelBoxPopDistance', () => {
  it('at box 0 (nearest min), returns exactly VOXEL_TRACK_POP_DISTANCE_MIN_RATIO of the max distance', () => {
    expect(computeVoxelBoxPopDistance(0, 5)).toBe(VOXEL_TRACK_POP_DISTANCE * VOXEL_TRACK_POP_DISTANCE_MIN_RATIO);
  });

  it('at the last box (nearest max), returns exactly the full VOXEL_TRACK_POP_DISTANCE', () => {
    expect(computeVoxelBoxPopDistance(4, 5)).toBe(VOXEL_TRACK_POP_DISTANCE);
  });

  it('interpolates linearly by row position for boxes in between — independent of the slider value', () => {
    // boxCount 5 → span 4; box 2 sits at positionFraction 0.5, exactly
    // halfway between the min-ratio floor and the full max distance.
    const min = VOXEL_TRACK_POP_DISTANCE * VOXEL_TRACK_POP_DISTANCE_MIN_RATIO;
    const expected = min + (VOXEL_TRACK_POP_DISTANCE - min) * 0.5;
    expect(computeVoxelBoxPopDistance(2, 5)).toBe(expected);
  });

  it('never exceeds VOXEL_TRACK_POP_DISTANCE or drops below the min-ratio floor, across a representative sweep of box counts', () => {
    const min = VOXEL_TRACK_POP_DISTANCE * VOXEL_TRACK_POP_DISTANCE_MIN_RATIO;
    for (const boxCount of [3, 4, 5, 8, 20]) {
      for (let i = 0; i < boxCount; i++) {
        const distance = computeVoxelBoxPopDistance(i, boxCount);
        expect(distance).toBeGreaterThanOrEqual(min);
        expect(distance).toBeLessThanOrEqual(VOXEL_TRACK_POP_DISTANCE);
      }
    }
  });

  it('does not throw for a single-box row (boxCount: 1) — the divide-by-zero guard; index 0 still reads as nearest-min, so it gets the floor distance, not the max', () => {
    expect(() => computeVoxelBoxPopDistance(0, 1)).not.toThrow();
    expect(computeVoxelBoxPopDistance(0, 1)).toBe(VOXEL_TRACK_POP_DISTANCE * VOXEL_TRACK_POP_DISTANCE_MIN_RATIO);
  });
});

describe('computeVoxelBoxZIndex', () => {
  it('horizontal: descends as index rises — box 0 (leftmost) outranks every box to its right', () => {
    const zIndexes = [0, 1, 2, 3, 4].map((i) => computeVoxelBoxZIndex(i, 5, 'horizontal'));
    expect(zIndexes).toEqual([5, 4, 3, 2, 1]);
    for (let i = 1; i < zIndexes.length; i++) {
      expect(zIndexes[i]).toBeLessThan(zIndexes[i - 1]);
    }
  });

  it('vertical: ascends as index rises — the last box (topmost, per column-reverse) outranks every box below it', () => {
    const zIndexes = [0, 1, 2, 3, 4].map((i) => computeVoxelBoxZIndex(i, 5, 'vertical'));
    expect(zIndexes).toEqual([1, 2, 3, 4, 5]);
    for (let i = 1; i < zIndexes.length; i++) {
      expect(zIndexes[i]).toBeGreaterThan(zIndexes[i - 1]);
    }
  });

  it('never produces a tie between two different indexes of the same row, for either axis', () => {
    for (const axis of ['horizontal', 'vertical'] as const) {
      const zIndexes = Array.from({ length: 8 }, (_, i) => computeVoxelBoxZIndex(i, 8, axis));
      expect(new Set(zIndexes).size).toBe(zIndexes.length);
    }
  });
});

describe('computeVoxelTrackTrailingReserve', () => {
  it("horizontal: returns exactly 2 * VOXEL_TRACK_POP_DISTANCE — the last box's own full rightward bleed", () => {
    expect(computeVoxelTrackTrailingReserve('horizontal')).toBe(2 * VOXEL_TRACK_POP_DISTANCE);
  });

  it('vertical: returns 0 — the fixed 2:1 vector bleeds right and down regardless of axis, so a vertical track\'s last (topmost) box bleeds into the column, not past its own top edge', () => {
    expect(computeVoxelTrackTrailingReserve('vertical')).toBe(0);
  });
});

describe('computeVoxelFillBackground', () => {
  it('returns the solid accent token, no gradient syntax, at exactly 100%', () => {
    expect(computeVoxelFillBackground(100, 'horizontal')).toBe('var(--color-accent)');
  });

  it('returns the solid accent token above 100%', () => {
    expect(computeVoxelFillBackground(150, 'horizontal')).toBe('var(--color-accent)');
  });

  it('returns the solid surface token, no gradient syntax, at exactly 0%', () => {
    expect(computeVoxelFillBackground(0, 'horizontal')).toBe('var(--color-surface)');
  });

  it('returns the solid surface token below 0%', () => {
    expect(computeVoxelFillBackground(-10, 'horizontal')).toBe('var(--color-surface)');
  });

  it('renders a hard-stop gradient — both color stops at the same percentage boundary — for a mid-value fill', () => {
    expect(computeVoxelFillBackground(37, 'horizontal')).toBe(
      'linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) 37%, var(--color-surface) 37%, var(--color-surface) 100%)',
    );
  });

  it('splits toward the right for the horizontal axis', () => {
    expect(computeVoxelFillBackground(50, 'horizontal')).toContain('to right');
  });

  it('splits toward the top for the vertical axis', () => {
    expect(computeVoxelFillBackground(50, 'vertical')).toContain('to top');
  });
});

describe('VOXEL_STRADDLE_MIN_SIZE_FRACTION', () => {
  it('is a fraction strictly between 0 and 1', () => {
    expect(VOXEL_STRADDLE_MIN_SIZE_FRACTION).toBeGreaterThan(0);
    expect(VOXEL_STRADDLE_MIN_SIZE_FRACTION).toBeLessThan(1);
  });
});

describe('computeVoxelStraddleSizeFraction', () => {
  it('at fillPercent: 100, returns exactly 1 (full-size)', () => {
    expect(computeVoxelStraddleSizeFraction(100)).toBe(1);
  });

  it('at fillPercent: 50, returns exactly 0.5 — no floor engaged', () => {
    expect(computeVoxelStraddleSizeFraction(50)).toBe(0.5);
  });

  it('at fillPercent: 0 (value === min), floors to VOXEL_STRADDLE_MIN_SIZE_FRACTION rather than 0 — the straddling box must never fully disappear', () => {
    expect(computeVoxelStraddleSizeFraction(0)).toBe(VOXEL_STRADDLE_MIN_SIZE_FRACTION);
  });

  it('at a fillPercent whose raw fraction is below the floor (e.g. 5%, i.e. 0.05), clamps up to the floor rather than returning the raw fraction', () => {
    const raw = 5 / 100;
    expect(raw).toBeLessThan(VOXEL_STRADDLE_MIN_SIZE_FRACTION); // sanity-check the test's own premise
    expect(computeVoxelStraddleSizeFraction(5)).toBe(VOXEL_STRADDLE_MIN_SIZE_FRACTION);
  });

  it('at a fillPercent whose raw fraction is comfortably above the floor, returns the raw fraction unclamped', () => {
    expect(computeVoxelStraddleSizeFraction(80)).toBe(0.8);
  });
});
