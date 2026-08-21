import { DualLabel } from './DualLabel';
import type { TextInputSchema } from '@/types/controls';
import './TextInput.css';

interface TextInputProps {
  schema: TextInputSchema;
  value: string;
  onChange: (value: string) => void;
}

/** Plain schema-driven text input. Controlled — calls onChange with the raw
 *  string on every keystroke, no internal buffering. */
export function TextInput({ schema, value, onChange }: TextInputProps) {
  return (
    <div className="sc-text-input">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <input
        type="text"
        className="sc-text-input__el"
        aria-label={schema.humanLabel ?? schema.loreLabel}
        placeholder={schema.placeholder}
        maxLength={schema.maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
