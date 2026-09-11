import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { Lfo } from '@/components/ui/controls/Lfo';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { DirectionalPanel } from '@/components/ui/controls/DirectionalPanel';
import { useLfoTargetGroup } from '@/components/ui/controls/useLfoTargetGroup';
import { withActiveClass } from '@/components/ui/controls/activeClass';
import {
  AUDIO_SETTING_SCHEMA,
  VOLUME_SCHEMA,
  VOLUME_ACCORDION_SCHEMA,
  VOLUME_ROW_PANEL_SCHEMA,
  VOLUME_SETTINGS_COLUMN_PANEL_SCHEMA,
} from '@/data/robotOptionsConfig';
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
 * component, same contract every other refactored Robot Options section uses.
 *
 * Wrapped in its own Volume accordion (docs/specs/ROBOT_OPTIONS_RESPONSIVE_LAYOUT.md §1.2) — the
 * one Robot Options section that didn't have an accordion before this phase. Volume renders
 * through `useLfoTargetGroup` called directly (the hook, not the shared `<LfoTargetGroup>`
 * wrapper component) so this component can hand-compose a layout `LfoTargetGroup` has no way to
 * produce on its own: Audio Setting + Volume stacked in one column, beside (desktop) or above
 * (mobile/tablet) the shared Lfo display — the same escape hatch `AudioRigLfoGroup`
 * (`AudioRigDrawer.tsx`) already uses for its own custom composition needs. There's only one
 * field to target ('volume'), so `selected`/`isTargeted` are effectively constant, but the same
 * click/focus-to-select wiring is kept for consistency with every other LFO-tied control group.
 */
export function AudioSettingSection({ value, onAudioModeChange, onVolumeChange, onVolumeLfoChange, disabled }: AudioSettingSectionProps) {
  const { transitioning, select, isTargeted, displayValue, displayLabel } = useLfoTargetGroup({
    groupId: 'robotOptions.volume',
    fields: [{ field: 'volume', label: VOLUME_SCHEMA.humanLabel!, lfoValue: value.volumeLfo }],
  });

  return (
    <AccordionContainer schema={VOLUME_ACCORDION_SCHEMA}>
      <DirectionalPanel schema={VOLUME_ROW_PANEL_SCHEMA}>
        <DirectionalPanel schema={VOLUME_SETTINGS_COLUMN_PANEL_SCHEMA}>
          <div className="audio-setting-section__row">
            <RadioButton
              schema={AUDIO_SETTING_SCHEMA}
              value={value.audioMode}
              onChange={(v) => onAudioModeChange(v as Robot['audioMode'])}
              disabled={disabled}
            />
          </div>
          <div
            className={withActiveClass('audio-setting-section__row sc-lfo-target-group__row', isTargeted('volume'))}
            onClick={() => select('volume')}
            onFocus={() => select('volume')}
          >
            <SliderLinear schema={VOLUME_SCHEMA} value={value.masterVolume * 100} onChange={onVolumeChange} disabled={disabled} />
          </div>
        </DirectionalPanel>
        <div className={withActiveClass('sc-lfo-target-group__display', transitioning)}>
          <Lfo
            schema={{ id: 'robotOptions.volume.lfo', type: 'lfo', humanLabel: displayLabel }}
            value={displayValue}
            onChange={(v) => onVolumeLfoChange(v)}
            disabled={disabled || transitioning}
          />
        </div>
      </DirectionalPanel>
    </AccordionContainer>
  );
}

export default AudioSettingSection;
