/**
 * Pure voxel-track math shared by SliderLinear (roadmap 11.1.3) and its two
 * thin follow-ups, SliderLog/SliderCenteredZero (11.1.4/11.1.5) — no DOM, no
 * GSAP, no React. See docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.5,
 * §1.8, §1.9 for the derivations.
 */

import { VOXEL_TRACK_POP_DISTANCE, VOXEL_TRACK_POP_DISTANCE_MIN_RATIO } from './cabinetGeometry';

/** A container too narrow for even this many boxes clamps to this count and
 *  scrolls, rather than shrinking boxes below their fixed per-breakpoint
 *  size. Confirmed via /interview-me. */
export const VOXEL_TRACK_MIN_BOX_COUNT = 3;

/**
 * How many fixed-size boxes fit in `availableLength` px without overflowing,
 * floored, clamped to VOXEL_TRACK_MIN_BOX_COUNT. N boxes of size `boxSize`
 * with (N-1) gaps of `gap` occupy N*(boxSize+gap) - gap px; solving for the
 * largest N that fits gives this formula. See spec §1.5.
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
  /**
   * True for exactly one box per call — the one representing the slider's
   * exact current value. `popT` alone can't identify it: every filled box
   * (not just the straddling one) is ALSO `popT: 1` — found live, 2026-09-09,
   * as the root cause of VoxelTrack.tsx rendering every filled box through
   * the 2-piece glow+flat straddle path (a hidden, always-0-width "flat"
   * CabinetBox riding along with every one of them), not just the actual
   * straddling box. `VoxelTrack.tsx` branches on this field now, not
   * `popT !== 1`.
   */
  isStraddling: boolean;
}

/**
 * Dual-fill + extrusion-falloff, per box. Boxes are indexed 0 (nearest min)
 * through boxCount-1 (nearest max) — Radix's own horizontal min-at-left /
 * vertical min-at-bottom convention (SliderCenteredZero.tsx's own existing
 * precedent). See spec §1.8 for the roadmap-wording cross-check.
 */
export function computeVoxelBoxStates(value: number, min: number, max: number, boxCount: number): VoxelBoxState[] {
  const t = max === min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const rawPosition = t * boxCount;
  const straddlingIndex = Math.min(boxCount - 1, Math.floor(rawPosition));
  const localFraction = rawPosition - straddlingIndex;

  // Every filled box (i <= straddlingIndex) is popT: 1 — fully popped.
  // Revised 2026-09-08: previously stepped down toward 0 the further a
  // filled box sat from the straddling box (i / straddlingIndex), tapering
  // relative to how much of the track happened to be filled. That let a
  // box near the minimum end reach the same full pop distance as a box
  // near the maximum the moment it became the straddling box — wrong per
  // /interview-me. Depth-by-row-position now lives entirely in
  // computeVoxelBoxPopDistance below, keyed to each box's fixed index, not
  // to its distance from wherever the value currently sits.
  return Array.from({ length: boxCount }, (_, i) => {
    if (i < straddlingIndex) return { fillPercent: 100, popT: 1, isStraddling: false };
    if (i > straddlingIndex) return { fillPercent: 0, popT: 0, isStraddling: false };
    return { fillPercent: localFraction * 100, popT: 1, isStraddling: true };
  });
}

/**
 * How far box `index` (of `boxCount` total, 0 = nearest min) can protrude at
 * full pop — a fixed ceiling determined by the box's own row position, never
 * by the slider's current value. Interpolates linearly from
 * VOXEL_TRACK_POP_DISTANCE_MIN_RATIO of VOXEL_TRACK_POP_DISTANCE at box 0 up
 * to the full VOXEL_TRACK_POP_DISTANCE at the last box. Only meaningful for
 * a box that's actually popped (popT > 0, from computeVoxelBoxStates above);
 * a flat box never renders this value regardless of what it computes to.
 * See docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.8 revision note.
 */
export function computeVoxelBoxPopDistance(index: number, boxCount: number): number {
  const span = Math.max(1, boxCount - 1); // guards boxCount <= 1 (single-box row)
  const positionFraction = Math.min(1, Math.max(0, index / span));
  const minDistance = VOXEL_TRACK_POP_DISTANCE * VOXEL_TRACK_POP_DISTANCE_MIN_RATIO;
  return minDistance + (VOXEL_TRACK_POP_DISTANCE - minDistance) * positionFraction;
}

/**
 * Paint-order z-index for box `index` (of `boxCount` total) in a VoxelTrack
 * row/column, so a box whose walls visually bleed into a neighbor's space
 * (per computeVoxelBoxPopDistance's now-varying-by-position pop distance)
 * paints OVER that neighbor rather than under it. The wall geometry always
 * extends along the same fixed 2:1 oblique vector — right and down,
 * regardless of axis (computeCabinetGeometry) — so which neighbor a box
 * bleeds into depends on how index maps to screen position, which is
 * axis-dependent (VoxelTrack.css):
 *  - horizontal: box 0 (nearest min) renders leftmost, walls extend
 *    rightward into the next box's space — z-index DESCENDS as index rises,
 *    so the leftmost box always wins.
 *  - vertical: box 0 (nearest min) renders bottommost (CSS's own
 *    column-reverse), walls extend downward into the box BELOW it (the
 *    next-lower index) — z-index ASCENDS as index rises, so the topmost
 *    (highest-index) box always wins.
 * In both cases: "up/left of a neighbor" outranks "down/right of it" —
 * confirmed by feel against the real running app, 2026-09-08.
 */
export function computeVoxelBoxZIndex(index: number, boxCount: number, axis: 'horizontal' | 'vertical'): number {
  return axis === 'horizontal' ? boxCount - index : index + 1;
}

/**
 * A box's front-face background: solid accent when fully filled, solid
 * surface when fully empty, a HARD-STOP two-color linear-gradient (not a
 * blend) for the straddling box's local split. Reuses the same
 * --color-accent/--color-surface tokens CabinetBox's own face-shading and
 * default front face already use — no new CSS custom property. See spec §1.9.
 */
export function computeVoxelFillBackground(fillPercent: number, axis: 'horizontal' | 'vertical'): string {
  if (fillPercent >= 100) return 'var(--color-accent)';
  if (fillPercent <= 0) return 'var(--color-surface)';
  const direction = axis === 'vertical' ? 'to top' : 'to right'; // box 0 = min = bottom/left = the filled side
  return `linear-gradient(${direction}, var(--color-accent) 0%, var(--color-accent) ${fillPercent}%, var(--color-surface) ${fillPercent}%, var(--color-surface) 100%)`;
}

/** Minimum visible size fraction for the straddling box (the one currently
 *  representing the slider's exact value) — so it never fully disappears
 *  at value === min, where its own local fill is exactly 0%. Tuned by
 *  feel, expect to move (same posture as CABINET_POP_DISTANCE/
 *  VOXEL_TRACK_POP_DISTANCE in cabinetGeometry.ts). */
export const VOXEL_STRADDLE_MIN_SIZE_FRACTION = 0.1;

/**
 * How much of the normal box size the straddling box should actually
 * render at, along the axis the value travels — replaces the old
 * "full-size box with an internal hard-split gradient" representation
 * with a physically smaller box (still fully popped, still solid-colored
 * — see VoxelTrack.tsx), clamped so it never fully disappears at
 * fillPercent: 0. Only ever applied to the one box whose popT === 1
 * (the straddling box); every other box keeps rendering at full size.
 */
export function computeVoxelStraddleSizeFraction(fillPercent: number): number {
  return Math.max(VOXEL_STRADDLE_MIN_SIZE_FRACTION, fillPercent / 100);
}
