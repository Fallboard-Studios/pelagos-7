import type { ReactNode } from 'react';

import { DualLabel } from './DualLabel';
import type { DirectionalPanelSchema } from '@/types/controls';
import './DirectionalPanel.css';

interface DirectionalPanelProps {
  schema: DirectionalPanelSchema;
  children: ReactNode;
}

/**
 * A pure layout container — groups already-rendered controls into a row or
 * column flex box. No value/onChange, no state of its own (unlike
 * AccordionContainer's open/closed useState). 'row' is the default
 * orientation when schema.orientation is omitted, and 'row' never wraps
 * (docs/specs/DIRECTIONAL_PANEL.md §1.4) — an overflowing row is solved with
 * a nested DirectionalPanel, not a wrap prop on this one.
 */
export function DirectionalPanel({ schema, children }: DirectionalPanelProps) {
  const orientation = schema.orientation ?? 'row';

  return (
    <div className="sc-directional-panel">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <div className="sc-directional-panel__content" data-orientation={orientation}>
        {children}
      </div>
    </div>
  );
}
