/**
 * Expand/collapse timing for AccordionContainer, resolving docs/tasks/
 * ARCHITECTURE_AND_COMPONENTS_PLAN.md Task 13. Respects
 * `prefers-reduced-motion` the same way PowerRockerSwitch.css does — the
 * section still opens/closes, but the transition snaps instead of animating.
 */

export const ACCORDION_DURATION = 0.25;

/** Content fade duration — deliberately shorter than ACCORDION_DURATION and
 * sequenced (never simultaneous) with the height tween in
 * AccordionContainer.tsx's animateTo(): height first then fade in on open,
 * fade out then height on close, so the content is never visible while it's
 * still overlapping a sibling section that hasn't finished making room (or
 * losing room) for it. */
export const ACCORDION_FADE_DURATION = 0.15;

export function getAccordionDuration(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : ACCORDION_DURATION;
}

export function getAccordionFadeDuration(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : ACCORDION_FADE_DURATION;
}
