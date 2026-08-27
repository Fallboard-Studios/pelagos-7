import { Stepper } from '@/components/ui/controls/Stepper';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { StepperWithToggle, type StepperWithToggleValue } from '@/components/ui/controls/StepperWithToggle';
import { Button } from '@/components/ui/controls/Button';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { useLocaleStore } from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { regenerateMelody } from '@/engine/regenerateMelody';
import {
  PING_CONTROLS_ACCORDION_SCHEMA,
  DENSITY_SCHEMA,
  MOTIF_LENGTH_SCHEMA,
  OCTAVE_RANGE_MIN_SCHEMA,
  OCTAVE_RANGE_MAX_SCHEMA,
  NOTE_VARIANCE_SCHEMA,
  RESET_MELODY_SCHEMA,
} from '@/data/robotOptionsConfig';
import type { Robot } from '@/types/Robot';

import './PingControlsDrawer.css';

interface PingControlsDrawerProps {
  robot: Robot;
}

/**
 * One AccordionContainer wrapping Density/Motif Length/Octave Range/Note Variance/Reset Melody —
 * the direct schema-driven replacement for RobotAudioTab.tsx's hand-rolled Radix sliders/toggle-
 * group, calling the same regenerateMelody()/updateRobot() pair it already does. Octave Range is
 * two independent Steppers (per ROBOT_DATA_GRID.md), not the old dual-thumb Slider. Density is a
 * SliderLinear rather than the grid's Stepper — clicking through a 0-100 range one increment at a
 * time was too slow to be usable.
 */
export function PingControlsDrawer({ robot }: PingControlsDrawerProps) {
  const localeId = getActiveLocaleId();
  const rhythmicDensity = robot.rhythmicDensity ?? 50;
  const rhythmicMotifLength = robot.rhythmicMotifLength ?? { active: true, value: 8 };
  const noteVariance = robot.noteVariance ?? { active: false, value: 1 };
  const [octMin, octMax] = robot.octaveRange;

  const handleDensityChange = (density: number) => {
    useLocaleStore.getState().updateRobot(localeId, robot.id, { rhythmicDensity: density });
    regenerateMelody({ ...robot, rhythmicDensity: density }, localeId);
  };

  const handleMotifLengthChange = (value: StepperWithToggleValue) => {
    useLocaleStore.getState().updateRobot(localeId, robot.id, { rhythmicMotifLength: value });
    regenerateMelody({ ...robot, rhythmicMotifLength: value }, localeId);
  };

  const handleNoteVarianceChange = (value: StepperWithToggleValue) => {
    useLocaleStore.getState().updateRobot(localeId, robot.id, { noteVariance: value });
    regenerateMelody({ ...robot, noteVariance: value }, localeId);
  };

  // Keeps min <= max at all times — the old dual-thumb Slider enforced this via
  // minStepsBetweenThumbs; two independent Steppers need the same guard here instead.
  const handleOctaveMinChange = (value: number) => {
    const next: [number, number] = [Math.min(value, octMax), octMax];
    useLocaleStore.getState().updateRobot(localeId, robot.id, { octaveRange: next });
  };

  const handleOctaveMaxChange = (value: number) => {
    const next: [number, number] = [octMin, Math.max(value, octMin)];
    useLocaleStore.getState().updateRobot(localeId, robot.id, { octaveRange: next });
  };

  const handleResetMelody = () => {
    regenerateMelody(robot, localeId);
  };

  return (
    <AccordionContainer schema={PING_CONTROLS_ACCORDION_SCHEMA}>
      <div className="ping-controls-drawer">
        <SliderLinear schema={DENSITY_SCHEMA} value={rhythmicDensity} onChange={handleDensityChange} />
        <StepperWithToggle schema={MOTIF_LENGTH_SCHEMA} value={rhythmicMotifLength} onChange={handleMotifLengthChange} />
        <Stepper schema={OCTAVE_RANGE_MIN_SCHEMA} value={octMin} onChange={handleOctaveMinChange} />
        <Stepper schema={OCTAVE_RANGE_MAX_SCHEMA} value={octMax} onChange={handleOctaveMaxChange} />
        <StepperWithToggle schema={NOTE_VARIANCE_SCHEMA} value={noteVariance} onChange={handleNoteVarianceChange} />
        <Button schema={RESET_MELODY_SCHEMA} onClick={handleResetMelody} />
      </div>
    </AccordionContainer>
  );
}

export default PingControlsDrawer;
