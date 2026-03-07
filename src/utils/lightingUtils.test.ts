import { describe, it, expect } from 'vitest';
import { getLighting, getNightDepth, DAY_CYCLE_MEASURES, FLICKER_PERIOD } from './lightingUtils';

// ========================================
// HELPERS
// ========================================

/** Returns east and west values rounded to 3 decimal places. */
function lighting(measure: number) {
  const { eastL, westL } = getLighting(measure);
  return { eastL: Math.round(eastL * 1000) / 1000, westL: Math.round(westL * 1000) / 1000 };
}

// ========================================
// TESTS
// ========================================

describe('getLighting', () => {
  it('returns equal east and west at midnight (m=0)', () => {
    const { eastL, westL } = getLighting(0);
    expect(eastL).toBeCloseTo(westL, 3);
  });

  it('returns equal east and west at noon (m=48)', () => {
    const { eastL, westL } = getLighting(48);
    expect(eastL).toBeCloseTo(westL, 3);
  });

  it('east face peaks at m=36 (9am)', () => {
    const { eastL: at36 } = getLighting(36);
    const { eastL: at24 } = getLighting(24);
    const { eastL: at48 } = getLighting(48);
    expect(at36).toBeGreaterThan(at24);
    expect(at36).toBeGreaterThan(at48);
    // Should be at or near PEAK_L
    expect(at36).toBeCloseTo(1.05, 2);
  });

  it('west face peaks at m=60 (3pm)', () => {
    const { westL: at60 } = getLighting(60);
    const { westL: at48 } = getLighting(48);
    const { westL: at72 } = getLighting(72);
    expect(at60).toBeGreaterThan(at48);
    expect(at60).toBeGreaterThan(at72);
    // Should be at or near PEAK_L
    expect(at60).toBeCloseTo(1.05, 2);
  });

  it('east is brighter than west in the morning (m=24)', () => {
    const { eastL, westL } = getLighting(24);
    expect(eastL).toBeGreaterThan(westL);
  });

  it('west is brighter than east in the afternoon (m=72)', () => {
    const { eastL, westL } = getLighting(72);
    expect(westL).toBeGreaterThan(eastL);
  });

  it('all values stay within [NIGHT_L, PEAK_L] range', () => {
    for (let m = 0; m < DAY_CYCLE_MEASURES; m++) {
      const { eastL, westL } = getLighting(m);
      expect(eastL).toBeGreaterThanOrEqual(0.15);
      expect(eastL).toBeLessThanOrEqual(1.05);
      expect(westL).toBeGreaterThanOrEqual(0.15);
      expect(westL).toBeLessThanOrEqual(1.05);
    }
  });

  it('wraps correctly — m=0 and m=96 produce same result', () => {
    expect(lighting(0)).toEqual(lighting(96));
    expect(lighting(0)).toEqual(lighting(192));
  });

  it('is darker at night than at noon', () => {
    const night = getLighting(0).eastL;
    const noon = getLighting(48).eastL;
    expect(noon).toBeGreaterThan(night);
  });
});
// ========================================
// getNightDepth
// ========================================

describe('getNightDepth', () => {
  it('returns ~1 at deepest night (m=0)', () => {
    const { eastL, westL } = getLighting(0);
    expect(getNightDepth(eastL, westL)).toBeCloseTo(1, 1);
  });

  it('is near its minimum around midday (m=48) — not zero because faces peak at different times', () => {
    const { eastL, westL } = getLighting(48);
    // East peaks at m=36, west at m=60; their average at m=48 is well below NIGHT_L
    // ceiling but never reaches PEAK_L simultaneously, so nightDepth is low but > 0.
    expect(getNightDepth(eastL, westL)).toBeLessThan(0.4);
  });

  it('is always in [0, 1]', () => {
    for (let m = 0; m < DAY_CYCLE_MEASURES; m++) {
      const { eastL, westL } = getLighting(m);
      const d = getNightDepth(eastL, westL);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });

  it('is higher in the evening/night than at midday', () => {
    const { eastL: eNoon, westL: wNoon } = getLighting(48);
    const { eastL: eNight, westL: wNight } = getLighting(0);
    expect(getNightDepth(eNight, wNight)).toBeGreaterThan(getNightDepth(eNoon, wNoon));
  });
});

// ========================================
// FLICKER_PERIOD
// ========================================

describe('FLICKER_PERIOD', () => {
  it('is a positive integer', () => {
    expect(Number.isInteger(FLICKER_PERIOD)).toBe(true);
    expect(FLICKER_PERIOD).toBeGreaterThan(0);
  });

  it('produces a new epoch every FLICKER_PERIOD measures', () => {
    const epoch0 = Math.floor(0 / FLICKER_PERIOD);
    const epochN = Math.floor(FLICKER_PERIOD / FLICKER_PERIOD);
    expect(epochN).toBe(epoch0 + 1);
  });
});