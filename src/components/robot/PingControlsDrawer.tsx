import { Stepper } from '@/components/ui/controls/Stepper';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { StepperWithToggle, type StepperWithToggleValue } from '@/components/ui/controls/StepperWithToggle';
import { Toggle } from '@/components/ui/controls/Toggle';
import { Button } from '@/components/ui/controls/Button';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import {
  PING_CONTROLS_ACCORDION_SCHEMA,
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
  rhythmicMotifLength: StepperWithToggleValue;
  noteVariance: StepperWithToggleValue;
  /**
   * 0-100. Increasingly locks a tiled motif's repeated cells to the base cell's pitches. Only
   * meaningful while `rhythmicMotifLength.active` is true — the slider is disabled whenever it
   * isn't, in addition to the usual `generationDisabled` gate.
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
  onMotifLengthChange: (value: StepperWithToggleValue) => void;
  onPitchRepeatChange: (value: number) => void;
  onOctaveMinChange: (value: number) => void;
  onOctaveMaxChange: (value: number) => void;
  onNoteVarianceChange: (value: StepperWithToggleValue) => void;
  onClickTrackActiveChange: (active: boolean) => void;
  /** Undefined omits the Reset Melody button entirely — it has no company-scoped meaning
   *  (Roadmap Phase 10's company panel never renders it), so absence, not disabling, is how a
   *  caller opts it out. */
  onResetMelody?: () => void;
  disabled?: boolean;
}

/**
 * One AccordionContainer wrapping Density/Motif Length/Octave Range/Note Variance/Reset Melody —
 * the direct schema-driven replacement for RobotAudioTab's hand-rolled Radix sliders/toggle-
 * group. Purely presentational as of Roadmap Phase 10 (Task 14) — no `robot` prop, no store
 * access; both RobotOptionsTab (robot mode) and CompanyOptionsSection (company mode) derive
 * `value` and wire each callback through robotOptionsActions themselves. Octave Range is two
 * independent Steppers (per ROBOT_DATA_GRID.md), not the old dual-thumb Slider. Density is a
 * SliderLinear rather than the grid's Stepper — clicking through a 0-100 range one increment at a
 * time was too slow to be usable.
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
  // when Motif Length is off (docs/specs/PITCH_REPEAT.md). Named separately from
  // generationDisabled (rather than inlined at the one call site) so a future field with a
  // similar cross-field gate has a pattern to match instead of inventing its own shape.
  const pitchRepeatDisabled = generationDisabled || !value.rhythmicMotifLength.active;

  return (
    <AccordionContainer schema={PING_CONTROLS_ACCORDION_SCHEMA}>
      <div className="ping-controls-drawer">
        {/* Dev-only, same gate as the Skipped Notes debug counter (App.tsx) — a testing aid,
            not something a production build's audience should see or be able to reach. */}
        {DEV_TUNING && (
          <Toggle schema={CLICK_TRACK_SCHEMA} value={value.clickTrackActive} onChange={onClickTrackActiveChange} disabled={disabled} />
        )}
        <SliderLinear schema={DENSITY_SCHEMA} value={value.rhythmicDensity} onChange={onDensityChange} disabled={generationDisabled} />
        <StepperWithToggle schema={MOTIF_LENGTH_SCHEMA} value={value.rhythmicMotifLength} onChange={onMotifLengthChange} disabled={generationDisabled} />
        <SliderLinear
          schema={PITCH_REPEAT_SCHEMA}
          value={value.pitchRepeat}
          onChange={onPitchRepeatChange}
          disabled={pitchRepeatDisabled}
        />
        <Stepper schema={OCTAVE_RANGE_MIN_SCHEMA} value={octMin} onChange={onOctaveMinChange} disabled={generationDisabled} />
        <Stepper schema={OCTAVE_RANGE_MAX_SCHEMA} value={octMax} onChange={onOctaveMaxChange} disabled={generationDisabled} />
        <StepperWithToggle schema={NOTE_VARIANCE_SCHEMA} value={value.noteVariance} onChange={onNoteVarianceChange} disabled={generationDisabled} />
        {onResetMelody && <Button schema={RESET_MELODY_SCHEMA} onClick={onResetMelody} disabled={generationDisabled} />}
      </div>
    </AccordionContainer>
  );
}

export default PingControlsDrawer;
