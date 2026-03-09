import { describe, it, expect } from 'vitest';

import { getVariantFromNoise, selectVariantFromSeed, VARIANT_CONF } from './factoryVariants';
import type { FactoryVariant } from './factoryVariants';

describe('Factory variant selection', () => {
  it('maps noise value to correct variant using default list', () => {
    const available: FactoryVariant[] = ['Monolith', 'Stacks', 'Refinery'];
    expect(getVariantFromNoise(0.1, 1, available)).toBe('Monolith');
    expect(getVariantFromNoise(0.6, 1, available)).toBe('Stacks');
    expect(getVariantFromNoise(0.9, 1, available)).toBe('Refinery');
  });

  it('weights variants according to provided order', () => {
    const available: FactoryVariant[] = ['Refinery', 'Stacks', 'Monolith'];
    expect(getVariantFromNoise(0.1, 1, available)).toBe('Refinery');
    expect(getVariantFromNoise(0.6, 1, available)).toBe('Stacks');
    expect(getVariantFromNoise(0.95, 1, available)).toBe('Monolith');
  });

  it('is deterministic for a given seed and x position', () => {
    const a = selectVariantFromSeed('seed-123', 240);
    const b = selectVariantFromSeed('seed-123', 240);
    expect(a.variant).toBe(b.variant);
    expect(a.scale).toBeCloseTo(b.scale, 6);
    expect(a.noiseValue).toBeCloseTo(b.noiseValue, 6);
  });

  it('varies with different seeds or positions', () => {
    const s1 = selectVariantFromSeed('seed-abc', 100);
    const s2 = selectVariantFromSeed('seed-def', 100);
    const s3 = selectVariantFromSeed('seed-abc', 200);

    // At least one difference expected across seeds/positions
    expect(s1.variant === s2.variant && s1.noiseValue === s2.noiseValue).toBe(false);
    expect(s1.variant === s3.variant && s1.noiseValue === s3.noiseValue).toBe(false);
  });

  it('all variants define the new config schema', () => {
    for (const key of Object.keys(VARIANT_CONF) as FactoryVariant[]) {
      const v = VARIANT_CONF[key];
      expect(v).toHaveProperty('sizeRange');
      expect(v.sizeRange).toHaveProperty('minWidth');
      expect(v.sizeRange).toHaveProperty('maxHeight');
      expect(v).toHaveProperty('colors');
      expect(v.colors).toHaveProperty('body');
      expect(v.colors).toHaveProperty('accent');
      expect(v.colors).toHaveProperty('greeble');
      expect(v.colors).toHaveProperty('illuminated');
      expect(v).toHaveProperty('colorRanges');
      expect(Array.isArray(v.colorRanges.hueShiftRange)).toBe(true);
      expect(typeof v.frontCornerX).toBe('number');
      // greebleConfig now contains rooftop/facade pools
      expect(v).toHaveProperty('greebleConfig');
      const gc = v.greebleConfig;
      expect(Array.isArray(gc.allowedRooftop)).toBe(true);
      expect(Array.isArray(gc.allowedFacade)).toBe(true);
      expect(gc.maxRooftop).toBe(1);

      // character-specific pools (spot check)
      if (key === 'Monolith') {
        expect(gc.allowedRooftop).toEqual(expect.arrayContaining(['steppeRoof', 'machinery']));
      }
      if (key === 'Stacks') {
        expect(gc.allowedFacade).toEqual(expect.arrayContaining(['tallWindows']));
        expect(typeof gc.maxBeltCourses).toBe('number');
      }

      // old path-based fields should no longer exist
      expect(v).not.toHaveProperty('pathD');
      expect(v).not.toHaveProperty('bodyClipPath');
    }
  });

  it('all variants define maxBeltCourses as a number in greebleConfig', () => {
    for (const key of Object.keys(VARIANT_CONF) as FactoryVariant[]) {
      const gc = VARIANT_CONF[key].greebleConfig;
      expect(typeof gc.maxBeltCourses).toBe('number');
      expect(gc.maxBeltCourses).toBeGreaterThanOrEqual(0);
    }
  });

  it('selectVariantFromSeed returns beltCourseCount within [0..maxBeltCourses]', () => {
    // Test many seeds to exercise the PRNG range
    const seeds = ['seed-a', 'seed-b', 'seed-c', 'seed-d', 'seed-e'];
    for (const seed of seeds) {
      const result = selectVariantFromSeed(seed, 500);
      const maxBeltCourses = VARIANT_CONF[result.variant].greebleConfig.maxBeltCourses;
      expect(result.beltCourseCount).toBeGreaterThanOrEqual(0);
      expect(result.beltCourseCount).toBeLessThanOrEqual(maxBeltCourses);
    }
  });

  it('beltCourseCount is deterministic for the same seed', () => {
    const a = selectVariantFromSeed('det-seed-42', 300);
    const b = selectVariantFromSeed('det-seed-42', 300);
    expect(a.beltCourseCount).toBe(b.beltCourseCount);
  });
});