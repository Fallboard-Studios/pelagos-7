import { describe, it, expect } from 'vitest';

import {
  getCabinetPopDuration,
  getCabinetPopEase,
  CABINET_POP_DURATION,
  CABINET_POP_DURATION_OUT,
} from './cabinetAnimation';

describe('getCabinetPopDuration', () => {
  it('returns 0 when prefers-reduced-motion is set, regardless of direction', () => {
    expect(getCabinetPopDuration(true)).toBe(0);
    expect(getCabinetPopDuration(true, 'in')).toBe(0);
    expect(getCabinetPopDuration(true, 'out')).toBe(0);
  });

  it('returns CABINET_POP_DURATION for the (default) "in" direction', () => {
    expect(getCabinetPopDuration(false)).toBe(CABINET_POP_DURATION);
    expect(getCabinetPopDuration(false, 'in')).toBe(CABINET_POP_DURATION);
    expect(getCabinetPopDuration(false)).toBeGreaterThan(0);
  });

  it('returns the shorter CABINET_POP_DURATION_OUT for the "out" direction — popping out should not linger', () => {
    expect(getCabinetPopDuration(false, 'out')).toBe(CABINET_POP_DURATION_OUT);
    expect(CABINET_POP_DURATION_OUT).toBeLessThan(CABINET_POP_DURATION);
    expect(CABINET_POP_DURATION_OUT).toBeGreaterThan(0);
  });
});

describe('getCabinetPopEase — both directions currently resolve to power2.out (2026-09-09, reverted from an earlier power2.in attempt for "out")', () => {
  it('defaults to power2.out when direction is omitted', () => {
    expect(getCabinetPopEase()).toBe('power2.out');
  });

  it('returns power2.out for the "in" direction — an entering box decelerates into its popped position', () => {
    expect(getCabinetPopEase('in')).toBe('power2.out');
  });

  it('returns power2.out for the "out" direction too — power2.in (slow-start/fast-finish) was tried here and reverted: it kept the wall near full size for most of the (shorter) duration before a sudden late collapse, reading as a LONGER, more prominent flash than power2.out\'s own front-loaded shrink, not a shorter one. power2.out already gets small fast; CABINET_POP_DURATION_OUT (the shorter duration) is what actually shortens the lingering tail', () => {
    expect(getCabinetPopEase('out')).toBe('power2.out');
  });
});
