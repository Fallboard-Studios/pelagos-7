import { describe, it, expect } from 'vitest';

import {
  VOXEL_TRACK_MIN_BOX_COUNT,
  computeFittedBoxCount,
  computeVoxelTrackLength,
  computeVoxelBoxStates,
  computeVoxelFillBackground,
} from './voxelTrackMath';

describe('computeFittedBoxCount', () => {
  it('fits an exact number of boxes when the available length divides evenly', () => {
    // 5 boxes of 32px with 4 gaps of 8px = 160 + 32 = 192px exactly
    expect(computeFittedBoxCount(192, 32, 8)).toBe(5);
  });

  it('falls back to one fewer box when the available length is even 1px short of the next box', () => {
    // 5 boxes need exactly 192px (160 + 32 gap-px); 191px is 1px short, so
    // only 4 fit (4*32 + 3*8 = 128 + 24 = 152px, well within 191).
    expect(computeFittedBoxCount(191, 32, 8)).toBe(4);
  });

  it('fits generously more boxes in a much larger space', () => {
    // 10 boxes of 32px with 9 gaps of 8px = 320 + 72 = 392px
    expect(computeFittedBoxCount(392, 32, 8)).toBe(10);
  });

  it('boxSize <= 0 returns the minimum box count', () => {
    expect(computeFittedBoxCount(1000, 0, 8)).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
    expect(computeFittedBoxCount(1000, -5, 8)).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
  });

  it('a space too small even for the minimum count still returns exactly the minimum, never fewer', () => {
    expect(computeFittedBoxCount(0, 32, 8)).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
    expect(computeFittedBoxCount(10, 32, 8)).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
  });
});

describe('computeVoxelTrackLength', () => {
  it('is the inverse of computeFittedBoxCount — the fitted count never overflows what was asked for', () => {
    const cases: Array<[number, number, number]> = [
      [500, 32, 8],
      [500, 40, 10],
      [500, 48, 12],
      [1000, 32, 8],
    ];
    for (const [availableLength, boxSize, gap] of cases) {
      const fitted = computeFittedBoxCount(availableLength, boxSize, gap);
      expect(computeVoxelTrackLength(fitted, boxSize, gap)).toBeLessThanOrEqual(availableLength);
    }
  });

  it('a single box has no gap term', () => {
    expect(computeVoxelTrackLength(1, 32, 8)).toBe(32);
  });

  it('N boxes with (N-1) gaps', () => {
    expect(computeVoxelTrackLength(5, 32, 8)).toBe(5 * 32 + 4 * 8);
  });
});

describe('computeVoxelBoxStates', () => {
  it('value === min: box 0 is the straddling box (fillPercent 0, popT 1); every other box is flat and empty', () => {
    const states = computeVoxelBoxStates(0, 0, 100, 4);
    expect(states[0]).toEqual({ fillPercent: 0, popT: 1 });
    expect(states[1]).toEqual({ fillPercent: 0, popT: 0 });
    expect(states[2]).toEqual({ fillPercent: 0, popT: 0 });
    expect(states[3]).toEqual({ fillPercent: 0, popT: 0 });
  });

  it('value === max: the t=1 clamp edge — the LAST box is the straddling box, every prior box is fully filled with a stepped-down popT, none report fillPercent 0', () => {
    const states = computeVoxelBoxStates(100, 0, 100, 4);
    expect(states).toHaveLength(4);
    expect(states[3]).toEqual({ fillPercent: 100, popT: 1 }); // last box is straddling
    expect(states[0].fillPercent).toBe(100);
    expect(states[1].fillPercent).toBe(100);
    expect(states[2].fillPercent).toBe(100);
    // Stepped down in equal decrements from the straddling box's popT=1 to 0
    // at the box nearest the minimum end (box 0), matching the roadmap's own
    // wording exactly.
    expect(states[0].popT).toBe(0);
    expect(states[1].popT).toBeCloseTo(1 / 3);
    expect(states[2].popT).toBeCloseTo(2 / 3);
    for (const state of states) {
      expect(state.fillPercent).not.toBe(0);
    }
  });

  it('a mid-range value against a small boxCount is hand-verified exactly, not spot-checked', () => {
    // value=37.5, min=0, max=100, boxCount=4 → rawPosition = 0.375 * 4 = 1.5
    // straddlingIndex = floor(1.5) = 1, localFraction = 0.5
    const states = computeVoxelBoxStates(37.5, 0, 100, 4);
    expect(states).toEqual([
      { fillPercent: 100, popT: 0 }, // box 0: below straddling (index 1), straddlingIndex=1 so popT = 0/1 = 0
      { fillPercent: 50, popT: 1 },  // box 1: the straddling box, local split at 50%
      { fillPercent: 0, popT: 0 },   // box 2: above straddling, not yet filled
      { fillPercent: 0, popT: 0 },   // box 3: above straddling, not yet filled
    ]);
  });

  it('min === max does not throw and returns the t=0 shape for every box', () => {
    expect(() => computeVoxelBoxStates(5, 5, 5, 3)).not.toThrow();
    const states = computeVoxelBoxStates(5, 5, 5, 3);
    expect(states[0]).toEqual({ fillPercent: 0, popT: 1 });
    expect(states[1]).toEqual({ fillPercent: 0, popT: 0 });
    expect(states[2]).toEqual({ fillPercent: 0, popT: 0 });
  });

  it('returns exactly boxCount entries', () => {
    expect(computeVoxelBoxStates(50, 0, 100, 7)).toHaveLength(7);
  });
});

describe('computeVoxelFillBackground', () => {
  it('fillPercent >= 100 returns the solid accent color, no gradient syntax', () => {
    expect(computeVoxelFillBackground(100, 'horizontal')).toBe('var(--color-accent)');
  });

  it('fillPercent <= 0 returns the solid surface color, no gradient syntax', () => {
    expect(computeVoxelFillBackground(0, 'horizontal')).toBe('var(--color-surface)');
  });

  it('a mid-value produces a hard-stop gradient — both color stops at the same percent boundary', () => {
    const bg = computeVoxelFillBackground(37, 'horizontal');
    expect(bg).toContain('linear-gradient(');
    expect(bg).toContain('var(--color-accent) 0%');
    expect(bg).toContain('var(--color-accent) 37%');
    expect(bg).toContain('var(--color-surface) 37%');
    expect(bg).toContain('var(--color-surface) 100%');
  });

  it('horizontal axis fills to the right (min-ward = left)', () => {
    expect(computeVoxelFillBackground(50, 'horizontal')).toContain('to right');
  });

  it('vertical axis fills to the top (min-ward = bottom)', () => {
    expect(computeVoxelFillBackground(50, 'vertical')).toContain('to top');
  });
});
