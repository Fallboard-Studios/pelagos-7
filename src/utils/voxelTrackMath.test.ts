import { describe, it, expect } from 'vitest';

import {
  VOXEL_TRACK_MIN_BOX_COUNT,
  computeFittedBoxCount,
  computeVoxelTrackLength,
  computeVoxelBoxStates,
  computeVoxelFillBackground,
} from './voxelTrackMath';

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
      { fillPercent: 0, popT: 1 },
      { fillPercent: 0, popT: 0 },
      { fillPercent: 0, popT: 0 },
      { fillPercent: 0, popT: 0 },
      { fillPercent: 0, popT: 0 },
    ]);
  });

  it('at value === max: the last box straddles fully popped, every prior box is full with stepped-down popT, and no box reports 0% fill', () => {
    const states = computeVoxelBoxStates(100, 0, 100, 5);
    expect(states).toEqual([
      { fillPercent: 100, popT: 0 },
      { fillPercent: 100, popT: 0.25 },
      { fillPercent: 100, popT: 0.5 },
      { fillPercent: 100, popT: 0.75 },
      { fillPercent: 100, popT: 1 },
    ]);
    expect(states.every((s) => s.fillPercent > 0)).toBe(true);
  });

  it('hand-derives the exact per-box array for a mid-range value against a small box count', () => {
    // min=0, max=100, boxCount=4, value=62.5 → t=0.625, rawPosition=2.5,
    // straddlingIndex=2, localFraction=0.5 → box 2 straddles at 50% fill.
    const states = computeVoxelBoxStates(62.5, 0, 100, 4);
    expect(states).toEqual([
      { fillPercent: 100, popT: 0 },
      { fillPercent: 100, popT: 0.5 },
      { fillPercent: 50, popT: 1 },
      { fillPercent: 0, popT: 0 },
    ]);
  });

  it('does not throw and returns the t=0 shape when min === max', () => {
    expect(() => computeVoxelBoxStates(50, 50, 50, 4)).not.toThrow();
    const states = computeVoxelBoxStates(50, 50, 50, 4);
    expect(states).toEqual([
      { fillPercent: 0, popT: 1 },
      { fillPercent: 0, popT: 0 },
      { fillPercent: 0, popT: 0 },
      { fillPercent: 0, popT: 0 },
    ]);
  });

  it('clamps a value below min to the same t=0 shape as value === min', () => {
    expect(computeVoxelBoxStates(-50, 0, 100, 5)).toEqual(computeVoxelBoxStates(0, 0, 100, 5));
  });

  it('clamps a value above max to the same t=1 shape as value === max', () => {
    expect(computeVoxelBoxStates(150, 0, 100, 5)).toEqual(computeVoxelBoxStates(100, 0, 100, 5));
  });

  it('boxCount 1 always renders the single box as the fully-popped straddler', () => {
    expect(computeVoxelBoxStates(25, 0, 100, 1)).toEqual([{ fillPercent: 25, popT: 1 }]);
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
