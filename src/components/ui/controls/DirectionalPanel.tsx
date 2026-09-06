import { useRef, type ReactNode } from 'react';

import { DualLabel } from './DualLabel';
import { useAutoPanelOrientation } from './useAutoPanelOrientation';
import type { DirectionalPanelSchema } from '@/types/controls';
import './DirectionalPanel.css';

interface DirectionalPanelProps {
  schema: DirectionalPanelSchema;
  children: ReactNode;
}

/**
 * A pure layout container — groups already-rendered controls into a row or
 * column flex box. No value/onChange, no state of its own beyond 'auto'
 * orientation's own measured resolution (unlike AccordionContainer's
 * open/closed useState). 'row' is the default orientation when
 * schema.orientation is omitted, and 'row' never wraps (docs/specs/
 * DIRECTIONAL_PANEL.md §1.4) — an overflowing row is solved with a nested
 * DirectionalPanel, not a wrap prop on this one. 'auto' resolves via
 * useAutoPanelOrientation, measuring this panel's own parent element and
 * going 'row' once there's enough room, 'column' otherwise
 * (docs/tasks/DIRECTIONAL_PANEL_WIRING.md follow-up fix).
 */
export function DirectionalPanel({ schema, children }: DirectionalPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const orientation = useAutoPanelOrientation(ref, schema.orientation ?? 'row');

  return (
    <div className="sc-directional-panel" ref={ref}>
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <div className="sc-directional-panel__content" data-orientation={orientation}>
        {children}
      </div>
    </div>
  );
}
