import { Stepper } from '@/components/ui/controls/Stepper';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { StepperWithToggle, type StepperWithToggleValue } from '@/components/ui/controls/StepperWithToggle';
import { Button } from '@/components/ui/controls/Button';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import {
  PING_CONTROLS_ACCORDION_SCHEMA,
  DENSITY_SCHEMA,
  MOTIF_LENGTH_SCHEMA,
  OCTAVE_RANGE_MIN_SCHEMA,
  OCTAVE_RANGE_MAX_SCHEMA,
  NOTE_VARIANCE_SCHEMA,
  RESET_MELODY_SCHEMA,
} from '@/data/robotOptionsConfig';

import './PingControlsDrawer.css';

export interface PingControlsValue {
  rhythmicDensity: number;
  rhythmicMotifLength: StepperWithToggleValue;
  noteVariance: StepperWithToggleValue;
  octaveRange: [number, number];
}

interface PingControlsDrawerProps {
  value: PingControlsValue;
  onDensityChange: (value: number) => void;
  onMotifLengthChange: (value: StepperWithToggleValue) => void;
  onOctaveMinChange: (value: number) => void;
  onOctaveMaxChange: (value: number) => void;
  onNoteVarianceChange: (value: StepperWithToggleValue) => void;
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
  onOctaveMinChange,
  onOctaveMaxChange,
  onNoteVarianceChange,
  onResetMelody,
  disabled,
}: PingControlsDrawerProps) {
  const [octMin, octMax] = value.octaveRange;

  return (
    <AccordionContainer schema={PING_CONTROLS_ACCORDION_SCHEMA}>
      <div className="ping-controls-drawer">
        <SliderLinear schema={DENSITY_SCHEMA} value={value.rhythmicDensity} onChange={onDensityChange} disabled={disabled} />
        <StepperWithToggle schema={MOTIF_LENGTH_SCHEMA} value={value.rhythmicMotifLength} onChange={onMotifLengthChange} disabled={disabled} />
        <Stepper schema={OCTAVE_RANGE_MIN_SCHEMA} value={octMin} onChange={onOctaveMinChange} disabled={disabled} />
        <Stepper schema={OCTAVE_RANGE_MAX_SCHEMA} value={octMax} onChange={onOctaveMaxChange} disabled={disabled} />
        <StepperWithToggle schema={NOTE_VARIANCE_SCHEMA} value={value.noteVariance} onChange={onNoteVarianceChange} disabled={disabled} />
        {onResetMelody && <Button schema={RESET_MELODY_SCHEMA} onClick={onResetMelody} />}
      </div>
    </AccordionContainer>
  );
}

export default PingControlsDrawer;
