import { describe, it, expect } from 'vitest';
import { type HSL, hslToString, clamp, applyColorShift, boostLightness, type ColorShift } from './colorUtils';

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

    it('formats as hsla() when an alpha is supplied', () => {
      const hsl: HSL = { h: 180, s: 50, l: 25 };
      expect(hslToString(hsl, 0.6)).toBe('hsla(180, 50%, 25%, 0.6)');
    });

    it('handles alpha edge values 0 and 1', () => {
      const hsl: HSL = { h: 180, s: 50, l: 25 };
      expect(hslToString(hsl, 0)).toBe('hsla(180, 50%, 25%, 0)');
      expect(hslToString(hsl, 1)).toBe('hsla(180, 50%, 25%, 1)');
    });

    it('omits alpha entirely (stays hsl(), not hsla()) when alpha is not passed', () => {
      const hsl: HSL = { h: 180, s: 50, l: 25 };
      // Regression guard: existing callers (realWorldGradient.ts, etc.) must keep getting
      // byte-identical output when they don't opt into alpha.
      expect(hslToString(hsl)).toBe('hsl(180, 50%, 25%)');
      expect(hslToString(hsl)).not.toContain('hsla');
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

  describe('applyColorShift', () => {
    const baseColor: HSL = { h: 180, s: 50, l: 50 };
    const noShift: ColorShift = { hueShift: 0, satShift: 0 };

    it('applies no shift with neutral values', () => {
      const result = applyColorShift(baseColor, noShift, 1.0);
      expect(result).toBe('hsl(180, 50%, 50%)');
    });

    it('applies hue shift correctly', () => {
      const shift: ColorShift = { hueShift: 30, satShift: 0 };
      const result = applyColorShift(baseColor, shift, 1.0);
      expect(result).toBe('hsl(210, 50%, 50%)');
    });

    it('applies negative hue shift correctly', () => {
      const shift: ColorShift = { hueShift: -30, satShift: 0 };
      const result = applyColorShift(baseColor, shift, 1.0);
      expect(result).toBe('hsl(150, 50%, 50%)');
    });

    it('wraps hue around at 360 (positive overflow)', () => {
      const base: HSL = { h: 350, s: 50, l: 50 };
      const shift: ColorShift = { hueShift: 30, satShift: 0 };
      const result = applyColorShift(base, shift, 1.0);
      expect(result).toBe('hsl(20, 50%, 50%)');
    });

    it('wraps hue around at 0 (negative overflow)', () => {
      const base: HSL = { h: 10, s: 50, l: 50 };
      const shift: ColorShift = { hueShift: -30, satShift: 0 };
      const result = applyColorShift(base, shift, 1.0);
      expect(result).toBe('hsl(340, 50%, 50%)');
    });

    it('applies saturation shift correctly', () => {
      const shift: ColorShift = { hueShift: 0, satShift: 20 };
      const result = applyColorShift(baseColor, shift, 1.0);
      expect(result).toBe('hsl(180, 70%, 50%)');
    });

    it('clamps saturation at 0 (negative overflow)', () => {
      const base: HSL = { h: 180, s: 10, l: 50 };
      const shift: ColorShift = { hueShift: 0, satShift: -20 };
      const result = applyColorShift(base, shift, 1.0);
      expect(result).toBe('hsl(180, 0%, 50%)');
    });

    it('clamps saturation at 100 (positive overflow)', () => {
      const base: HSL = { h: 180, s: 90, l: 50 };
      const shift: ColorShift = { hueShift: 0, satShift: 20 };
      const result = applyColorShift(base, shift, 1.0);
      expect(result).toBe('hsl(180, 100%, 50%)');
    });

    it('applies lightness multiplier correctly', () => {
      const result = applyColorShift(baseColor, noShift, 0.8);
      expect(result).toBe('hsl(180, 50%, 40%)');
    });

    it('brightens with multiplier > 1', () => {
      const result = applyColorShift(baseColor, noShift, 1.2);
      expect(result).toBe('hsl(180, 50%, 60%)');
    });

    it('darkens with multiplier < 1', () => {
      const base: HSL = { h: 180, s: 50, l: 60 };
      const result = applyColorShift(base, noShift, 0.5);
      expect(result).toBe('hsl(180, 50%, 30%)');
    });

    it('applies all shifts simultaneously', () => {
      const base: HSL = { h: 200, s: 40, l: 30 };
      const shift: ColorShift = { hueShift: 15, satShift: 10 };
      const result = applyColorShift(base, shift, 1.5);
      expect(result).toBe('hsl(215, 50%, 45%)');
    });

    it('handles edge case: zero lightness multiplier', () => {
      const result = applyColorShift(baseColor, noShift, 0);
      expect(result).toBe('hsl(180, 50%, 0%)');
    });

    it('handles extreme hue shifts with multiple wraps', () => {
      const base: HSL = { h: 10, s: 50, l: 50 };
      const shift: ColorShift = { hueShift: 720, satShift: 0 };
      const result = applyColorShift(base, shift, 1.0);
      expect(result).toBe('hsl(10, 50%, 50%)');
    });
  });

  describe('boostLightness', () => {
    it('adds the boost to lightness, leaving hue/sat untouched', () => {
      const base: HSL = { h: 200, s: 15, l: 19 };
      expect(boostLightness(base, 20)).toEqual({ h: 200, s: 15, l: 39 });
    });

    it('is a no-op for a zero boost', () => {
      const base: HSL = { h: 200, s: 15, l: 19 };
      expect(boostLightness(base, 0)).toEqual(base);
    });

    it('clamps at 100 (positive overflow)', () => {
      const base: HSL = { h: 200, s: 15, l: 90 };
      expect(boostLightness(base, 30)).toEqual({ h: 200, s: 15, l: 100 });
    });

    it('clamps at 0 (negative boost, negative overflow)', () => {
      const base: HSL = { h: 200, s: 15, l: 10 };
      expect(boostLightness(base, -30)).toEqual({ h: 200, s: 15, l: 0 });
    });

    it('does not mutate the input object', () => {
      const base: HSL = { h: 200, s: 15, l: 19 };
      boostLightness(base, 20);
      expect(base).toEqual({ h: 200, s: 15, l: 19 });
    });
  });

});

