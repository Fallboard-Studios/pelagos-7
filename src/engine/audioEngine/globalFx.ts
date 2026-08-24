import * as Tone from 'tone';

import { getToneCtor, type ModulationTarget } from './toneHelpers';
import { devLog, devWarn } from '@/utils/helpers';
import type { ReverbSettings, DelaySettings, FilterSettings, EQ3Settings, CompressorSettings, LimiterSettings } from '@/types/globalAudio';
import type { GlobalLfoTargetId } from '@/types/lfo';

// ========================================
// MODULE STATE (module-scoped, runtime-only — never put these in Zustand)
// ========================================
let _globalCompressor: Tone.Compressor | null = null;
let _globalReverb: Tone.Reverb | null = null;
let _globalDelay: Tone.FeedbackDelay | null = null;
let _globalEQ: Tone.EQ3 | null = null;
let _globalLPF: Tone.Filter | null = null;
let _globalHPF: Tone.Filter | null = null;
let _globalLimiter: Tone.Limiter | null = null;
// Master output gain controlling overall volume (used by setMasterVolume/getMasterVolume)
let _masterGain: Tone.Gain | null = null;
let _masterVolume = 1;
// Which of the two fixed topologies wireGlobalFxChain() last wired — read by
// setGlobalBypass() to restore the correct order when un-bypassing.
let _currentControlledDecay = false;

/**
 * Cache of the last wet/level values for each FX node — used to restore values
 * when an effect is re-enabled after being bypassed via setEffectBypass().
 */
const _fxParamCache = {
  reverb: { wet: 0.3 },
  delay: { wet: 0.15 },
  eq3: { low: 0, mid: 0, high: 0 },
  lpf: { frequency: 20000, Q: 1 },
  hpf: { frequency: 20, Q: 1 },
  compressor: { threshold: -18, ratio: 6, attack: 0.003, release: 0.15, knee: 0 },
  limiter: { threshold: -12 },
};

/**
 * Build every global FX node and wire them into the default "Natural Decay"
 * topology via wireGlobalFxChain(false). All nodes are guarded with
 * getToneCtor() checks for test/headless environments. Idempotent relative to
 * AudioEngine.ts's own instrumentsLoaded guard — this function itself doesn't
 * guard re-entry, that stays the caller's job (loadInstruments).
 */
export function buildGlobalFxChain(): void {
  _globalCompressor = new Tone.Compressor({
    threshold: -18,  // engage earlier to tame FM/AM harmonics before clipping
    ratio: 6,        // softer compression ratio; not a hard limiter
    attack: 0.003,
    release: 0.15,
  });

  const ReverbCtor = getToneCtor<Tone.Reverb>('Reverb');
  const DelayCtor = getToneCtor<Tone.FeedbackDelay>('FeedbackDelay');
  const EQ3Ctor = getToneCtor<Tone.EQ3>('EQ3');
  const FilterCtor = getToneCtor<Tone.Filter>('Filter');
  const GainCtorFX = getToneCtor<Tone.Gain>('Gain');
  const LimiterCtor = getToneCtor<Tone.Limiter>('Limiter');

  if (ReverbCtor) {
    _globalReverb = new ReverbCtor({ decay: 1.5, preDelay: 0.02, wet: 0.3 });
  }
  if (DelayCtor) {
    // maxDelay is explicit on purpose: it must stay >= the max of
    // GLOBAL_AUDIO_SEED_RANGES['delay.delayTime'] (1s). Previously this was
    // an unset, implicit reliance on Tone.FeedbackDelay's own default of 1 —
    // correct today only by coincidence, and silently driftable if either
    // side changed independently.
    _globalDelay = new DelayCtor({ delayTime: 0.25, feedback: 0.2, wet: 0, maxDelay: 1 });
  }
  if (EQ3Ctor) {
    _globalEQ = new EQ3Ctor({ low: 0, mid: 0, high: 0 });
  }
  if (FilterCtor) {
    _globalLPF = new FilterCtor({ type: 'lowpass', frequency: 20000, Q: 1 });
    _globalHPF = new FilterCtor({ type: 'highpass', frequency: 20, Q: 1 });
  }
  if (LimiterCtor) {
    _globalLimiter = new LimiterCtor({ threshold: -12 });
  }
  if (GainCtorFX) {
    // Master gain sits after the FX chain (or final destination) to control overall volume.
    try {
      _masterGain = new GainCtorFX(1);
    } catch {
      _masterGain = null;
    }
  }

  wireGlobalFxChain(false);
}

/**
 * Disconnect every constructed global FX node from whatever it's currently
 * connected to. Tone.js's (and the underlying Web Audio) disconnect() with no
 * arguments detaches a node from ALL of its outputs, so this doesn't need to
 * track exact prior edges — safe to call even if nothing was ever connected.
 */
function disconnectAllFxNodes(): void {
  const nodes = [
    _globalEQ,
    _globalLPF,
    _globalHPF,
    _globalDelay,
    _globalReverb,
    _globalCompressor,
    _globalLimiter,
    _masterGain,
  ].filter(Boolean) as Array<{ disconnect: () => void }>;
  for (const node of nodes) {
    try {
      node.disconnect();
    } catch (err) {
      devWarn('[AudioEngine] disconnect failed during FX rewire', err);
    }
  }
}

/**
 * Wire the global FX chain into one of two fixed topologies, tearing down
 * whatever was previously connected first:
 *
 * - Natural Decay (controlledDecay=false, default): EQ3 → LPF → HPF → Delay →
 *   Reverb → Compressor → Limiter — the two time-based effects' tails ring
 *   out before compression.
 * - Controlled Decay (controlledDecay=true): EQ3 → LPF → HPF → Compressor →
 *   Delay → Reverb → Limiter — compression happens before both Delay and
 *   Reverb, tightening their tails.
 *
 * Both topologies terminate at masterGain → Destination (or straight to
 * Destination if masterGain wasn't constructed). Called once from
 * buildGlobalFxChain() and again whenever the "Natural Decay" / "Controlled
 * Decay" toggle flips (src/stores/audioStore.ts's setCompressorBeforeDelay).
 */
export function wireGlobalFxChain(controlledDecay: boolean): void {
  _currentControlledDecay = controlledDecay;
  disconnectAllFxNodes();

  const orderedNodes = controlledDecay
    ? [_globalEQ, _globalLPF, _globalHPF, _globalCompressor, _globalDelay, _globalReverb, _globalLimiter]
    : [_globalEQ, _globalLPF, _globalHPF, _globalDelay, _globalReverb, _globalCompressor, _globalLimiter];

  const chainNodes = orderedNodes.filter(Boolean) as Array<{
    connect: (t: unknown) => unknown;
    toDestination?: () => void;
  }>;

  if (chainNodes.length === 0) {
    // No FX nodes available at all (fully headless env) — nothing to wire.
    devLog('[AudioEngine] FX chain wired — no nodes constructed (headless env)');
    return;
  }

  try {
    for (let i = 0; i < chainNodes.length - 1; i++) {
      chainNodes[i].connect(chainNodes[i + 1]);
    }
    const last = chainNodes[chainNodes.length - 1];
    if (_masterGain) {
      last.connect(_masterGain);
      try {
        _masterGain.toDestination?.();
      } catch (err) {
        devWarn('[AudioEngine] masterGain.toDestination failed', err);
      }
    } else {
      try {
        last.toDestination?.();
      } catch (err) {
        devWarn('[AudioEngine] chain.toDestination failed', err);
      }
    }
  } catch (err) {
    devWarn('[AudioEngine] wireGlobalFxChain failed', err);
  }

  devLog('[AudioEngine] FX chain wired', controlledDecay ? '(Controlled Decay)' : '(Natural Decay)');
}

/** The live chain-entry node — EQ3, first in both Natural and Controlled
 *  Decay topologies — read by AudioEngine.ts's reserveVoice() to connect each
 *  robot's per-voice bus into the global chain. Null until
 *  buildGlobalFxChain() has run. Replaces the old getMasterCompressor(),
 *  which stopped being accurate once the V2 reorder moved Compressor off the
 *  front of the chain. */
export function getGlobalChainEntry(): Tone.EQ3 | null {
  return _globalEQ;
}

/** Reverb generates its impulse response asynchronously — AudioEngine.start()
 *  awaits this before starting the transport. No-op if reverb wasn't built
 *  (headless/test env) or has no `.ready` promise. */
export async function waitForGlobalReverbReady(): Promise<void> {
  if (!_globalReverb) return;
  try {
    await (_globalReverb as unknown as { ready: Promise<void> }).ready;
  } catch (err) {
    devWarn('[AudioEngine] reverb.ready failed', err);
  }
}

/** Set master volume (clamped to [0,1]). */
export function setMasterVolume(volume: number): void {
  const v = Math.max(0, Math.min(1, Number(volume) || 0));
  _masterVolume = v;
  if (_masterGain) {
    try {
      (_masterGain as unknown as { gain: { value: number } }).gain.value = v;
    } catch (err) {
      devWarn('[AudioEngine] setMasterVolume failed', err);
    }
  }
}

/** Get the current master volume (0..1). */
export function getMasterVolume(): number {
  try {
    if (_masterGain && typeof (_masterGain as unknown as { gain?: { value?: number } }).gain?.value === 'number') {
      return (_masterGain as unknown as { gain?: { value?: number } }).gain!.value ?? _masterVolume;
    }
  } catch {
    /* ignore */
  }
  return _masterVolume;
}

// ========================================
// GLOBAL FX SETTERS
// ========================================

export function setGlobalReverb(params: Partial<ReverbSettings>): void {
  if (params.wet !== undefined) _fxParamCache.reverb.wet = params.wet;
  if (!_globalReverb) return;
  try {
    if (params.wet !== undefined) (_globalReverb as unknown as { wet: { value: number } }).wet.value = params.wet;
    if (params.decay !== undefined) (_globalReverb as unknown as { decay: number }).decay = params.decay;
    if (params.preDelay !== undefined) (_globalReverb as unknown as { preDelay: number }).preDelay = params.preDelay;
  } catch (err) {
    devWarn('[AudioEngine] setGlobalReverb failed', err);
  }
}

export function setGlobalDelay(params: Partial<DelaySettings>): void {
  if (params.wet !== undefined) _fxParamCache.delay.wet = params.wet;
  if (!_globalDelay) return;
  try {
    if (params.wet !== undefined) (_globalDelay as unknown as { wet: { value: number } }).wet.value = params.wet;
    if (params.delayTime !== undefined) (_globalDelay as unknown as { delayTime: { value: number } }).delayTime.value = params.delayTime;
    if (params.feedback !== undefined) (_globalDelay as unknown as { feedback: { value: number } }).feedback.value = params.feedback;
  } catch (err) {
    devWarn('[AudioEngine] setGlobalDelay failed', err);
  }
}

export function setGlobalFilterLPF(params: Partial<FilterSettings>): void {
  if (params.frequency !== undefined) _fxParamCache.lpf.frequency = params.frequency;
  if (params.Q !== undefined) _fxParamCache.lpf.Q = params.Q;
  if (!_globalLPF) return;
  try {
    if (params.frequency !== undefined) (_globalLPF as unknown as { frequency: { value: number } }).frequency.value = params.frequency;
    if (params.Q !== undefined) (_globalLPF as unknown as { Q: { value: number } }).Q.value = params.Q;
  } catch (err) {
    devWarn('[AudioEngine] setGlobalFilterLPF failed', err);
  }
}

export function setGlobalFilterHPF(params: Partial<FilterSettings>): void {
  if (params.frequency !== undefined) _fxParamCache.hpf.frequency = params.frequency;
  if (params.Q !== undefined) _fxParamCache.hpf.Q = params.Q;
  if (!_globalHPF) return;
  try {
    if (params.frequency !== undefined) (_globalHPF as unknown as { frequency: { value: number } }).frequency.value = params.frequency;
    if (params.Q !== undefined) (_globalHPF as unknown as { Q: { value: number } }).Q.value = params.Q;
  } catch (err) {
    devWarn('[AudioEngine] setGlobalFilterHPF failed', err);
  }
}

export function setGlobalEQ(params: Partial<EQ3Settings>): void {
  if (params.low !== undefined) _fxParamCache.eq3.low = params.low;
  if (params.mid !== undefined) _fxParamCache.eq3.mid = params.mid;
  if (params.high !== undefined) _fxParamCache.eq3.high = params.high;
  if (!_globalEQ) return;
  try {
    if (params.low !== undefined) (_globalEQ as unknown as { low: { value: number } }).low.value = params.low;
    if (params.mid !== undefined) (_globalEQ as unknown as { mid: { value: number } }).mid.value = params.mid;
    if (params.high !== undefined) (_globalEQ as unknown as { high: { value: number } }).high.value = params.high;
  } catch (err) {
    devWarn('[AudioEngine] setGlobalEQ failed', err);
  }
}

export function setGlobalCompressor(params: Partial<CompressorSettings>): void {
  if (params.threshold !== undefined) _fxParamCache.compressor.threshold = params.threshold;
  if (params.ratio !== undefined) _fxParamCache.compressor.ratio = params.ratio;
  if (params.attack !== undefined) _fxParamCache.compressor.attack = params.attack;
  if (params.release !== undefined) _fxParamCache.compressor.release = params.release;
  if (params.knee !== undefined) _fxParamCache.compressor.knee = params.knee;
  if (!_globalCompressor) return;
  try {
    if (params.threshold !== undefined) _globalCompressor.threshold.value = params.threshold;
    if (params.ratio !== undefined) _globalCompressor.ratio.value = params.ratio;
    if (params.attack !== undefined) _globalCompressor.attack.value = params.attack;
    if (params.release !== undefined) _globalCompressor.release.value = params.release;
    if (params.knee !== undefined) _globalCompressor.knee.value = params.knee;
  } catch (err) {
    devWarn('[AudioEngine] setGlobalCompressor failed', err);
  }
}

export function setGlobalLimiter(params: Partial<LimiterSettings>): void {
  if (params.threshold !== undefined) _fxParamCache.limiter.threshold = params.threshold;
  if (!_globalLimiter) return;
  try {
    if (params.threshold !== undefined) (_globalLimiter as unknown as { threshold: { value: number } }).threshold.value = params.threshold;
  } catch (err) {
    devWarn('[AudioEngine] setGlobalLimiter failed', err);
  }
}

/**
 * Short-circuit the entire FX chain.
 * When bypass=true, disconnect the chain entry (EQ3) and connect it directly
 * to Destination. When bypass=false, re-run wireGlobalFxChain() for whichever
 * topology (Natural/Controlled Decay) was last selected, restoring it exactly.
 */
export function setGlobalBypass(bypass: boolean): void {
  devLog('[AudioEngine] global bypass state set to', bypass);
  if (!_globalEQ) return;
  try {
    if (bypass) {
      const entry = _globalEQ as unknown as { disconnect: () => void; toDestination: () => void };
      entry.disconnect();
      entry.toDestination();
      devLog('[AudioEngine] Global bypass ON — audio routed direct to destination');
    } else {
      wireGlobalFxChain(_currentControlledDecay);
      devLog('[AudioEngine] Global bypass OFF — audio routed through FX chain');
    }
  } catch (err) {
    devWarn('[AudioEngine] setGlobalBypass failed', err);
  }
}

/**
 * Enable or disable an individual effect in the chain.
 * For wet effects (reverb, delay): sets wet=0 to disable, restores cached wet to enable.
 * For dry effects (eq3): zeros all bands to disable, restores cached values to enable.
 * For filters (lpf, hpf): sets frequency to passthrough value to disable, restores cached freq to enable.
 * For dynamics processors with no wet mix (compressor, limiter): neutralizes
 * via parameter (ratio→1/threshold→0) rather than physically rerouting the graph.
 *
 * @param effect - 'reverb' | 'delay' | 'eq3' | 'lpf' | 'hpf' | 'compressor' | 'limiter'
 * @param enabled - true to enable, false to bypass
 */
export function setEffectBypass(effect: string, enabled: boolean): void {
  try {
    switch (effect) {
      case 'reverb':
        if (_globalReverb) {
          (_globalReverb as unknown as { wet: { value: number } }).wet.value = enabled ? _fxParamCache.reverb.wet : 0;
        }
        break;
      case 'delay':
        if (_globalDelay) {
          (_globalDelay as unknown as { wet: { value: number } }).wet.value = enabled ? _fxParamCache.delay.wet : 0;
        }
        break;
      case 'eq3':
        if (_globalEQ) {
          const e = _globalEQ as unknown as { low: { value: number }; mid: { value: number }; high: { value: number } };
          e.low.value = enabled ? _fxParamCache.eq3.low : 0;
          e.mid.value = enabled ? _fxParamCache.eq3.mid : 0;
          e.high.value = enabled ? _fxParamCache.eq3.high : 0;
        }
        break;
      case 'lpf':
        if (_globalLPF) {
          (_globalLPF as unknown as { frequency: { value: number } }).frequency.value = enabled ? _fxParamCache.lpf.frequency : 20000;
        }
        break;
      case 'hpf':
        if (_globalHPF) {
          (_globalHPF as unknown as { frequency: { value: number } }).frequency.value = enabled ? _fxParamCache.hpf.frequency : 20;
        }
        break;
      case 'compressor':
        // Compressor bypass: restore or clamp to passthrough (ratio=1, threshold=0)
        if (_globalCompressor) {
          _globalCompressor.ratio.value = enabled ? _fxParamCache.compressor.ratio : 1;
          _globalCompressor.threshold.value = enabled ? _fxParamCache.compressor.threshold : 0;
        }
        break;
      case 'limiter':
        // Limiter bypass: push threshold to 0dB (transparent), same neutralize-
        // via-parameter approach as Compressor — Limiter has no wet mix either.
        if (_globalLimiter) {
          (_globalLimiter as unknown as { threshold: { value: number } }).threshold.value = enabled ? _fxParamCache.limiter.threshold : 0;
        }
        break;
      default:
        devWarn(`[AudioEngine] setEffectBypass: unknown effect "${effect}"`);
    }
  } catch (err) {
    devWarn(`[AudioEngine] setEffectBypass(${effect}, ${enabled}) failed`, err);
  }
}

/**
 * Resolve the live, connectable Tone Signal/Param for a global-chain LFO
 * modulation target (docs/tasks/LFO_INTEGRATION_PLAN.md Task 10). Returns
 * null — never throws — before buildGlobalFxChain() has run (module-scope
 * _global* nodes are null until then). Neither Limiter nor Delay's
 * delayTime ever appears here: neither is a GlobalLfoTargetId member (no
 * LFO on the Limiter by design; delayTime's LFO was removed after shipping).
 */
export function getGlobalModulationTarget(target: GlobalLfoTargetId): ModulationTarget | null {
  try {
    switch (target) {
      case 'eq3.low':
        return ((_globalEQ as unknown as { low?: unknown })?.low as ModulationTarget) ?? null;
      case 'eq3.mid':
        return ((_globalEQ as unknown as { mid?: unknown })?.mid as ModulationTarget) ?? null;
      case 'eq3.high':
        return ((_globalEQ as unknown as { high?: unknown })?.high as ModulationTarget) ?? null;
      case 'lpf.frequency':
        return ((_globalLPF as unknown as { frequency?: unknown })?.frequency as ModulationTarget) ?? null;
      case 'lpf.Q':
        return ((_globalLPF as unknown as { Q?: unknown })?.Q as ModulationTarget) ?? null;
      case 'hpf.frequency':
        return ((_globalHPF as unknown as { frequency?: unknown })?.frequency as ModulationTarget) ?? null;
      case 'hpf.Q':
        return ((_globalHPF as unknown as { Q?: unknown })?.Q as ModulationTarget) ?? null;
      default:
        return null;
    }
  } catch (err) {
    devWarn('[AudioEngine] getGlobalModulationTarget failed', err);
    return null;
  }
}
