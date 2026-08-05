import type { Actor } from '../../types/Actor';
import { lerp } from '../../utils/math';

// ========================================
// TYPES
// ========================================

/**
 * Min/max bounds used to map a noise value in [0,1] to a concrete
 * pixel width and height via linear interpolation.
 */
export interface SizeRange {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

// ========================================
// EXPORTS
// ========================================

/**
 * Maps a noise value in [0,1] to a concrete pixel {width, height}
 * by linearly interpolating between the supplied min/max bounds.
 *
 * @param noiseValue - Normalised value in [0,1].
 * @param range - Min/max width and height bounds.
 * @returns Object with `width` and `height` in pixels.
 */
export function calcSilhouetteSize(
  noiseValue: number,
  range: SizeRange,
): { width: number; height: number } {
  const width = lerp(range.minWidth, range.maxWidth, noiseValue);
  const height = lerp(range.minHeight, range.maxHeight, noiseValue);
  return { width, height };
}

/**
 * Picks one of three fill values based on a noise value threshold.
 * Values below 0.4 → light; above 0.7 → dark; otherwise → base.
 *
 * @param noiseValue - Normalised value in [0,1].
 * @param colors - Object containing `light`, `base`, and `dark` fill strings.
 * @returns The selected fill string.
 */
export function pickSilhouetteFill(
  noiseValue: number,
  colors: { light: string; base: string; dark: string }
): string {
  if (noiseValue < 0.4) return colors.light;
  if (noiseValue > 0.7) return colors.dark;
  return colors.base;
}

/**
 * Builds an SVG `translate(x, y)` transform string that anchors the bottom
 * of a building silhouette to `actor.position.y`, accounting for `scaleY`.
 *
 * @param actor - The factory actor supplying position and optional scale.
 * @param height - Unscaled pixel height of the silhouette.
 * @returns SVG transform string, e.g. `"translate(400, 540)"`.
 */
export function bottomAnchorTransform(actor: Actor, height: number): string {
  const x = actor.position.x;
  const sy = actor.scaleY ?? 1;
  const y = Math.round(actor.position.y - height * sy);
  return `translate(${x}, ${y})`;
}

/**
 * Dev-time assertion to ensure internal SVG coordinates are in the 0..100 viewBox range.
 * This helps catch accidental mixing of pixel/native coordinate math with viewBox units.
 */
export function assertInViewBox(value: number, name = 'coord') {
  // `import.meta.env.DEV` is Vite-specific and will be truthy in dev/test runs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.DEV) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`SVG viewBox coord out of range [0,100]: ${name} = ${value}`);
    }
  }
}


