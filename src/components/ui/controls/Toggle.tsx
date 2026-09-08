import * as Switch from '@radix-ui/react-switch';
import type { CSSProperties } from 'react';

import { CabinetBox } from './CabinetBox';
import { DualLabel } from './DualLabel';
import { resolveAccessibleName } from './accessibleName';
import { withActiveClass } from './activeClass';
import type { ToggleSchema } from '@/types/controls';
import './Toggle.css';

interface ToggleProps {
  schema: ToggleSchema;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * Fixed cabinet-box size for Toggle (roadmap Phase 11.1.2) — deliberately
 * NOT the breakpoint-driven 32/40/48px tiers Button's own content-sized box
 * uses (roadmap 11.1.1). Toggle sits inline next to its own DualLabel row
 * rather than filling a hub tile, so there's no content to accommodate at a
 * larger size on wider viewports. See docs/specs/OBLIQUE_CABINETRY_TOGGLE.md §1.2.
 */
export const CABINET_TOGGLE_BOX_SIZE = 32;

const cabinetTokens = {
  '--cabinet-toggle-box-size': `${CABINET_TOGGLE_BOX_SIZE}px`,
} as CSSProperties;

/**
 * Binary ON/OFF control wrapping @radix-ui/react-switch. Controlled — never
 * manages its own selection state. Renders through CabinetBox (roadmap
 * Phase 11.1.2) as a bare, textless box in place of the previous pill track
 * + sliding thumb — popped-out is the resting "on" state, flat is "off",
 * keyed directly off `value` (never hover/focus/press, unlike Button).
 * `popped` mirrors `value` even when `disabled` — a disabled-but-checked
 * toggle still visually reads as on, just non-interactive; see
 * docs/specs/OBLIQUE_CABINETRY_TOGGLE.md §1.4. The root also carries a plain
 * `isActive` class (alongside Radix's own `data-state` on the switch itself)
 * so a consumer can write `.sc-toggle.isActive { ... }` instead of a
 * `:has()` attribute selector.
 */
export function Toggle({ schema, value, onChange, disabled }: ToggleProps) {
  return (
    <div className={withActiveClass('sc-toggle', value)}>
      <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      <Switch.Root
        className="sc-toggle__root"
        style={cabinetTokens}
        checked={value}
        aria-label={resolveAccessibleName(schema)}
        onCheckedChange={(checked) => onChange(checked)}
        disabled={disabled}
      >
        <CabinetBox
          popped={value}
          boxHeight={CABINET_TOGGLE_BOX_SIZE}
          timelineKey={`cabinet-toggle-${schema.id}`}
        />
      </Switch.Root>
    </div>
  );
}
