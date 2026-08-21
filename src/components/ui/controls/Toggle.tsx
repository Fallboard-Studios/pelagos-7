import * as Switch from '@radix-ui/react-switch';

import { DualLabel } from './DualLabel';
import { resolveAccessibleName } from './accessibleName';
import type { ToggleSchema } from '@/types/controls';
import './Toggle.css';

interface ToggleProps {
  schema: ToggleSchema;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** Binary ON/OFF control wrapping @radix-ui/react-switch. Controlled — never
 *  manages its own selection state. The root also carries a plain `isActive`
 *  class (alongside Radix's own `data-state` on the switch itself) so a
 *  consumer can write `.sc-toggle.isActive { ... }` instead of a `:has()`
 *  attribute selector. */
export function Toggle({ schema, value, onChange }: ToggleProps) {
  return (
    <div className={`sc-toggle${value ? ' isActive' : ''}`}>
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <Switch.Root
        className="sc-toggle__root"
        checked={value}
        aria-label={resolveAccessibleName(schema)}
        onCheckedChange={(checked) => onChange(checked)}
      >
        <Switch.Thumb className="sc-toggle__thumb" />
      </Switch.Root>
    </div>
  );
}
