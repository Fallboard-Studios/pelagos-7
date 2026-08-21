/**
 * Default LFO settings per target, resolving docs/tasks/LFO_INTEGRATION_PLAN.md
 * Task 8. Follows the src/types/globalAudio.ts DEFAULT_* const pattern —
 * every target gets a typed default, no magic numbers.
 */

import {
  ROBOT_LFO_TARGET_IDS,
  GLOBAL_LFO_TARGET_IDS,
  LFO_RATE_MIN,
  LFO_DEPTH_MIN,
  type RobotLfoTargetId,
  type GlobalLfoTargetId,
  type LfoSettings,
} from '../types/lfo';

/**
 * Inert by default — depth pinned to LFO_DEPTH_MIN (0%) so a connected-but-
 * unconfigured LFO produces no audible modulation until a human (Phase 1/4/9
 * UI) or seeded generation (Task 13 for robot targets) sets a real depth.
 * Rate is pinned to LFO_RATE_MIN rather than an arbitrary "typical" value —
 * both bounds trace to Task 7's exported constants, not invented here.
 * 'sine' is the conventional default LFO waveform (smooth, no discontinuities
 * at zero depth) — not a bounds concern, just the shape pick.
 */
function makeDefaultLfoSettings(): LfoSettings {
  return { shape: 'sine', rate: LFO_RATE_MIN, depth: LFO_DEPTH_MIN };
}

/**
 * One entry per target — 13 robot + 9 global = 22. Each target gets its own
 * settings object (not a shared reference), since lfoEngine.ts's setters
 * (Task 11) will mutate these in place.
 */
export const DEFAULT_LFO_SETTINGS: Record<RobotLfoTargetId | GlobalLfoTargetId, LfoSettings> = Object.fromEntries(
  [...ROBOT_LFO_TARGET_IDS, ...GLOBAL_LFO_TARGET_IDS].map((id) => [id, makeDefaultLfoSettings()])
) as Record<RobotLfoTargetId | GlobalLfoTargetId, LfoSettings>;
