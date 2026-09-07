/**
 * Oblique Cabinetry's viewport-width breakpoint tiers — the JS-side source
 * of truth for the numeric box height the wall geometry math (cabinetGeometry.ts)
 * needs. CabinetBox.css independently expresses the SAME 3 breakpoint numbers
 * via plain CSS @media rules for layout purposes (padding, front-face height)
 * — CSS cannot import this file, so the two are manually kept in sync. See
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
