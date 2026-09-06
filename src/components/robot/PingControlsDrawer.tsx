import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { Toggle } from '@/components/ui/controls/Toggle';
import { Button } from '@/components/ui/controls/Button';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { DirectionalPanel } from '@/components/ui/controls/DirectionalPanel';
import {
  MELODY_ACCORDION_SCHEMA,
  PHRASING_PANEL_SCHEMA,
  RHYTHM_PANEL_SCHEMA,
  FREQUENCY_PANEL_SCHEMA,
  CLICK_TRACK_SCHEMA,
  DENSITY_SCHEMA,
  MOTIF_LENGTH_SCHEMA,
  PITCH_REPEAT_SCHEMA,
  OCTAVE_RANGE_MIN_SCHEMA,
  OCTAVE_RANGE_MAX_SCHEMA,
  NOTE_VARIANCE_SCHEMA,
  RESET_MELODY_SCHEMA,
} from '@/data/robotOptionsConfig';
import { DEV_TUNING } from '@/constants';

import './PingControlsDrawer.css';

export interface PingControlsValue {
  rhythmicDensity: number;
  /**
   * 0-8, min extended down to 0 (docs/specs/STEPPER_TO_SLIDER.md) — 0 is the off state
   * (equivalent to the old rhythmicMotifLength.active === false), reproduced exactly in
   * melodyGenerator.ts. The slider itself is never disabled purely because its value is 0 —
   * there's no separate toggle left to turn it back on, so dragging it back above 0 is the
   * only way. {active, value} reconstruction happens only in robotOptionsActions.ts.
   */
  rhythmicMotifLength: number;
  /** Same off-via-0 shape as rhythmicMotifLength above. */
  noteVariance: number;
  /**
   * 0-100. Increasingly locks a tiled motif's repeated cells to the base cell's pitches. Only
   * meaningful while `rhythmicMotifLength` is nonzero — the slider is disabled whenever it's 0,
   * in addition to the usual `generationDisabled` gate.
   */
  pitchRepeat: number;
  octaveRange: [number, number];
  /**
   * Testing-only: whether the robot's (or, in company mode, every broadcast member's) real
   * melody is currently overridden by the fixed click-track pattern (see
   * src/engine/clickTrack.ts). Unlike onResetMelody, this one *is* company-scoped — broadcasting
   * it turns the click track on/off for every member at once, e.g. to check tempo consistency
   * across a whole company. The toggle itself only renders behind `DEV_TUNING` (see below) — a
   * production build can never set this true.
   */
  clickTrackActive: boolean;
}

interface PingControlsDrawerProps {
  value: PingControlsValue;
  onDensityChange: (value: number) => void;
  onMotifLengthChange: (value: number) => void;
  onPitchRepeatChange: (value: number) => void;
  onOctaveMinChange: (value: number) => void;
  onOctaveMaxChange: (value: number) => void;
  onNoteVarianceChange: (value: number) => void;
  onClickTrackActiveChange: (active: boolean) => void;
  /** Undefined omits the Reset Melody button entirely — it has no company-scoped meaning
   *  (Roadmap Phase 10's company panel never renders it), so absence, not disabling, is how a
   *  caller opts it out. */
  onResetMelody?: () => void;
  disabled?: boolean;
}

/**
 * One Melody AccordionContainer wrapping 2 DirectionalPanels — Phrasing (Density, Motif Length,
 * Pitch Repeat, the dev-only Click Track toggle, Reset Melody) and Frequency (Octave Range, Note
 * Variance) — the direct schema-driven replacement for RobotAudioTab's hand-rolled Radix
 * sliders/toggle-group. Purely presentational as of Roadmap Phase 10 (Task 14), regrouped into
 * Melody/Phrasing/Frequency by docs/tasks/DIRECTIONAL_PANEL_WIRING.md Task 6 — no `robot` prop,
 * no store access; both RobotOptionsTab (robot mode) and CompanyOptionsSection (company mode)
 * derive `value` and wire each callback through robotOptionsActions themselves, and neither call
 * site needed any change for this restructure (`PingControlsDrawerProps` is unchanged). Octave
 * Range is two independent SliderLinears (not the old dual-thumb Slider) — each was a Stepper
 * before docs/specs/STEPPER_TO_SLIDER.md, same "too slow to click through" reasoning Density's
 * own SliderLinear conversion established first.
 */
export function PingControlsDrawer({
  value,
  onDensityChange,
  onMotifLengthChange,
  onPitchRepeatChange,
  onOctaveMinChange,
  onOctaveMaxChange,
  onNoteVarianceChange,
  onResetMelody,
  onClickTrackActiveChange,
  disabled,
}: PingControlsDrawerProps) {
  const [octMin, octMax] = value.octaveRange;
  // While the click track is playing, the rest of this accordion's controls would silently
  // overwrite it (every one of density/motif/note-variance's handlers re-registers a freshly
  // generated melody with AudioEngine) without ever clearing the toggle's own visual state —
  // so they're disabled alongside it, not just cosmetically greyed but genuinely inert.
  const generationDisabled = disabled || value.clickTrackActive;
  // Pitch Repeat additionally needs a tiled motif to lock cells within — no cell concept exists
  // when Motif Length is off (docs/specs/PITCH_REPEAT.md). rhythmicMotifLength === 0 is the off
  // state (equivalent to the old .active === false) — see docs/specs/STEPPER_TO_SLIDER.md. Named
  // separately from generationDisabled (rather than inlined at the one call site) so a future
  // field with a similar cross-field gate has a pattern to match instead of inventing its own shape.
  const pitchRepeatDisabled = generationDisabled || value.rhythmicMotifLength === 0;

  return (
    <AccordionContainer schema={MELODY_ACCORDION_SCHEMA}>
      <div className="ping-controls-drawer">
        <DirectionalPanel schema={PHRASING_PANEL_SCHEMA}>
          {/* Dev-only, same gate as the Skipped Notes debug counter (App.tsx) — a testing aid,
              not something a production build's audience should see or be able to reach. */}
          {DEV_TUNING && (
            <Toggle schema={CLICK_TRACK_SCHEMA} value={value.clickTrackActive} onChange={onClickTrackActiveChange} disabled={disabled} />
          )}
          <DirectionalPanel schema={RHYTHM_PANEL_SCHEMA}>
            <SliderLinear schema={DENSITY_SCHEMA} value={value.rhythmicDensity} onChange={onDensityChange} disabled={generationDisabled} />
            <SliderLinear schema={MOTIF_LENGTH_SCHEMA} value={value.rhythmicMotifLength} onChange={onMotifLengthChange} disabled={generationDisabled} />
            <SliderLinear
              schema={PITCH_REPEAT_SCHEMA}
              value={value.pitchRepeat}
              onChange={onPitchRepeatChange}
              disabled={pitchRepeatDisabled}
            />
          </DirectionalPanel>
          {onResetMelody && <Button schema={RESET_MELODY_SCHEMA} onClick={onResetMelody} disabled={generationDisabled} />}
        </DirectionalPanel>
        <DirectionalPanel schema={FREQUENCY_PANEL_SCHEMA}>
          <SliderLinear schema={OCTAVE_RANGE_MIN_SCHEMA} value={octMin} onChange={onOctaveMinChange} disabled={generationDisabled} />
          <SliderLinear schema={OCTAVE_RANGE_MAX_SCHEMA} value={octMax} onChange={onOctaveMaxChange} disabled={generationDisabled} />
          <SliderLinear schema={NOTE_VARIANCE_SCHEMA} value={value.noteVariance} onChange={onNoteVarianceChange} disabled={generationDisabled} />
        </DirectionalPanel>
      </div>
    </AccordionContainer>
  );
}

export default PingControlsDrawer;
