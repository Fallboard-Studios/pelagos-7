// ========================================
// IMPORTS
// ========================================
import Alea from 'alea';
import { createNoise2D } from 'simplex-noise';
import colorTheme from '../../constants/colorTheme.json';
import type { HSL } from '../../utils/colorUtils';
import { lerp } from '../../utils/math';
import type { RooftopGreeble, FacadeGreeble } from './greebles/greebleTypes';


// ========================================
// TYPES
// ========================================

/**
 * Visual silhouette archetypes available for factory buildings.
 * Determines the base size range, colour palette, and greeble pools.
 */
export type FactoryVariant = 'Monolith' | 'Stacks' | 'Refinery' | 'Skyscraper' | 'Warehouse';

/**
 * High-level operational purpose assigned to each factory variant.
 * Gates which animations, bubble-vent effects, and offline visuals apply.
 */
export type FactoryPurpose =
  | 'heavyIndustry'
  | 'chemicalProcessing'
  | 'pipeWorks'
  | 'observationComms'
  | 'storageLogistics';

// ========================================
// CONSTANTS
// ========================================

/**
 * Per-variant configuration table. Each entry fully describes the visual
 * character of one factory variant — sizes, HSL base colors, per-instance
 * color-shift ranges, and the greeble pools that govern procedural decoration.
 *
 * Key schema fields (see docs/BUILDING_DESIGN.md §VariantConfig for full spec):
 *
 * - `sizeRange`     — lerp bounds for width/height; maps noise value → pixel size.
 * - `colors`        — four HSL slots (body, accent, greeble, illuminated) used
 *                     by renderers via `applyColorShift()`. No hex strings.
 * - `colorRanges`   — PRNG bounds for per-instance hue/sat shifts. Ranges may be
 *                     inverted (e.g. `[-45, -90]`) — `Math.min/max` is used to
 *                     resolve the actual interval at test/validation time.
 * - `greebleConfig` — greeble pool arrays and belt course maximum.
 * - `frontCornerX`  — kept in schema as a fallback; runtime value is overridden
 *                     by `selectVariantFromSeed` which generates a per-instance
 *                     random split in the range 25–75.
 */
export const VARIANT_CONF: Record<FactoryVariant, {
  // size range replaced nativeSizes
  sizeRange: { minWidth: number; maxWidth: number; minHeight: number; maxHeight: number };

  // colour slots now HSL
  colors: {
    body: HSL;
    accent: HSL;
    greeble: HSL;
    illuminated: HSL;
  };

  // per-instance shift ranges
  colorRanges: { hueShiftRange: [number, number]; satShiftRange: [number, number] };

  greebleConfig: {
    allowedRooftop: RooftopGreeble[];
    allowedFacade: FacadeGreeble[];
    maxRooftop?: number;
    /** Max belt courses for this variant; 0 means none. */
    maxBeltCourses: number;
  };
  purpose: FactoryPurpose;
  frontCornerX: number; // 0-100 horizontal split
}> = {
  Monolith: {
    purpose: 'heavyIndustry',
    sizeRange: { minWidth: 120, maxWidth: 180, minHeight: 200, maxHeight: 300 },
    colors: {
      body: colorTheme.body.base,
      accent: colorTheme.body.highlight,
      greeble: colorTheme.vent.base,
      illuminated: { h: colorTheme.vent.shadow.h, s: colorTheme.vent.shadow.s, l: Math.min(colorTheme.vent.shadow.l + 30, 100) },
    },
    colorRanges: { hueShiftRange: [-15, 15], satShiftRange: [40, 60] },
    greebleConfig: { allowedRooftop: ['steppeRoof', 'machinery', 'pipesValves'], allowedFacade: ['squareWindows', 'pipesValves'], maxRooftop: 1, maxBeltCourses: 2 },
    frontCornerX: 50,
  },
  Stacks: {
    purpose: 'chemicalProcessing',
    sizeRange: { minWidth: 480, maxWidth: 520, minHeight: 160, maxHeight: 180 },
    colors: {
      body: colorTheme.body.base,
      accent: colorTheme.shell.highlight,
      greeble: colorTheme.vent.shadow,
      illuminated: { h: colorTheme.vent.shadow.h, s: colorTheme.vent.shadow.s, l: Math.min(colorTheme.vent.shadow.l + 30, 100) },
    },
    colorRanges: { hueShiftRange: [-15, 15], satShiftRange: [-60, -40] },
    greebleConfig: { allowedRooftop: ['machinery', 'pipesValves'], allowedFacade: ['tallWindows', 'wideWindows', 'pipesValves'], maxRooftop: 1, maxBeltCourses: 1 },
    frontCornerX: 50,
  },
  Refinery: {
    purpose: 'pipeWorks',
    sizeRange: { minWidth: 176, maxWidth: 264, minHeight: 160, maxHeight: 240 },
    colors: {
      body: colorTheme.body.base,
      accent: colorTheme.shell.base,
      greeble: colorTheme.vent.shadow,
      illuminated: { h: colorTheme.vent.shadow.h, s: colorTheme.vent.shadow.s, l: Math.min(colorTheme.vent.shadow.l + 30, 100) },
    },
    colorRanges: { hueShiftRange: [60, 150], satShiftRange: [-35, 20] },
    greebleConfig: { allowedRooftop: ['machinery', 'antennae', 'pipesValves'], allowedFacade: ['wideWindows', 'pipesValves'], maxRooftop: 1, maxBeltCourses: 1 },
    frontCornerX: 50,
  },
  Skyscraper: {
    purpose: 'observationComms',
    sizeRange: { minWidth: 160, maxWidth: 240, minHeight: 440, maxHeight: 660 },
    colors: {
      body: colorTheme.body.base,
      accent: colorTheme.shell.base,
      greeble: colorTheme.vent.shadow,
      illuminated: { h: colorTheme.vent.shadow.h, s: colorTheme.vent.shadow.s, l: Math.min(colorTheme.vent.shadow.l + 30, 100) },
    },
    colorRanges: { hueShiftRange: [-120, 120], satShiftRange: [0, 30] },
    greebleConfig: { allowedRooftop: ['pitchedRoof', 'crownSpire', 'antennae', 'pipesValves'], allowedFacade: ['tallWindows', 'pipesValves'], maxRooftop: 1, maxBeltCourses: 3 },
    frontCornerX: 50,
  },
  Warehouse: {
    purpose: 'storageLogistics',
    sizeRange: { minWidth: 160, maxWidth: 240, minHeight: 240, maxHeight: 360 },
    colors: {
      body: colorTheme.body.base,
      accent: colorTheme.body.base,
      greeble: colorTheme.body.base,
      illuminated: { h: colorTheme.body.base.h, s: colorTheme.body.base.s, l: Math.min(colorTheme.body.base.l + 30, 100) },
    },
    colorRanges: { hueShiftRange: [45, 60], satShiftRange: [-30, 20] },
    greebleConfig: { allowedRooftop: ['crownSpire', 'pipesValves'], allowedFacade: ['squareWindows', 'pipesValves'], maxRooftop: 1, maxBeltCourses: 0 },
    frontCornerX: 50,
  },
};

// ========================================
// EXPORTS
// ========================================

/**
 * Maps a noise value (0..1) to a FactoryVariant, respecting the
 * `availableTypes` allow-list. Variants are weighted by index order —
 * earlier entries receive a larger share of the noise range.
 *
 * @param noiseValue    - Simplex noise output normalised to [0, 1].
 * @param _row          - Depth row; reserved for future row-specific variant
 *                        constraints, currently unused.
 * @param availableTypes - Ordered subset of variants to select from.
 * @returns The resolved FactoryVariant for this noise position.
 */
export function getVariantFromNoise(
  noiseValue: number,
  _row: number,
  availableTypes: FactoryVariant[] = ['Monolith', 'Stacks', 'Refinery', 'Skyscraper', 'Warehouse'],
): FactoryVariant {
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
}

/**
 * Deterministic variant selection driven by actor id + x position.
 * Consumes a reproducible PRNG sequence (Alea seeded by `actorId`) to derive
 * **all** per-instance values in a single pass, so spawn order doesn't affect
 * any individual value.
 *
 * PRNG draw order (must not be changed without updating tests):
 *   1. `noiseValue`      — simplex noise at (x/100, 0)
 *   2. `scale`           — 0.8–1.2 uniform
 *   3. `hueShift`        — lerp across variant `hueShiftRange`
 *   4. `satShift`        — lerp across variant `satShiftRange`
 *   5. `rooftopGreeble`  — uniform pick from `allowedRooftop`
 *   6. `facadeGreeble`   — uniform pick from `allowedFacade`
 *   7. `beltCourseCount` — uniform integer in `[0 .. maxBeltCourses]`
 *   8. `frontCornerX`    — uniform integer in `[25 .. 75]`
 *
 * See docs/BUILDING_DESIGN.md §ProceduralGeneration for the full rationale.
 *
 * @param actorId        - Unique actor id used as the PRNG seed.
 * @param x              - World x position used for simplex noise sampling.
 * @param row            - Depth row forwarded to `getVariantFromNoise`.
 * @param availableTypes - Optional allow-list passed to `getVariantFromNoise`.
 * @returns Immutable object containing all per-instance derived values.
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

  // Generate per-instance color shifts from variant's allowed ranges
  const colorRanges = VARIANT_CONF[variant].colorRanges;
  const hueShift = lerp(colorRanges.hueShiftRange[0], colorRanges.hueShiftRange[1], prng());
  const satShift = lerp(colorRanges.satShiftRange[0], colorRanges.satShiftRange[1], prng());

  // choose rooftop/facade greebles deterministically
  const gcfg = VARIANT_CONF[variant].greebleConfig;
  const rooftopPool = gcfg.allowedRooftop || [];
  const facadePool = gcfg.allowedFacade || [];
  const rooftopGreeble = rooftopPool.length
    ? rooftopPool[Math.floor(prng() * rooftopPool.length)]
    : undefined;
  const facadeGreeble = facadePool.length
    ? facadePool[Math.floor(prng() * facadePool.length)]
    : undefined;

  // uniform pick in [0 .. maxBeltCourses]
  const maxBeltCourses = gcfg.maxBeltCourses ?? 0;
  const beltCourseCount = maxBeltCourses === 0 ? 0 : Math.floor(prng() * (maxBeltCourses + 1));

  // random east/west split point: 25-75 in 0-100 normalised SVG space
  const frontCornerX = 25 + Math.floor(prng() * 51);

  // purpose is purely derived from the variant, but we include it here so
  // callers (e.g. createFactory) can stash it in Actor.config in one pass.
  return { variant, scale, noiseValue, hueShift, satShift, rooftopGreeble, facadeGreeble, beltCourseCount, frontCornerX, purpose: VARIANT_CONF[variant].purpose } as const;
}
