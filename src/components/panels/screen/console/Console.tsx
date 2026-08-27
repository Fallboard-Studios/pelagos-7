import { ConsolePanel } from './ConsolePanel';
import { useUIStore } from '@/stores/uiStore';
import './Console.css'

/**
 * activeHubTile === null is the hub grid state — ConsolePanel renders bare HubNav with nothing
 * else in .console-panel__content (see ConsolePanel.tsx). console--grid lets clicks in that
 * state pass through to WorldView's robots underneath (Console.css re-enables pointer-events
 * only on HubNav's own .sc-button tiles) — Roadmap Phase 8's world-view click-through fix.
 */
function Console() {
  const activeHubTile = useUIStore((s) => s.activeHubTile);
  return (
    <div className={activeHubTile === null ? 'console console--grid' : 'console'}>
      <ConsolePanel />
    </div>
  );
}

export default Console;