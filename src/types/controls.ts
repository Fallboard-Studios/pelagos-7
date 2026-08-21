/**
 * ControlSchema types, resolving docs/tasks/ARCHITECTURE_AND_COMPONENTS_PLAN.md
 * Task 1. One interface per stateless UI primitive (docs/specs/
 * ARCHITECTURE_AND_COMPONENTS.md §4) — every later drawer phase (Audio Rig,
 * Sector Settings, Robot Options) renders its content through these schemas
 * instead of hardcoded JSX. Bounds/options trace to
 * docs/reference/ROBOT_DATA_GRID.md's Component column.
 */
import type { LfoSettings } from './lfo';

// ========================================
// BASE
// ========================================

export interface ControlSchemaBase {
  id: string;
  /** Both optional — a schema entry may supply neither, either, or both.
   *  Rendered by this control's own internally-composed <DualLabel />. */
  loreLabel?: string;
  humanLabel?: string;
}

// ========================================
// VARIANTS
// ========================================

export interface StepperSchema extends ControlSchemaBase {
  type: 'stepper';
  min: number;
  max: number;
  step?: number;
}

export interface StepperWithToggleSchema extends ControlSchemaBase {
  type: 'stepperToggle';
  min: number;
  max: number;
}

export interface SliderLinearSchema extends ControlSchemaBase {
  type: 'sliderLinear';
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface SliderLogSchema extends ControlSchemaBase {
  type: 'sliderLog';
  min: number;
  max: number;
  unit?: string;
}

export interface SliderCenteredZeroSchema extends ControlSchemaBase {
  type: 'sliderCenteredZero';
  min: number; // negative bound, e.g. -50
  max: number; // positive bound, e.g. +50
  unit?: string;
}

export interface RadioButtonSchema extends ControlSchemaBase {
  type: 'radio';
  options: { value: string; label: string }[];
}

export interface ToggleSchema extends ControlSchemaBase {
  type: 'toggle';
}

export interface TextInputSchema extends ControlSchemaBase {
  type: 'textInput';
  placeholder?: string;
  maxLength?: number;
}

export interface CoordsInputSchema extends ControlSchemaBase {
  type: 'coordsInput';
}

export interface ButtonSchema extends ControlSchemaBase {
  type: 'button';
}

export interface DualLabelSchema extends ControlSchemaBase {
  type: 'dualLabel';
}

export interface AccordionSchema extends ControlSchemaBase {
  type: 'accordion';
}

export interface LfoSchema extends ControlSchemaBase {
  type: 'lfo';
}

export type ControlSchema =
  | StepperSchema | StepperWithToggleSchema
  | SliderLinearSchema | SliderLogSchema | SliderCenteredZeroSchema
  | RadioButtonSchema | ToggleSchema | TextInputSchema | CoordsInputSchema
  | ButtonSchema | DualLabelSchema | AccordionSchema | LfoSchema;

/** Every ControlSchema discriminant, paired with the union per the pattern
 *  src/types/lfo.ts established (LFO_SHAPES, ROBOT_LFO_TARGET_IDS) — makes
 *  "all 13 variants covered, no duplicates" a runtime-testable assertion. */
export const CONTROL_SCHEMA_TYPES: readonly ControlSchema['type'][] = [
  'stepper', 'stepperToggle',
  'sliderLinear', 'sliderLog', 'sliderCenteredZero',
  'radio', 'toggle', 'textInput', 'coordsInput',
  'button', 'dualLabel', 'accordion', 'lfo',
];

// ========================================
// LFO VALUE
// ========================================

/** Lfo component's controlled value — reuses the real engine type from Phase 0,
 *  plus `active`, which sits outside LfoSettings per the OSCILLATION STATE row. */
export interface LfoValue extends LfoSettings {
  active: boolean;
}
