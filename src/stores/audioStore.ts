// ========================================
// IMPORTS
// ========================================
import { create } from 'zustand';

import { AudioEngine } from '../engine/AudioEngine';
import { generateGlobalAudioSettings } from '../utils/globalAudioSeed';
import { usePlanetStore, selectCurrentPlanet } from './planetStore';

import type { GlobalAudioSettings } from '../types/globalAudio';
import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from '../types/globalAudio';

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

export interface AudioStore {
  bpm: number;
  globalAudio: GlobalAudioSettings;
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
  setMuted: (muted: boolean) => void;
  setPreMuteVolume: (volume: number) => void;
  /**
   * Regenerate `globalAudio` for the given planet from the seed (Task 5's
   * generateGlobalAudioSettings), forcing every effect's `enabled` to true
   * (spec §3/§6 — not seeded, pinned on for this phase), and push the
   * result into AudioEngine's live Tone FX chain.
   */
  regenerateGlobalAudioFromSeed: (planetId: string, planetName: string) => void;
}

// ========================================
// STORE
// ========================================
export const useAudioStore = create<AudioStore>((set) => ({
  bpm: 60,
  globalAudio: { ...DEFAULT_GLOBAL_AUDIO_SETTINGS },
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
}

syncGlobalAudioToCurrentPlanet();
usePlanetStore.subscribe((state, prevState) => {
  if (state.currentPlanetId !== prevState.currentPlanetId) {
    syncGlobalAudioToCurrentPlanet();
  }
});
