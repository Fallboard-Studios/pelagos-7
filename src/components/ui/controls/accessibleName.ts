import type { ControlSchemaBase } from '@/types/controls';

/**
 * Every interactive primitive needs a real accessible name (spec §5 pt 6),
 * but `loreLabel`/`humanLabel` are both optional (ControlSchemaBase) — a
 * schema entry may supply neither. `humanLabel ?? loreLabel` alone falls
 * through to `undefined` in that case, which makes React omit `aria-label`
 * entirely and leaves the control unlabeled for assistive tech (WCAG 4.1.2).
 * `schema.id` is the one field every schema is guaranteed to have, so it's
 * the last-resort fallback — not a great label, but never silent.
 */
export function resolveAccessibleName(schema: ControlSchemaBase): string {
  return schema.humanLabel ?? schema.loreLabel ?? schema.id;
}
