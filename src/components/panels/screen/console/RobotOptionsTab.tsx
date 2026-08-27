import { RobotDisplaySection } from '@/components/robot/RobotDisplaySection';
import { PingControlsDrawer } from '@/components/robot/PingControlsDrawer';
import { PingContourDrawer } from '@/components/robot/PingContourDrawer';
import { SignatureArrayDrawer } from '@/components/robot/SignatureArrayDrawer';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';

import './RobotOptionsTab.css';

/**
 * Robot Options screen (Roadmap Phase 9) — reached by selecting a robot from the Robot Selection
 * hub tile (Phase 8), scoped entirely to that robot. Replaces the old Tabs.Root shell
 * (RobotMetaTab/RobotAudioTab/RobotOscillatorsTab, all removed) with RobotDisplaySection followed
 * by the 3 schema-driven drawers, stacked. Renamed from RobotEditorTab.tsx — it stopped being a
 * tabbed "editor" and became the Robot Options screen (confirmed via /interview-me).
 */
export function RobotOptionsTab() {
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
      <div className="robot-options-empty">
        Select a robot from the list, or use Robots to spawn one.
      </div>
    );
  }

  if (!robot) {
    return <div className="robot-options-empty">Robot not found</div>;
  }

  return (
    <div className="robot-options">
      <RobotDisplaySection robot={robot} />
      <PingControlsDrawer robot={robot} />
      <PingContourDrawer robot={robot} />
      <SignatureArrayDrawer robot={robot} />
    </div>
  );
}

export default RobotOptionsTab;
