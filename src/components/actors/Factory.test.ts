import { describe, it, expect } from 'vitest';

import { getVariantFromNoise, selectVariantFromSeed } from './factoryVariants';
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
});
