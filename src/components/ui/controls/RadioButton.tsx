import * as ToggleGroup from '@radix-ui/react-toggle-group';

import { DualLabel } from './DualLabel';
import { resolveAccessibleName } from './accessibleName';
import type { RadioButtonSchema } from '@/types/controls';
import './RadioButton.css';

interface RadioButtonProps {
  schema: RadioButtonSchema;
  value: string;
  onChange: (value: string) => void;
}

/** Single-select control wrapping @radix-ui/react-toggle-group (type="single"),
 *  matching RobotAudioTab.tsx's existing Audio Mode pattern. A deselect-to-empty
 *  event is guarded and does not call onChange. */
export function RadioButton({ schema, value, onChange }: RadioButtonProps) {
  return (
    <div className="sc-radio-button">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <ToggleGroup.Root
        type="single"
        className="sc-radio-button__root"
        value={value}
        onValueChange={(next) => { if (next) onChange(next); }}
        aria-label={resolveAccessibleName(schema)}
      >
        {schema.options.map((option) => (
          <ToggleGroup.Item
            key={option.value}
            className="sc-radio-button__item"
            value={option.value}
            aria-label={option.label}
          >
            {option.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}
