// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';

import { AudioEngine } from './AudioEngine';
import { scheduleRepeat, cancelSchedule } from './beatClock';
import { DEFAULT_LFO_SETTINGS } from '../data/lfoConfig';

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
 * for the target (pulseWidth on a non-'pulse' layer, chorus.delayTime —
 * structural Tone.js limitations documented at the AudioEngine layer,
 * Tasks 9/10). 'layerN.phase' is handled entirely separately via the
 * manual-polling fallback above, since no live Signal exists for it at all.
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
  try {
    lfo.connect(signal as unknown as Tone.InputNode);
  } catch (err) {
    devWarn('[lfoEngine] connectLfoTarget: connect failed', err);
    return false;
  }
  return true;
}

/** Reverse connectLfoTarget: disconnects the live node, or cancels the phase-polling schedule. Safe/no-op if nothing was connected. */
function disconnectLfoTarget(target: LfoTargetId, robotId?: string): void {
  const key = instanceKey(target, robotId);
  if (phaseFallbacks.has(key)) {
    stopPhaseFallback(key);
    return;
  }
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
