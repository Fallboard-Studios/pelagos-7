import { useState } from 'react';

import type { LfoValue } from '@/types/controls';
import { DualLabel } from '@/components/ui/controls/DualLabel';
import { Button } from '@/components/ui/controls/Button';
import { Toggle } from '@/components/ui/controls/Toggle';
import { TextInput } from '@/components/ui/controls/TextInput';
import { Stepper } from '@/components/ui/controls/Stepper';
import { StepperWithToggle } from '@/components/ui/controls/StepperWithToggle';
import { RadioButton } from '@/components/ui/controls/RadioButton';
import { SliderLinear } from '@/components/ui/controls/SliderLinear';
import { SliderLog } from '@/components/ui/controls/SliderLog';
import { SliderCenteredZero } from '@/components/ui/controls/SliderCenteredZero';
import { CoordsInput } from '@/components/ui/controls/CoordsInput';
import { AccordionContainer } from '@/components/ui/controls/AccordionContainer';
import { Lfo } from '@/components/ui/controls/Lfo';

/**
 * THROWAWAY dev-only preview — not part of Phase 1's scope (spec explicitly
 * excludes a demo harness). Renders all 13 primitives together for a quick
 * visual check. Delete this file (and its main.tsx hook) when done.
 */
export function ControlsPreview() {
  const [toggleVal, setToggleVal] = useState(true);
  const [textVal, setTextVal] = useState('Unit 7');
  const [density, setDensity] = useState(6);
  const [noteVariance, setNoteVariance] = useState({ active: true, value: 4 });
  const [lfoShape, setLfoShape] = useState('sine');
  const [volume, setVolume] = useState(0.7);
  const [attack, setAttack] = useState(0.2);
  const [detune, setDetune] = useState(-15);
  const [coords, setCoords] = useState({ x: 12, y: -7 });
  const [lfoValue, setLfoValue] = useState<LfoValue>({ shape: 'triangle', rate: 2, depth: 40, active: true });

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ color: 'var(--color-text-primary)' }}>Component Library Preview</h1>

      <DualLabel loreLabel="ROBOT IDENTIFIER" humanLabel="Robot Name" />
      <Button schema={{ id: 'resetMelody', type: 'button', loreLabel: 'CALIBRATE PING', humanLabel: 'Reset Melody' }} onClick={() => alert('Reset!')} />
      <Toggle schema={{ id: 'layerActive', type: 'toggle', loreLabel: 'LAYER ACTIVE', humanLabel: 'Layer Active' }} value={toggleVal} onChange={setToggleVal} />
      <TextInput schema={{ id: 'robotName', type: 'textInput', loreLabel: 'DESIGNATION', humanLabel: 'Robot Name' }} value={textVal} onChange={setTextVal} />
      <Stepper schema={{ id: 'density', type: 'stepper', min: 1, max: 16, loreLabel: 'PING DENSITY', humanLabel: 'Density' }} value={density} onChange={setDensity} />
      <StepperWithToggle schema={{ id: 'noteVariance', type: 'stepperToggle', min: 1, max: 8, loreLabel: 'PING FREQUENCY VARIANCE', humanLabel: 'Note Variance' }} value={noteVariance} onChange={setNoteVariance} />
      <RadioButton
        schema={{
          id: 'lfoShape', type: 'radio', loreLabel: 'OSCILLATION SHAPE', humanLabel: 'LFO Shape',
          options: [
            { value: 'triangle', label: 'TRIANGLE' },
            { value: 'sine', label: 'SINE' },
            { value: 'square', label: 'SQUARE' },
            { value: 'sawtooth', label: 'SAWTOOTH' },
          ],
        }}
        value={lfoShape}
        onChange={setLfoShape}
      />
      <SliderLinear schema={{ id: 'volume', type: 'sliderLinear', min: 0, max: 1, unit: '%', step: 0.01, loreLabel: 'TRANSDUCER PRESSURE INDEX', humanLabel: 'Volume' }} value={volume} onChange={setVolume} />
      <SliderLog schema={{ id: 'attack', type: 'sliderLog', min: 0, max: 10, unit: 's', loreLabel: 'COMPRESSION RATE', humanLabel: 'Attack' }} value={attack} onChange={setAttack} />
      <SliderCenteredZero schema={{ id: 'detune', type: 'sliderCenteredZero', min: -50, max: 50, unit: 'ct', loreLabel: 'BASELINE DRIFT', humanLabel: 'Detune' }} value={detune} onChange={setDetune} />
      <CoordsInput schema={{ id: 'sectorCoords', type: 'coordsInput', humanLabel: 'Sector Coordinates' }} value={coords} onChange={setCoords} />

      <AccordionContainer schema={{ id: 'pingControls', type: 'accordion', loreLabel: 'PING CONTROLS', humanLabel: 'Ping Controls' }} defaultOpen>
        <p style={{ color: 'var(--color-text-muted)' }}>Nested content — e.g. Density/Motif Length/Note Variance would live here in a real drawer.</p>
      </AccordionContainer>

      <Lfo schema={{ id: 'volumeLfo', type: 'lfo', loreLabel: 'OSCILLATION', humanLabel: 'Volume LFO' }} value={lfoValue} onChange={setLfoValue} />
    </div>
  );
}
