/**
 * Audio Swells — a rare, self-reversing ramp event on one global-chain or
 * robot-scoped parameter, resolving docs/tasks/AUDIO_SWELLS.md Task 3.
 * Deliberately NOT built on lfoEngine.ts/lfoDrift.ts (docs/specs/AUDIO_SWELLS.md
 * §1.1) — no Tone.LFO, no Signal/Param connection. Every write flows through
 * the same store-backed path a human editing a control by hand would use
 * (setGlobalAudio here; robotOptionsActions.ts's apply* functions once the
 * robot pool lands in Task 4), so the relevant slider visibly moves.
 *
 * Mirrors robotSystems.ts's startRobotLifecycle/stopRobotLifecycle/tick
 * lifecycle shape. Runtime state (activeSwells) lives in a plain module-scope
 * Map, never in Zustand (CLAUDE.md: runtime-only state stays out of state).
 *
 * The global pool (Task 3) is the first complete, independently testable
 * vertical slice (trigger -> select -> ramp -> write -> exact return-to-base
 * -> disabled-effect eligibility). The robot pool (Task 4, this revision)
 * reuses pickSwellPeakDelta unchanged and generalizes tickAudioSwells/
 * advanceActiveSwells to a second pool — single-robot swells only; the
 * company-wide variant lands in Task 5.
 */

// ========================================
// IMPORTS
// ========================================
import type { NoiseFunction2D } from 'simplex-noise';

import { applyVolume, applyLayersContinuous, applyAdsr } from './robotOptionsActions';
import { subscribeToMeasure, getCurrentMeasure } from '@/engine/beatClock';
import { getSeededVal } from '@/utils/getSeededVal';
import { getAttenuationStyleNoiseMap } from '@/utils/noiseMaps';
import { useAttenuationStyleStore, selectCurrentAttenuationStyle } from '@/stores/attenuationStyleStore';
import { useAudioStore } from '@/stores/audioStore';
import { useLocaleStore } from '@/stores/localeStore';
import { GLOBAL_AUDIO_SEED_RANGES, type GlobalAudioSeedFieldKey } from '@/data/globalAudioSeedRanges';
import { ROBOT_SWELL_FIELD_RANGE } from '@/data/audioSwellRanges';
import {
  SWELL_GLOBAL_TARGET_IDS,
  SWELL_ROBOT_ATTRIBUTE_IDS,
  type ActiveSwell,
  type SwellGlobalTargetId,
  type SwellRobotAttributeId,
  type SwellMember,
  type SwellPool,
} from '@/types/audioSwell';
import type { Robot } from '@/types/Robot';

// ========================================
// CONSTANTS
// ========================================

/** Each pool (global, robot) is capped independently — never a shared budget. */
export const MAX_CONCURRENT_SWELLS_PER_POOL = 5;

/** Per-measure probability a pool rolls a new swell, calibrated so an average
 *  gap of ~3-4 measures emerges (confirmed via interview) — NOT a fixed
 *  "every N measures" timer. First-pass placeholder, same caveat as every
 *  other probability-threshold field in this app (DELAY_ENABLED_THRESHOLD,
 *  LFO_ACTIVE_THRESHOLD) — tune during the manual/audible checkpoint. */
export const SWELL_TRIGGER_CHANCE = 0.28; // ~= 1 / 3.5

/** Rising-phase and falling-phase measure counts are drawn INDEPENDENTLY from
 *  each other (never mirrored) — every global target except delay.wet/
 *  reverb.wet uses this range. 1 measure is a hard floor on any phase for any
 *  attribute, full stop (docs/specs/AUDIO_SWELLS.md §1.5). */
export const DEFAULT_SWELL_DURATION_RANGE = { min: 3, max: 6 };
/** delay.wet / reverb.wet only — both min and max widen. */
export const MIX_SWELL_DURATION_RANGE = { min: 6, max: 12 };

const MIX_SWELL_TARGETS: readonly SwellGlobalTargetId[] = ['delay.wet', 'reverb.wet'];

/** Every direction/magnitude draw covers AT LEAST 50% of the attribute's full
 *  range and AT MOST the true edge (§1.5) — the shared floor fraction every
 *  attribute uses. */
const SWELL_MIN_RANGE_FRACTION = 0.5;

/** Robot volume's own downward-swell floor — a pure clamp on the final peak,
 *  never a gate on direction-picking (§1.5). Expressed in volume's own 0-1
 *  domain (ROBOT_SWELL_FIELD_RANGE.volume), matching applyVolume's pct/100
 *  convention. */
export const VOLUME_SWELL_DOWNWARD_FLOOR = 0.5;

// ========================================
// GLOBAL TARGET -> EFFECT/FIELD MAPPING
// ========================================

type GlobalSwellEffectKey = 'eq3' | 'filterLPF' | 'filterHPF' | 'delay' | 'reverb';

interface GlobalTargetMeta {
  effect: GlobalSwellEffectKey;
  field: string;
  /** Key into GLOBAL_AUDIO_SEED_RANGES — translates the 'lpf.'/'hpf.' short
   *  form (matching AudioEngine.setEffectBypass's effect keys) to the
   *  'filterLPF.'/'filterHPF.' keys that table actually uses, same
   *  translation lfoEngine.ts's own (private) globalSeedRangeKey performs. */
  rangeKey: GlobalAudioSeedFieldKey;
}

const GLOBAL_TARGET_META: Record<SwellGlobalTargetId, GlobalTargetMeta> = {
  'eq3.low': { effect: 'eq3', field: 'low', rangeKey: 'eq3.low' },
  'eq3.mid': { effect: 'eq3', field: 'mid', rangeKey: 'eq3.mid' },
  'eq3.high': { effect: 'eq3', field: 'high', rangeKey: 'eq3.high' },
  'lpf.frequency': { effect: 'filterLPF', field: 'frequency', rangeKey: 'filterLPF.frequency' },
  'lpf.Q': { effect: 'filterLPF', field: 'Q', rangeKey: 'filterLPF.Q' },
  'hpf.frequency': { effect: 'filterHPF', field: 'frequency', rangeKey: 'filterHPF.frequency' },
  'hpf.Q': { effect: 'filterHPF', field: 'Q', rangeKey: 'filterHPF.Q' },
  'delay.wet': { effect: 'delay', field: 'wet', rangeKey: 'delay.wet' },
  'reverb.wet': { effect: 'reverb', field: 'wet', rangeKey: 'reverb.wet' },
};

function readGlobalValue(target: SwellGlobalTargetId): number {
  const meta = GLOBAL_TARGET_META[target];
  const effectSettings = useAudioStore.getState().globalAudio[meta.effect];
  // Same generic-narrowing limitation audioStore.ts's own setGlobalAudio hits —
  // meta.field's type is only known at the per-target literal, not across the union.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (effectSettings as any)[meta.field] as number;
}

function writeGlobalValue(target: SwellGlobalTargetId, value: number): void {
  const meta = GLOBAL_TARGET_META[target];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useAudioStore.getState().setGlobalAudio(meta.effect, { [meta.field]: value } as any);
}

// ========================================
// ROBOT ATTRIBUTE READ/WRITE
// ========================================

const LAYER_FIELD_PATTERN = /^layer(\d)\.(gain|detune|phase|pulseWidth)$/;
const ADSR_FIELD_PATTERN = /^adsr\.(attack|decay|sustain|release)$/;

/** A robot attribute's own parent-toggle check (§1.5, §3): layerN.* requires
 *  that layer's own OscillatorLayer.active === true; volume and the 4 ADSR
 *  fields have no such parent and are always structurally available. */
function isRobotAttributeStructurallyLive(robot: Robot, attribute: SwellRobotAttributeId): boolean {
  const layerMatch = LAYER_FIELD_PATTERN.exec(attribute);
  if (!layerMatch) return true; // volume, adsr.* — no parent toggle
  const layerIndex = Number(layerMatch[1]);
  return robot.audioAttributes.layers?.[layerIndex]?.active === true;
}

function readRobotValue(robot: Robot, attribute: SwellRobotAttributeId): number {
  if (attribute === 'volume') return robot.masterVolume;
  const layerMatch = LAYER_FIELD_PATTERN.exec(attribute);
  if (layerMatch) {
    const layer = robot.audioAttributes.layers![Number(layerMatch[1])];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (layer as any)[layerMatch[2]] as number;
  }
  const adsrMatch = ADSR_FIELD_PATTERN.exec(attribute);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (robot.audioAttributes.adsr as any)[adsrMatch![1]] as number;
}

/**
 * Writes through the exact same apply* function a human editing that
 * control by hand would call (docs/specs/AUDIO_SWELLS.md §3) — never a bare
 * updateRobot/AudioEngine.updateVoice* pairing. `robot` must be freshly read
 * from the store (not a stale creation-time reference) so a concurrent edit
 * to a different field on the same robot isn't clobbered.
 */
function writeRobotValue(robot: Robot, localeId: string, attribute: SwellRobotAttributeId, value: number): void {
  if (attribute === 'volume') {
    // ROBOT_SWELL_FIELD_RANGE.volume is the store's 0-1 masterVolume fraction;
    // applyVolume's own parameter is the UI's 0-100 display percent.
    applyVolume(robot, localeId, value * 100);
    return;
  }
  const layerMatch = LAYER_FIELD_PATTERN.exec(attribute);
  if (layerMatch) {
    const layerIndex = Number(layerMatch[1]);
    const field = layerMatch[2];
    const nextLayers = robot.audioAttributes.layers!.map((layer, i) =>
      i === layerIndex ? { ...layer, [field]: value } : layer
    );
    applyLayersContinuous(robot, localeId, nextLayers);
    return;
  }
  const adsrMatch = ADSR_FIELD_PATTERN.exec(attribute)!;
  applyAdsr(robot, localeId, { ...robot.audioAttributes.adsr, [adsrMatch[1]]: value });
}

function robotSwellKey(robotId: string, attribute: SwellRobotAttributeId): string {
  return `${robotId}:${attribute}`;
}

// ========================================
// SHARED DIRECTION + MAGNITUDE HELPER
// ========================================

/**
 * Attribute-agnostic direction+magnitude draw (docs/specs/AUDIO_SWELLS.md
 * §1.5) — reused unchanged by the robot pool (Task 4). Direction is picked so
 * the swell can cover AT LEAST 50% of the field's full range: up if `current`
 * is at or below the range's midpoint, down if at or above it, a seeded
 * coin-flip tie-break exactly at the midpoint. The peak is then drawn between
 * that 50%-of-range floor (relative to `current`, not the range's own
 * midpoint — e.g. a field at 33% of range swells up into [83%, 100%]) and the
 * true edge. Returns the SIGNED peakDelta — `current + peakDelta` is the
 * swell's peak — matching ActiveSwell/SwellMember's own baseValue/peakDelta
 * shape. This is a new, from-scratch formula, deliberately not
 * centeredSwingFromRange (symmetric/bounded, no directionality or
 * minimum-swing guarantee — the wrong shape here).
 */
export function pickSwellPeakDelta(
  noiseMap: NoiseFunction2D,
  dataId: string,
  offset: number,
  range: { min: number; max: number },
  currentValue: number,
): number {
  const { min, max } = range;
  const midpoint = (min + max) / 2;
  const halfSpan = (max - min) * SWELL_MIN_RANGE_FRACTION;

  let goingUp: boolean;
  if (currentValue < midpoint) goingUp = true;
  else if (currentValue > midpoint) goingUp = false;
  else goingUp = getSeededVal(noiseMap, `${dataId}.tiebreak`, offset, 0, 1) < 0.5;

  if (goingUp) {
    const floor = Math.min(currentValue + halfSpan, max);
    const peak = getSeededVal(noiseMap, dataId, offset, floor, max);
    return peak - currentValue;
  } else {
    const floor = Math.max(currentValue - halfSpan, min);
    const peak = getSeededVal(noiseMap, dataId, offset, min, floor);
    return peak - currentValue;
  }
}

function pickPhaseMeasures(
  noiseMap: NoiseFunction2D,
  dataId: string,
  offset: number,
  range: { min: number; max: number },
): number {
  const raw = getSeededVal(noiseMap, dataId, offset, range.min, range.max);
  return Math.max(1, Math.round(raw)); // 1-measure hard floor, full stop
}

// ========================================
// LIFECYCLE
// ========================================

let unsubscribe: (() => void) | null = null;

/** Keyed by a stable target identity: the bare global target id for pool
 *  'global'; `${robotId}:${attribute}` per member for pool 'robot' (Task 4) —
 *  a company-wide swell's members all key off this same Map, one entry per
 *  participating robot, deduplicated by object identity (not key count) when
 *  iterating, since a company-wide ActiveSwell is stored under multiple keys. */
const activeSwells = new Map<string, ActiveSwell>();

export function startAudioSwells(localeId: string): void {
  if (unsubscribe !== null) return; // already running — same idempotent guard startRobotLifecycle uses
  unsubscribe = subscribeToMeasure(() => tickAudioSwells(localeId, getCurrentMeasure()));
}

export function stopAudioSwells(): void {
  unsubscribe?.();
  unsubscribe = null;
  activeSwells.clear(); // no partial swells survive a locale/AS change
}

/**
 * Read-only snapshot of every in-flight swell in one pool, deduplicated by
 * object identity — a company-wide swell (Task 5) is stored under multiple
 * Map keys but must count/appear once. Exists for tests/future debug UI;
 * `activeSwells` itself deliberately stays module-private (CLAUDE.md:
 * runtime-only state stays out of Zustand, and out of any public API that
 * could tempt a caller into treating it as reactive state).
 */
export function getActiveSwellSnapshot(pool: SwellPool): ActiveSwell[] {
  const seen = new Set<ActiveSwell>();
  const result: ActiveSwell[] = [];
  for (const swell of activeSwells.values()) {
    if (swell.pool === pool && !seen.has(swell)) {
      seen.add(swell);
      result.push({ ...swell });
    }
  }
  return result;
}

function activeSwellCount(pool: SwellPool): number {
  return getActiveSwellSnapshot(pool).length;
}

/** One measure's worth of Audio Swell evaluation. Pure with respect to its
 *  `measure` input (not read from BeatClock directly) so tests can drive it
 *  without a real transport — see startAudioSwells for the BeatClock-wired
 *  entry point. Mirrors tickRobotLifecycle's own shape (robotSystems.ts). */
export function tickAudioSwells(localeId: string, measure: number): void {
  const as = selectCurrentAttenuationStyle(useAttenuationStyleStore.getState());
  if (!as) return;
  const noiseMap = getAttenuationStyleNoiseMap(as.id, as.name);

  advanceActiveSwells(localeId, measure);
  maybeStartGlobalSwell(noiseMap, measure);
  maybeStartRobotSwell(localeId, noiseMap, measure);
}

// ========================================
// GLOBAL POOL — TRIGGER & SELECTION
// ========================================

function isGlobalTargetEligible(target: SwellGlobalTargetId): boolean {
  if (activeSwells.has(target)) return false;
  const meta = GLOBAL_TARGET_META[target];
  return useAudioStore.getState().globalAudio[meta.effect].enabled;
}

function maybeStartGlobalSwell(noiseMap: NoiseFunction2D, measure: number): void {
  if (activeSwellCount('global') >= MAX_CONCURRENT_SWELLS_PER_POOL) return;

  const triggerRoll = getSeededVal(noiseMap, 'audioSwell.trigger.global', measure, 0, 1);
  if (triggerRoll >= SWELL_TRIGGER_CHANCE) return;

  const eligible = SWELL_GLOBAL_TARGET_IDS.filter(isGlobalTargetEligible);
  if (eligible.length === 0) return;

  const rawIndex = getSeededVal(noiseMap, 'audioSwell.target.global', measure, 0, eligible.length);
  const target = eligible[Math.min(eligible.length - 1, Math.floor(rawIndex))];

  const meta = GLOBAL_TARGET_META[target];
  const range = GLOBAL_AUDIO_SEED_RANGES[meta.rangeKey];
  const currentValue = readGlobalValue(target);
  const peakDelta = pickSwellPeakDelta(noiseMap, `audioSwell.peak.${target}`, measure, range, currentValue);

  const durationRange = MIX_SWELL_TARGETS.includes(target) ? MIX_SWELL_DURATION_RANGE : DEFAULT_SWELL_DURATION_RANGE;
  const risingMeasures = pickPhaseMeasures(noiseMap, `audioSwell.rising.${target}`, measure, durationRange);
  const fallingMeasures = pickPhaseMeasures(noiseMap, `audioSwell.falling.${target}`, measure, durationRange);

  activeSwells.set(target, {
    pool: 'global',
    globalTarget: target,
    baseValue: currentValue,
    peakDelta,
    phase: 'rising',
    startMeasure: measure,
    risingMeasures,
    fallingMeasures,
  });
}

// ========================================
// ROBOT POOL — TRIGGER & SELECTION (single-robot only; company-wide is Task 5)
// ========================================

function isRobotAttributeEligible(robot: Robot, attribute: SwellRobotAttributeId): boolean {
  if (activeSwells.has(robotSwellKey(robot.id, attribute))) return false;
  return isRobotAttributeStructurallyLive(robot, attribute);
}

function maybeStartRobotSwell(localeId: string, noiseMap: NoiseFunction2D, measure: number): void {
  if (activeSwellCount('robot') >= MAX_CONCURRENT_SWELLS_PER_POOL) return;

  const triggerRoll = getSeededVal(noiseMap, 'audioSwell.trigger.robot', measure, 0, 1);
  if (triggerRoll >= SWELL_TRIGGER_CHANCE) return;

  // Robot selection spans the whole roster (docs/specs/AUDIO_SWELLS.md §3) —
  // the 17x12 pool, never scoped to one robot.
  const robots = useLocaleStore.getState().getLocaleById(localeId)?.robots ?? [];
  const eligiblePairs: { robot: Robot; attribute: SwellRobotAttributeId }[] = [];
  for (const robot of robots) {
    for (const attribute of SWELL_ROBOT_ATTRIBUTE_IDS) {
      if (isRobotAttributeEligible(robot, attribute)) eligiblePairs.push({ robot, attribute });
    }
  }
  if (eligiblePairs.length === 0) return;

  const rawIndex = getSeededVal(noiseMap, 'audioSwell.target.robot', measure, 0, eligiblePairs.length);
  const { robot, attribute } = eligiblePairs[Math.min(eligiblePairs.length - 1, Math.floor(rawIndex))];

  const range = ROBOT_SWELL_FIELD_RANGE[attribute];
  const currentValue = readRobotValue(robot, attribute);
  let peakDelta = pickSwellPeakDelta(noiseMap, `audioSwell.peak.${robot.id}.${attribute}`, measure, range, currentValue);

  // Volume's downward clamp: a pure post-hoc clamp on the final peak, never a
  // gate on direction-picking (§1.5) — an upward pick is never touched here.
  if (attribute === 'volume' && peakDelta < 0) {
    const clampedPeak = Math.max(currentValue + peakDelta, VOLUME_SWELL_DOWNWARD_FLOOR);
    peakDelta = clampedPeak - currentValue;
  }

  // Robot attributes have no mix-style duration exception — always the default range.
  const risingMeasures = pickPhaseMeasures(
    noiseMap, `audioSwell.rising.${robot.id}.${attribute}`, measure, DEFAULT_SWELL_DURATION_RANGE
  );
  const fallingMeasures = pickPhaseMeasures(
    noiseMap, `audioSwell.falling.${robot.id}.${attribute}`, measure, DEFAULT_SWELL_DURATION_RANGE
  );

  const member: SwellMember = { robotId: robot.id, baseValue: currentValue, peakDelta };
  activeSwells.set(robotSwellKey(robot.id, attribute), {
    pool: 'robot',
    robotAttribute: attribute,
    members: [member],
    phase: 'rising',
    startMeasure: measure,
    risingMeasures,
    fallingMeasures,
  });
}

// ========================================
// ADVANCE / WRITE-BACK
// ========================================

function advanceActiveSwells(localeId: string, measure: number): void {
  const processed = new Set<ActiveSwell>();
  for (const [key, swell] of activeSwells) {
    if (processed.has(swell)) continue;
    processed.add(swell);
    if (swell.pool === 'global') advanceGlobalSwell(key, swell, measure);
    else advanceRobotSwell(key, swell, localeId, measure);
  }
}

function advanceGlobalSwell(key: string, swell: ActiveSwell, measure: number): void {
  const target = swell.globalTarget!;
  const meta = GLOBAL_TARGET_META[target];
  const baseValue = swell.baseValue!;
  const peakDelta = swell.peakDelta!;

  const stillEnabled = useAudioStore.getState().globalAudio[meta.effect].enabled;
  if (!stillEnabled) {
    // An effect disabled mid-swell cancels that swell immediately, snapping
    // back to its captured base value in the same tick — better than
    // silently continuing to write into a bypassed node's now-irrelevant
    // param (docs/specs/AUDIO_SWELLS.md §3).
    writeGlobalValue(target, baseValue);
    activeSwells.delete(key);
    return;
  }

  const elapsed = measure - swell.startMeasure;
  const total = swell.risingMeasures + swell.fallingMeasures;

  if (elapsed >= total) {
    writeGlobalValue(target, baseValue); // exact return-to-base, never approximate
    activeSwells.delete(key);
    return;
  }

  swell.phase = elapsed < swell.risingMeasures ? 'rising' : 'falling';

  let value: number;
  if (swell.phase === 'rising') {
    const progress = elapsed / swell.risingMeasures;
    value = baseValue + peakDelta * progress;
  } else {
    const fallElapsed = elapsed - swell.risingMeasures;
    const progress = fallElapsed / swell.fallingMeasures;
    value = baseValue + peakDelta * (1 - progress);
  }

  writeGlobalValue(target, value);
}

/**
 * Task 4: exactly one SwellMember per robot swell — company-wide (2+
 * members sharing phase/timing, Task 5) reuses this same elapsed/phase math
 * per member. Unlike the global pool, a robot attribute's structural parent
 * going inactive mid-swell is NOT re-checked here — eligibility is evaluated
 * at selection time only (docs/specs/AUDIO_SWELLS.md §7, an explicitly
 * deferred open question, not addressed this task).
 */
function advanceRobotSwell(key: string, swell: ActiveSwell, localeId: string, measure: number): void {
  const attribute = swell.robotAttribute!;
  const member = swell.members![0];
  const robot = useLocaleStore.getState().getRobotById(localeId, member.robotId);
  if (!robot) {
    activeSwells.delete(key); // robot no longer exists — defensive, not expected in normal play
    return;
  }

  const elapsed = measure - swell.startMeasure;
  const total = swell.risingMeasures + swell.fallingMeasures;

  if (elapsed >= total) {
    writeRobotValue(robot, localeId, attribute, member.baseValue); // exact return-to-base
    activeSwells.delete(key);
    return;
  }

  swell.phase = elapsed < swell.risingMeasures ? 'rising' : 'falling';

  let value: number;
  if (swell.phase === 'rising') {
    const progress = elapsed / swell.risingMeasures;
    value = member.baseValue + member.peakDelta * progress;
  } else {
    const fallElapsed = elapsed - swell.risingMeasures;
    const progress = fallElapsed / swell.fallingMeasures;
    value = member.baseValue + member.peakDelta * (1 - progress);
  }

  writeRobotValue(robot, localeId, attribute, value);
}
