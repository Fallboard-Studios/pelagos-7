/**
 * Pure voxel-track math shared by SliderLinear (roadmap 11.1.3) and its two
 * thin follow-ups, SliderLog/SliderCenteredZero (11.1.4/11.1.5) — no DOM, no
 * GSAP, no React. See docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.5,
 * §1.8, §1.9 for the derivations.
 */

/** A container too narrow for even this many boxes clamps to this count and
 *  scrolls, rather than shrinking boxes below their fixed per-breakpoint
 *  size. Confirmed via /interview-me. */
export const VOXEL_TRACK_MIN_BOX_COUNT = 3;

/**
 * How many fixed-size boxes fit in `availableLength` px without overflowing,
 * floored, clamped to VOXEL_TRACK_MIN_BOX_COUNT. N boxes of size `boxSize`
 * with (N-1) gaps of `gap` occupy N*(boxSize+gap) - gap px; solving for the
 * largest N that fits gives this formula. See
 * docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.5.
 */
export function computeFittedBoxCount(availableLength: number, boxSize: number, gap: number): number {
  if (boxSize <= 0) return VOXEL_TRACK_MIN_BOX_COUNT;
  const fitted = Math.floor((availableLength + gap) / (boxSize + gap));
  return Math.max(VOXEL_TRACK_MIN_BOX_COUNT, fitted);
}

/** Total rendered length of `boxCount` boxes — the inverse of the packing
 *  math above, used to size Slider.Root itself to a fixed function of box
 *  count (confirmed intent). */
export function computeVoxelTrackLength(boxCount: number, boxSize: number, gap: number): number {
  return boxCount * boxSize + Math.max(0, boxCount - 1) * gap;
}

export interface VoxelBoxState {
  /** 0-100. Only the straddling box is ever fractional. */
  fillPercent: number;
  /** 0-1, fed directly into CabinetBox's popped prop. */
  popT: number;
}

/**
 * Dual-fill + extrusion-falloff, per box. Boxes are indexed 0 (nearest min)
 * through boxCount-1 (nearest max) — Radix's own horizontal min-at-left /
 * vertical min-at-bottom convention (SliderCenteredZero.tsx's own existing
 * precedent). See
 * docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.8 for the
 * roadmap-wording cross-check.
 */
export function computeVoxelBoxStates(value: number, min: number, max: number, boxCount: number): VoxelBoxState[] {
  const t = max === min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const rawPosition = t * boxCount;
  const straddlingIndex = Math.min(boxCount - 1, Math.floor(rawPosition));
  const localFraction = rawPosition - straddlingIndex;

  return Array.from({ length: boxCount }, (_, i) => {
    if (i < straddlingIndex) {
      return { fillPercent: 100, popT: straddlingIndex === 0 ? 0 : i / straddlingIndex };
    }
    if (i > straddlingIndex) {
      return { fillPercent: 0, popT: 0 };
    }
    return { fillPercent: localFraction * 100, popT: 1 };
  });
}

/**
 * A box's front-face background: solid accent when fully filled, solid
 * surface when fully empty, a HARD-STOP two-color gradient (not a blend) for
 * the straddling box's local split. Reuses the same --color-accent/
 * --color-surface tokens CabinetBox's own face-shading and default front
 * face already use — no new CSS custom property. See
 * docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.9.
 */
export function computeVoxelFillBackground(fillPercent: number, axis: 'horizontal' | 'vertical'): string {
  if (fillPercent >= 100) return 'var(--color-accent)';
  if (fillPercent <= 0) return 'var(--color-surface)';
  const direction = axis === 'vertical' ? 'to top' : 'to right';
  return `linear-gradient(${direction}, var(--color-accent) 0%, var(--color-accent) ${fillPercent}%, var(--color-surface) ${fillPercent}%, var(--color-surface) 100%)`;
}
