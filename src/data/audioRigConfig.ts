/**
 * ControlSchema data for the Audio Rig drawer's 7 global effect blocks,
 * resolving docs/tasks/AUDIO_RIG.md Task 1. Every label/unit/range/default
 * traces field-for-field to docs/reference/GLOBAL_CHAIN_GRID.md — no
 * invented copy. Field paths (`${key}.${field}`) match GlobalAudioSettings'
 * own field names (src/types/globalAudio.ts); the 9 params the grid flags
 * `LFO?: X` additionally carry a `lfoTarget` in GlobalLfoTargetId's short
 * form (src/types/lfo.ts) and their own nested `lfoAccordion` schema.
 */
import type { ControlSchema, ToggleSchema, AccordionSchema } from '@/types/controls';
import type { GlobalLfoTargetId } from '@/types/lfo';

// ========================================
// TYPES
// ========================================

export type AudioRigEffectKey =
  | 'compressor' | 'eq3' | 'filterLPF' | 'filterHPF' | 'chorus' | 'delay' | 'reverb';

export interface AudioRigParamSchema {
  /** Matches the field path on GlobalAudioSettings[block.key], e.g. 'threshold', 'low', 'frequency'. */
  field: string;
  schema: ControlSchema;
  /** Present only for the 9 rows GLOBAL_CHAIN_GRID.md flags LFO?: X. Short form, matching GlobalLfoTargetId directly. */
  lfoTarget?: GlobalLfoTargetId;
  /** The nested accordion wrapping this param's Lfo control — present iff lfoTarget is. */
  lfoAccordion?: AccordionSchema;
}

export interface AudioRigEffectBlock {
  /** Matches GlobalAudioSettings' own key. */
  key: AudioRigEffectKey;
  accordion: AccordionSchema;
  enabledSchema: ToggleSchema;
  params: AudioRigParamSchema[];
}

// ========================================
// HELPERS
// ========================================

function accordionSchema(key: AudioRigEffectKey, loreLabel: string, humanLabel: string): AccordionSchema {
  return { id: `audioRig.${key}`, type: 'accordion', loreLabel, humanLabel };
}

function enabledSchema(key: AudioRigEffectKey): ToggleSchema {
  return { id: `audioRig.${key}.enabled`, type: 'toggle', humanLabel: 'Enabled' };
}

function lfoAccordionSchema(key: AudioRigEffectKey, field: string): AccordionSchema {
  return { id: `audioRig.${key}.${field}.lfo`, type: 'accordion', humanLabel: 'Modulation' };
}

// ========================================
// CONFIG
// ========================================

export const AUDIO_RIG_CONFIG: AudioRigEffectBlock[] = [
  {
    key: 'compressor',
    accordion: accordionSchema('compressor', 'DYNAMIC RANGE CONDENSER', 'Compressor'),
    enabledSchema: enabledSchema('compressor'),
    params: [
      { field: 'threshold', schema: { id: 'compressor.threshold', type: 'sliderLinear', loreLabel: 'ATTENUATION THRESHOLD', humanLabel: 'Threshold', min: -60, max: 0, unit: 'dB' } },
      { field: 'ratio', schema: { id: 'compressor.ratio', type: 'stepper', loreLabel: 'COMPRESSION RATIO', humanLabel: 'Ratio', min: 1, max: 20 } },
      { field: 'attack', schema: { id: 'compressor.attack', type: 'sliderLog', loreLabel: 'COMPRESSION RATE', humanLabel: 'Attack', min: 0.001, max: 1, unit: 's' } },
      { field: 'release', schema: { id: 'compressor.release', type: 'sliderLog', loreLabel: 'RAREFACTION RATE', humanLabel: 'Release', min: 0.01, max: 1, unit: 's' } },
      { field: 'knee', schema: { id: 'compressor.knee', type: 'sliderLinear', loreLabel: 'CURVATURE DAMPING', humanLabel: 'Knee', min: 0, max: 40, unit: 'dB' } },
    ],
  },
  {
    key: 'eq3',
    accordion: accordionSchema('eq3', 'SPECTRAL FREQUENCY EQUALIZER', '3-Band EQ'),
    enabledSchema: enabledSchema('eq3'),
    params: [
      {
        field: 'low',
        schema: { id: 'eq3.low', type: 'sliderCenteredZero', loreLabel: 'SUB-BAND DENSITY', humanLabel: 'Low', min: -12, max: 12, unit: 'dB' },
        lfoTarget: 'eq3.low',
        lfoAccordion: lfoAccordionSchema('eq3', 'low'),
      },
      {
        field: 'mid',
        schema: { id: 'eq3.mid', type: 'sliderCenteredZero', loreLabel: 'MEDIAL-BAND DENSITY', humanLabel: 'Mid', min: -12, max: 12, unit: 'dB' },
        lfoTarget: 'eq3.mid',
        lfoAccordion: lfoAccordionSchema('eq3', 'mid'),
      },
      {
        field: 'high',
        schema: { id: 'eq3.high', type: 'sliderCenteredZero', loreLabel: 'APICAL-BAND DENSITY', humanLabel: 'High', min: -12, max: 12, unit: 'dB' },
        lfoTarget: 'eq3.high',
        lfoAccordion: lfoAccordionSchema('eq3', 'high'),
      },
    ],
  },
  {
    key: 'filterLPF',
    accordion: accordionSchema('filterLPF', 'HIGH-FREQUENCY MASK', 'Low-Pass Filter'),
    enabledSchema: enabledSchema('filterLPF'),
    params: [
      {
        field: 'frequency',
        schema: { id: 'filterLPF.frequency', type: 'sliderLog', loreLabel: 'CUTOFF FREQUENCY', humanLabel: 'Frequency', min: 20, max: 20000, unit: 'Hz' },
        lfoTarget: 'lpf.frequency',
        lfoAccordion: lfoAccordionSchema('filterLPF', 'frequency'),
      },
      {
        field: 'Q',
        schema: { id: 'filterLPF.Q', type: 'sliderLog', loreLabel: 'BOUNDARY RESONANCE', humanLabel: 'Resonance', min: 0.1, max: 20 },
        lfoTarget: 'lpf.Q',
        lfoAccordion: lfoAccordionSchema('filterLPF', 'Q'),
      },
    ],
  },
  {
    key: 'filterHPF',
    accordion: accordionSchema('filterHPF', 'LOW-FREQUENCY MASK', 'High-Pass Filter'),
    enabledSchema: enabledSchema('filterHPF'),
    params: [
      {
        field: 'frequency',
        schema: { id: 'filterHPF.frequency', type: 'sliderLog', loreLabel: 'CUTOFF FREQUENCY', humanLabel: 'Frequency', min: 20, max: 20000, unit: 'Hz' },
        lfoTarget: 'hpf.frequency',
        lfoAccordion: lfoAccordionSchema('filterHPF', 'frequency'),
      },
      {
        field: 'Q',
        schema: { id: 'filterHPF.Q', type: 'sliderLog', loreLabel: 'BOUNDARY RESONANCE', humanLabel: 'Resonance', min: 0.1, max: 20 },
        lfoTarget: 'hpf.Q',
        lfoAccordion: lfoAccordionSchema('filterHPF', 'Q'),
      },
    ],
  },
  {
    key: 'chorus',
    accordion: accordionSchema('chorus', 'PHASE DISPERSION ARRAY', 'Chorus'),
    enabledSchema: enabledSchema('chorus'),
    params: [
      { field: 'rate', schema: { id: 'chorus.rate', type: 'sliderLinear', loreLabel: 'OSCILLATION RATE', humanLabel: 'Rate', min: 0.1, max: 10, unit: 'Hz' } },
      { field: 'depth', schema: { id: 'chorus.depth', type: 'sliderLinear', loreLabel: 'DISPERSION DEPTH', humanLabel: 'Depth', min: 0, max: 1 } },
      {
        field: 'delayTime',
        schema: { id: 'chorus.delayTime', type: 'sliderLinear', loreLabel: 'PHASE OFFSET', humanLabel: 'Offset', min: 2, max: 20, unit: 'ms' },
        lfoTarget: 'chorus.delayTime',
        lfoAccordion: lfoAccordionSchema('chorus', 'delayTime'),
      },
      { field: 'feedback', schema: { id: 'chorus.feedback', type: 'sliderLinear', loreLabel: 'RECIRCULATION', humanLabel: 'Feedback', min: 0, max: 1 } },
      { field: 'wet', schema: { id: 'chorus.wet', type: 'sliderLinear', loreLabel: 'SIGNAL DISPERSION BALANCE', humanLabel: 'Mix', min: 0, max: 1 } },
    ],
  },
  {
    key: 'delay',
    accordion: accordionSchema('delay', 'TEMPORAL REFLECTION MATRIX', 'Delay'),
    enabledSchema: enabledSchema('delay'),
    params: [
      {
        field: 'delayTime',
        schema: { id: 'delay.delayTime', type: 'sliderLinear', loreLabel: 'PROPAGATION LAG', humanLabel: 'Time', min: 0, max: 1, unit: 's' },
        lfoTarget: 'delay.delayTime',
        lfoAccordion: lfoAccordionSchema('delay', 'delayTime'),
      },
      { field: 'feedback', schema: { id: 'delay.feedback', type: 'sliderLinear', loreLabel: 'RECIRCULATION RATE', humanLabel: 'Feedback', min: 0, max: 0.95 } },
      { field: 'wet', schema: { id: 'delay.wet', type: 'sliderLinear', loreLabel: 'REFLECTED SIGNAL BALANCE', humanLabel: 'Mix', min: 0, max: 1 } },
    ],
  },
  {
    key: 'reverb',
    accordion: accordionSchema('reverb', 'SPATIAL DIFFUSION MATRIX', 'Reverb'),
    enabledSchema: enabledSchema('reverb'),
    params: [
      { field: 'decay', schema: { id: 'reverb.decay', type: 'sliderLog', loreLabel: 'DISSIPATION DURATION', humanLabel: 'Decay', min: 0.1, max: 10, unit: 's' } },
      { field: 'preDelay', schema: { id: 'reverb.preDelay', type: 'sliderLinear', loreLabel: 'INITIAL LAG', humanLabel: 'Pre-Delay', min: 0, max: 0.5, unit: 's' } },
      // Note: dampening is NOT LFO-flagged — GLOBAL_CHAIN_GRID.md marks it "–", unlike
      // filterLPF/HPF.frequency's "X", despite also being a log-scaled Hz field.
      { field: 'dampening', schema: { id: 'reverb.dampening', type: 'sliderLog', loreLabel: 'ABSORPTION THRESHOLD', humanLabel: 'Dampening', min: 100, max: 8000, unit: 'Hz' } },
      { field: 'wet', schema: { id: 'reverb.wet', type: 'sliderLinear', loreLabel: 'DIFFUSED SIGNAL BALANCE', humanLabel: 'Mix', min: 0, max: 1 } },
    ],
  },
];
