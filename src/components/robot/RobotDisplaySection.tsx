import { RobotBody } from '@/components/robot/RobotBody';
import { DualLabel } from '@/components/ui/controls/DualLabel';
import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { Lfo } from '@/components/ui/controls/Lfo';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { lfoEngine } from '@/engine/lfoEngine';
import { AudioEngine } from '@/engine/AudioEngine';
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
 * docs/specs/ROBOT_OPTIONS.md §1). The avatar and Name/Job/Battery/Docking rows all reuse the
 * exact display pattern Phase 8's RobotSelectionCard already established — same sunlight/time-
 * agnostic RobotBody rendering (ignoreDaylight, so the portrait reads consistently regardless of
 * the active locale's time of day), same read-only DualLabel rows, no job reassignment, no
 * docking-state override (both stay fully system-driven). Audio Setting and Volume (with its LFO
 * frame) are the only editable controls here.
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

  // Volume displays 0-100% but stores 0..1 (Robot.masterVolume) — the same display-vs-storage
  // split PingContourDrawer's Sustain uses. Also updates AudioEngine's live masterVolume cache
  // directly (not just the store): scheduleNote's velocity lookup caches masterVolume on a
  // robot's first note and never re-reads the store afterward, so without this the slider moves
  // but has no audible effect until the cache is separately invalidated.
  const handleVolumeChange = (pct: number) => {
    const value = pct / 100;
    useLocaleStore.getState().updateRobot(localeId, robot.id, { masterVolume: value });
    AudioEngine.updateRobotMasterVolume(robot.id, value);
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
        <RadioButton schema={AUDIO_SETTING_SCHEMA} value={audioMode} onChange={handleAudioModeChange} />
      </div>

      <div className="robot-display-section__row">
        <SliderLinear schema={VOLUME_SCHEMA} value={robot.masterVolume * 100} onChange={handleVolumeChange} />
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
