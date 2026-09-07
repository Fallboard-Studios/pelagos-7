/**
 * Pure oblique-projection math for a single cabinet box — no DOM, no GSAP.
 * Given a footprint width/height and a pop progress t (0 = flat, 1 = fully
 * popped), computes the Top/Left Face wall polygons and the front face's own
 * translate offset. GSAP tweens the `points` attribute directly between the
 * t=0 and t=1 outputs of this function (same technique PowerRockerSwitch.tsx
 * already uses for its own polygon morphs) — this is never called per-frame.
 * See docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md §1.2 for the derivation.
 */

/**
 * How far the front face slides at full pop — fixed, deliberately NOT scaled
 * by box height (the original design scaled it 2×height/height, which read
 * as far too much protrusion at the 40/48px tiers once actually seen
 * rendered). Still the same 2:1 oblique vector direction, just a small fixed
 * magnitude: 32px right, 16px down at t=1, identical across every
 * breakpoint's box height. CabinetBox.css's reserved hit-area padding must
 * match this exactly (2×16 / 16), not var(--cabinet-box-height) — see that
 * file's own comment.
 */
export const CABINET_POP_DISTANCE = 16;

export interface CabinetGeometry {
  topFacePoints: string;
  leftFacePoints: string;
  frontFaceOffsetX: number;
  frontFaceOffsetY: number;
}

export function computeCabinetGeometry(width: number, height: number, t: number): CabinetGeometry {
  const dx = 2 * CABINET_POP_DISTANCE * t;
  const dy = CABINET_POP_DISTANCE * t;
  return {
    topFacePoints: `0,0 ${width},0 ${width + dx},${dy} ${dx},${dy}`,
    leftFacePoints: `0,0 0,${height} ${dx},${height + dy} ${dx},${dy}`,
    frontFaceOffsetX: dx,
    frontFaceOffsetY: dy,
  };
}
