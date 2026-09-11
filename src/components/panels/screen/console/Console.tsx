import { ConsolePanel } from './ConsolePanel';
import { useUIStore } from '@/stores/uiStore';
import './Console.css'

/**
 * activeHubTile === null is the blank hub state — navigation lives in
 * Header's always-visible row 3 now (docs/specs/HEADER_HUB_CONSOLIDATION.md
 * §1.7), and ConsolePanel itself renders null in that state (nothing left
 * for this wrapper to show). Rendering nothing here too — not an empty
 * .console div — lets clicks reach WorldView's robots underneath for free,
 * with no pointer-events special-casing needed (the old console--grid
 * mechanism this replaces existed specifically to poke a hole through an
 * otherwise-full-bleed .console for HubNav's own tiles, which no longer
 * exist).
 */
function Console() {
  const activeHubTile = useUIStore((s) => s.activeHubTile);
  if (activeHubTile === null) return null;
  return (
    <div className="console">
      <ConsolePanel />
    </div>
  );
}

export default Console;