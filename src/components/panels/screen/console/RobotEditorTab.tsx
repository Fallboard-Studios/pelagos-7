import * as Tabs from '@radix-ui/react-tabs';

import RobotMetaTab from './RobotMetaTab.tsx';
import type { Robot } from '@/types/Robot';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';

import './RobotEditorTab.css';

export function RobotEditorTab() {
  const activeConsoleTab = useUIStore((s) => s.activeConsoleTab);
  const selectedRobotId = useUIStore((s) => s.selectedRobotId);

  // Localize the active locale id and look up the selected robot safely.
  // Call hooks unconditionally to satisfy the rules-of-hooks linter.
  const localeId = getActiveLocaleId();
  const robot = useLocaleStore((s) => {
    if (!localeId || !selectedRobotId) return undefined;
    return s.locales[localeId]?.robots?.find((r) => r.id === selectedRobotId);
  });

  // If this tab isn't active, don't render anything.
  if (activeConsoleTab !== 'robotEditor') return null;

  if (!selectedRobotId) {
    return (
      <div className="robot-editor-empty">
        Select a robot from the list, or use Robot Options to spawn one.
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
            {robot ? <RobotAudioPanel robot={robot} /> : <div className="empty">Robot not found</div>}
          </Tabs.Content>

          <Tabs.Content value="oscillators" className="tab-content">
            {robot ? <RobotOscillatorsPanel robot={robot} /> : <div className="empty">Robot not found</div>}
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}

// Robot meta panel is implemented in its own file: RobotMetaTab.tsx

function RobotAudioPanel({ robot }: { robot: Robot }) {
  return (
    <div className="robot-audio-panel">
      <p>Audio attributes are displayed here (placeholder).</p>
      <pre className="robot-audio-pre">{JSON.stringify(robot.audioAttributes, null, 2)}</pre>
    </div>
  );
}

function RobotOscillatorsPanel({ robot }: { robot: Robot }) {
  return (
    <div className="robot-oscillators-panel">
      <p>Oscillator settings for {robot.name ?? 'Unnamed Robot'} (placeholder)</p>
    </div>
  );
}

export default RobotEditorTab;
