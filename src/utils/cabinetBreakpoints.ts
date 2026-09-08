/**
 * Oblique Cabinetry's viewport-width breakpoint tiers — the sole source of
 * truth for box height, used both by the wall geometry math
 * (cabinetGeometry.ts, via useCabinetBoxHeight) and by CSS layout: the
 * resolved height is applied as an inline --cabinet-box-height custom
 * property on CabinetBox's wrapper (CabinetBox.tsx), not redeclared in CSS
 * via @media rules — that redundant copy was removed after going stale in
 * prose more than once as this value was tuned. See
 * docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md §1.3/§7.
 */
export const CABINET_BREAKPOINT_MOBILE_MAX = 640;
export const CABINET_BREAKPOINT_TABLET_MAX = 1024;

export const CABINET_BOX_HEIGHT = {
  mobile: 32,
  tablet: 40,
  desktop: 48,
} as const;

export type CabinetTier = keyof typeof CABINET_BOX_HEIGHT;
