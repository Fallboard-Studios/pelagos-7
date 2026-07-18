// ========================================
// IMPORTS
// ========================================
import { create } from 'zustand';

import type { GlobalAudioSettings } from '../types/globalAudio';
import { DEFAULT_GLOBAL_AUDIO_SETTINGS } from '../types/globalAudio';
import { AudioEngine } from '../engine/AudioEngine';

// ========================================
// TYPES
// ========================================

/** Keys of GlobalAudioSettings that are effect-param objects (excludes `globalBypass`). */
type EffectKey = Exclude<keyof GlobalAudioSettings, 'globalBypass'>;

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
  setMuted: (muted: boolean) => void;
  setPreMuteVolume: (volume: number) => void;
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
  },
  setMuted: (muted) => {
    set({ isMuted: muted });
  },
  setPreMuteVolume: (volume) => {
    set({ preMuteVolume: volume });
  },
}));
