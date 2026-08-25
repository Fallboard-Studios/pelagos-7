/**
 * Global audio settings types.
 * All fields are JSON-serializable primitives suitable for Zustand storage.
 */

export interface ReverbSettings {
  enabled: boolean;
  /** seconds (0.1 - 10) */
  decay: number;
  /** seconds (0 - 0.5) */
  preDelay: number;
  /** 0 - 1 */
  wet: number;
}

export interface DelaySettings {
  enabled: boolean;
  /** seconds (0 - 1) */
  delayTime: number;
  /** 0 - 0.95 */
  feedback: number;
  /** 0 - 1 */
  wet: number;
}

export interface CompressorSettings {
  enabled: boolean;
  /** dB (-60 - 0) */
  threshold: number;
  /** 1 - 20 */
  ratio: number;
  /** seconds (0.001 - 1) */
  attack: number;
  /** seconds (0.01 - 1) */
  release: number;
  /** dB (0 - 40) */
  knee: number;
}

export interface EQ3Settings {
  enabled: boolean;
  /** dB (-12 - 12) */
  low: number;
  /** dB (-12 - 12) */
  mid: number;
  /** dB (-12 - 12) */
  high: number;
}

export type FilterType = 'lowpass' | 'highpass';

export interface FilterSettings {
  enabled: boolean;
  type: FilterType;
  /** Hz (20 - 20000) */
  frequency: number;
  /** Q (0.1 - 20) */
  Q: number;
}

export interface LimiterSettings {
  enabled: boolean;
  /** dB (-20 - 0) — Tone.Limiter's only controllable param; wraps a fixed ratio=20/attack=0.003/release=0.01 Compressor internally. */
  threshold: number;
}

/**
 * Top-level global audio settings: single source of truth for FX state.
 */
export interface GlobalAudioSettings {
  globalBypass: boolean;
  /** false = Natural Decay (Compressor after Delay+Reverb, tails ring out uncompressed).
   *  true = Controlled Decay (Compressor moved before both Delay and Reverb). Not seeded —
   *  always starts false; only a direct user toggle changes it. */
  compressorBeforeDelay: boolean;
  reverb: ReverbSettings;
  delay: DelaySettings;
  compressor: CompressorSettings;
  eq3: EQ3Settings;
  /** Low-pass filter — AudioEngine builds this as its own Tone.Filter node (`_globalLPF`), independent of filterHPF. */
  filterLPF: FilterSettings;
  /** High-pass filter — AudioEngine builds this as its own Tone.Filter node (`_globalHPF`), independent of filterLPF. */
  filterHPF: FilterSettings;
  limiter: LimiterSettings;
}

export const DEFAULT_GLOBAL_AUDIO_SETTINGS: GlobalAudioSettings = {
  globalBypass: false,
  compressorBeforeDelay: false,
  reverb: { enabled: false, decay: 1.5, preDelay: 0.02, wet: 0.3 },
  delay: { enabled: false, delayTime: 0.25, feedback: 0.2, wet: 0.15 },
  compressor: { enabled: false, threshold: -24, ratio: 2, attack: 0.003, release: 0.25, knee: 6 },
  eq3: { enabled: false, low: 0, mid: 0, high: 0 },
  filterLPF: { enabled: false, type: 'lowpass', frequency: 20000, Q: 1 },
  filterHPF: { enabled: false, type: 'highpass', frequency: 20, Q: 1 },
  limiter: { enabled: false, threshold: -12 },
};
