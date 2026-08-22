import * as Tabs from '@radix-ui/react-tabs';

import RobotMetaTab from './RobotMetaTab.tsx';
import { RobotAudioTab } from './RobotAudioTab.tsx';
import RobotOscillatorsTab from './RobotOscillatorsTab.tsx';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';

import './RobotEditorTab.css';

export function RobotEditorTab() {
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);

  // Localize the active locale id and look up the selected robot safely.
  // Call hooks unconditionally to satisfy the rules-of-hooks linter.
  const localeId = getActiveLocaleId();
  const robot = useLocaleStore((s) => {
    if (!localeId || !selectedRobotId) return undefined;
    return s.locales[localeId]?.robots?.find((r) => r.id === selectedRobotId);
  });

  // ConsolePanel only mounts this component once a robot is selected; this
  // stays as a defensive fallback, not the primary guard.
  if (!selectedRobotId) {
    return (
      <div className="robot-editor-empty">
        Select a robot from the list, or use Robots to spawn one.
      </div>
    );
  }

  return (
    <div className="robot-editor">
      <Tabs.Root defaultValue="meta" className="robot-editor-tabs">
        <Tabs.List className="tabs-list" aria-label="Robot editor sub-tabs">
          <Tabs.Trigger className="tab-trigger" value="meta">
            Robot Meta
          </Tabs.Trigger>
          <Tabs.Trigger className="tab-trigger" value="audio">
            Robot Audio
          </Tabs.Trigger>
          <Tabs.Trigger className="tab-trigger" value="oscillators">
            Robot Oscillators
          </Tabs.Trigger>
        </Tabs.List>

        <div className="tab-panels">
          <Tabs.Content value="meta" className="tab-content">
            <RobotMetaTab />
          </Tabs.Content>

          <Tabs.Content value="audio" className="tab-content">
            {robot ? <RobotAudioTab robot={robot} /> : <div className="empty">Robot not found</div>}
          </Tabs.Content>

          <Tabs.Content value="oscillators" className="tab-content">
            <RobotOscillatorsTab />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}

export default RobotEditorTab;

