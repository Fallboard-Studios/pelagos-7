import { RobotDisplaySection } from '@/components/robot/RobotDisplaySection';
import { AudioSettingSection, type AudioSettingValue } from '@/components/robot/AudioSettingSection';
import { PingControlsDrawer, type PingControlsValue } from '@/components/robot/PingControlsDrawer';
import { PingContourDrawer } from '@/components/robot/PingContourDrawer';
import { SignatureArrayDrawer, type SignatureArrayValue } from '@/components/robot/SignatureArrayDrawer';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { useUIStore } from '@/stores/uiStore';
import { useLocaleStore } from '@/stores/localeStore';
import { regenerateMelody } from '@/engine/regenerateMelody';
import { DEFAULT_RHYTHMIC_MOTIF_LENGTH, DEFAULT_NOTE_VARIANCE } from '@/engine/melodyGenerator';
import { DEFAULT_LFO_SETTINGS } from '@/data/lfoConfig';
import { VOLUME_LFO_TARGET } from '@/data/robotOptionsConfig';
import {
  applyDensity, applyMotifLength, applyNoteVariance, applyPitchRepeat, applyOctaveMin, applyOctaveMax,
  applyAdsr, applyLayersContinuous, applyLayersStructural, applyLayerLfo, applyClickTrackActive,
  applyAudioMode, applyVolume, applyVolumeLfo,
} from '@/systems/robotOptionsActions';
import type { LfoValue } from '@/types/controls';

import './RobotOptionsTab.css';

/**
 * Robot Options screen (Roadmap Phase 9) — reached by selecting a robot from the Robot Selection
 * hub tile (Phase 8), scoped entirely to that robot. Replaces the old Tabs.Root shell
 * (RobotMetaTab/RobotAudioTab/RobotOscillatorsTab, all removed) with RobotDisplaySection followed
 * by AudioSettingSection and the 3 schema-driven drawers, stacked. Renamed from
 * RobotEditorTab.tsx — it stopped being a tabbed "editor" and became the Robot Options screen
 * (confirmed via /interview-me).
 *
 * This is the "robot mode" call site for AudioSettingSection/PingControlsDrawer/
 * PingContourDrawer/SignatureArrayDrawer (Roadmap Phase 10, Task 17) — each component's `value`
 * is derived directly from `robot`, and each callback is wired to the matching
 * robotOptionsActions function. The company-broadcast call site, CompanyOptionsSection, wires the
 * same components to a company's resolved snapshot instead.
 *
 * AudioSettingSection was previously rendered inside RobotDisplaySection (mixed into its avatar/
 * meta-data card); docs/tasks/DIRECTIONAL_PANEL_WIRING.md Task 5 extracted it out to render here
 * as its own top-level Output panel, directly after RobotDisplaySection and before Melody
 * (PingControlsDrawer) — same derived value/handlers as before, just rendered one level up.
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

  const audioSettingValue: AudioSettingValue = {
    audioMode: robot.audioMode ?? 'none',
    masterVolume: robot.masterVolume,
    volumeLfo: robot.lfoSettings?.[VOLUME_LFO_TARGET] as LfoValue
      ?? { ...DEFAULT_LFO_SETTINGS[VOLUME_LFO_TARGET] },
  };

  const pingControlsValue: PingControlsValue = {
    rhythmicDensity: robot.rhythmicDensity ?? 50,
    rhythmicMotifLength: robot.rhythmicMotifLength?.value ?? DEFAULT_RHYTHMIC_MOTIF_LENGTH.value,
    noteVariance: robot.noteVariance?.value ?? DEFAULT_NOTE_VARIANCE.value,
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
      <AudioSettingSection
        value={audioSettingValue}
        onAudioModeChange={(mode) => applyAudioMode(robot, localeId, mode)}
        onVolumeChange={(pct) => applyVolume(robot, localeId, pct)}
        onVolumeLfoChange={(value) => applyVolumeLfo(robot, localeId, value)}
      />
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
