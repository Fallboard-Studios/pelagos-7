// ========================================
// IMPORTS
// ========================================
import { create } from 'zustand';

import { AudioEngine } from '../engine/AudioEngine';
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

/** Keys of GlobalAudioSettings that are effect-param objects (excludes `globalBypass`). */
type EffectKey = Exclude<keyof GlobalAudioSettings, 'globalBypass'>;

/** `AudioEngine.setEffectBypass`'s effect keys — note 'lpf'/'hpf', not 'filterLPF'/'filterHPF'. */
const BYPASS_EFFECT_KEYS = ['reverb', 'delay', 'chorus', 'eq3', 'lpf', 'hpf', 'compressor'] as const;

/** Routes a setGlobalAudio(effect, partial) call to its matching AudioEngine setter. */
const GLOBAL_SETTER: { [K in EffectKey]: (params: Partial<GlobalAudioSettings[K]>) => void } = {
  compressor: AudioEngine.setGlobalCompressor,
  eq3: AudioEngine.setGlobalEQ,
  filterLPF: AudioEngine.setGlobalFilterLPF,
  filterHPF: AudioEngine.setGlobalFilterHPF,
  chorus: AudioEngine.setGlobalChorus,
  delay: AudioEngine.setGlobalDelay,
  reverb: AudioEngine.setGlobalReverb,
};

/** EffectKey -> AudioEngine.setEffectBypass's short-form key — same mapping BYPASS_EFFECT_KEYS implies. */
const BYPASS_KEY: Record<EffectKey, (typeof BYPASS_EFFECT_KEYS)[number]> = {
  compressor: 'compressor',
  eq3: 'eq3',
  filterLPF: 'lpf',
  filterHPF: 'hpf',
  chorus: 'chorus',
  delay: 'delay',
  reverb: 'reverb',
};

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
   * Regenerate `globalAudio` for the given planet from the seed (Task 5's
   * generateGlobalAudioSettings), forcing every effect's `enabled` to true
   * (spec §3/§6 — not seeded, pinned on for this phase), and push the
   * result into AudioEngine's live Tone FX chain.
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
export const useAudioStore = create<AudioStore>((set) => ({
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
    const generated = generateGlobalAudioSettings(planetId, planetName);
    const globalAudio: GlobalAudioSettings = {
      ...generated,
      compressor: { ...generated.compressor, enabled: true },
      eq3: { ...generated.eq3, enabled: true },
      filterLPF: { ...generated.filterLPF, enabled: true },
      filterHPF: { ...generated.filterHPF, enabled: true },
      chorus: { ...generated.chorus, enabled: true },
      delay: { ...generated.delay, enabled: true },
      reverb: { ...generated.reverb, enabled: true },
    };
    set({ globalAudio });

    AudioEngine.setGlobalCompressor(globalAudio.compressor);
    AudioEngine.setGlobalEQ(globalAudio.eq3);
    AudioEngine.setGlobalFilterLPF(globalAudio.filterLPF);
    AudioEngine.setGlobalFilterHPF(globalAudio.filterHPF);
    AudioEngine.setGlobalChorus(globalAudio.chorus);
    AudioEngine.setGlobalDelay(globalAudio.delay);
    AudioEngine.setGlobalReverb(globalAudio.reverb);
    for (const effect of BYPASS_EFFECT_KEYS) {
      AudioEngine.setEffectBypass(effect, true);
    }
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
