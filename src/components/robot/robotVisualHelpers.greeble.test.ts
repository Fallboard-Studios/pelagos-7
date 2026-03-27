import { describe, it, expect } from 'vitest';

import {
  calculateGreebleCount,
  calculateGreebleSize,
  calculateGreeblePersistence,
} from './robotVisualHelpers';

describe('greeble helpers', () => {
  it('calculateGreebleCount is deterministic and capped <= 16', () => {
    const adsr = { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.3 } as any;
    const c1 = calculateGreebleCount(2000, 1.0, 'sawtooth', adsr);
    const c2 = calculateGreebleCount(2000, 1.0, 'sawtooth', adsr);
    expect(c1).toBe(c2);
    expect(c1).toBeGreaterThanOrEqual(0);
    expect(c1).toBeLessThanOrEqual(16);

    const high = calculateGreebleCount(10000, 1.0, 'sawtooth', adsr);
    expect(high).toBeLessThanOrEqual(16);
  });

  it('calculateGreebleSize maps sustain to size between 1 and 6', () => {
    expect(calculateGreebleSize(0)).toBeGreaterThanOrEqual(1);
    expect(calculateGreebleSize(1)).toBeLessThanOrEqual(6);
    expect(calculateGreebleSize(1)).toBeGreaterThanOrEqual(calculateGreebleSize(0));
  });

  it('calculateGreeblePersistence clamps release to visual-safe range', () => {
    expect(calculateGreeblePersistence(0.01)).toBeGreaterThanOrEqual(0.1);
    expect(calculateGreeblePersistence(10)).toBeLessThanOrEqual(3.0);
    expect(calculateGreeblePersistence(0.5)).toBeCloseTo(0.5, 2);
  });
});
