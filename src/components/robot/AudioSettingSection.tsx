import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { Lfo } from '@/components/ui/controls/Lfo';
import { AUDIO_SETTING_SCHEMA, VOLUME_SCHEMA, VOLUME_LFO_ACCORDION_SCHEMA } from '@/data/robotOptionsConfig';
import type { Robot } from '@/types/Robot';
import type { LfoValue } from '@/types/controls';

import './AudioSettingSection.css';

export interface AudioSettingValue {
  audioMode: NonNullable<Robot['audioMode']>;
  /** 0..1, matching Robot.masterVolume's own domain — this component converts to/from the
   *  0-100% the Volume slider displays; onVolumeChange still emits the 0-100 percent, matching
   *  robotOptionsActions.applyVolume's own (robot, localeId, pct) signature. */
  masterVolume: number;
  volumeLfo: LfoValue;
}

interface AudioSettingSectionProps {
  value: AudioSettingValue;
  onAudioModeChange: (mode: Robot['audioMode']) => void;
  onVolumeChange: (pct: number) => void;
  onVolumeLfoChange: (value: LfoValue) => void;
  disabled?: boolean;
}

/**
 * Robot Options' editable Audio Setting + Volume (+ its LFO frame) block — extracted out of
 * RobotDisplaySection (Roadmap Phase 10) into its own presentational component so both the
 * single-robot screen and the company-broadcast panel can render the exact same controls, bound
 * to different value/onChange sources. No `robot` prop, no store access — a pure value/onChange
 * component, same contract every other refactored Robot Options section now uses.
 */
export function AudioSettingSection({ value, onAudioModeChange, onVolumeChange, onVolumeLfoChange, disabled }: AudioSettingSectionProps) {
  return (
    <div className="audio-setting-section">
      <div className="audio-setting-section__row">
        <RadioButton
          schema={AUDIO_SETTING_SCHEMA}
          value={value.audioMode}
          onChange={(v) => onAudioModeChange(v as Robot['audioMode'])}
          disabled={disabled}
        />
      </div>

      <div className="audio-setting-section__row">
        <SliderLinear
          schema={VOLUME_SCHEMA}
          value={value.masterVolume * 100}
          onChange={onVolumeChange}
          disabled={disabled}
        />
        <AccordionContainer
          schema={VOLUME_LFO_ACCORDION_SCHEMA}
          defaultOpen={value.volumeLfo.active}
          contentActive={value.volumeLfo.active}
        >
          <Lfo
            schema={{ id: `${VOLUME_LFO_ACCORDION_SCHEMA.id}.control`, type: 'lfo' }}
            value={value.volumeLfo}
            onChange={onVolumeLfoChange}
            disabled={disabled}
          />
        </AccordionContainer>
      </div>
    </div>
  );
}

export default AudioSettingSection;
