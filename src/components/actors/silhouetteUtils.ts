import { useMemo } from 'react';
import Alea from 'alea';
import { createNoise2D } from 'simplex-noise';

import type { Actor } from '../../types/Actor';

export const SVG_VIEWBOX = '0 0 100 100';
export const SVG_PRESERVE_ASPECT = 'xMidYMax meet';

/**
 * Shift a hex color's brightness based on noiseValue.
 * noiseValue (0-1) maps to brightness multiplier (0.85-1.15) for ±15% variation.
 * Returns a similar but slightly varied shade of the input color.
 */
export function shiftColorByNoise(hexColor: string, noiseValue: number): string {
  // Parse hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Apply brightness shift based on noiseValue (0.85 to 1.15 range = ±15%)
  const brightnessMultiplier = 0.5 + noiseValue * 1.5;
  const rNew = Math.round(Math.min(255, r * brightnessMultiplier));
  const gNew = Math.round(Math.min(255, g * brightnessMultiplier));
  const bNew = Math.round(Math.min(255, b * brightnessMultiplier));

  // Convert back to hex
  const toHex = (val: number) => val.toString(16).padStart(2, '0');
  return `#${toHex(rNew)}${toHex(gNew)}${toHex(bNew)}`;
}

export function calcSilhouetteSize(
  noiseValue: number,
  nativeSizes: { width: number; height: number },
) {

  const width = noiseValue * nativeSizes.width / 2 + nativeSizes.width * 0.85; // Ensure a minimum width of 50% native size
  const height = noiseValue * nativeSizes.height / 2 + nativeSizes.height * 0.85; // Ensure a minimum height of 50% native size

  return { width, height };
}

export function pickSilhouetteFill(
  noiseValue: number,
  colors: { light: string; base: string; dark: string }
) {
  if (noiseValue < 0.4) return colors.light;
  if (noiseValue > 0.7) return colors.dark;
  return colors.base;
}

export function pickSilhouetteGreebleFill(
  noiseValue: number,
  colors: { light: string; base: string; dark: string }
) {
  if (noiseValue < 0.4) return colors.base;
  if (noiseValue > 0.7) return colors.light;
  return colors.dark;
}

/**
 * Generate non-overlapping rectangles positions for decorations.
 * x positions are random but spaced by at least minGap (4px width + 2px gap).
 * y positions distributed across specified rows.
/**
 * Generate a full cols×rows grid of window positions in SVG viewBox space (0–100).
 * Every cell always renders; opacity is driven by simplex noise at (col, row).
 * The bodyClipPath in Factory.tsx masks cells outside the silhouette shape.
 */
export function generateGreebleRects(
  noiseValue: number,
  cols: number,
  rows: number,
): Array<{ x: number; y: number; opacity: number }> {
  const noise2D = createNoise2D(Alea(String(noiseValue)));
  const xSpacing = 100 / (cols + 1);
  const ySpacing = 100 / (rows + 1);

  return Array.from({ length: cols * rows }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = xSpacing * (col + 1);
    const y = ySpacing * (row + 1);
    // Map noise [-1, 1] → opacity [0.1, 0.9]; threshold below 0.5 to 0 (window absent)
    const raw = ((noise2D(col, row) + 1) / 2) * 0.8 + 0.1;
    const opacity = raw < 0.5 ? 0 : raw;
    return { x, y, opacity };
  });
}

export function bottomAnchorTransform(actor: Actor, height: number) {
  // Anchor the bottom of the silhouette to actor.position.y.  Respect
  // vertical scaling so callers don't have to remember to multiply.
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
  // Guard so this only runs in development
  // `import.meta.env.DEV` is Vite-specific and will be truthy in dev/test runs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.DEV) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`SVG viewBox coord out of range [0,100]: ${name} = ${value}`);
    }
  }
}

export interface SilhouetteResult {
  width: number;
  height: number;
  fill: string;
  greebleFill: string;
  transform: string;
  greebles?: Array<{ x: number; y: number; opacity: number }>;
}

export function useSilhouette(props: {
  noiseValue: number;
  nativeSizes: { width: number; height: number };
  colors: { light: string; base: string; dark: string };
  actor: Actor;
  greebleConfig?: {
    cols: number;
    rows: number;
  };
}): SilhouetteResult {
  const { noiseValue, nativeSizes, colors, actor, greebleConfig } = props;

  // Extract primitives so useMemo only re-runs when actual values change,
  // not whenever parent creates a new object literal (e.g. on every Zustand tick)
  const nativeWidth = nativeSizes.width;
  const nativeHeight = nativeSizes.height;
  const colorLight = shiftColorByNoise(colors.light, noiseValue);
  const colorBase = shiftColorByNoise(colors.base, noiseValue);
  const colorDark = shiftColorByNoise(colors.dark, noiseValue);
  const actorX = actor.position.x;
  const actorY = actor.position.y;
  const cols = greebleConfig?.cols;
  const rows = greebleConfig?.rows;

  return useMemo(() => {
    const sizes = { width: nativeWidth, height: nativeHeight };
    const clrs = { light: colorLight, base: colorBase, dark: colorDark };
    const { width, height } = calcSilhouetteSize(noiseValue, sizes);
    const fill = pickSilhouetteFill(noiseValue, clrs);
    const greebleFill = pickSilhouetteGreebleFill(noiseValue, clrs);
    // subtract computed height so the bottom of every building lands at actorY;
    // also factor in actor-scale so the translation matches the rendered size.
    const sy = actor.scaleY ?? 1;
    const scaledHeight = Math.round(height * sy);
    const transform = `translate(${actorX}, ${Math.round(actorY - scaledHeight)})`;
    const result: SilhouetteResult = { width, height, fill, greebleFill, transform };
    if (cols && rows) {
      result.greebles = generateGreebleRects(noiseValue, cols, rows);
    }
    return result;
  }, [noiseValue, nativeWidth, nativeHeight, colorLight, colorBase, colorDark, actorX, actorY, cols, rows, actor.scaleY]);
}
