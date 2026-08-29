// ========================================
// IMPORTS
// ========================================
import * as Tone from 'tone';
import alea from 'alea';

import { AudioEngine } from './AudioEngine';
import { scheduleRepeat, cancelSchedule } from './beatClock';
import { DEFAULT_LFO_SETTINGS } from '../data/lfoConfig';
import { GLOBAL_AUDIO_SEED_RANGES, type GlobalAudioSeedFieldKey } from '../data/globalAudioSeedRanges';

import type { OscillatorLayer } from '../types/layeredAudio';
import type { LfoSettings, LfoShape, RobotLfoTargetId, GlobalLfoTargetId, DriftGroupId } from '../types/lfo';
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

/**
 * Per-group shared secondary Tone.LFO pools, phase-spread evenly across each
 * group's own pool — fixed and deterministic, not seeded per-planet (only
 * the drift AMOUNT, rateDrift/depthDrift, is seeded; a pool's own relative
 * phases are a structural implementation detail, the same for every
 * session). Each group's pool is constructed lazily, once, on that group's
 * own first successful connectLfoTarget call — never per-robot, never
 * per-target, and never shared across groups. See
 * docs/specs/LFO_DRIFT_GROUPS.md §1.2 (reshaped from docs/specs/LFO_DRIFT.md's
 * single shared pool).
 */
const driftPools: Partial<Record<DriftGroupId, Tone.LFO[]>> = {};

/**
 * One rate-drift + depth-drift Gain pair per currently-connected primary,
 * keyed the same as activeLfos/connectedSignals. Both Gains start at 0 —
 * setGlobalRateDrift/setGlobalDepthDrift are what make drift audible; this
 * wiring alone is deliberately inert.
 */
interface DriftLink {
  /** Set once at attachDrift time from the target the link was created for
   *  — never reassigned. Determines which group's global rate/depth drift
   *  amount this link's Gains read (docs/specs/LFO_DRIFT_GROUPS.md §1.3). */
  group: DriftGroupId;
  rateDriftGain: Tone.Gain;
  depthDriftGain: Tone.Gain;
  /** Whether depthDriftGain is currently wired into the primary's amplitude.
   *  False whenever this primary's own depth is 0 — see refreshDepthDriftGain's
   *  silence guard (docs/specs/LFO_DRIFT.md §1.3). Rate has no equivalent
   *  field: it has no "off" state (LFO_RATE_MIN is 0.1, never 0), so
   *  rateDriftGain stays connected unconditionally from attachDrift on. */
  depthDriftConnected: boolean;
}
const driftLinks = new Map<string, DriftLink>();

/** Global Rate/Depth Drift amounts, both -1..1, pushed by setGlobalRateDrift/
 *  setGlobalDepthDrift — read by refreshRateDriftGain/refreshDepthDriftGain
 *  for every currently-linked primary. */
let globalRateDrift = 0;
let globalDepthDrift = 0;

/** Phase modulates around this center (degrees) — the midpoint of the 0-360 range
 * ROBOT_DATA_GRID.md's Phase field documents. Depth scales how far it swings from
 * there, not around the layer's own current phase value (that would require
 * lfoEngine to read robot state directly, which stays AudioEngine/store territory —
 * a deliberate Phase-0 scope choice, revisit once UI/testing calls for it). */
const PHASE_CENTER_DEGREES = 180;
/** Polling granularity for the phase fallback — matches BeatClock's own internal tick. */
const PHASE_POLL_INTERVAL = '16n';

/** Per-group pool size — sized to each group's own real target ceiling, not
 *  a uniform constant. eq3/filterLPF/filterHPF only ever have 3/2/2 possible
 *  LFO targets in the entire app; robots can have dozens of simultaneously
 *  active primaries across every robot/layer/field, the same "70-100+
 *  primaries, a handful of buckets is enough" reasoning
 *  docs/specs/LFO_DRIFT.md §1.2 already established for its own flat 8.
 *  See docs/specs/LFO_DRIFT_GROUPS.md §1.2. */
const DRIFT_POOL_SIZE: Record<DriftGroupId, number> = {
  eq3: 3,
  filterLPF: 2,
  filterHPF: 2,
  robots: 8,
};
/** ~33-second cycle for the shared drift oscillators — fixed, never exposed
 *  in the UI (only the drift AMOUNT, rateDrift/depthDrift, is user-facing). */
const DRIFT_RATE_HZ = 0.03;

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
 *
 * 'volume' is deliberately 0-2, NOT the 0-1 domain ROBOT_DATA_GRID.md
 * documents for the Volume slider itself. getRobotModulationTarget resolves
 * 'volume' to the composite voice's own `output` Gain node (compositeVoice.ts)
 * — an internal mix-stage node constructed at a fixed 1 and never written to
 * in production, entirely separate from the robot's masterVolume/bus-gain
 * fader. A 0-1 range put that permanent value of 1 exactly on the range's own
 * max edge, so centeredSwingFromRange's min(distanceToMin, distanceToMax) was
 * unconditionally 0 — the Volume LFO connected and took rate/depth/shape, but
 * could never produce any audible swing, for any setting. 0-2 matches 'gain'
 * (the other field backed by an identical Tone.Gain(1) node), putting 1 at
 * the midpoint instead of the edge.
 */
const ROBOT_LFO_FIELD_RANGE: Record<string, { min: number; max: number }> = {
  volume: { min: 0, max: 2 },
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

/**
 * Whether it's safe to actually start an oscillator right now. Gates on the
 * AudioContext itself, not Transport state — Transport can still be mid-
 * startup (instrument loading, waiting on reverb) well after Tone.start()
 * has already made the context running, and gating on Transport left a real
 * window where an LFO could connect to a live target but never actually
 * start oscillating: Tone.LFO outputs a raw, undepth-scaled "stopped" value
 * (its waveform's value at its resting phase — not necessarily 0, e.g. for
 * square/sawtooth/triangle shapes) for as long as it never starts, which
 * gets summed straight into whatever it's connected to indefinitely.
 */
function isAudioContextRunning(): boolean {
  try {
    return Tone.getContext().state === 'running';
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
 * Which drift group a target belongs to — the three global-chain groups
 * that ever carry an lfoTarget map one-to-one by their own short-form
 * prefix (mirrors globalSeedRangeKey's own 'lpf.'/'hpf.' prefix-matching
 * style above); every RobotLfoTargetId (isRobotTarget(target) === true)
 * shares 'robots' regardless of field or robotId. See
 * docs/specs/LFO_DRIFT_GROUPS.md §1.1.
 */
function driftGroupForTarget(target: LfoTargetId): DriftGroupId {
  if (target.startsWith('eq3.')) return 'eq3';
  if (target.startsWith('lpf.')) return 'filterLPF';
  if (target.startsWith('hpf.')) return 'filterHPF';
  return 'robots';
}

/**
 * Lazily construct (or return the existing) drift-oscillator pool for one
 * group — sized to that group's own DRIFT_POOL_SIZE entry, phase-spread
 * evenly across it. Started immediately if the AudioContext is already
 * running, matching every other LFO construction path in this file. Never
 * shared across groups.
 */
function getOrCreateDriftPool(group: DriftGroupId): Tone.LFO[] {
  const existing = driftPools[group];
  if (existing) return existing;
  const size = DRIFT_POOL_SIZE[group];
  const pool: Tone.LFO[] = [];
  for (let i = 0; i < size; i++) {
    const lfo = new Tone.LFO({ frequency: DRIFT_RATE_HZ, type: 'sine', phase: (360 / size) * i });
    if (isAudioContextRunning()) lfo.start();
    pool.push(lfo);
  }
  driftPools[group] = pool;
  return pool;
}

/**
 * Wire a successfully-connected primary into the shared drift pool — called
 * once from connectLfoTarget, right after the primary's own connection to
 * its target succeeds. Idempotent (checked via driftLinks), matching the
 * pattern connectedSignals already uses for the primary's own connection.
 * Both Gains start at 0 — setGlobalRateDrift/setGlobalDepthDrift (Task 5)
 * are what make drift audible; this wiring alone is deliberately inert.
 */
function attachDrift(key: string, lfo: Tone.LFO, group: DriftGroupId): void {
  if (driftLinks.has(key)) return;
  const pool = getOrCreateDriftPool(group);
  const poolLfo = pool[Math.floor(alea(key)() * pool.length)];

  const rateDriftGain = new Tone.Gain(0);
  const depthDriftGain = new Tone.Gain(0);
  poolLfo.connect(rateDriftGain);
  poolLfo.connect(depthDriftGain);

  // Same Signal.override fix connectLfoTarget already applies to its own
  // target connection below — reused, not re-derived (docs/specs/LFO_DRIFT.md
  // §1.4). lfo.frequency is a real Tone.Signal. Rate has no "off" state
  // (LFO_RATE_MIN is 0.1, never 0), so rateDriftGain connects unconditionally
  // here and stays connected for the primary's whole lifetime.
  (lfo.frequency as unknown as { override?: boolean }).override = false;
  const currentFreq = lfo.frequency.value as number;
  rateDriftGain.connect(lfo.frequency as unknown as Tone.InputNode);
  if (Number.isFinite(currentFreq)) lfo.frequency.value = currentFreq;

  // depthDriftGain's own connection is deliberately NOT made here — it's
  // conditional on this primary's own current depth, per the "never revive
  // a silenced target" guard (§1.3). refreshDepthDriftGain below owns it.
  driftLinks.set(key, { group, rateDriftGain, depthDriftGain, depthDriftConnected: false });
  refreshRateDriftGain(key);
  refreshDepthDriftGain(key);
}

/**
 * Recompute one primary's rate-drift Gain value from its OWN current rate
 * (bounded via centeredSwingFromRange, the same "swing bounded by distance
 * to the nearer edge" math connectLfoTarget already uses for primary-to-
 * target swings) and the current global rateDrift amount. Called after
 * attachDrift, after setLfoRate, and from setGlobalRateDrift for every
 * linked key. A no-op if this key has no drift link (yet, or ever).
 */
function refreshRateDriftGain(key: string): void {
  const link = driftLinks.get(key);
  const lfo = activeLfos.get(key);
  if (!link || !lfo) return;
  const currentRate = lfo.frequency.value as number;
  const swing = centeredSwingFromRange({ min: LFO_RATE_MIN, max: LFO_RATE_MAX }, currentRate);
  link.rateDriftGain.gain.value = globalRateDrift * swing.max;
}

/**
 * Recompute one primary's depth-drift Gain — connects it lazily (via the
 * same override-disable-then-restore sequence attachDrift already uses for
 * frequency) the first time this primary's own depth rises above 0, and
 * DISCONNECTS it entirely (not just zeroes it) whenever depth is 0. A
 * primary deliberately silenced by its own Depth must stay silent
 * regardless of global drift (§1.3) — a zeroed-but-still-connected Gain
 * can't guarantee that on its own, since the shared pool oscillator's
 * output is bipolar and could still swing the amplitude UP on its upswing
 * half. Called after attachDrift, after setLfoDepth, and from
 * setGlobalDepthDrift for every linked key. A no-op if this key has no
 * drift link (yet, or ever).
 */
function refreshDepthDriftGain(key: string): void {
  const link = driftLinks.get(key);
  const lfo = activeLfos.get(key);
  if (!link || !lfo) return;
  const currentAmp = lfo.amplitude.value as number;

  if (currentAmp <= 0) {
    if (link.depthDriftConnected) {
      try {
        link.depthDriftGain.disconnect();
      } catch (err) {
        devWarn('[lfoEngine] refreshDepthDriftGain: disconnect failed', err);
      }
      link.depthDriftConnected = false;
    }
    return;
  }

  if (!link.depthDriftConnected) {
    // lfo.amplitude is a Tone.Param, not a Signal — no override escape
    // hatch, always resets to 0 on connect regardless (§1.4). Writing
    // `.override` here is harmless defensive symmetry with the frequency
    // case in attachDrift; the restore afterward is what actually matters.
    (lfo.amplitude as unknown as { override?: boolean }).override = false;
    link.depthDriftGain.connect(lfo.amplitude as unknown as Tone.InputNode);
    if (Number.isFinite(currentAmp)) lfo.amplitude.value = currentAmp;
    link.depthDriftConnected = true;
  }

  const swing = centeredSwingFromRange({ min: 0, max: 1 }, currentAmp);
  link.depthDriftGain.gain.value = globalDepthDrift * swing.max;
}

/** Reverse attachDrift — called from disconnectLfoTarget. The shared pool
 *  oscillators are never disposed here; they're app-lifetime. */
function detachDrift(key: string): void {
  const link = driftLinks.get(key);
  if (!link) return;
  try {
    link.rateDriftGain.disconnect();
  } catch (err) {
    devWarn('[lfoEngine] detachDrift: rate-drift teardown failed', err);
  }
  try {
    link.depthDriftGain.disconnect();
  } catch (err) {
    devWarn('[lfoEngine] detachDrift: depth-drift teardown failed', err);
  }
  driftLinks.delete(key);
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
  refreshRateDriftGain(key); // no-op if this target has no drift link yet
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
  refreshDepthDriftGain(key); // no-op if this target has no drift link yet
}

/** Set the LFO's oscillator shape. */
function setLfoShape(target: LfoTargetId, shape: LfoSettings['shape'], robotId?: string): void {
  const key = instanceKey(target, robotId);
  const updated: LfoSettings = { ...getLfoSettings(target, robotId), shape };
  settingsByKey.set(key, updated);
  getOrCreateLfo(key, target, robotId).type = shape;
}

/**
 * Start an already-created LFO, gated by the AudioContext: no-ops (does not
 * call the underlying node's start()) unless Tone.getContext().state is
 * 'running' (not Transport state — see isAudioContextRunning() above).
 * Deliberately does NOT call Tone.LFO.sync() — per its own doc comment,
 * sync() ties frequency to the transport's BPM as well as start/stop, which
 * would tempo-couple the rate and violate the confirmed intent that rate
 * stays a free-running Hz value. If no node has been created yet for this
 * target (no setter/connect called), this is a no-op — start() itself never
 * lazily constructs a node.
 */
function start(target: LfoTargetId, robotId?: string): void {
  const lfo = activeLfos.get(instanceKey(target, robotId));
  if (!lfo) return;
  if (!isAudioContextRunning()) return;
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
  // Read the target's CURRENT base value (both Signal and Param expose a
  // plain numeric .value getter) — used to bound the swing below AND to
  // restore the value after connecting (see the comment further down).
  const currentValue = (signal as unknown as { value: number }).value;
  const range = resolveLfoOutputRange(target);
  if (range) {
    const swing = centeredSwingFromRange(range, currentValue);
    lfo.min = swing.min;
    lfo.max = swing.max;
  }

  if (connectedSignals.get(key) === signal) {
    attachDrift(key, lfo, driftGroupForTarget(target)); // already connected to this exact signal — no-op, never a second .connect() — but drift still needs to be (idempotently) attached
    return true;
  }

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

  // Tone.Signal defaults `override: true`, which makes Tone's own
  // connectSignal() (invoked internally by lfo.connect() below) immediately
  // cancelScheduledValues + setValueAtTime(0, 0) on the destination and
  // permanently mark it "overridden" — the INSTANT .connect() runs, before
  // the LFO has even started oscillating, and regardless of what lfo.min/
  // lfo.max are set to. For a filter's frequency Signal, that's a step
  // change to an invalid 0 Hz cutoff every single time an LFO connects —
  // verified directly against Tone.js's own source (signal/Signal.ts). It
  // also silently discards whatever the target's own value was, which is
  // exactly the "additive on top of the current value" assumption
  // centeredSwingFromRange() above depends on. Disabling `override` first
  // restores plain additive Web Audio summing. Has no effect on a Tone.Param
  // destination (e.g. robot Gain targets) — Param has no `override` concept
  // at all; that case is handled separately below.
  (signal as unknown as { override?: boolean }).override = false;

  try {
    lfo.connect(signal as unknown as Tone.InputNode);
  } catch (err) {
    devWarn('[lfoEngine] connectLfoTarget: connect failed', err);
    return false;
  }

  // Tone.Param (e.g. robot Gain targets — Tone.Gain.gain) has no `override`
  // escape hatch — connecting to it ALWAYS resets its own value to 0 the
  // instant .connect() runs (verified: connectSignal()'s `destination
  // instanceof Param` branch is unconditional, unlike Signal's). Unlike
  // Signal, though, Param never gets marked permanently "overridden" by
  // this — a plain write immediately after restores it, and the LFO's
  // contribution sums on top of it normally from then on, same as the
  // Signal case once override is disabled above. Harmless no-op for a
  // Signal destination — override being false already meant connect()
  // never touched its value in the first place. Guarded against a
  // non-finite currentValue for the same reason centeredSwingFromRange()
  // does — never write NaN into a live Web Audio graph.
  if (Number.isFinite(currentValue)) {
    (signal as unknown as { value: number }).value = currentValue;
  }

  connectedSignals.set(key, signal);
  attachDrift(key, lfo, driftGroupForTarget(target));
  return true;
}

/**
 * Set the global Rate Drift amount (-1..1, clamped) — immediately refreshes
 * every currently-linked primary's rate-drift Gain. Safe no-op with zero
 * primaries connected (just updates the module-scope value).
 */
function setGlobalRateDrift(value: number): void {
  globalRateDrift = clamp(value, -1, 1);
  for (const key of driftLinks.keys()) refreshRateDriftGain(key);
}

/**
 * Set the global Depth Drift amount (-1..1, clamped) — immediately
 * refreshes every currently-linked primary's depth-drift Gain, respecting
 * each primary's own silence guard (§1.3). Safe no-op with zero primaries
 * connected.
 */
function setGlobalDepthDrift(value: number): void {
  globalDepthDrift = clamp(value, -1, 1);
  for (const key of driftLinks.keys()) refreshDepthDriftGain(key);
}

/** Reverse connectLfoTarget: disconnects the live node, or cancels the phase-polling schedule. Safe/no-op if nothing was connected. */
function disconnectLfoTarget(target: LfoTargetId, robotId?: string): void {
  const key = instanceKey(target, robotId);
  if (phaseFallbacks.has(key)) {
    stopPhaseFallback(key);
    return;
  }
  connectedSignals.delete(key);
  detachDrift(key);
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
  setGlobalRateDrift,
  setGlobalDepthDrift,
};
