import { RobotDisplaySection } from '@/components/robot/RobotDisplaySection';
import { PingControlsDrawer, type PingControlsValue } from '@/components/robot/PingControlsDrawer';
import { PingContourDrawer } from '@/components/robot/PingContourDrawer';
import { SignatureArrayDrawer, type SignatureArrayValue } from '@/components/robot/SignatureArrayDrawer';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';
import { regenerateMelody } from '@/engine/regenerateMelody';
import {
  applyDensity, applyMotifLength, applyNoteVariance, applyPitchRepeat, applyOctaveMin, applyOctaveMax,
  applyAdsr, applyLayersContinuous, applyLayersStructural, applyLayerLfo, applyClickTrackActive,
} from '@/systems/robotOptionsActions';

import './RobotOptionsTab.css';

/**
 * Robot Options screen (Roadmap Phase 9) — reached by selecting a robot from the Robot Selection
 * hub tile (Phase 8), scoped entirely to that robot. Replaces the old Tabs.Root shell
 * (RobotMetaTab/RobotAudioTab/RobotOscillatorsTab, all removed) with RobotDisplaySection followed
 * by the 3 schema-driven drawers, stacked. Renamed from RobotEditorTab.tsx — it stopped being a
 * tabbed "editor" and became the Robot Options screen (confirmed via /interview-me).
 *
 * This is the "robot mode" call site for PingControlsDrawer/PingContourDrawer/
 * SignatureArrayDrawer (Roadmap Phase 10, Task 17) — each drawer's `value` is derived directly
 * from `robot`, and each callback is wired to the matching robotOptionsActions function. The
 * company-broadcast call site, CompanyOptionsSection, wires the same three drawers to a
 * company's resolved snapshot instead.
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

  const pingControlsValue: PingControlsValue = {
    rhythmicDensity: robot.rhythmicDensity ?? 50,
    rhythmicMotifLength: robot.rhythmicMotifLength ?? { active: true, value: 8 },
    noteVariance: robot.noteVariance ?? { active: false, value: 1 },
    pitchRepeat: robot.pitchRepeat ?? 0,
    octaveRange: robot.octaveRange,
    clickTrackActive: robot.clickTrackActive ?? false,
  };

  const signatureArrayValue: SignatureArrayValue = {
    layers: robot.audioAttributes.layers ?? [],
    lfoSettings: robot.lfoSettings,
  };

  return (
    <div className="robot-options">
      <RobotDisplaySection robot={robot} />
      <PingControlsDrawer
        value={pingControlsValue}
        onDensityChange={(v) => applyDensity(robot, localeId, v)}
        onMotifLengthChange={(v) => applyMotifLength(robot, localeId, v)}
        onPitchRepeatChange={(v) => applyPitchRepeat(robot, localeId, v)}
        onOctaveMinChange={(v) => applyOctaveMin(robot, localeId, v)}
        onOctaveMaxChange={(v) => applyOctaveMax(robot, localeId, v)}
        onNoteVarianceChange={(v) => applyNoteVariance(robot, localeId, v)}
        onResetMelody={() => regenerateMelody(robot, localeId)}
        onClickTrackActiveChange={(v) => applyClickTrackActive(robot, localeId, v)}
      />
      <PingContourDrawer
        value={robot.audioAttributes.adsr}
        onChange={(adsr) => applyAdsr(robot, localeId, adsr)}
      />
      <SignatureArrayDrawer
        value={signatureArrayValue}
        onContinuousChange={(layers) => applyLayersContinuous(robot, localeId, layers)}
        onStructuralChange={(layers) => applyLayersStructural(robot, localeId, layers)}
        onLfoChange={(target, value) => applyLayerLfo(robot, localeId, target, value)}
      />
    </div>
  );
}

export default RobotOptionsTab;
