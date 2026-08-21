import * as Switch from '@radix-ui/react-switch';

import { DualLabel } from './DualLabel';
import type { ToggleSchema } from '@/types/controls';
import './Toggle.css';

interface ToggleProps {
  schema: ToggleSchema;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** Binary ON/OFF control wrapping @radix-ui/react-switch. Controlled — never
 *  manages its own selection state. */
export function Toggle({ schema, value, onChange }: ToggleProps) {
  return (
    <div className="sc-toggle">
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <Switch.Root
        className="sc-toggle__root"
        checked={value}
        aria-label={schema.humanLabel ?? schema.loreLabel}
        onCheckedChange={(checked) => onChange(checked)}
      >
        <Switch.Thumb className="sc-toggle__thumb" />
      </Switch.Root>
    </div>
  );
}
