// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';

import { DEFAULT_LFO_SETTINGS } from '../data/lfoConfig';

import type { LfoSettings, RobotLfoTargetId, GlobalLfoTargetId } from '../types/lfo';
import { LFO_RATE_MIN, LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX } from '../types/lfo';

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

export const lfoEngine = {
  getLfoSettings,
  setLfoRate,
  setLfoDepth,
  setLfoShape,
  start,
  stop,
};
