import { DualLabel } from './DualLabel';
import type { TextInputSchema } from '@/types/controls';
import './TextInput.css';

interface TextInputProps {
  schema: TextInputSchema;
  value: string;
  onChange: (value: string) => void;
  /** Renders as a native numeric input (type="number", inputMode="decimal")
   *  instead of plain text — for callers whose value is always a number
   *  (e.g. CoordsInput's X/Y fields). Purely a rendering concern, not part
   *  of TextInputSchema — the schema still describes generic text entry. */
  numeric?: boolean;
}

/** Plain schema-driven text input. Controlled — calls onChange with the raw
 *  string on every keystroke, no internal buffering. */
export function TextInput({ schema, value, onChange, numeric }: TextInputProps) {
  return (
    <div className="sc-text-input">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <input
        type={numeric ? 'number' : 'text'}
        inputMode={numeric ? 'decimal' : undefined}
        step={numeric ? 'any' : undefined}
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
