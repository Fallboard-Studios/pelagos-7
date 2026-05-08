import type { WaveformType, ADSREnvelope } from './Robot'

/** Raw ADSR values used on individual layers (may be partial at spawn time) */
export interface ADSTRaw {
  attack?: number
  decay?: number
  sustain?: number
  release?: number
}

/** Descriptor for a single layer within a layered wave */
export interface LayerDescriptor {
  type: WaveformType | 'noise'
  gain?: number
  detune?: number // cents
  phase?: number // degrees
  pulseWidth?: number // 0..1, meaningful for pulse/square oscillators
  adsr?: ADSTRaw
}

/** Compact layered wave descriptor stored on spawn */
export interface LayeredWave {
  base: WaveformType
  layers?: LayerDescriptor[]
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
  layeredWave?: LayeredWave
  averagedADSR?: ADSREnvelope
  averagedGain?: number
  shapeParams?: ShapeParams
  layerVisuals?: LayerVisual[]
}

