import { useEffect, useState } from 'react';
import {
  CABINET_BOX_HEIGHT,
  CABINET_BREAKPOINT_MOBILE_MAX,
  CABINET_BREAKPOINT_TABLET_MAX,
} from '@/utils/cabinetBreakpoints';

function resolveHeight(): number {
  if (typeof window.matchMedia !== 'function') return CABINET_BOX_HEIGHT.desktop;
  if (window.matchMedia(`(max-width: ${CABINET_BREAKPOINT_MOBILE_MAX}px)`).matches) return CABINET_BOX_HEIGHT.mobile;
  if (window.matchMedia(`(max-width: ${CABINET_BREAKPOINT_TABLET_MAX}px)`).matches) return CABINET_BOX_HEIGHT.tablet;
  return CABINET_BOX_HEIGHT.desktop;
}

/**
 * Live numeric cabinet box height for the current viewport tier — for the
 * wall-geometry math only (cabinetGeometry.ts). CabinetBox.css independently
 * drives the same 3 tiers for layout via --cabinet-box-height; see
 * docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md §1.3.
 */
export function useCabinetBoxHeight(): number {
  const [height, setHeight] = useState(resolveHeight);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mobileQuery = window.matchMedia(`(max-width: ${CABINET_BREAKPOINT_MOBILE_MAX}px)`);
    const tabletQuery = window.matchMedia(`(max-width: ${CABINET_BREAKPOINT_TABLET_MAX}px)`);
    const update = () => setHeight(resolveHeight());
    mobileQuery.addEventListener('change', update);
    tabletQuery.addEventListener('change', update);
    return () => {
      mobileQuery.removeEventListener('change', update);
      tabletQuery.removeEventListener('change', update);
    };
  }, []);

  return height;
}
