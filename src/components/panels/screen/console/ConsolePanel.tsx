import type { ReactNode } from 'react';
import { RobotsTab } from './RobotsTab';
import { RobotOptionsTab } from './RobotOptionsTab';
import { AudioRigDrawer } from './AudioRigDrawer';
import { SectorSettingsDrawer } from './SectorSettingsDrawer';
import { Button } from '@/components/ui/controls/Button';
import type { ButtonSchema } from '@/types/controls';
import type { HubTile } from '@/types/hub';
import { useUIStore } from '@/stores/uiStore';
import './ConsolePanel.css';

const BACK_SCHEMA: ButtonSchema = { id: 'hubNavBack', type: 'button', humanLabel: 'Back' };

/**
 * One entry per HubTile, keyed by a Record so TypeScript itself enforces
 * every tile is covered — a new HubTile value that's missing an entry here
 * is a compile error, not a silent blank render. Adding a future tile is one
 * new entry, not a switch case to remember. `selectedRobotId` is threaded
 * through for `robots`, which nests a list/detail switch of its own; other
 * tiles ignore it.
 */
const TILE_CONTENT: Record<HubTile, (selectedRobotId: string | null) => ReactNode> = {
  robots: (selectedRobotId) => (selectedRobotId ? <RobotOptionsTab /> : <RobotsTab />),
  audioRig: () => <AudioRigDrawer />,
  settings: () => <SectorSettingsDrawer />,
};

export function ConsolePanel() {
  const activeHubTile = useUIStore((s) => s.activeHubTile);
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);
  const setActiveHubTile = useUIStore((s) => s.setActiveHubTile);
  const selectRobot = useUIStore((s) => s.selectRobot);

  // Navigation moved into Header's always-visible row 3 (docs/specs/
  // HEADER_HUB_CONSOLIDATION.md §1.7) — no tile grid to render here anymore.
  // A genuinely empty return, not a wrapper div with nothing in it, so
  // WorldView's robots show through unobstructed.
  if (activeHubTile === null) {
    return null;
  }

  // Within the robots tile, a selected robot's editor backs out to the list
  // first, not straight to the grid — a second nesting level. Every other
  // tile (and the list itself) backs straight out to the grid.
  function handleBack() {
    if (activeHubTile === 'robots' && selectedRobotId) {
      selectRobot(null);
    } else {
      setActiveHubTile(null);
    }
  }

  return (
    <div className="console-panel" role="region" aria-label="Console Panel">
      <div className="console-panel__back">
        <Button schema={BACK_SCHEMA} onClick={handleBack} />
      </div>
      <div className="console-panel__content">{TILE_CONTENT[activeHubTile](selectedRobotId)}</div>
    </div>
  );
}

export default ConsolePanel;
