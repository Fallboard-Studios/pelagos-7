import { DualLabel } from './DualLabel';
import { TextInput } from './TextInput';
import type { CoordsInputSchema, TextInputSchema } from '@/types/controls';
import './CoordsInput.css';

export interface CoordsValue {
  x: number;
  y: number;
}

interface CoordsInputProps {
  schema: CoordsInputSchema;
  value: CoordsValue;
  onChange: (value: CoordsValue) => void;
}

/**
 * X/Y coordinate entry composing two TextInput instances. Presentation
 * only — no round-number/low-entropy coordinate guard (that's roadmap
 * Phase 5's responsibility). A non-numeric entry does not call onChange.
 */
export function CoordsInput({ schema, value, onChange }: CoordsInputProps) {
  const xSchema: TextInputSchema = { id: `${schema.id}.x`, type: 'textInput', humanLabel: 'X' };
  const ySchema: TextInputSchema = { id: `${schema.id}.y`, type: 'textInput', humanLabel: 'Y' };

  function handleX(raw: string) {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onChange({ ...value, x: parsed });
  }

  function handleY(raw: string) {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onChange({ ...value, y: parsed });
  }

  return (
    <div className="sc-coords-input">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <div className="sc-coords-input__fields">
        <TextInput schema={xSchema} value={String(value.x)} onChange={handleX} />
        <TextInput schema={ySchema} value={String(value.y)} onChange={handleY} />
      </div>
    </div>
  );
}
