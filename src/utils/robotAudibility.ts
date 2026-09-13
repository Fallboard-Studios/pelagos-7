import type { Robot } from '@/types/Robot';

/**
 * True if a robot with `audioMode` would actually be heard right now, given every robot
 * currently in its locale — mirrors AudioEngine.ts's own triggerWithCap mute/solo check exactly
 * (that check is refactored to call this instead of re-deriving the rule, see
 * docs/specs/ROBOT_CARDS_REDESIGN.md §1.2). `undefined` (a robot not yet in the store, or
 * audioMode unset) behaves identically to `'none'`.
 */
export function isRobotAudible(audioMode: Robot['audioMode'], localeRobots: Robot[]): boolean {
  if (audioMode === 'mute') return false;
  const anySolo = localeRobots.some((r) => r.audioMode === 'solo');
  if (anySolo && audioMode !== 'solo') return false;
  return true;
}
