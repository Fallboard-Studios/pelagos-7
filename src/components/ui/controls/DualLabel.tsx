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
export function DualLabel({ loreLabel, humanLabel }: DualLabelProps) {
  if (!loreLabel && !humanLabel) return null;
  return (
    <div className="sc-dual-label">
      {loreLabel && <span className="sc-dual-label__lore">{loreLabel}</span>}
      {humanLabel && <span className="sc-dual-label__human">{humanLabel}</span>}
    </div>
  );
}
