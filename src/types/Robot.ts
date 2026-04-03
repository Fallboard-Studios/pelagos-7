import type { Vec2 } from './Vec2';
import type { VisualAudioMap } from './layeredAudio';

/**
 * Note duration values for Tone.js scheduling
 * Standard musical note lengths: 32nd, 16th, 8th, quarter, half
 */
export type NoteDuration = '32n' | '16n' | '8n' | '4n' | '2n';

/**
 * Robot state machine states
 */
export enum RobotState {
  Idle = 'idle',
  Moving = 'moving',
  Selected = 'selected',
  Interacting = 'interacting',
  Leaving = 'leaving',
}

/**
 * Synth type determines robot shape and sonic character
 */
export type SynthType =
  | 'AMSynth'
  | 'FMSynth'
  | 'PolySynth'
  | 'DuoSynth'
  ;

/**
 * Oscillator waveform shapes for timbral variety
 */
export type WaveformType = 'sine' | 'square' | 'triangle' | 'sawtooth';

/**
 * ADSR envelope parameters for synth
 */
export interface ADSREnvelope {
  attack: number;      // seconds
  decay: number;       // seconds
  sustain: number;     // 0-1
  release: number;     // seconds
}

/**
 * Audio attributes determine both sound synthesis and visual appearance
 * Visual appearance is derived from these at render time, not stored separately
 */
export interface AudioAttributes {
  synthType: SynthType;
  adsr: ADSREnvelope;
  pitchRange: {
    min: number;       // Hz
    max: number;       // Hz
  };
  filterFreq: number;  // Hz (cutoff frequency, 0 = no filter)
  reverb: number;      // 0-1 (mix amount)
  waveform: WaveformType; // Oscillator shape applied once at voice reservation time
  /** Optional compact visual/audio mapping produced at spawn time and stored on the robot */
  visualAudioMap?: VisualAudioMap;
}

/**
 * Single melody event within a robot's 16-step, 2-measure loop
 */
export interface MelodyEvent {
  id: string;                           // Unique identifier (UUID)
  startStep: number;                    // 1-16 (8th-note grid position)
  length: NoteDuration;                 // Note duration
  noteIndex: number;                    // 0-7 (index into available harmony palette)
  octave: number;                       // Concrete octave assigned at spawn time
}

/**
 * Main Robot entity
 * All fields are serializable (JSON-compatible) for Zustand state management
 * Visual appearance is derived from audioAttributes at render time
 */
export interface Robot {
  id: string;
  state: RobotState;
  position: Vec2;
  destination: Vec2 | null;
  direction: 'left' | 'right';     // Facing direction (horizontal orientation)
  melody: MelodyEvent[];
  audioAttributes: AudioAttributes;
  /** Octave range [min, max] this robot plays within. Melody events store concrete octaves within this range. */
  octaveRange: [number, number];
  layer?: 'background' | 'foreground'; // SVG rendering layer (default: foreground)
  createdAt: number;            // timestamp used for removal ordering
  /** Transport measure at which this robot last interacted (for cooldown tracking). */
  lastInteractionMeasure?: number;
  /** Base velocity (0–1) controlling average note loudness. Per-note variance is applied at scheduling time, not stored. */
  masterVolume: number;
  // Note: Visual appearance (shape, colors, scale, detail level) is derived
  // from audioAttributes and NOT stored in state - calculated at render time
}
