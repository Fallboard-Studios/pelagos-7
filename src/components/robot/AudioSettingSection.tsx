import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { LfoTargetGroup } from '@/components/ui/controls/LfoTargetGroup';
import { DirectionalPanel } from '@/components/ui/controls/DirectionalPanel';
import { AUDIO_SETTING_SCHEMA, VOLUME_SCHEMA, ROBOT_OUTPUT_PANEL_SCHEMA } from '@/data/robotOptionsConfig';
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
 * Robot Options' editable Audio Setting + Volume (+ its LFO display) block — extracted out of
 * RobotDisplaySection (Roadmap Phase 10) into its own presentational component so both the
 * single-robot screen and the company-broadcast panel can render the exact same controls, bound
 * to different value/onChange sources. No `robot` prop, no store access — a pure value/onChange
 * component, same contract every other refactored Robot Options section now uses.
 *
 * Volume renders through a shared LfoTargetGroup (docs/specs/LFO_CONSOLIDATED_DISPLAY.md) with
 * a single field — the same bare-slider-plus-shared-display shape every other LFO-tied group
 * uses, replacing the old nested "Modulation" accordion, even though there's nothing else to
 * target yet. Keeps this section's shape consistent should more sliders join it later.
 *
 * Self-wraps in a DirectionalPanel (docs/tasks/DIRECTIONAL_PANEL_WIRING.md Task 4), matching the
 * "component wraps itself" precedent PingControlsDrawer/PingContourDrawer/SignatureArrayDrawer
 * already established with their own AccordionContainer — this was the one drawer-ish component
 * that didn't self-wrap before this task.
 */
export function AudioSettingSection({ value, onAudioModeChange, onVolumeChange, onVolumeLfoChange, disabled }: AudioSettingSectionProps) {
  return (
    <DirectionalPanel schema={ROBOT_OUTPUT_PANEL_SCHEMA}>
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
          <LfoTargetGroup
            groupId="robotOptions.volume"
            fields={[{ field: 'volume', label: VOLUME_SCHEMA.humanLabel!, lfoValue: value.volumeLfo }]}
            onLfoChange={(_field, v) => onVolumeLfoChange(v)}
            disabled={disabled}
            renderField={() => (
              <SliderLinear schema={VOLUME_SCHEMA} value={value.masterVolume * 100} onChange={onVolumeChange} disabled={disabled} />
            )}
          />
        </div>
      </div>
    </DirectionalPanel>
  );
}

export default AudioSettingSection;
