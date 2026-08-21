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

/** Single-select control wrapping @radix-ui/react-toggle-group (type="single")
 *  — already installed elsewhere in the codebase (e.g. RobotAudioTab.tsx's
 *  Audio Mode row, pre-Phase-9), so this avoids adding a redundant
 *  @radix-ui/react-radio-group dependency for the same job. A deselect-to-empty
 *  event (Radix's single-mode ToggleGroup emits '' when the active item is
 *  clicked again) is guarded and does not call onChange. */
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
