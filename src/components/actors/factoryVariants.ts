import Alea from 'alea';
import { createNoise2D } from 'simplex-noise';
import colorTheme from '../../constants/colorTheme.json';


// FactoryVariant and configuration moved here to centralize variant data
export type FactoryVariant = 'Monolith' | 'Stacks' | 'Refinery' | 'Skyscraper' | 'Warehouse';


// configuration for each variant; values copied from the old individual components
export const VARIANT_CONF: Record<FactoryVariant, {
  nativeSizes: { width: number; height: number };
  colors: { light: string; base: string; dark: string };
  greebleConfig: { cols: number; rows: number };
  pathD: string;
  bodyClipPath?: string;
}> = {
  Monolith: {
    nativeSizes: { width: 150, height: 250 },
    colors: {
      light: colorTheme.vent.shadow,
      base: colorTheme.shell.base,
      dark: colorTheme.body.shadow,
    },
    greebleConfig: { cols: 2, rows: 3 },
    pathD: 'M20,100 V20 L50,0 L80,20 V100 Z',
    // inset by ~3px to keep rects away from silhouette edges
    bodyClipPath: 'M23,97 V23 L50,3 L77,23 V97 Z',
  },
  Stacks: {
    nativeSizes: { width: 200, height: 210 },
    colors: {
      light: colorTheme.vent.shadow,
      base: colorTheme.body.base,
      dark: colorTheme.body.highlight,
    },
    greebleConfig: { cols: 6, rows: 2 },
    pathD: 'M0,100 V40 H20 V0 H40 V40 H60 V0 H80 V40 H100 V100 Z',
    // inset contours to give padding around stacks
    bodyClipPath: 'M3,97 V43 H23 V3 H43 V43 H63 V3 H83 V43 H97 V97 Z',
  },
  Refinery: {
    nativeSizes: { width: 220, height: 200 },
    colors: {
      light: colorTheme.vent.shadow,
      base: colorTheme.body.base,
      dark: colorTheme.shell.shadow,
    },
    greebleConfig: { cols: 5, rows: 3 },
    pathD: 'M0,100 V60 H30 V40 H70 V60 H100 V100 Z',
    // keep greebles off the outermost edge
    bodyClipPath: 'M3,97 V63 H33 V43 H67 V63 H97 V97 Z',
  },
  Skyscraper: {
    nativeSizes: { width: 200, height: 550 },
    colors: {
      light: colorTheme.vent.shadow,
      base: colorTheme.body.base,
      dark: colorTheme.shell.shadow,
    },
    greebleConfig: { cols: 4, rows: 16 },
    pathD: 'M20,100 V20 L50,0 L80,20 V100 Z',
    // inset by ~3px to keep rects away from silhouette edges
    bodyClipPath: 'M23,97 V23 L50,3 L77,23 V97 Z',
  },
  Warehouse: {
    nativeSizes: { width: 200, height: 300 },
    colors: {
      light: colorTheme.body.base,
      base: colorTheme.body.base,
      dark: colorTheme.body.base,
    },
    greebleConfig: { cols: 6, rows: 2 },
    // simple square footprint
    pathD: 'M0,100 L0,0 L100,0 L100,100 Z',
    // inset square clip
    bodyClipPath: 'M3,97 V3 H97 V97 Z',
  },
};



/**
 * Deterministic mapping from raw noise value -> silhouette variant
 * Exported for unit tests.
 */
export function getVariantFromNoise(
  noiseValue: number,
  row: number,
  availableTypes: FactoryVariant[] = ['Monolith', 'Stacks', 'Refinery', 'Skyscraper', 'Warehouse'],
): FactoryVariant {
  // if caller provided an ordered list, weight variants based on order
  if (availableTypes && availableTypes.length > 0) {
    const n = availableTypes.length;
    const total = (n * (n + 1)) / 2; // sum of 1..n
    let cumulative = 0;
    for (let i = 0; i < n; i++) {
      cumulative += (n - i) / total;
      if (noiseValue < cumulative) {
        return availableTypes[i];
      }
    }
    return availableTypes[n - 1];
  } else {
    if (noiseValue < 0.2) return 'Monolith';
    if (noiseValue < 0.65) return 'Stacks';
    if (noiseValue < 0.75) return 'Skyscraper';
    if (noiseValue < 0.95) return 'Refinery';
    return 'Warehouse';
  }

}

/**
 * Deterministic selection from seed (actorId) + x position.
 * Returns variant, scale (0.8-1.2) and raw noise value.
 */
export function selectVariantFromSeed(
  actorId: string,
  x = 0,
  row: number = 1,
  availableTypes?: FactoryVariant[],
) {
  const prng = Alea(actorId);
  const noise2D = createNoise2D(prng);
  const noiseValue = (noise2D(x / 100, 0) + 1) / 2; // Normalize to [0,1]
  const variant = getVariantFromNoise(noiseValue, row, availableTypes);
  const scale = 0.8 + prng() * 0.4; // 0.8-1.2
  return { variant, scale, noiseValue } as const;
}
