import { HubNav } from './HubNav';
import { RobotOptionsTab } from './RobotOptionsTab';
import { RobotEditorTab } from './RobotEditorTab';
import { Button } from '@/components/ui/controls/Button';
import type { ButtonSchema } from '@/types/controls';
import type { HubTile } from '@/types/hub';
import { useUIStore } from '@/stores/uiStore';
import './ConsolePanel.css';

const BACK_SCHEMA: ButtonSchema = { id: 'hubNavBack', type: 'button', humanLabel: 'Back' };

function renderTile(tile: HubTile) {
  switch (tile) {
    case 'robotOptions':
      return <RobotOptionsTab />;
    case 'robotEditor':
      return <RobotEditorTab />;
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
  const setActiveHubTile = useUIStore((s) => s.setActiveHubTile);

  if (activeHubTile === null) {
    return (
      <div className="console-panel" role="region" aria-label="Console Panel">
        <HubNav />
      </div>
    );
  }

  return (
    <div className="console-panel" role="region" aria-label="Console Panel">
      <div className="console-panel__back">
        <Button schema={BACK_SCHEMA} onClick={() => setActiveHubTile(null)} />
      </div>
      <div className="console-panel__content">{renderTile(activeHubTile)}</div>
    </div>
  );
}

export default ConsolePanel;
