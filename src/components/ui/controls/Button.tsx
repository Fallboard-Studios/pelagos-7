import { useId, useState } from 'react';

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
 *
 * `timelineKey` includes `useId()`, not just `schema.id` — `timelineMap` is a
 * shared, module-level `Map`, so two simultaneously-mounted `Button`s
 * rendering the same schema object would otherwise compute identical keys
 * and stomp each other's `setTimeline`/`killTimeline` calls (the exact bug
 * found live in `RadioButton`'s own timelineKey, fixed the same way — see
 * that file's own comment). Not yet exercised by any real `Button` consumer,
 * but the vulnerability is identical, so the fix is applied preemptively
 * rather than waiting for a live collision.
 */
export function Button({ schema, onClick, disabled }: ButtonProps) {
  const accessibleName = resolveAccessibleName(schema);
  const instanceId = useId();
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
      <CabinetBox popped={popped} timelineKey={`cabinet-button-${schema.id}-${instanceId}`}>
        <DualLabel loreLabel={schema.loreLabel} humanLabel={schema.humanLabel} />
      </CabinetBox>
    </button>
  );
}
