import { useState } from 'react';

import { CabinetBox } from './CabinetBox';
import { DualLabel } from './DualLabel';
import { resolveAccessibleName } from './accessibleName';
import type { ButtonSchema } from '@/types/controls';
import './Button.css';

interface ButtonProps {
  schema: ButtonSchema;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Schema-driven button — renders through CabinetBox (roadmap Phase 11.1.1).
 * `popped` combines hover, focus, and press (pointerdown/pointerup, not
 * `click` — click fires only on release, which would leave touch users with
 * no feedback until the tap is already over) into one boolean; a disabled
 * button never pops regardless of these events. No distinct click bounce or
 * partial-pop state — see docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md §1.5.
 */
export function Button({ schema, onClick, disabled }: ButtonProps) {
  const accessibleName = resolveAccessibleName(schema);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const popped = !disabled && (hovered || focused || pressed);

  return (
    <button
      type="button"
      className="sc-button"
      aria-label={accessibleName}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      <CabinetBox popped={popped} timelineKey={`cabinet-button-${schema.id}`}>
        <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      </CabinetBox>
    </button>
  );
}
