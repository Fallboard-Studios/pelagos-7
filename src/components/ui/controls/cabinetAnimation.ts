/**
 * Pop/flat transition timing for CabinetBox. Respects prefers-reduced-motion
 * the same way accordionAnimation.ts (AccordionContainer) and
 * PowerRockerSwitch.css do — the box still pops/flattens, but the transition
 * snaps instead of animating.
 */
export const CABINET_POP_DURATION = 0.25;

export function getCabinetPopDuration(prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : CABINET_POP_DURATION;
}
