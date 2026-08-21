/**
 * Expand/collapse timing for AccordionContainer, resolving docs/tasks/
 * ARCHITECTURE_AND_COMPONENTS_PLAN.md Task 13. Respects
 * `prefers-reduced-motion` the same way PowerRockerSwitch.css does — the
 * section still opens/closes, but the transition snaps instead of animating.
 */

export const ACCORDION_DURATION = 0.25;

export function getAccordionDuration(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : ACCORDION_DURATION;
}
