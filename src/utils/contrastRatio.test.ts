import { describe, it, expect } from 'vitest';

import { hslToRgb, relativeLuminance, contrastRatio, blendOverBackground, type RGB } from './contrastRatio';

describe('hslToRgb', () => {
  it('converts hsl(0, 0%, 0%) to black', () => {
    expect(hslToRgb(0, 0, 0)).toEqual([0, 0, 0]);
  });

  it('converts hsl(0, 0%, 100%) to white', () => {
    expect(hslToRgb(0, 0, 100)).toEqual([255, 255, 255]);
  });

  it('converts pure red hsl(0, 100%, 50%) to [255, 0, 0]', () => {
    expect(hslToRgb(0, 100, 50)).toEqual([255, 0, 0]);
  });

  it('converts pure green hsl(120, 100%, 50%) to [0, 255, 0]', () => {
    expect(hslToRgb(120, 100, 50)).toEqual([0, 255, 0]);
  });

  it('converts pure blue hsl(240, 100%, 50%) to [0, 0, 255]', () => {
    expect(hslToRgb(240, 100, 50)).toEqual([0, 0, 255]);
  });

  it('wraps hues outside 0-360 the same as their normalized equivalent', () => {
    expect(hslToRgb(720, 100, 50)).toEqual(hslToRgb(0, 100, 50));
    expect(hslToRgb(-120, 100, 50)).toEqual(hslToRgb(240, 100, 50));
  });
});

describe('relativeLuminance', () => {
  it('is 0 for black', () => {
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
  });

  it('is 1 for white', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black vs white (the maximum possible ratio)', () => {
    const black: RGB = [0, 0, 0];
    const white: RGB = [255, 255, 255];
    expect(contrastRatio(black, white)).toBeCloseTo(21, 1);
  });

  it('is 1 for a color against itself', () => {
    const gray: RGB = [128, 64, 200];
    expect(contrastRatio(gray, gray)).toBeCloseTo(1, 5);
  });

  it('is order-independent (foreground/background swap gives the same ratio)', () => {
    const a: RGB = [10, 20, 30];
    const b: RGB = [200, 210, 220];
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });
});

describe('blendOverBackground', () => {
  it('returns the foreground unchanged at full opacity (alpha = 1)', () => {
    const white: RGB = [255, 255, 255];
    const bg: RGB = [10, 20, 30];
    expect(blendOverBackground(white, 1, bg)).toEqual([255, 255, 255]);
  });

  it('returns the background unchanged at zero opacity (alpha = 0)', () => {
    const fg: RGB = [255, 0, 0];
    const bg: RGB = [10, 20, 30];
    expect(blendOverBackground(fg, 0, bg)).toEqual([10, 20, 30]);
  });

  it('averages evenly at alpha = 0.5', () => {
    const fg: RGB = [200, 200, 200];
    const bg: RGB = [0, 0, 0];
    expect(blendOverBackground(fg, 0.5, bg)).toEqual([100, 100, 100]);
  });
});
