import { DualLabel } from '@/components/ui/controls/DualLabel';
import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { Lfo } from '@/components/ui/controls/Lfo';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { lfoEngine } from '@/engine/lfoEngine';
import { DEFAULT_LFO_SETTINGS } from '@/data/lfoConfig';
import {
  ROBOT_SELECTION_ROW_SCHEMAS,
  JOB_TYPE_LABELS,
  UNASSIGNED_JOB_LABEL,
  DOCKING_STATE_LABELS,
} from '@/data/robotSelectionConfig';
import {
  AUDIO_SETTING_SCHEMA,
  VOLUME_SCHEMA,
  VOLUME_LFO_TARGET,
  VOLUME_LFO_ACCORDION_SCHEMA,
} from '@/data/robotOptionsConfig';
import type { Robot } from '@/types/Robot';
import type { LfoValue } from '@/types/controls';

import './RobotDisplaySection.css';

interface RobotDisplaySectionProps {
  robot: Robot;
}

/**
 * Robot Options' always-visible header block (not an AccordionContainer — see
 * docs/specs/ROBOT_OPTIONS.md §1). Name/Job/Battery/Docking are plain read-only DualLabel rows,
 * the exact display pattern Phase 8's RobotSelectionCard already established — no job
 * reassignment, no docking-state override (both stay fully system-driven). Audio Setting and
 * Volume (with its LFO frame) are the only editable controls here.
 */
export function RobotDisplaySection({ robot }: RobotDisplaySectionProps) {
  const localeId = getActiveLocaleId();
  const jobLabel = robot.job ? JOB_TYPE_LABELS[robot.job.type] : UNASSIGNED_JOB_LABEL;
  const audioMode = robot.audioMode ?? 'none';
  const volumeLfo: LfoValue = robot.lfoSettings?.volume
    ?? { ...DEFAULT_LFO_SETTINGS[VOLUME_LFO_TARGET], active: false };

  const handleAudioModeChange = (value: string) => {
    useLocaleStore.getState().updateRobot(localeId, robot.id, { audioMode: value as Robot['audioMode'] });
  };

  const handleVolumeChange = (value: number) => {
    useLocaleStore.getState().updateRobot(localeId, robot.id, { masterVolume: value });
  };

  // Mirrors audioStore.ts's setGlobalLfo pattern, robot-scoped: store write plus the matching
  // lfoEngine calls, connecting/starting only when the new value is active.
  const handleVolumeLfoChange = (value: LfoValue) => {
    const nextLfoSettings = { ...robot.lfoSettings, [VOLUME_LFO_TARGET]: value } as Robot['lfoSettings'];
    useLocaleStore.getState().updateRobot(localeId, robot.id, { lfoSettings: nextLfoSettings });
    lfoEngine.setLfoShape(VOLUME_LFO_TARGET, value.shape, robot.id);
    lfoEngine.setLfoRate(VOLUME_LFO_TARGET, value.rate, robot.id);
    lfoEngine.setLfoDepth(VOLUME_LFO_TARGET, value.depth, robot.id);
    if (value.active) {
      if (lfoEngine.connectLfoTarget(VOLUME_LFO_TARGET, robot.id)) lfoEngine.start(VOLUME_LFO_TARGET, robot.id);
    } else {
      lfoEngine.disconnectLfoTarget(VOLUME_LFO_TARGET, robot.id);
      lfoEngine.stop(VOLUME_LFO_TARGET, robot.id);
    }
  };

  return (
    <div className="robot-display-section">
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
        <RadioButton schema={AUDIO_SETTING_SCHEMA} value={audioMode} onChange={handleAudioModeChange} />
      </div>

      <div className="robot-display-section__row">
        <SliderLinear schema={VOLUME_SCHEMA} value={robot.masterVolume} onChange={handleVolumeChange} />
        <AccordionContainer
          schema={VOLUME_LFO_ACCORDION_SCHEMA}
          defaultOpen={volumeLfo.active}
          contentActive={volumeLfo.active}
        >
          <Lfo
            schema={{ id: `${VOLUME_LFO_ACCORDION_SCHEMA.id}.control`, type: 'lfo' }}
            value={volumeLfo}
            onChange={handleVolumeLfoChange}
          />
        </AccordionContainer>
      </div>
    </div>
  );
}

export default RobotDisplaySection;
