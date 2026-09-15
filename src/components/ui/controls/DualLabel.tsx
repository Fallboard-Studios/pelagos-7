import { memo } from 'react';
import './DualLabel.css';

interface DualLabelProps {
  loreLabel?: string;
  humanLabel?: string;
}

/**
 * Renders whichever subset of the lore/human label pair is present — used
 * standalone for display-only rows (Robot Name, Job Data, ...) and composed
 * internally by every other control primitive for its own label rendering.
 */
function DualLabelInner({ loreLabel, humanLabel }: DualLabelProps) {
  if (!loreLabel && !humanLabel) return null;
  return (
    <div className="sc-dual-label">
      {loreLabel && <span className="sc-dual-label__lore">{loreLabel}</span>}
      {humanLabel && <span className="sc-dual-label__human">{humanLabel}</span>}
    </div>
  );
}

// React.memo (docs/tasks/OBLIQUE_CABINETRY_MEMOIZATION.md Task 6) — both props are always plain
// strings pulled directly off a stable schema object, so the default shallow compare is correct.
// Composed internally by every other primitive; its own benefit is realized once its parent
// primitive is memoized and bails (so DualLabel is never even reached).
export const DualLabel = memo(DualLabelInner);
