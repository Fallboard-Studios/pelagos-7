import { Toggle } from './Toggle';
import { Stepper } from './Stepper';
import { withActiveClass } from './activeClass';
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
  disabled?: boolean;
}

/** Composes Toggle + Stepper (Note Variance row). The Stepper is disabled
 *  (non-interactive) when value.active is false, or when the external `disabled` prop is set
 *  (which also disables the Toggle itself — a parent-level disabled overrides value.active
 *  entirely, e.g. the company panel's greyed-out "None selected" state). The root also carries a
 *  plain `isActive` class (see Toggle.tsx) so a consumer can write
 *  `.sc-stepper-toggle.isActive { ... }`. */
export function StepperWithToggle({ schema, value, onChange, disabled }: StepperWithToggleProps) {
  const toggleSchema: ToggleSchema = { id: `${schema.id}.active`, type: 'toggle', loreLabel: schema.loreLabel, humanLabel: schema.humanLabel };
  const stepperSchema: StepperSchema = { id: schema.id, type: 'stepper', min: schema.min, max: schema.max };

  return (
    <div className={withActiveClass('sc-stepper-toggle', value.active)}>
      <Toggle
        schema={toggleSchema}
        value={value.active}
        onChange={(active) => onChange({ ...value, active })}
        disabled={disabled}
      />
      <Stepper
        schema={stepperSchema}
        value={value.value}
        onChange={(next) => onChange({ ...value, value: next })}
        disabled={disabled || !value.active}
      />
    </div>
  );
}
