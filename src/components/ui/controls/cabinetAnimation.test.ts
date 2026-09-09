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

describe('getCabinetPopEase — direction-dependent easing (a box flattening out should accelerate away, not decelerate into a lingering small-but-visible size)', () => {
  it('defaults to power2.out (decelerate into place) when direction is omitted — matches the existing popping-in behavior byte-for-byte', () => {
    expect(getCabinetPopEase()).toBe('power2.out');
  });

  it('returns power2.out for the "in" direction — an entering box decelerates into its popped position', () => {
    expect(getCabinetPopEase('in')).toBe('power2.out');
  });

  it('returns power2.in for the "out" direction — an exiting/flattening box accelerates away instead of crawling the last bit', () => {
    expect(getCabinetPopEase('out')).toBe('power2.in');
  });
});
