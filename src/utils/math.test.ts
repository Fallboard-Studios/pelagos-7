// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import { lerp } from './math';

// ========================================
// TEST SUITE
// ========================================
describe('math utilities', () => {
  describe('lerp', () => {
    it('returns start value when t = 0', () => {
      expect(lerp(10, 20, 0)).toBe(10);
      expect(lerp(-5, 5, 0)).toBe(-5);
    });

    it('returns end value when t = 1', () => {
      expect(lerp(10, 20, 1)).toBe(20);
      expect(lerp(-5, 5, 1)).toBe(5);
    });

    it('returns midpoint when t = 0.5', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
      expect(lerp(10, 30, 0.5)).toBe(20);
    });

    it('interpolates correctly for arbitrary t values', () => {
      expect(lerp(0, 100, 0.25)).toBe(25);
      expect(lerp(0, 100, 0.75)).toBe(75);
      expect(lerp(50, 150, 0.2)).toBe(70);
    });

    it('handles negative ranges', () => {
      expect(lerp(-10, -5, 0.5)).toBe(-7.5);
      expect(lerp(-100, 100, 0.5)).toBe(0);
    });

    it('works with identical start and end values', () => {
      expect(lerp(42, 42, 0)).toBe(42);
      expect(lerp(42, 42, 0.5)).toBe(42);
      expect(lerp(42, 42, 1)).toBe(42);
    });

    it('extrapolates correctly outside [0,1] range', () => {
      // t < 0
      expect(lerp(0, 10, -0.5)).toBe(-5);
      // t > 1
      expect(lerp(0, 10, 1.5)).toBe(15);
    });
  });
});
