import Alea from 'alea';
import { createNoise2D } from 'simplex-noise';

import type { FactoryVariant } from './Building';

/**
 * Deterministic mapping from raw noise value -> silhouette variant
 * Exported for unit tests.
 */
export function getVariantFromNoise(noiseValue: number): FactoryVariant {
  if (noiseValue < 0.2) return 'Monolith';
  if (noiseValue < 0.65) return 'Stacks';
  return 'Refinery';
}

/**
 * Deterministic selection from seed (actorId) + x position.
 * Returns variant, scale (0.8-1.2) and raw noise value.
 */
export function selectVariantFromSeed(actorId: string, x = 0) {
  const prng = Alea(actorId);
  const noise2D = createNoise2D(prng);
  const noiseValue = noise2D(x / 100, 0) + 1 / 2; // Normalize to [0,1] for easier thresholding and interpretation
  const variant = getVariantFromNoise(noiseValue);
  const scale = 0.8 + prng() * 0.4; // 0.8-1.2
  return { variant, scale, noiseValue } as const;
}
