// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';

import { AudioEngine } from './AudioEngine';
import { scheduleRepeat, cancelSchedule } from './beatClock';
import { DEFAULT_LFO_SETTINGS } from '../data/lfoConfig';
import { GLOBAL_AUDIO_SEED_RANGES, type GlobalAudioSeedFieldKey } from '../data/globalAudioSeedRanges';

import type { OscillatorLayer } from '../types/layeredAudio';
import type { LfoSettings, LfoShape, RobotLfoTargetId, GlobalLfoTargetId } from '../types/lfo';
import { LFO_RATE_MIN, LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX, ROBOT_LFO_TARGET_IDS } from '../types/lfo';
import { devWarn } from '../utils/helpers';

// ========================================
// TYPES
// ========================================

type LfoTargetId = RobotLfoTargetId | GlobalLfoTargetId;

// ========================================
// STATE (module-scoped, runtime-only — never put these in Zustand)
// ========================================

/**
 * Live Tone.LFO nodes, keyed by instanceKey(target, robotId). Lazily
 * populated — no entry exists until the first setter or connect call for
 * that (target, robotId) pair (connect is Task 12's job, not this file's).
 */
const activeLfos = new Map<string, Tone.LFO>();

/** Persisted LfoSettings per instance key, independent of whether a live node exists yet. */
const settingsByKey = new Map<string, LfoSettings>();

/**
 * Manual-polling fallback state for 'layerN.phase' targets — Tone.js has no
 * connectable Signal for oscillator phase (verified against the real synth
 * construction code in AudioEngine.ts, not assumed; see spec §7.1). Keyed
 * the same as activeLfos/settingsByKey.
 */
interface PhaseFallback {
  scheduleId: string;
  robotId: string;
  layerIndex: number;
  startTime: number;
}
const phaseFallbacks = new Map<string, PhaseFallback>();

/**
 * The specific Signal/Param object each instance key is currently connected
 * to (Signal-based targets only — phase's fallback tracks its own state via
 * phaseFallbacks). Makes repeated connectLfoTarget calls idempotent by our
 * own bookkeeping rather than leaning on the Web Audio spec's connect()
 * dedup guarantee (real, but not something a unit test against a mocked
 * Tone.LFO can verify) — and lets a changed signal (e.g. a rebuilt composite
 * voice) be detected and re-wired instead of silently left stale.
 */
const connectedSignals = new Map<string, unknown>();

/** Phase modulates around this center (degrees) — the midpoint of the 0-360 range
 * ROBOT_DATA_GRID.md's Phase field documents. Depth scales how far it swings from
 * there, not around the layer's own current phase value (that would require
 * lfoEngine to read robot state directly, which stays AudioEngine/store territory —
 * a deliberate Phase-0 scope choice, revisit once UI/testing calls for it). */
const PHASE_CENTER_DEGREES = 180;
/** Polling granularity for the phase fallback — matches BeatClock's own internal tick. */
const PHASE_POLL_INTERVAL = '16n';

// ========================================
// INTERNAL FUNCTIONS
// ========================================

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Robot-scoped targets need one live LFO per robot, not one shared across
 * all robots — 'robotId:target' disambiguates; global-chain targets (no
 * robotId) use the bare target id.
 */
function instanceKey(target: LfoTargetId, robotId?: string): string {
  return robotId ? `${robotId}:${target}` : target;
}

/** Whether a target belongs to the per-robot set (needs a robotId) vs. the global-chain set (doesn't). */
function isRobotTarget(target: LfoTargetId): boolean {
  return (ROBOT_LFO_TARGET_IDS as readonly string[]).includes(target);
}

/**
 * Real value range per robot field, per docs/reference/ROBOT_DATA_GRID.md —
 * shared across all 3 layers, since the range depends on the field (gain,
 * detune, pulseWidth), not which layer index it's on. 'phase' is
 * deliberately absent — the phase-polling fallback computes its own range
 * independently (PHASE_CENTER_DEGREES), it never reaches this lookup.
 */
const ROBOT_LFO_FIELD_RANGE: Record<string, { min: number; max: number }> = {
  volume: { min: 0, max: 1 },
  gain: { min: 0, max: 2 },
  detune: { min: -50, max: 50 },
  pulseWidth: { min: 0, max: 1 },
};

/** Translates a GlobalLfoTargetId's 'lpf.'/'hpf.' short form (matching AudioEngine.setEffectBypass's
 * effect keys) to the 'filterLPF.'/'filterHPF.' keys GLOBAL_AUDIO_SEED_RANGES actually uses. */
function globalSeedRangeKey(target: GlobalLfoTargetId): GlobalAudioSeedFieldKey {
  if (target.startsWith('lpf.')) return `filterLPF.${target.slice(4)}` as GlobalAudioSeedFieldKey;
  if (target.startsWith('hpf.')) return `filterHPF.${target.slice(4)}` as GlobalAudioSeedFieldKey;
  return target as GlobalAudioSeedFieldKey; // eq3.* already matches directly
}

/**
 * Resolve the real min/max a target's Signal actually operates in. Reuses
 * GLOBAL_AUDIO_SEED_RANGES (Task 4/5) for global targets rather than
 * maintaining a second range table. Returns null for targets with no
 * meaningful output range here (phase, handled entirely separately).
 *
 * This is the field's own absolute range — NOT what gets applied directly to
 * lfo.min/lfo.max. See centeredSwingFromRange() below for why.
 */
function resolveLfoOutputRange(target: LfoTargetId): { min: number; max: number } | null {
  if (target === 'volume') return ROBOT_LFO_FIELD_RANGE.volume;
  const robotFieldMatch = /^layer\d+\.(gain|detune|pulseWidth)$/.exec(target);
  if (robotFieldMatch) return ROBOT_LFO_FIELD_RANGE[robotFieldMatch[1]];
  if (!isRobotTarget(target)) {
    // Anything that isn't a robot target and isn't 'volume' is a global-chain target.
    const range = GLOBAL_AUDIO_SEED_RANGES[globalSeedRangeKey(target as GlobalLfoTargetId)];
    return range ? { min: range.min, max: range.max } : null;
  }
  return null;
}

/**
 * Convert a field's absolute range AND its current base value into the
 * ADDITIVE delta lfo.min/lfo.max should actually be set to.
 *
 * Tone.LFO.connect() sums onto the destination Param's existing value —
 * native Web Audio AudioParam behavior: connecting an input signal ADDS to
 * whatever the param's own intrinsic value already is, it never overrides
 * it. Using a field's raw absolute range (e.g. LPF frequency, 20-20000)
 * directly as lfo.min/lfo.max was a real bug: that adds up to +20000 Hz on
 * top of whatever the slider is already at, trivially pushing the actual
 * cutoff past Nyquist (filter wide open — an audible burst of unfiltered
 * harmonics) the instant the LFO connects.
 *
 * A first fix used a FIXED zero-centered swing (half the field's own total
 * span) — better, but still a constant, independent of where the base value
 * actually sits. That reintroduced the same bug from the other direction:
 * for a base value anywhere off-center (e.g. left low, as a workaround for
 * the original crash), a fixed swing still large enough to swing the OTHER
 * way pushed the combined value below the field's own minimum for roughly
 * half of every cycle — heard as the mix muting for half the time.
 *
 * The real fix: bound the swing by the base value's own distance to
 * whichever edge of the range is nearer — min(value - rangeMin, rangeMax -
 * value). Added to the base value, this can never leave [rangeMin, rangeMax]
 * in either direction, for any starting position. A value sitting exactly at
 * the range's own midpoint (both distances equal) still gets the same "half
 * the total span" swing as the simpler fixed version — no regression for
 * fields whose typical resting value already is the midpoint (EQ dB bands,
 * robot detune both default to 0, the center of a symmetric range).
 */
function centeredSwingFromRange(
  range: { min: number; max: number },
  currentValue: number
): { min: number; max: number } {
  // A non-finite currentValue (NaN/Infinity — e.g. the resolved Signal not
  // actually initialized yet) must never reach lfo.min/lfo.max: connecting
  // an LFO whose output is NaN poisons the live Web Audio graph downstream
  // of whatever it's connected to, not just this one target. Fall back to
  // zero swing (the LFO contributes nothing) rather than propagate it.
  if (!Number.isFinite(currentValue)) return { min: 0, max: 0 };
  const distanceToMin = currentValue - range.min;
  const distanceToMax = range.max - currentValue;
  const halfSpan = Math.max(0, Math.min(distanceToMin, distanceToMax));
  return { min: -halfSpan, max: halfSpan };
}

/** Unit-amplitude waveform value in [-1, 1] for a given shape at a given phase angle (radians). */
function waveformUnit(shape: LfoShape, phaseRadians: number): number {
  const twoPi = Math.PI * 2;
  const t = ((phaseRadians % twoPi) + twoPi) % twoPi;
  switch (shape) {
    case 'sine':
      return Math.sin(t);
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(t));
    case 'square':
      return t < Math.PI ? 1 : -1;
    case 'sawtooth':
      return t / Math.PI - 1;
    default:
      return 0;
  }
}

function isTransportRunning(): boolean {
  try {
    return Tone.getTransport().state === 'started';
  } catch {
    return false;
  }
}

/** Apply a full LfoSettings object onto a live node (used at creation and by each setter). */
function applySettingsToNode(lfo: Tone.LFO, settings: LfoSettings): void {
  lfo.frequency.value = settings.rate;
  lfo.amplitude.value = settings.depth / 100;
  lfo.type = settings.shape;
}

/**
 * Lazily construct (or return the existing) Tone.LFO for an instance key.
 * This is the only place `new Tone.LFO(...)` is called — the sole trigger
 * for construction is a setter reaching this via getOrCreateLfo; getters and
 * start()/stop() on an unset target never call it (see their own bodies).
 */
function getOrCreateLfo(key: string, target: LfoTargetId, robotId?: string): Tone.LFO {
  let lfo = activeLfos.get(key);
  if (!lfo) {
    const settings = getLfoSettings(target, robotId);
    lfo = new Tone.LFO(settings.rate);
    applySettingsToNode(lfo, settings);
    activeLfos.set(key, lfo);
  }
  return lfo;
}

// ========================================
// PUBLIC API
// ========================================

/** Current settings for a target — DEFAULT_LFO_SETTINGS until a setter has been called. Never constructs a node. */
function getLfoSettings(target: LfoTargetId, robotId?: string): LfoSettings {
  return settingsByKey.get(instanceKey(target, robotId)) ?? DEFAULT_LFO_SETTINGS[target];
}

/**
 * Set the LFO's rate in Hz — a plain float, clamped to [LFO_RATE_MIN,
 * LFO_RATE_MAX]. Never a Time-string/note-division; no BeatClock or
 * Transport involvement in the value itself (spec §3 — rate stays free-
 * running, only start/stop are transport-gated, see start() below).
 */
function setLfoRate(target: LfoTargetId, hz: number, robotId?: string): void {
  const key = instanceKey(target, robotId);
  const clamped = clamp(hz, LFO_RATE_MIN, LFO_RATE_MAX);
  const updated: LfoSettings = { ...getLfoSettings(target, robotId), rate: clamped };
  settingsByKey.set(key, updated);
  getOrCreateLfo(key, target, robotId).frequency.value = clamped;
}

/**
 * Set the LFO's depth as a percent (0-100), clamped to [LFO_DEPTH_MIN,
 * LFO_DEPTH_MAX]. Maps onto Tone.LFO's amplitude Param, which is a
 * 0-1 normalRange — Tone.LFO has no `depth` property of its own.
 */
function setLfoDepth(target: LfoTargetId, percent: number, robotId?: string): void {
  const key = instanceKey(target, robotId);
  const clamped = clamp(percent, LFO_DEPTH_MIN, LFO_DEPTH_MAX);
  const updated: LfoSettings = { ...getLfoSettings(target, robotId), depth: clamped };
  settingsByKey.set(key, updated);
  getOrCreateLfo(key, target, robotId).amplitude.value = clamped / 100;
}

/** Set the LFO's oscillator shape. */
function setLfoShape(target: LfoTargetId, shape: LfoSettings['shape'], robotId?: string): void {
  const key = instanceKey(target, robotId);
  const updated: LfoSettings = { ...getLfoSettings(target, robotId), shape };
  settingsByKey.set(key, updated);
  getOrCreateLfo(key, target, robotId).type = shape;
}

/**
 * Start an already-created LFO, gated by the transport: no-ops (does not
 * call the underlying node's start()) unless Tone.getTransport().state is
 * 'started'. Deliberately does NOT call Tone.LFO.sync() — per its own doc
 * comment, sync() ties frequency to the transport's BPM as well as
 * start/stop, which would tempo-couple the rate and violate the confirmed
 * intent that rate stays a free-running Hz value. If no node has been
 * created yet for this target (no setter/connect called), this is a no-op —
 * start() itself never lazily constructs a node.
 */
function start(target: LfoTargetId, robotId?: string): void {
  const lfo = activeLfos.get(instanceKey(target, robotId));
  if (!lfo) return;
  if (!isTransportRunning()) return;
  lfo.start();
}

/** Stop an LFO if one exists. Always allowed, regardless of transport state — safe/idempotent if already stopped or never created. */
function stop(target: LfoTargetId, robotId?: string): void {
  activeLfos.get(instanceKey(target, robotId))?.stop();
}

/**
 * Start the manual-polling fallback for a 'layerN.phase' target: recomputes
 * a waveform value each tick from the target's current LfoSettings and
 * reapplies it via AudioEngine.updateVoiceLayerParams — a periodic re-.set(),
 * not a native .connect(). Uses beatClock's Transport-driven scheduleRepeat
 * (never a raw JS timer, per CLAUDE.md), matching the same transport-gated
 * spirit as start()/stop() above.
 */
function startPhaseFallback(key: string, target: RobotLfoTargetId, robotId: string, layerIndex: number): void {
  const startTime = Tone.now();
  const scheduleId = scheduleRepeat(PHASE_POLL_INTERVAL, () => {
    const settings = getLfoSettings(target, robotId);
    const elapsed = Tone.now() - startTime;
    const angle = 2 * Math.PI * settings.rate * elapsed;
    const unit = waveformUnit(settings.shape, angle);
    const swing = (settings.depth / 100) * PHASE_CENTER_DEGREES;
    const phase = clamp(PHASE_CENTER_DEGREES + unit * swing, 0, 360);

    const layers: Partial<OscillatorLayer>[] = [];
    layers[layerIndex] = { phase };
    AudioEngine.updateVoiceLayerParams(robotId, layers as OscillatorLayer[]);
  });
  phaseFallbacks.set(key, { scheduleId, robotId, layerIndex, startTime });
}

function stopPhaseFallback(key: string): void {
  const entry = phaseFallbacks.get(key);
  if (!entry) return;
  cancelSchedule(entry.scheduleId);
  phaseFallbacks.delete(key);
}

/**
 * Connect this target's LFO to its live modulation destination. Returns
 * false — never throws — when: a robot-scoped target is called without a
 * robotId (nothing to resolve against), or AudioEngine has no live Signal
 * for the target (pulseWidth on a non-'pulse' layer — a structural Tone.js
 * limitation documented at the AudioEngine layer, Tasks 9/10). 'layerN.phase'
 * is handled entirely separately via the manual-polling fallback above,
 * since no live Signal exists for it at all.
 */
function connectLfoTarget(target: LfoTargetId, robotId?: string): boolean {
  const key = instanceKey(target, robotId);

  const phaseMatch = /^layer(\d+)\.phase$/.exec(target);
  if (phaseMatch) {
    if (!robotId) return false;
    getOrCreateLfo(key, target, robotId); // keep rate/depth/shape bookkeeping consistent with every other target
    if (phaseFallbacks.has(key)) return true; // already connected — idempotent
    startPhaseFallback(key, target as RobotLfoTargetId, robotId, Number(phaseMatch[1]));
    return true;
  }

  // signal's type is inferred from AudioEngine's own return types (Tasks 9/10) —
  // no local `any` needed here even though that union isn't re-exported by name.
  if (isRobotTarget(target) && !robotId) return false;
  const signal = isRobotTarget(target)
    ? AudioEngine.getRobotModulationTarget(robotId!, target as RobotLfoTargetId)
    : AudioEngine.getGlobalModulationTarget(target as GlobalLfoTargetId);
  if (!signal) return false;

  const lfo = getOrCreateLfo(key, target, robotId);
  const range = resolveLfoOutputRange(target);
  if (range) {
    // Read the target's CURRENT base value (both Signal and Param expose a
    // plain numeric .value getter) so the swing can be bounded relative to
    // where it actually sits, not just the field's own total span.
    const currentValue = (signal as unknown as { value: number }).value;
    const swing = centeredSwingFromRange(range, currentValue);
    lfo.min = swing.min;
    lfo.max = swing.max;
  }

  if (connectedSignals.get(key) === signal) return true; // already connected to this exact signal — no-op, never a second .connect()

  if (connectedSignals.has(key)) {
    // Connected to a different (stale) signal — e.g. a rebuilt composite
    // voice resolved a new Gain node for the same target — reverse the old
    // connection before wiring the new one, rather than leaving both live.
    try {
      lfo.disconnect();
    } catch (err) {
      devWarn('[lfoEngine] connectLfoTarget: disconnect of stale signal failed', err);
    }
  }

  try {
    lfo.connect(signal as unknown as Tone.InputNode);
  } catch (err) {
    devWarn('[lfoEngine] connectLfoTarget: connect failed', err);
    return false;
  }
  connectedSignals.set(key, signal);
  return true;
}

/** Reverse connectLfoTarget: disconnects the live node, or cancels the phase-polling schedule. Safe/no-op if nothing was connected. */
function disconnectLfoTarget(target: LfoTargetId, robotId?: string): void {
  const key = instanceKey(target, robotId);
  if (phaseFallbacks.has(key)) {
    stopPhaseFallback(key);
    return;
  }
  connectedSignals.delete(key);
  try {
    activeLfos.get(key)?.disconnect();
  } catch (err) {
    devWarn('[lfoEngine] disconnectLfoTarget: disconnect failed', err);
  }
}

export const lfoEngine = {
  getLfoSettings,
  setLfoRate,
  setLfoDepth,
  setLfoShape,
  start,
  stop,
  connectLfoTarget,
  disconnectLfoTarget,
};
