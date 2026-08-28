// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import {
  CONTROL_SCHEMA_TYPES,
  type ControlSchema,
  type StepperSchema,
  type StepperWithToggleSchema,
  type SliderLinearSchema,
  type SliderLogSchema,
  type SliderCenteredZeroSchema,
  type RadioButtonSchema,
  type ToggleSchema,
  type TextInputSchema,
  type CoordsInputSchema,
  type ButtonSchema,
  type DualLabelSchema,
  type AccordionSchema,
  type LfoSchema,
  type SelectSchema,
  type LfoValue,
} from './controls';

// ========================================
// TESTS
// ========================================

describe('CONTROL_SCHEMA_TYPES', () => {
  it('has exactly 14 entries, no duplicates', () => {
    expect(CONTROL_SCHEMA_TYPES).toHaveLength(14);
    expect(new Set(CONTROL_SCHEMA_TYPES).size).toBe(14);
  });

  it('matches the ControlSchema union discriminants exactly', () => {
    expect([...CONTROL_SCHEMA_TYPES].sort()).toEqual(
      [
        'stepper', 'stepperToggle',
        'sliderLinear', 'sliderLog', 'sliderCenteredZero',
        'radio', 'toggle', 'textInput', 'coordsInput',
        'button', 'dualLabel', 'accordion', 'lfo', 'select',
      ].sort()
    );
  });
});

describe('ControlSchema variants', () => {
  it('accepts one literal object per variant, each optional loreLabel/humanLabel omitted', () => {
    const stepper: StepperSchema = { id: 'density', type: 'stepper', min: 1, max: 16 };
    const stepperToggle: StepperWithToggleSchema = { id: 'noteVariance', type: 'stepperToggle', min: 1, max: 8 };
    const sliderLinear: SliderLinearSchema = { id: 'lfoRate', type: 'sliderLinear', min: 0.1, max: 10 };
    const sliderLog: SliderLogSchema = { id: 'attack', type: 'sliderLog', min: 0, max: 10 };
    const sliderCenteredZero: SliderCenteredZeroSchema = { id: 'detune', type: 'sliderCenteredZero', min: -50, max: 50 };
    const radio: RadioButtonSchema = { id: 'lfoShape', type: 'radio', options: [{ value: 'sine', label: 'SINE' }] };
    const toggle: ToggleSchema = { id: 'layerActive', type: 'toggle' };
    const textInput: TextInputSchema = { id: 'robotName', type: 'textInput' };
    const coordsInput: CoordsInputSchema = { id: 'sectorCoords', type: 'coordsInput' };
    const button: ButtonSchema = { id: 'resetMelody', type: 'button' };
    const dualLabel: DualLabelSchema = { id: 'jobData', type: 'dualLabel' };
    const accordion: AccordionSchema = { id: 'pingControls', type: 'accordion' };
    const lfo: LfoSchema = { id: 'volumeLfo', type: 'lfo' };
    const select: SelectSchema = { id: 'company.assign', type: 'select', options: [{ value: 'a', label: 'A' }] };

    const variants: ControlSchema[] = [
      stepper, stepperToggle, sliderLinear, sliderLog, sliderCenteredZero,
      radio, toggle, textInput, coordsInput, button, dualLabel, accordion, lfo, select,
    ];

    expect(variants).toHaveLength(14);
  });

  it('accepts loreLabel and/or humanLabel on the shared base, both optional', () => {
    const neither: ButtonSchema = { id: 'a', type: 'button' };
    const lore: ButtonSchema = { id: 'b', type: 'button', loreLabel: 'CALIBRATE PING' };
    const human: ButtonSchema = { id: 'c', type: 'button', humanLabel: 'Reset Melody' };
    const both: ButtonSchema = { id: 'd', type: 'button', loreLabel: 'CALIBRATE PING', humanLabel: 'Reset Melody' };

    expect(neither.loreLabel).toBeUndefined();
    expect(lore.loreLabel).toBe('CALIBRATE PING');
    expect(human.humanLabel).toBe('Reset Melody');
    expect(both.loreLabel).toBe('CALIBRATE PING');
    expect(both.humanLabel).toBe('Reset Melody');
  });
});

describe('LfoValue', () => {
  it('extends LfoSettings with an active flag', () => {
    const value: LfoValue = { shape: 'triangle', rate: 2, depth: 40, active: true };
    expect(value.shape).toBe('triangle');
    expect(value.active).toBe(true);
  });
});
