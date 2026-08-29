// ========================================
// IMPORTS
// ========================================
import { create } from 'zustand';

import { AudioEngine } from '../engine/AudioEngine';
import { wireGlobalFxChain } from '../engine/audioEngine/globalFx';
import { lfoEngine } from '../engine/lfoEngine';
import { generateGlobalAudioSettings, generateGlobalLfoSettings } from '../utils/globalAudioSeed';
import { usePlanetStore, selectCurrentPlanet } from './planetStore';
import { DEFAULT_LFO_SETTINGS } from '../data/lfoConfig';

import type { GlobalAudioSettings } from '../types/globalAudio';
import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from '../types/globalAudio';
import { GLOBAL_LFO_TARGET_IDS, type GlobalLfoTargetId, type LfoSettings } from '../types/lfo';

// ========================================
// TYPES
// ========================================

/** Keys of GlobalAudioSettings that are effect-param objects (excludes the three top-level flags). */
type EffectKey = Exclude<keyof GlobalAudioSettings, 'globalBypass' | 'compressorBeforeDelay' | 'lfoDrift'>;

/** `AudioEngine.setEffectBypass`'s effect keys — note 'lpf'/'hpf', not 'filterLPF'/'filterHPF'. */
type BypassEffectKey = 'reverb' | 'delay' | 'limiter' | 'eq3' | 'lpf' | 'hpf' | 'compressor';

/** Routes a setGlobalAudio(effect, partial) call to its matching AudioEngine setter. */
const GLOBAL_SETTER: { [K in EffectKey]: (params: Partial<GlobalAudioSettings[K]>) => void } = {
  compressor: AudioEngine.setGlobalCompressor,
  eq3: AudioEngine.setGlobalEQ,
  filterLPF: AudioEngine.setGlobalFilterLPF,
  filterHPF: AudioEngine.setGlobalFilterHPF,
  limiter: AudioEngine.setGlobalLimiter,
  delay: AudioEngine.setGlobalDelay,
  reverb: AudioEngine.setGlobalReverb,
};

/** EffectKey -> AudioEngine.setEffectBypass's short-form key. */
const BYPASS_KEY: Record<EffectKey, BypassEffectKey> = {
  compressor: 'compressor',
  eq3: 'eq3',
  filterLPF: 'lpf',
  filterHPF: 'hpf',
  limiter: 'limiter',
  delay: 'delay',
  reverb: 'reverb',
};

/**
 * Push every effect's current param values and enabled/bypass state onto
 * AudioEngine's live Tone FX chain. Used both by regenerateGlobalAudioFromSeed
 * (fresh seed values, right after generating them) and by AudioEngine.start()
 * (right after buildGlobalFxChain() constructs fresh nodes — which start on
 * globalFx.ts's own hardcoded construction literals, not whatever's already
 * seeded in the store; regenerateGlobalAudioFromSeed's own push runs at
 * module load, long before those nodes exist, so it lands as a no-op on
 * every one of these setters and needs re-applying once real nodes exist).
 * Values first, bypass second — setEffectBypass('compressor'/'limiter', ...)
 * reads its restore value from globalFx.ts's own _fxParamCache, which the
 * setGlobal* calls just above populate as a side effect.
 */
export function applyGlobalAudioToEngine(globalAudio: GlobalAudioSettings): void {
  AudioEngine.setGlobalCompressor(globalAudio.compressor);
  AudioEngine.setGlobalEQ(globalAudio.eq3);
  AudioEngine.setGlobalFilterLPF(globalAudio.filterLPF);
  AudioEngine.setGlobalFilterHPF(globalAudio.filterHPF);
  AudioEngine.setGlobalLimiter(globalAudio.limiter);
  AudioEngine.setGlobalDelay(globalAudio.delay);
  AudioEngine.setGlobalReverb(globalAudio.reverb);
  // Stopgap — lfoDrift is now per-group (Task 2, docs/tasks/LFO_DRIFT_GROUPS.md),
  // but lfoEngine's setters and this loop aren't group-aware until Task 6/8.
  // 'robots' stands in for all 4 groups until then.
  lfoEngine.setGlobalRateDrift(globalAudio.lfoDrift.robots.rateDrift);
  lfoEngine.setGlobalDepthDrift(globalAudio.lfoDrift.robots.depthDrift);
  // Push each effect's OWN enabled value, not a blanket true — Delay in
  // particular may be seeded/set false and must stay bypassed.
  for (const [effectKey, bypassKey] of Object.entries(BYPASS_KEY) as [EffectKey, BypassEffectKey][]) {
    AudioEngine.setEffectBypass(bypassKey, globalAudio[effectKey].enabled);
  }
}

/** Initial globalLfo — DEFAULT_LFO_SETTINGS' 9 global entries, each starting inactive
 *  (not connected) until the planet-sync below seeds real values. */
function buildDefaultGlobalLfo(): Record<GlobalLfoTargetId, LfoSettings & { active: boolean }> {
  const result = {} as Record<GlobalLfoTargetId, LfoSettings & { active: boolean }>;
  for (const target of GLOBAL_LFO_TARGET_IDS) {
    result[target] = { ...DEFAULT_LFO_SETTINGS[target], active: false };
  }
  return result;
}

export interface AudioStore {
  bpm: number;
  globalAudio: GlobalAudioSettings;
  /** Global-chain LFO settings, one entry per GlobalLfoTargetId — seeded per planet, see regenerateGlobalLfoFromSeed. */
  globalLfo: Record<GlobalLfoTargetId, LfoSettings & { active: boolean }>;
  isMuted: boolean;
  preMuteVolume: number;
  setBPM: (bpm: number) => void;
  setGlobalAudio: <K extends EffectKey>(
    effect: K,
    partial: Partial<GlobalAudioSettings[K]>
  ) => void;
  /** Sets one effect's own bypass — updates its `enabled` field and calls AudioEngine.setEffectBypass. */
  setEffectEnabled: (effect: EffectKey, enabled: boolean) => void;
  /** Sets the rig-wide bypass — updates `globalBypass` and calls AudioEngine.setGlobalBypass. */
  setGlobalBypassEnabled: (bypass: boolean) => void;
  /**
   * Sets one global LFO target's settings — updates state, always pushes
   * shape/rate/depth to lfoEngine, and connects+starts (active: true) or
   * disconnects+stops (active: false) the live node.
   */
  setGlobalLfo: (target: GlobalLfoTargetId, value: LfoSettings & { active: boolean }) => void;
  setMuted: (muted: boolean) => void;
  setPreMuteVolume: (volume: number) => void;
  /**
   * Swap the compressor's chain position — false (default) = "Natural Decay"
   * (compressor after Delay+Reverb), true = "Controlled Decay" (compressor
   * before both). Updates state and rewires the live Tone FX chain via
   * globalFx.ts's wireGlobalFxChain().
   */
  setCompressorBeforeDelay: (value: boolean) => void;
  /**
   * Sets the global LFO drift amount(s) (docs/specs/LFO_DRIFT.md) — updates
   * globalAudio.lfoDrift and pushes only the field(s) actually provided to
   * lfoEngine's matching setGlobalRateDrift/setGlobalDepthDrift. A bespoke
   * action (not routed through setGlobalAudio/GLOBAL_SETTER), shaped like
   * setCompressorBeforeDelay above — lfoDrift is a top-level flag, not a
   * per-effect object with its own AudioEngine.setGlobal* counterpart.
   */
  // Stopgap signature — Task 8 (docs/tasks/LFO_DRIFT_GROUPS.md) makes this
  // group-aware ((group: DriftGroupId, partial: ...) => void); until then it
  // only ever writes the 'robots' group.
  setGlobalLfoDrift: (partial: Partial<{ rateDrift: number; depthDrift: number }>) => void;
  /**
   * Regenerate `globalAudio` for the given planet from the seed
   * (generateGlobalAudioSettings, src/utils/globalAudioSeed.ts) and push the
   * result into AudioEngine's live Tone FX chain. `enabled` is used exactly
   * as seeded — every effect true except Delay's real ~25% chance (spec §5)
   * — no override here; that force-true shim was Phase 0-only and is gone.
   */
  regenerateGlobalAudioFromSeed: (planetId: string, planetName: string) => void;
  /**
   * Regenerate `globalLfo` state for the given planet from the seed
   * (generateGlobalLfoSettings). Data-only — does NOT touch lfoEngine.
   * Runs at module load / on every planet switch, before any user gesture,
   * so it must never construct a real Tone.LFO node. AudioEngine.start()
   * (Task 9) is what primes lfoEngine from this state and connects/starts
   * already-seeded-active targets, since that's the only point guaranteed
   * to run after an AudioContext actually exists.
   */
  regenerateGlobalLfoFromSeed: (planetId: string, planetName: string) => void;
}

// ========================================
// STORE
// ========================================
export const useAudioStore = create<AudioStore>((set, get) => ({
  bpm: 60,
  globalAudio: { ...DEFAULT_GLOBAL_AUDIO_SETTINGS },
  globalLfo: buildDefaultGlobalLfo(),
  isMuted: false,
  preMuteVolume: 1.0,

  setBPM: (bpm) => {
    set({ bpm });
    // Delegate to AudioEngine — the only module allowed to call Tone.js directly.
    // AudioEngine.setBPM guards against calling Transport before audio is started.
    AudioEngine.setBPM(bpm);
  },

  setGlobalAudio: (effect, partial) => {
    set((state) => ({
      globalAudio: {
        ...state.globalAudio,
        [effect]: {
          ...(state.globalAudio[effect] as object),
          ...partial,
        },
      },
    }));
    // GLOBAL_SETTER's per-key parameter types are correct individually; TS can't
    // narrow the union across the generic K at the call site without this cast,
    // the same shape AudioEngine.ts's own ModulationTarget alias resolves for its
    // own unavoidable union return type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GLOBAL_SETTER[effect] as (params: any) => void)(partial);
  },

  setEffectEnabled: (effect, enabled) => {
    set((state) => ({
      globalAudio: {
        ...state.globalAudio,
        [effect]: { ...(state.globalAudio[effect] as object), enabled },
      },
    }));
    AudioEngine.setEffectBypass(BYPASS_KEY[effect], enabled);
  },

  setGlobalBypassEnabled: (bypass) => {
    set((state) => ({ globalAudio: { ...state.globalAudio, globalBypass: bypass } }));
    AudioEngine.setGlobalBypass(bypass);
  },

  setCompressorBeforeDelay: (value) => {
    set((state) => ({ globalAudio: { ...state.globalAudio, compressorBeforeDelay: value } }));
    wireGlobalFxChain(value);
  },

  setGlobalLfoDrift: (partial) => {
    set((state) => ({
      globalAudio: {
        ...state.globalAudio,
        lfoDrift: { ...state.globalAudio.lfoDrift, robots: { ...state.globalAudio.lfoDrift.robots, ...partial } },
      },
    }));
    if (partial.rateDrift !== undefined) lfoEngine.setGlobalRateDrift(partial.rateDrift);
    if (partial.depthDrift !== undefined) lfoEngine.setGlobalDepthDrift(partial.depthDrift);
  },

  setGlobalLfo: (target, value) => {
    set((state) => ({ globalLfo: { ...state.globalLfo, [target]: value } }));
    lfoEngine.setLfoShape(target, value.shape);
    lfoEngine.setLfoRate(target, value.rate);
    lfoEngine.setLfoDepth(target, value.depth);
    if (value.active) {
      if (lfoEngine.connectLfoTarget(target)) lfoEngine.start(target);
    } else {
      lfoEngine.disconnectLfoTarget(target);
      lfoEngine.stop(target);
    }
  },

  setMuted: (muted) => {
    set({ isMuted: muted });
  },
  setPreMuteVolume: (volume) => {
    set({ preMuteVolume: volume });
  },

  regenerateGlobalAudioFromSeed: (planetId, planetName) => {
    // generateGlobalAudioSettings's own output is used as-is, `enabled`
    // included — seeding is where that decision lives now (V2, spec §5).
    // globalBypass/compressorBeforeDelay are NOT seeded — generateGlobalAudioSettings
    // always returns DEFAULT_GLOBAL_AUDIO_SETTINGS' value for both, which is
    // correct for the very first call (module load, state is still the
    // fresh default) but wrong for every later one (a planet switch after
    // the user has already flipped either flag): overwriting a live user
    // choice back to default here, with nothing to push that reset to the
    // engine, would silently desync the UI from the actual live audio graph.
    // Carry the CURRENT values forward instead — same effect on first call,
    // correct on every later one.
    const generated = generateGlobalAudioSettings(planetId, planetName);
    const current = get().globalAudio;
    const globalAudio: GlobalAudioSettings = {
      ...generated,
      globalBypass: current.globalBypass,
      compressorBeforeDelay: current.compressorBeforeDelay,
    };
    set({ globalAudio });
    applyGlobalAudioToEngine(globalAudio);
  },

  // Data-only, deliberately: this runs at module load / on every planet switch,
  // long before any user gesture — pushing to lfoEngine here would construct a
  // real Tone.LFO (getOrCreateLfo -> new Tone.LFO(...)) before an AudioContext
  // exists, violating "initialize audio only from an explicit user gesture"
  // (CLAUDE.md) and throwing outright in headless/test environments (found via
  // the Phase 2 checkpoint's full suite run — TransportBar.test.tsx, which
  // imports the real audioStore module, threw "param must be an AudioParam").
  // AudioEngine.start() (Task 9) is the only safe point to prime lfoEngine and
  // connect/start already-seeded-active targets, since it runs after
  // Tone.start()/transport.start() succeed.
  regenerateGlobalLfoFromSeed: (planetId, planetName) => {
    const globalLfo = generateGlobalLfoSettings(planetId, planetName);
    set({ globalLfo });
  },
}));

// ========================================
// PLANET SYNC
// ========================================
// Keep globalAudio seeded from whichever planet is active — seeds immediately
// for the planet active at load (satisfies "app init"), then re-seeds on every
// future currentPlanetId change (satisfies "any future planet switch") without
// requiring every future call site of setCurrentPlanetId to remember to also
// call regenerateGlobalAudioFromSeed. Mirrors planetStore.ts's own module-scope
// noise-map priming (`getPlanetNoiseMap('pelagos', 'Pelagos')`).
function syncGlobalAudioToCurrentPlanet(): void {
  const planet = selectCurrentPlanet(usePlanetStore.getState());
  if (!planet) return;
  useAudioStore.getState().regenerateGlobalAudioFromSeed(planet.id, planet.name);
  useAudioStore.getState().regenerateGlobalLfoFromSeed(planet.id, planet.name);
}

syncGlobalAudioToCurrentPlanet();
usePlanetStore.subscribe((state, prevState) => {
  if (state.currentPlanetId !== prevState.currentPlanetId) {
    syncGlobalAudioToCurrentPlanet();
  }
});
