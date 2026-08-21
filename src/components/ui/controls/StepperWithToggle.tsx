import { Toggle } from './Toggle';
import { Stepper } from './Stepper';
import type { StepperWithToggleSchema, ToggleSchema, StepperSchema } from '@/types/controls';
import './StepperWithToggle.css';

export interface StepperWithToggleValue {
  active: boolean;
  value: number;
}

interface StepperWithToggleProps {
  schema: StepperWithToggleSchema;
  value: StepperWithToggleValue;
  onChange: (value: StepperWithToggleValue) => void;
}

/** Composes Toggle + Stepper (Note Variance row). The Stepper is disabled
 *  (non-interactive) when value.active is false. */
export function StepperWithToggle({ schema, value, onChange }: StepperWithToggleProps) {
  const toggleSchema: ToggleSchema = { id: `${schema.id}.active`, type: 'toggle', loreLabel: schema.loreLabel, humanLabel: schema.humanLabel };
  const stepperSchema: StepperSchema = { id: schema.id, type: 'stepper', min: schema.min, max: schema.max };

  return (
    <div className="sc-stepper-toggle">
      <Toggle
        schema={toggleSchema}
        value={value.active}
        onChange={(active) => onChange({ ...value, active })}
      />
      <Stepper
        schema={stepperSchema}
        value={value.value}
        onChange={(next) => onChange({ ...value, value: next })}
        disabled={!value.active}
      />
    </div>
  );
}
