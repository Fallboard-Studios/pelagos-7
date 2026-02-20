import { describe, it, expect } from 'vitest';

import { getVariantFromNoise, selectVariantFromSeed } from './factoryVariants';

describe('Factory variant selection', () => {
  it('maps noise value to correct variant', () => {
    expect(getVariantFromNoise(0.1)).toBe('Monolith');
    expect(getVariantFromNoise(0.3)).toBe('Stacks');
    expect(getVariantFromNoise(0.8)).toBe('Refinery');
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
