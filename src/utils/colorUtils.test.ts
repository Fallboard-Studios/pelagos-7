import { describe, it, expect } from 'vitest';
import { HSL, hslToString, clamp } from './colorUtils';

describe('colorUtils', () => {
  describe('hslToString', () => {
    it('formats values correctly', () => {
      const hsl: HSL = { h: 180, s: 50, l: 25 };
      expect(hslToString(hsl)).toBe('hsl(180, 50%, 25%)');
    });

    it('handles edge values', () => {
      expect(hslToString({ h: 0, s: 0, l: 0 })).toBe('hsl(0, 0%, 0%)');
      expect(hslToString({ h: 360, s: 100, l: 100 })).toBe('hsl(360, 100%, 100%)');
    });
  });

  describe('clamp', () => {
    it('returns input when within bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('clamps to min', () => {
      expect(clamp(-1, 0, 10)).toBe(0);
    });

    it('clamps to max', () => {
      expect(clamp(11, 0, 10)).toBe(10);
    });

    it('handles swapped bounds by swapping them internally', () => {
      // clamp(5,10,0) should behave like clamp(5,0,10)
      expect(clamp(5, 10, 0)).toBe(5);
      expect(clamp(-1, 10, 0)).toBe(0);
      expect(clamp(11, 10, 0)).toBe(10);
    });
  });
});