import { ConsoleNavigation } from './ConsoleNavigation';
import { RobotOptionsTab } from './RobotOptionsTab';
import type { ConsoleTab } from '@/stores/uiStore';
import { useUIStore } from '@/stores/uiStore';
import './ConsolePanel.css';

export function ConsolePanel() {
  const activeConsoleTab = useUIStore((s) => s.activeConsoleTab);

  const renderStub = (tab: ConsoleTab | null) => {
    switch (tab) {
      case 'session':
        return (
          <div className="console-panel__stub" id="console-tab-session">
            Session
          </div>
        );
      case 'composition':
        return (
          <div className="console-panel__stub" id="console-tab-composition">
            Composition
          </div>
        );
      case 'robotOptions':
        return <RobotOptionsTab />;
      case 'robotEditor':
        return (
          <div className="console-panel__stub" id="console-tab-robotEditor">
            Robot Editor
          </div>
        );
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
      default:
        return (
          <div className="console-panel__stub" id="console-tab-empty">
            No tab selected
          </div>
        );
    }
  };

  return (
    <div className="console-panel" role="region" aria-label="Console Panel">
      <ConsoleNavigation />
      <div className="console-panel__content">{renderStub(activeConsoleTab)}</div>
    </div>
  );
}

export default ConsolePanel;
