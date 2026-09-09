/**
 * Pop/flat transition timing for CabinetBox. Respects prefers-reduced-motion
 * the same way accordionAnimation.ts (AccordionContainer) and
 * PowerRockerSwitch.css do — the box still pops/flattens, but the transition
 * snaps instead of animating.
 *
 * Direction-dependent duration/ease (2026-09-09 follow-up): a box popping
 * IN decelerates into place (power2.out) over CABINET_POP_DURATION — the
 * original, single-direction behavior. A box popping OUT (flattening)
 * instead ACCELERATES away (power2.in) over the shorter
 * CABINET_POP_DURATION_OUT. Both changes target the same real, felt
 * problem: power2.out's own slow-approaching-the-target tail meant a
 * flattening box's walls lingered at a small-but-visible size for a
 * disproportionate share of the transition — most noticeable on a slider
 * click (which can flip many boxes' popT from 1→0 in the same render, all
 * animating at once) rather than a drag (which flips at most one or two
 * boxes per frame). This is a well-established UI motion convention
 * (entering elements decelerate, exiting elements accelerate — Material
 * Design's own enter/exit easing split), not a reversal of it.
 */
export const CABINET_POP_DURATION = 0.75;

/**
 * Popping-out duration — shorter than CABINET_POP_DURATION so a flattening
 * box doesn't stay visible any longer than it has to. Tuned by feel; expect
 * this to move (same posture as CABINET_POP_DISTANCE/VOXEL_TRACK_POP_DISTANCE
 * in cabinetGeometry.ts — read this file, not a doc, for the current value).
 */
export const CABINET_POP_DURATION_OUT = 0.35;

export type CabinetPopDirection = 'in' | 'out';

export function getCabinetPopDuration(prefersReducedMotion: boolean, direction: CabinetPopDirection = 'in'): number {
  if (prefersReducedMotion) return 0;
  return direction === 'out' ? CABINET_POP_DURATION_OUT : CABINET_POP_DURATION;
}

/**
 * `power2.out` (decelerate into place) for popping in — the original,
 * single-direction ease. `power2.in` (accelerate away) for popping out, so
 * the tween's own rate of change is highest right as it reaches the flat
 * target instead of lowest — the direct fix for the lingering-small-sliver
 * problem `power2.out` produces on the way down. Applied uniformly to every
 * property in a single popped transition (front-face offset, both wall
 * scales, glow) by the caller, so all four stay synchronized — never mix
 * eases within one transition.
 */
export function getCabinetPopEase(direction: CabinetPopDirection = 'in'): string {
  return direction === 'out' ? 'power2.in' : 'power2.out';
}
