import { HubNav } from './HubNav';
import { RobotsTab } from './RobotsTab';
import { RobotEditorTab } from './RobotEditorTab';
import { Button } from '@/components/ui/controls/Button';
import type { ButtonSchema } from '@/types/controls';
import type { HubTile } from '@/types/hub';
import { useUIStore } from '@/stores/uiStore';
import './ConsolePanel.css';

const BACK_SCHEMA: ButtonSchema = { id: 'hubNavBack', type: 'button', humanLabel: 'Back' };

function renderTile(tile: HubTile, selectedRobotId: string | null) {
  switch (tile) {
    case 'robots':
      return selectedRobotId ? <RobotEditorTab /> : <RobotsTab />;
    case 'audioRig':
      return (
        <div className="console-panel__stub" id="console-tab-audioRig">
          Audio Rig
        </div>
      );
    case 'settings':
      return (
        <div className="console-panel__stub" id="console-tab-settings">
          Settings
        </div>
      );
  }
}

export function ConsolePanel() {
  const activeHubTile = useUIStore((s) => s.activeHubTile);
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);
  const setActiveHubTile = useUIStore((s) => s.setActiveHubTile);
  const selectRobot = useUIStore((s) => s.selectRobot);

  if (activeHubTile === null) {
    return (
      <div className="console-panel" role="region" aria-label="Console Panel">
        <HubNav />
      </div>
    );
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
      <div className="console-panel__content">{renderTile(activeHubTile, selectedRobotId)}</div>
    </div>
  );
}

export default ConsolePanel;
