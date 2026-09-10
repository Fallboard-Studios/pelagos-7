import { createContext, useContext, useRef, type ReactNode } from 'react';

import { CabinetBox } from './CabinetBox';
import { DualLabel } from './DualLabel';
import { useAutoPanelOrientation } from './useAutoPanelOrientation';
import type { DirectionalPanelSchema } from '@/types/controls';
import './DirectionalPanel.css';

interface DirectionalPanelProps {
  schema: DirectionalPanelSchema;
  children: ReactNode;
}

// Internal only — not exported. Defaults to false ("not yet inside a
// DirectionalPanel"); every instance re-provides `true` to its own children
// regardless of whether it renders its own facade, so a panel nested several
// levels deep still correctly reads as nested. See
// docs/specs/OBLIQUE_CABINETRY_DIRECTIONAL_PANEL.md §1.2.
const DirectionalPanelNestingContext = createContext(false);

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
 *
 * Renders through a permanently-popped, non-animating CabinetBox facade
 * ("Oblique Cabinetry — DirectionalPanel") whenever this instance is
 * top-level — not itself nested inside another DirectionalPanel's own
 * children, detected via DirectionalPanelNestingContext rather than a prop,
 * since the same call site can be top-level in one caller and nested in
 * another (AudioRigDrawer's renderBlock(), see the intent doc's own Scope
 * section). A nested instance renders exactly as before, unframed. See
 * docs/specs/OBLIQUE_CABINETRY_DIRECTIONAL_PANEL.md §1 for the full
 * derivation, including why this needed one small additive change to
 * CabinetBox itself (autoHeight, §1.1).
 */
export function DirectionalPanel({ schema, children }: DirectionalPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const orientation = useAutoPanelOrientation(ref, schema.orientation ?? 'row');
  const isNested = useContext(DirectionalPanelNestingContext);

  const panel = (
    <div className="sc-directional-panel" ref={ref}>
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <div className="sc-directional-panel__content" data-orientation={orientation}>
        {children}
      </div>
    </div>
  );

  const content = isNested ? panel : (
    <div className="sc-directional-panel-facade">
      <CabinetBox
        popped
        skipMountAnimation
        autoHeight
        timelineKey={`cabinet-directional-panel-facade-${schema.id}`}
      >
        {panel}
      </CabinetBox>
    </div>
  );

  return (
    <DirectionalPanelNestingContext.Provider value={true}>
      {content}
    </DirectionalPanelNestingContext.Provider>
  );
}
