import { useEffect, useState } from 'react';
import {
  CABINET_BOX_HEIGHT,
  CABINET_VOXEL_GAP,
  CABINET_BREAKPOINT_MOBILE_MAX,
  CABINET_BREAKPOINT_TABLET_MAX,
  type CabinetTier,
} from '@/utils/cabinetBreakpoints';

function resolveTier(): CabinetTier {
  if (typeof window.matchMedia !== 'function') return 'desktop';
  if (window.matchMedia(`(max-width: ${CABINET_BREAKPOINT_MOBILE_MAX}px)`).matches) return 'mobile';
  if (window.matchMedia(`(max-width: ${CABINET_BREAKPOINT_TABLET_MAX}px)`).matches) return 'tablet';
  return 'desktop';
}

/**
 * Live current breakpoint tier — one matchMedia listener pair, shared by
 * useCabinetBoxHeight and useVoxelTrackGap below rather than each resolving
 * its own independently. Factored out when useVoxelTrackGap (roadmap
 * 11.1.3) needed the same tier for a second, independent value — see
 * docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.4 for why this wasn't
 * simply a second copy of the same listener logic. (Each hook still mounts
 * its own listener pair when called from a different component instance —
 * what's shared is the tier-resolution logic/constants, guaranteeing both
 * hooks can never disagree on which tier is active, not the subscription
 * itself.)
 */
function useCabinetTier(): CabinetTier {
  const [tier, setTier] = useState(resolveTier);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mobileQuery = window.matchMedia(`(max-width: ${CABINET_BREAKPOINT_MOBILE_MAX}px)`);
    const tabletQuery = window.matchMedia(`(max-width: ${CABINET_BREAKPOINT_TABLET_MAX}px)`);
    const update = () => setTier(resolveTier());
    mobileQuery.addEventListener('change', update);
    tabletQuery.addEventListener('change', update);
    return () => {
      mobileQuery.removeEventListener('change', update);
      tabletQuery.removeEventListener('change', update);
    };
  }, []);

  return tier;
}

/**
 * Live numeric cabinet box height for the current viewport tier. Feeds both
 * the wall-geometry math (cabinetGeometry.ts) and CSS layout — CabinetBox.tsx
 * applies this same value as an inline --cabinet-box-height custom property
 * on its wrapper, rather than CSS independently re-deriving it via @media
 * rules. Since 11.1.3, also doubles as the exact square footprint
 * voxel-track boxes use — see docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md
 * §1.3, no new size constant was needed. See
 * docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md §1.3.
 */
export function useCabinetBoxHeight(): number {
  return CABINET_BOX_HEIGHT[useCabinetTier()];
}

/**
 * Live numeric voxel-track box gap for the current viewport tier (roadmap
 * Phase 11.1.3). See docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md §1.4.
 */
export function useVoxelTrackGap(): number {
  return CABINET_VOXEL_GAP[useCabinetTier()];
}
