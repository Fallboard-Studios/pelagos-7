import { useMemo } from 'react';
import Alea from 'alea';
import { createNoise2D } from 'simplex-noise';

import type { Actor } from '../../types/Actor';

export const SVG_VIEWBOX = '0 0 100 100';
export const SVG_PRESERVE_ASPECT = 'xMidYMax meet';

export function calcSilhouetteSize(
  noiseValue: number,
  nativeSizes: { width: number; height: number },
  baseScale = 1
) {
  // baseScale applies uniformly to native sizes
  const baseW = nativeSizes.width * baseScale;
  const baseH = nativeSizes.height * baseScale;

  const width = noiseValue * nativeSizes.width + baseW;
  const height = noiseValue * nativeSizes.height + baseH;

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
 * The bodyClipPath in Building.tsx masks cells outside the silhouette shape.
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
  // Anchor the bottom of the silhouette to actor.position.y
  const x = actor.position.x;
  const y = Math.round(actor.position.y - height);
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
  baseScale?: number;
  colors: { light: string; base: string; dark: string };
  actor: Actor;
  greebleConfig?: {
    cols: number;
    rows: number;
  };
}): SilhouetteResult {
  const { noiseValue, nativeSizes, baseScale = 1, colors, actor, greebleConfig } = props;

  // Extract primitives so useMemo only re-runs when actual values change,
  // not whenever parent creates a new object literal (e.g. on every Zustand tick)
  const nativeWidth = nativeSizes.width;
  const nativeHeight = nativeSizes.height;
  const colorLight = colors.light;
  const colorBase = colors.base;
  const colorDark = colors.dark;
  const actorX = actor.position.x;
  const actorY = actor.position.y;
  const cols = greebleConfig?.cols;
  const rows = greebleConfig?.rows;

  return useMemo(() => {
    const sizes = { width: nativeWidth, height: nativeHeight };
    const clrs = { light: colorLight, base: colorBase, dark: colorDark };
    const { width, height } = calcSilhouetteSize(noiseValue, sizes, baseScale);
    const fill = pickSilhouetteFill(noiseValue, clrs);
    const greebleFill = pickSilhouetteGreebleFill(noiseValue, clrs);
    const transform = `translate(${actorX}, ${Math.round(actorY - height)})`;
    const result: SilhouetteResult = { width, height, fill, greebleFill, transform };
    if (cols && rows) {
      result.greebles = generateGreebleRects(noiseValue, cols, rows);
    }
    return result;
  }, [noiseValue, nativeWidth, nativeHeight, baseScale, colorLight, colorBase, colorDark, actorX, actorY, cols, rows]);
}
