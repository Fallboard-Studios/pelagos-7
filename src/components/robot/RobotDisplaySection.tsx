import { RobotBody } from '@/components/robot/RobotBody';
import { DualLabel } from '@/components/ui/controls/DualLabel';
import { Select } from '@/components/ui/controls/Select';
import { AudioSettingSection, type AudioSettingValue } from '@/components/robot/AudioSettingSection';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { applyAudioMode, applyVolume, applyVolumeLfo } from '@/systems/robotOptionsActions';
import { DEFAULT_LFO_SETTINGS } from '@/data/lfoConfig';
import {
  ROBOT_SELECTION_ROW_SCHEMAS,
  JOB_TYPE_LABELS,
  UNASSIGNED_JOB_LABEL,
  DOCKING_STATE_LABELS,
} from '@/data/robotSelectionConfig';
import { VOLUME_LFO_TARGET } from '@/data/robotOptionsConfig';
import { FREELANCE_VALUE, buildCompanySelectSchema } from '@/data/companyConfig';
import type { Robot } from '@/types/Robot';
import type { LfoValue } from '@/types/controls';

import './RobotDisplaySection.css';

interface RobotDisplaySectionProps {
  robot: Robot;
}

/**
 * Robot Options' always-visible header block (not an AccordionContainer — see
 * docs/specs/ROBOT_OPTIONS.md §1). The avatar and Name/Job/Battery/Docking rows all reuse the
 * exact display pattern Phase 8's RobotSelectionCard already established — same sunlight/time-
 * agnostic RobotBody rendering (ignoreDaylight, so the portrait reads consistently regardless of
 * the active locale's time of day), same read-only DualLabel rows, no job reassignment, no
 * docking-state override (both stay fully system-driven). Audio Setting and Volume (with its LFO
 * frame) are rendered via AudioSettingSection (Roadmap Phase 10) — this is the "robot mode" call
 * site: value derived from `robot`, each callback wired to robotOptionsActions.
 */
export function RobotDisplaySection({ robot }: RobotDisplaySectionProps) {
  const localeId = getActiveLocaleId();
  const jobLabel = robot.job ? JOB_TYPE_LABELS[robot.job.type] : UNASSIGNED_JOB_LABEL;
  const companies = useLocaleStore((s) => s.locales[localeId]?.companies ?? []);
  const companySelectSchema = buildCompanySelectSchema(companies);

  const handleCompanyChange = (value: string) => {
    useLocaleStore.getState().assignRobotToCompany(localeId, robot.id, value === FREELANCE_VALUE ? null : value);
  };

  const audioSettingValue: AudioSettingValue = {
    audioMode: robot.audioMode ?? 'none',
    masterVolume: robot.masterVolume,
    volumeLfo: robot.lfoSettings?.[VOLUME_LFO_TARGET] as LfoValue
      ?? { ...DEFAULT_LFO_SETTINGS[VOLUME_LFO_TARGET] },
  };

  return (
    <div className="robot-display-section">
      <svg className="robot-display-section__avatar" viewBox="-80 -80 160 160" aria-hidden="true">
        <RobotBody robot={robot} ignoreDaylight />
      </svg>

      <div className="robot-display-section__row">
        <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.name} />
        <span className="robot-display-section__value">{robot.name || robot.id}</span>
      </div>
      <div className="robot-display-section__row">
        <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.job} />
        <span className="robot-display-section__value">{jobLabel.humanLabel}</span>
      </div>
      <div className="robot-display-section__row">
        <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.battery} />
        <span className="robot-display-section__value">{Math.round(robot.batteryLevel)}%</span>
      </div>
      <div className="robot-display-section__row">
        <DualLabel {...ROBOT_SELECTION_ROW_SCHEMAS.docking} />
        <span className="robot-display-section__value">{DOCKING_STATE_LABELS[robot.docking].humanLabel}</span>
      </div>

      <div className="robot-display-section__row">
        <Select
          schema={companySelectSchema}
          value={robot.companyId ?? FREELANCE_VALUE}
          onChange={handleCompanyChange}
        />
      </div>

      <AudioSettingSection
        value={audioSettingValue}
        onAudioModeChange={(mode) => applyAudioMode(robot, localeId, mode)}
        onVolumeChange={(pct) => applyVolume(robot, localeId, pct)}
        onVolumeLfoChange={(value) => applyVolumeLfo(robot, localeId, value)}
      />
    </div>
  );
}

export default RobotDisplaySection;
