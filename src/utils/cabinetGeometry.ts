/**
 * Pure oblique-projection math for a single cabinet box — no DOM, no GSAP.
 * Given a footprint width/height and a pop progress t (0 = flat, 1 = fully
 * popped), computes the Top/Left Face wall polygons and the front face's own
 * translate offset. GSAP tweens the `points` attribute directly between the
 * t=0 and t=1 outputs of this function (same technique PowerRockerSwitch.tsx
 * already uses for its own polygon morphs) — this is never called per-frame.
 * See docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md §1.2 for the derivation.
 */
export interface CabinetGeometry {
  topFacePoints: string;
  leftFacePoints: string;
  frontFaceOffsetX: number;
  frontFaceOffsetY: number;
}

export function computeCabinetGeometry(width: number, height: number, t: number): CabinetGeometry {
  const dx = 2 * height * t;
  const dy = height * t;
  return {
    topFacePoints: `0,0 ${width},0 ${width + dx},${dy} ${dx},${dy}`,
    leftFacePoints: `0,0 0,${height} ${dx},${height + dy} ${dx},${dy}`,
    frontFaceOffsetX: dx,
    frontFaceOffsetY: dy,
  };
}
