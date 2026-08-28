import * as RadixSelect from '@radix-ui/react-select';

import { DualLabel } from './DualLabel';
import { resolveAccessibleName } from './accessibleName';
import type { SelectSchema } from '@/types/controls';
import './Select.css';

interface SelectProps {
  schema: SelectSchema;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Design System's 14th primitive (Roadmap Phase 10) — a dropdown, wrapping
 *  @radix-ui/react-select (already a dependency, this is its first consumer). Same props
 *  contract as RadioButton (the closest existing precedent — an options-list control wrapping
 *  a Radix primitive), plus `disabled`, which every other options-list control here already has.
 *  Used for the robot-to-company assignment dropdown (see src/data/companyConfig.ts). */
export function Select({ schema, value, onChange, disabled }: SelectProps) {
  return (
    <div className="sc-select">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <RadixSelect.Root value={value} onValueChange={onChange} disabled={disabled}>
        <RadixSelect.Trigger className="sc-select__trigger" aria-label={resolveAccessibleName(schema)}>
          <RadixSelect.Value />
          <RadixSelect.Icon className="sc-select__icon" aria-hidden="true">▾</RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content className="sc-select__content" position="popper">
            <RadixSelect.Viewport>
              {schema.options.map((option) => (
                <RadixSelect.Item key={option.value} value={option.value} className="sc-select__item">
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}
