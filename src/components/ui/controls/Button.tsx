import { DualLabel } from './DualLabel';
import { resolveAccessibleName } from './accessibleName';
import type { ButtonSchema } from '@/types/controls';
import './Button.css';

interface ButtonProps {
  schema: ButtonSchema;
  onClick: () => void;
}

/**
 * Schema-driven button — no internal state, calls onClick on click.
 * DualLabel is nested as the button's own content (not a sibling) so the
 * label renders exactly once.
 */
export function Button({ schema, onClick }: ButtonProps) {
  const accessibleName = resolveAccessibleName(schema);
  return (
    <button
      type="button"
      className="sc-button"
      aria-label={accessibleName}
      onClick={onClick}
    >
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
    </button>
  );
}
