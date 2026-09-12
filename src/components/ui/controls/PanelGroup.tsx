import type { ReactNode } from 'react';

import { useResponsivePanelOrientation } from './useResponsivePanelOrientation';
import './PanelGroup.css';

export type PanelGroupOrientation = 'responsive' | 'row' | 'column';

interface PanelGroupProps {
  orientation: PanelGroupOrientation;
  children: ReactNode;
}

/**
 * A plain row/column layout wrapper for grouping SIBLING top-level
 * DirectionalPanels that each need to keep their OWN Cabinetry facade —
 * unlike passing multiple blocks as children of one DirectionalPanel
 * (which nests them under a single shared facade, so a flex gap between
 * them reads as padding on one continuous surface, not a boundary between
 * two boxes; see docs/specs/AUDIO_RIG_RESPONSIVE_LAYOUT.md's "Separate
 * facades" amendment).
 *
 * Deliberately does NOT provide DirectionalPanelNestingContext (that
 * context is private to DirectionalPanel.tsx and is not even importable
 * here) — a DirectionalPanel rendered as this component's child sees
 * whatever nesting context its own ancestors already established, so
 * placing one directly under a PanelGroup leaves it exactly as top-level
 * as it would be with no wrapper at all. That's what keeps each child's
 * facade independent, producing a real visible gap between real boxes.
 *
 * `orientation="responsive"` resolves through the same fixed-viewport-tier
 * hook DirectionalPanel itself uses for its own 'responsive' schema
 * orientation, so a PanelGroup and its sibling DirectionalPanels stay in
 * lockstep at every breakpoint.
 *
 * The actual gap value (0.75rem, bigger than DirectionalPanel's own 4px/8px)
 * lives in PanelGroup.css's own `.sc-panel-group` rule, not an inline style
 * here — it's a flat constant, not something this component computes.
 */
export function PanelGroup({ orientation, children }: PanelGroupProps) {
  const responsiveResolved = useResponsivePanelOrientation();
  const resolved = orientation === 'responsive' ? responsiveResolved : orientation;

  return (
    <div className="sc-panel-group" data-orientation={resolved}>
      {children}
    </div>
  );
}
