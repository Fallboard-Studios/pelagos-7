/**
 * LFO modulation types, resolving docs/tasks/LFO_INTEGRATION_PLAN.md Task 7.
 * Target ids and bounds trace to the reference grids — see each export's
 * comment for its source row.
 */

// ========================================
// SHAPE
// ========================================

/**
 * LFO oscillator shapes. Per docs/reference/ROBOT_DATA_GRID.md's "LFO Shape"
 * row (OSCILLATION SHAPE, Radio Button): TRIANGLE, SINE, SQUARE, SAWTOOTH.
 * Lowercase, matching the Tone.js-style convention Robot.ts's WaveformType
 * already uses.
 */
export type LfoShape = 'triangle' | 'sine' | 'square' | 'sawtooth';

export const LFO_SHAPES: readonly LfoShape[] = ['triangle', 'sine', 'square', 'sawtooth'];

// ========================================
// ROBOT-LEVEL TARGETS
// ========================================

/**
 * Per-robot LFO modulation targets — the 13 targets
 * docs/reference/ROBOT_DATA_GRID.md flags `Has LFO: Yes`: Volume (Transducer
 * Pressure Index), plus each of the 3 oscillator layers' Gain (Saturation),
 * Detune (Drift), Phase (Alignment), and Interval/pulseWidth (only
 * meaningful for 'pulse'-type layers — see spec §7.1 for the Phase/pulseWidth
 * connectability caveats resolved in Task 12).
 */
export type RobotLfoTargetId =
  | 'volume'
  | 'layer0.gain'
  | 'layer0.detune'
  | 'layer0.phase'
  | 'layer0.pulseWidth'
  | 'layer1.gain'
  | 'layer1.detune'
  | 'layer1.phase'
  | 'layer1.pulseWidth'
  | 'layer2.gain'
  | 'layer2.detune'
  | 'layer2.phase'
  | 'layer2.pulseWidth';

export const ROBOT_LFO_TARGET_IDS: readonly RobotLfoTargetId[] = [
  'volume',
  'layer0.gain', 'layer0.detune', 'layer0.phase', 'layer0.pulseWidth',
  'layer1.gain', 'layer1.detune', 'layer1.phase', 'layer1.pulseWidth',
  'layer2.gain', 'layer2.detune', 'layer2.phase', 'layer2.pulseWidth',
];

// ========================================
// GLOBAL-CHAIN TARGETS
// ========================================

/**
 * Global-chain LFO modulation targets — the 7 targets
 * docs/reference/GLOBAL_CHAIN_GRID.md flags `LFO?: X`: EQ3 low/mid/high,
 * LPF frequency/Q, HPF frequency/Q. (Was 9, then 8 in V2 — Chorus and
 * 'chorus.delayTime' were removed entirely, the effect didn't suit this
 * music; 'delay.delayTime' was removed after that, LFO judged unwanted on
 * Delay's own time parameter. Delay itself is unaffected — its delayTime
 * still seeds/edits normally via GlobalAudioSeedFieldKey, an unrelated type;
 * only the LFO-modulation capability on that one param is gone.)
 *
 * Uses the 'lpf'/'hpf' short-form AudioEngine.setEffectBypass already uses
 * for its effect keys — not GlobalAudioSettings' filterLPF/filterHPF field
 * names — so target ids line up directly with the AudioEngine surface
 * Task 10 (getGlobalModulationTarget) will call into.
 */
export type GlobalLfoTargetId =
  | 'eq3.low'
  | 'eq3.mid'
  | 'eq3.high'
  | 'lpf.frequency'
  | 'lpf.Q'
  | 'hpf.frequency'
  | 'hpf.Q';

export const GLOBAL_LFO_TARGET_IDS: readonly GlobalLfoTargetId[] = [
  'eq3.low', 'eq3.mid', 'eq3.high',
  'lpf.frequency', 'lpf.Q',
  'hpf.frequency', 'hpf.Q',
];

// ========================================
// COMBINED TARGET ID
// ========================================

/**
 * Every target an LFO can connect to, robot-scoped or global-chain. Shared
 * between lfoEngine.ts (the primary-LFO registry) and lfoDrift.ts (the drift
 * subsystem attached to it) — defined here so neither has to import it from
 * the other.
 */
export type LfoTargetId = RobotLfoTargetId | GlobalLfoTargetId;

// ========================================
// DRIFT GROUPS
// ========================================

/**
 * The 4 independent LFO drift groups (docs/specs/LFO_DRIFT_GROUPS.md) — every
 * connected primary LFO belongs to exactly one, determined by its own target
 * id (see lfoDrift.ts's driftGroupForTarget). The three global-chain groups
 * map one-to-one onto the only three AudioRigEffectKey blocks that ever carry
 * an lfoTarget at all (eq3/filterLPF/filterHPF — see audioRigConfig.ts's
 * AUDIO_RIG_CONFIG); every RobotLfoTargetId, regardless of field or which
 * robot, shares the one 'robots' group — robot fields have no "effect block"
 * concept to split by further.
 */
export type DriftGroupId = 'eq3' | 'filterLPF' | 'filterHPF' | 'robots';

export const DRIFT_GROUP_IDS: readonly DriftGroupId[] = ['eq3', 'filterLPF', 'filterHPF', 'robots'];

// ========================================
// SETTINGS
// ========================================

/** Hz — docs/reference/ROBOT_DATA_GRID.md's "LFO Rate" row (OSCILLATION RATE). */
export const LFO_RATE_MIN = 0.1;
export const LFO_RATE_MAX = 10;

/** Percent — docs/reference/ROBOT_DATA_GRID.md's "LFO Depth" row (OSCILLATION DEPTH). */
export const LFO_DEPTH_MIN = 0;
export const LFO_DEPTH_MAX = 100;

/**
 * An LFO's tunable settings, per docs/reference/ROBOT_DATA_GRID.md's LFO
 * MODULE rows:
 * - shape: OSCILLATION SHAPE (Radio Button) — see LfoShape
 * - rate: OSCILLATION RATE (Slider - linear), LFO_RATE_MIN–LFO_RATE_MAX Hz
 * - depth: OSCILLATION DEPTH (Slider - linear), LFO_DEPTH_MIN–LFO_DEPTH_MAX %
 */
export interface LfoSettings {
  shape: LfoShape;
  rate: number;
  depth: number;
}
