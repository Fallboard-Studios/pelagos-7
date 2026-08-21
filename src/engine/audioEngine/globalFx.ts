import * as Tone from 'tone';

import { getToneCtor, type ModulationTarget } from './toneHelpers';
import { devLog, devWarn } from '@/utils/helpers';
import type { ReverbSettings, DelaySettings, ChorusSettings, FilterSettings, EQ3Settings, CompressorSettings } from '@/types/globalAudio';
import type { GlobalLfoTargetId } from '@/types/lfo';

// ========================================
// MODULE STATE (module-scoped, runtime-only — never put these in Zustand)
// ========================================
let _masterCompressor: Tone.Compressor | null = null;
let _globalReverb: Tone.Reverb | null = null;
let _globalDelay: Tone.FeedbackDelay | null = null;
let _globalChorus: Tone.Chorus | null = null;
let _globalEQ: Tone.EQ3 | null = null;
let _globalLPF: Tone.Filter | null = null;
let _globalHPF: Tone.Filter | null = null;
// Master output gain controlling overall volume (used by setMasterVolume/getMasterVolume)
let _masterGain: Tone.Gain | null = null;
let _masterVolume = 1;

/**
 * Cache of the last wet/level values for each FX node — used to restore values
 * when an effect is re-enabled after being bypassed via setEffectBypass().
 */
const _fxParamCache = {
  reverb: { wet: 0.3 },
  delay: { wet: 0.15 },
  chorus: { wet: 0.2 },
  eq3: { low: 0, mid: 0, high: 0 },
  lpf: { frequency: 20000, Q: 1 },
  hpf: { frequency: 20, Q: 1 },
  compressor: { threshold: -18, ratio: 6, attack: 0.003, release: 0.15, knee: 0 },
};

/**
 * Build the master compressor + global FX chain and wire them together:
 * _masterCompressor → _globalEQ → _globalLPF → _globalHPF → _globalChorus →
 * _globalDelay → _globalReverb → _masterGain → Destination. All nodes are
 * guarded with typeof checks for test/headless environments. Idempotent
 * relative to AudioEngine.ts's own instrumentsLoaded guard — this function
 * itself doesn't guard re-entry, that stays the caller's job (loadInstruments).
 */
export function buildGlobalFxChain(): void {
  const compressor = new Tone.Compressor({
    threshold: -18,  // engage earlier to tame FM/AM harmonics before clipping
    ratio: 6,        // softer compression ratio; not a hard limiter
    attack: 0.003,
    release: 0.15,
  });
  _masterCompressor = compressor;

  const ReverbCtor = getToneCtor<Tone.Reverb>('Reverb');
  const DelayCtor = getToneCtor<Tone.FeedbackDelay>('FeedbackDelay');
  const ChorusCtor = getToneCtor<Tone.Chorus>('Chorus');
  const EQ3Ctor = getToneCtor<Tone.EQ3>('EQ3');
  const FilterCtor = getToneCtor<Tone.Filter>('Filter');
  const GainCtorFX = getToneCtor<Tone.Gain>('Gain');

  if (ReverbCtor) {
    _globalReverb = new ReverbCtor({ decay: 1.5, preDelay: 0.02, wet: 0.3 });
  }
  if (DelayCtor) {
    _globalDelay = new DelayCtor({ delayTime: 0.25, feedback: 0.2, wet: 0 });
  }
  if (ChorusCtor) {
    _globalChorus = new ChorusCtor({ rate: 1.5, depth: 0.2, delayTime: 0.012, feedback: 0.1, wet: 0 });
    try { (_globalChorus as unknown as { start(): void }).start(); } catch (err) { devWarn('[AudioEngine] chorus.start failed', err); }
  }
  if (EQ3Ctor) {
    _globalEQ = new EQ3Ctor({ low: 0, mid: 0, high: 0 });
  }
  if (FilterCtor) {
    _globalLPF = new FilterCtor({ type: 'lowpass', frequency: 20000, Q: 1 });
    _globalHPF = new FilterCtor({ type: 'highpass', frequency: 20, Q: 1 });
  }
  if (GainCtorFX) {
    // Master gain sits after the FX chain (or final destination) to control overall volume.
    try {
      _masterGain = new GainCtorFX(1);
    } catch {
      _masterGain = null;
    }
  }

  // Wire chain: compressor → EQ → LPF → HPF → Chorus → Delay → Reverb → Destination
  // Fall back gracefully: connect compressor directly to destination when nodes are missing.
  const chainNodes = [
    _globalEQ,
    _globalLPF,
    _globalHPF,
    _globalChorus,
    _globalDelay,
    _globalReverb,
  ].filter(Boolean) as Array<{ connect: (t: unknown) => unknown; toDestination?: () => void }>;

  if (chainNodes.length > 0) {
    try {
      // connect compressor → first FX node
      (compressor as unknown as { connect: (t: unknown) => void }).connect(chainNodes[0]);
      // connect each FX node to the next
      for (let i = 0; i < chainNodes.length - 1; i++) {
        chainNodes[i].connect(chainNodes[i + 1]);
      }
      // connect last FX node → Master gain → Destination (masterGain optional)
      try {
        if (_masterGain) {
          chainNodes[chainNodes.length - 1].connect(_masterGain);
          try { _masterGain.toDestination?.(); } catch (err) { devWarn('[AudioEngine] masterGain.toDestination failed', err); }
        } else {
          try { chainNodes[chainNodes.length - 1].toDestination?.(); } catch (err) { devWarn('[AudioEngine] chain.toDestination failed', err); }
        }
      } catch (err) {
        devWarn('[AudioEngine] fxChain.connect failed', err);
        try { compressor.toDestination(); } catch { /* headless */ }
      }
    } catch (err) {
      devWarn('[AudioEngine] fxChain.topLevel failed', err);
      try { compressor.toDestination(); } catch (err) { devWarn('[AudioEngine] compressor.toDestination failed', err); }
    }
  } else {
    // No FX nodes available (test env) — route directly to destination
    try {
      if (_masterGain) {
        (compressor as unknown as { connect: (t: unknown) => void }).connect(_masterGain);
        try { _masterGain.toDestination?.(); } catch { /* headless */ }
      } else {
        compressor.toDestination();
      }
    } catch (err) { devWarn('[AudioEngine] failed', err); }
  }

  devLog('[AudioEngine] FX chain loaded');
}

/** The live master compressor — read by AudioEngine.ts's reserveVoice() to
 *  connect each robot's per-voice bus into the global chain. Null until
 *  buildGlobalFxChain() has run. */
export function getMasterCompressor(): Tone.Compressor | null {
  return _masterCompressor;
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
    try { (_masterGain as unknown as { gain: { value: number } }).gain.value = v; } catch (err) { devWarn('[AudioEngine] setMasterVolume failed', err); }
  }
}

/** Get the current master volume (0..1). */
export function getMasterVolume(): number {
  try {
    if (_masterGain && typeof (_masterGain as unknown as { gain?: { value?: number } }).gain?.value === 'number') {
      return (_masterGain as unknown as { gain?: { value?: number } }).gain!.value ?? _masterVolume;
    }
  } catch { /* ignore */ }
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
    if (params.dampening !== undefined) (_globalReverb as unknown as { dampening: number }).dampening = params.dampening;
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

export function setGlobalChorus(params: Partial<ChorusSettings>): void {
  if (params.wet !== undefined) _fxParamCache.chorus.wet = params.wet;
  if (!_globalChorus) return;
  try {
    if (params.wet !== undefined) (_globalChorus as unknown as { wet: { value: number } }).wet.value = params.wet;
    if (params.rate !== undefined) (_globalChorus as unknown as { frequency: { value: number } }).frequency.value = params.rate;
    if (params.depth !== undefined) (_globalChorus as unknown as { depth: number }).depth = params.depth;
    if (params.delayTime !== undefined) (_globalChorus as unknown as { delayTime: number }).delayTime = params.delayTime;
    if (params.feedback !== undefined) (_globalChorus as unknown as { feedback: { value: number } }).feedback.value = params.feedback;
  } catch (err) {
    devWarn('[AudioEngine] setGlobalChorus failed', err);
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
  if (!_masterCompressor) return;
  try {
    if (params.threshold !== undefined) _masterCompressor.threshold.value = params.threshold;
    if (params.ratio !== undefined) _masterCompressor.ratio.value = params.ratio;
    if (params.attack !== undefined) _masterCompressor.attack.value = params.attack;
    if (params.release !== undefined) _masterCompressor.release.value = params.release;
    if (params.knee !== undefined) _masterCompressor.knee.value = params.knee;
  } catch (err) {
    devWarn('[AudioEngine] setGlobalCompressor failed', err);
  }
}

/**
 * Short-circuit the entire FX chain.
 * When bypass=true, disconnect _masterCompressor from the FX chain and connect directly to Destination.
 * When bypass=false, reconnect through the FX chain.
 */
export function setGlobalBypass(bypass: boolean): void {
  devLog('[AudioEngine] global bypass state set to', bypass);
  if (!_masterCompressor) return;
  const comp = _masterCompressor as unknown as { connect: (t: unknown) => void; disconnect: () => void; toDestination: () => void };
  try {
    comp.disconnect();
    if (bypass) {
      comp.toDestination();
      devLog('[AudioEngine] Global bypass ON — audio routed direct to destination');
    } else {
      const firstFX = (_globalEQ ?? _globalLPF ?? _globalHPF ?? _globalChorus ?? _globalDelay ?? _globalReverb) as unknown as { connect?: (t: unknown) => void } | null;
      if (firstFX?.connect) {
        comp.connect(firstFX);
      } else {
        comp.toDestination();
      }
      devLog('[AudioEngine] Global bypass OFF — audio routed through FX chain');
    }
  } catch (err) {
    devWarn('[AudioEngine] setGlobalBypass failed', err);
  }
}

/**
 * Enable or disable an individual effect in the chain.
 * For wet effects (reverb, delay, chorus): sets wet=0 to disable, restores cached wet to enable.
 * For dry effects (eq3): zeros all bands to disable, restores cached values to enable.
 * For filters (lpf, hpf): sets frequency to passthrough value to disable, restores cached freq to enable.
 *
 * @param effect - 'reverb' | 'delay' | 'chorus' | 'eq3' | 'lpf' | 'hpf' | 'compressor'
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
      case 'chorus':
        if (_globalChorus) {
          (_globalChorus as unknown as { wet: { value: number } }).wet.value = enabled ? _fxParamCache.chorus.wet : 0;
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
        if (_masterCompressor) {
          _masterCompressor.ratio.value = enabled ? _fxParamCache.compressor.ratio : 1;
          _masterCompressor.threshold.value = enabled ? _fxParamCache.compressor.threshold : 0;
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
 * _global* nodes are null until then), and for 'chorus.delayTime'
 * unconditionally: Tone.Chorus.delayTime is a plain get/set number, not a
 * Signal — Chorus already runs its own internal LFO on delayTime, so Tone.js
 * exposes no connectable Signal for it at all, independent of anything built
 * here (verified against tone's own Chorus.d.ts, which declares
 * `get/set delayTime(): Milliseconds`).
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
      case 'chorus.delayTime':
        return null;
      case 'delay.delayTime':
        return ((_globalDelay as unknown as { delayTime?: unknown })?.delayTime as ModulationTarget) ?? null;
      default:
        return null;
    }
  } catch (err) {
    devWarn('[AudioEngine] getGlobalModulationTarget failed', err);
    return null;
  }
}
