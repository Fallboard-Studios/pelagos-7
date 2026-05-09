import type { WaveformType, ADSREnvelope } from './Robot'

/** Raw ADSR values used on individual layers (may be partial at spawn time) */
export interface ADSTRaw {
  attack?: number
  decay?: number
  sustain?: number
  release?: number
}

/** Canonical descriptor for a single oscillator layer */
export interface OscillatorLayer {
  type: WaveformType | 'noise'
  gain: number // required: default 1.0 at creation
  detune: number // cents (required; default 0)
  phase: number // degrees (required; default 0)
  pulseWidth?: number // 0..1, meaningful for pulse/square oscillators
  adsr?: ADSTRaw
}

/** Small set of shape parameters derived from averaged audio values */
export interface ShapeParams {
  scale: number // 0..1
  roundness: number // 0..1
  detail: number // 0..1
}

/** Visual properties for an individual audio layer (spawn-time, serializable) */
export interface LayerVisual {
  color?: string
  scale?: number // 0..1
  offset?: { x: number; y: number }
}

/** Visual mapping derived from audio for spawn-time storage on robots */
export interface VisualAudioMap {
  // Note: `layeredWave` removed — `audioAttributes.layers` is now canonical
  averagedADSR?: ADSREnvelope
  averagedGain?: number
  shapeParams?: ShapeParams
  layerVisuals?: LayerVisual[]
}


