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
 * How far the front face slides at full pop, for Button/Toggle — the two
 * single-box consumers. Deliberately NOT scaled by box height (the original
 * design scaled it 2×height/height, which read as far too much protrusion
 * at the 40/48px tiers once actually seen rendered): a small fixed
 * magnitude, identical across every breakpoint's box height. CabinetBox.tsx
 * applies the resolved distance (this constant, unless a consumer overrides
 * it via CabinetBoxProps.popDistance) directly as an inline
 * --cabinet-pop-distance custom property.
 *
 * VoxelTrack (roadmap 11.1.3) is a different visual context — a row of many
 * boxes read together, not one box in isolation — and reads better at a
 * deeper protrusion than Button/Toggle's own value; see
 * VOXEL_TRACK_POP_DISTANCE below. Tuned by feel after a real visual pass;
 * expect these numbers to keep moving.
 */
export const CABINET_POP_DISTANCE = 2;

/**
 * VoxelTrack's own pop distance (roadmap 11.1.3) — deeper than Button/
 * Toggle's CABINET_POP_DISTANCE because a row of many boxes read together
 * benefits from a more visible protrusion than a single isolated box does.
 * Passed as VoxelTrack.tsx's own CabinetBox instances' `popDistance` prop;
 * every other CabinetBox consumer keeps using the CABINET_POP_DISTANCE
 * default. Tuned by feel against the real running app, 2026-09-08.
 */
export const VOXEL_TRACK_POP_DISTANCE = 8;

export interface CabinetGeometry {
  topFacePoints: string;
  leftFacePoints: string;
  frontFaceOffsetX: number;
  frontFaceOffsetY: number;
}

/**
 * `popDistance` defaults to CABINET_POP_DISTANCE (Button/Toggle's own
 * value) when omitted — pass VOXEL_TRACK_POP_DISTANCE (or any other value)
 * explicitly for a different visual context. Still the same 2:1 oblique
 * vector direction regardless of magnitude: `2 * popDistance` right,
 * `popDistance` down at t=1.
 */
export function computeCabinetGeometry(
  width: number,
  height: number,
  t: number,
  popDistance: number = CABINET_POP_DISTANCE,
): CabinetGeometry {
  const dx = 2 * popDistance * t;
  const dy = popDistance * t;
  return {
    topFacePoints: `0,0 ${width},0 ${width + dx},${dy} ${dx},${dy}`,
    leftFacePoints: `0,0 0,${height} ${dx},${height + dy} ${dx},${dy}`,
    frontFaceOffsetX: dx,
    frontFaceOffsetY: dy,
  };
}
