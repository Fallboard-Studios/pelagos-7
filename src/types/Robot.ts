import type { Vec2 } from './Vec2';

/**
 * Robot state machine states
 */
export enum RobotState {
  Idle = 'idle',
  Moving = 'moving',
  Interacting = 'interacting',
  Selected = 'selected',
  Leaving = 'leaving',
}

/**
 * Synth type determines robot shape and sonic character
 */
export type SynthType = 'AMSynth' | 'FMSynth' | 'PolySynth' | 'MembraneSynth';

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
}

/**
 * Single melody event within a robot's 16-step, 2-measure loop
 */
export interface MelodyEvent {
  id: string;                           // Unique identifier (UUID)
  startStep: number;                    // 1-16 (8th-note grid position)
  length: '8n' | '4n' | '2n';          // Note duration
  noteIndex: number;                    // 0-7 (index into available harmony palette)
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
  melody: MelodyEvent[];
  audioAttributes: AudioAttributes;
  interactionCooldown?: number; // Timestamp (ms) when interaction cooldown expires
  // Note: Visual appearance (shape, colors, scale, detail level) is derived
  // from audioAttributes and NOT stored in state - calculated at render time
}
