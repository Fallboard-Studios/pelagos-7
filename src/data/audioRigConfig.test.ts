// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import { AUDIO_RIG_CONFIG, NATURAL_DECAY_SCHEMA, CONTROLLED_DECAY_SCHEMA } from './audioRigConfig';
import { GLOBAL_LFO_TARGET_IDS } from '../types/lfo';

// ========================================
// TESTS
// ========================================

// Effect key order matches the new V2 chain order (docs/reference/GLOBAL_CHAIN_GRID.md).
const EFFECT_KEYS = ['eq3', 'filterLPF', 'filterHPF', 'delay', 'reverb', 'compressor', 'limiter'] as const;

function findBlock(key: (typeof EFFECT_KEYS)[number]) {
  const block = AUDIO_RIG_CONFIG.find((b) => b.key === key);
  if (!block) throw new Error(`no AUDIO_RIG_CONFIG block for "${key}"`);
  return block;
}

function findParam(key: (typeof EFFECT_KEYS)[number], field: string) {
  const param = findBlock(key).params.find((p) => p.field === field);
  if (!param) throw new Error(`no param "${field}" on block "${key}"`);
  return param;
}

describe('AUDIO_RIG_CONFIG', () => {
  it('has exactly one block per effect, in GLOBAL_CHAIN_GRID.md row order', () => {
    expect(AUDIO_RIG_CONFIG.map((b) => b.key)).toEqual([...EFFECT_KEYS]);
  });

  it('every block has its own accordion schema and enabled toggle schema', () => {
    for (const block of AUDIO_RIG_CONFIG) {
      expect(block.accordion).toMatchObject({ id: `audioRig.${block.key}`, type: 'accordion' });
      expect(block.enabledSchema).toMatchObject({ id: `audioRig.${block.key}.enabled`, type: 'toggle' });
    }
  });

  it('every block\'s enabled toggle has a distinct human label — never a shared "Enabled" indistinguishable across all 7', () => {
    const labels = AUDIO_RIG_CONFIG.map((b) => b.enabledSchema.humanLabel);
    expect(new Set(labels).size).toBe(AUDIO_RIG_CONFIG.length);
    for (const label of labels) {
      expect(label).not.toBe('Enabled');
    }
  });

  it('every param schema id matches GlobalAudioSettings\' own field path — never the GlobalLfoTargetId short form', () => {
    for (const block of AUDIO_RIG_CONFIG) {
      for (const param of block.params) {
        expect(param.schema.id).toBe(`${block.key}.${param.field}`);
      }
    }
  });

  describe('Compressor', () => {
    it('has all 5 params, matching GLOBAL_CHAIN_GRID.md exactly', () => {
      expect(findBlock('compressor').params.map((p) => p.field)).toEqual([
        'threshold', 'ratio', 'attack', 'release', 'knee',
      ]);
    });

    it('threshold is a linear slider, dB, -60 to 0', () => {
      expect(findParam('compressor', 'threshold').schema).toMatchObject({
        type: 'sliderLinear', loreLabel: 'ATTENUATION THRESHOLD', min: -60, max: 0, unit: 'dB',
      });
    });

    it('ratio is a stepper, 1 to 20', () => {
      expect(findParam('compressor', 'ratio').schema).toMatchObject({
        type: 'stepper', loreLabel: 'COMPRESSION RATIO', min: 1, max: 20,
      });
    });

    it('attack is a log slider, seconds, 0.001 to 1', () => {
      expect(findParam('compressor', 'attack').schema).toMatchObject({
        type: 'sliderLog', loreLabel: 'COMPRESSION RATE', min: 0.001, max: 1, unit: 's',
      });
    });

    it('release is a log slider, seconds, 0.01 to 1', () => {
      expect(findParam('compressor', 'release').schema).toMatchObject({
        type: 'sliderLog', loreLabel: 'RAREFACTION RATE', min: 0.01, max: 1, unit: 's',
      });
    });

    it('knee is a linear slider, dB, 0 to 40', () => {
      expect(findParam('compressor', 'knee').schema).toMatchObject({
        type: 'sliderLinear', loreLabel: 'CURVATURE DAMPING', min: 0, max: 40, unit: 'dB',
      });
    });

    it('has no LFO-flagged params — GLOBAL_CHAIN_GRID.md marks every compressor row "–"', () => {
      for (const param of findBlock('compressor').params) {
        expect(param.lfoTarget).toBeUndefined();
      }
    });
  });

  describe('3-Band EQ', () => {
    it('has all 3 bands as center-zero sliders, dB, -12 to 12', () => {
      for (const field of ['low', 'mid', 'high']) {
        expect(findParam('eq3', field).schema).toMatchObject({
          type: 'sliderCenteredZero', min: -12, max: 12, unit: 'dB',
        });
      }
    });

    it('has the grid\'s exact lore labels per band', () => {
      expect(findParam('eq3', 'low').schema.loreLabel).toBe('SUB-BAND DENSITY');
      expect(findParam('eq3', 'mid').schema.loreLabel).toBe('MEDIAL-BAND DENSITY');
      expect(findParam('eq3', 'high').schema.loreLabel).toBe('APICAL-BAND DENSITY');
    });

    it('all 3 bands are LFO-flagged, mapping to their eq3.* GlobalLfoTargetId', () => {
      expect(findParam('eq3', 'low').lfoTarget).toBe('eq3.low');
      expect(findParam('eq3', 'mid').lfoTarget).toBe('eq3.mid');
      expect(findParam('eq3', 'high').lfoTarget).toBe('eq3.high');
    });
  });

  describe('Low-Pass Filter', () => {
    it('frequency is a log slider, Hz, 20 to 20000, LFO-flagged as lpf.frequency', () => {
      const param = findParam('filterLPF', 'frequency');
      expect(param.schema).toMatchObject({ type: 'sliderLog', loreLabel: 'CUTOFF FREQUENCY', min: 20, max: 20000, unit: 'Hz' });
      expect(param.lfoTarget).toBe('lpf.frequency');
    });

    it('Q is a log slider, 0.1 to 20, LFO-flagged as lpf.Q', () => {
      const param = findParam('filterLPF', 'Q');
      expect(param.schema).toMatchObject({ type: 'sliderLog', loreLabel: 'BOUNDARY RESONANCE', min: 0.1, max: 20 });
      expect(param.lfoTarget).toBe('lpf.Q');
    });
  });

  describe('High-Pass Filter', () => {
    it('frequency is a log slider, Hz, 20 to 20000, LFO-flagged as hpf.frequency', () => {
      const param = findParam('filterHPF', 'frequency');
      expect(param.schema).toMatchObject({ type: 'sliderLog', loreLabel: 'CUTOFF FREQUENCY', min: 20, max: 20000, unit: 'Hz' });
      expect(param.lfoTarget).toBe('hpf.frequency');
    });

    it('Q is a log slider, 0.1 to 20, LFO-flagged as hpf.Q', () => {
      const param = findParam('filterHPF', 'Q');
      expect(param.schema).toMatchObject({ type: 'sliderLog', loreLabel: 'BOUNDARY RESONANCE', min: 0.1, max: 20 });
      expect(param.lfoTarget).toBe('hpf.Q');
    });
  });

  describe('Delay', () => {
    it('has all 3 params, matching GLOBAL_CHAIN_GRID.md exactly', () => {
      expect(findBlock('delay').params.map((p) => p.field)).toEqual(['delayTime', 'feedback', 'wet']);
    });

    it('delayTime is a linear slider, seconds, 0 to 1, LFO-flagged as delay.delayTime', () => {
      const param = findParam('delay', 'delayTime');
      expect(param.schema).toMatchObject({ type: 'sliderLinear', loreLabel: 'PROPAGATION LAG', min: 0, max: 1, unit: 's' });
      expect(param.lfoTarget).toBe('delay.delayTime');
    });

    it('feedback is a linear slider, 0 to 0.95, not LFO-flagged', () => {
      const param = findParam('delay', 'feedback');
      expect(param.schema).toMatchObject({ type: 'sliderLinear', loreLabel: 'RECIRCULATION RATE', min: 0, max: 0.95 });
      expect(param.lfoTarget).toBeUndefined();
    });

    it('wet is a linear slider, 0 to 1, not LFO-flagged', () => {
      const param = findParam('delay', 'wet');
      expect(param.schema).toMatchObject({ type: 'sliderLinear', loreLabel: 'REFLECTED SIGNAL BALANCE', min: 0, max: 1 });
      expect(param.lfoTarget).toBeUndefined();
    });
  });

  describe('Reverb', () => {
    it('has all 3 params, matching GLOBAL_CHAIN_GRID.md exactly — no dampening (dead, Tone.Reverb has no such property)', () => {
      expect(findBlock('reverb').params.map((p) => p.field)).toEqual(['decay', 'preDelay', 'wet']);
    });

    it('decay is a log slider, seconds, 0.1 to 10, not LFO-flagged', () => {
      const param = findParam('reverb', 'decay');
      expect(param.schema).toMatchObject({ type: 'sliderLog', loreLabel: 'DISSIPATION DURATION', min: 0.1, max: 10, unit: 's' });
      expect(param.lfoTarget).toBeUndefined();
    });

    it('preDelay is a linear slider, seconds, 0 to 0.5, not LFO-flagged', () => {
      const param = findParam('reverb', 'preDelay');
      expect(param.schema).toMatchObject({ type: 'sliderLinear', loreLabel: 'INITIAL LAG', min: 0, max: 0.5, unit: 's' });
      expect(param.lfoTarget).toBeUndefined();
    });

    it('wet is a linear slider, 0 to 1, not LFO-flagged', () => {
      const param = findParam('reverb', 'wet');
      expect(param.schema).toMatchObject({ type: 'sliderLinear', loreLabel: 'DIFFUSED SIGNAL BALANCE', min: 0, max: 1 });
      expect(param.lfoTarget).toBeUndefined();
    });
  });

  describe('Limiter', () => {
    it('has exactly one param, threshold', () => {
      expect(findBlock('limiter').params.map((p) => p.field)).toEqual(['threshold']);
    });

    it('threshold is a linear slider, dB, -20 to 0, not LFO-flagged — Limiter never gets an LFO', () => {
      const param = findParam('limiter', 'threshold');
      expect(param.schema).toMatchObject({ type: 'sliderLinear', loreLabel: 'OUTPUT CEILING', min: -20, max: 0, unit: 'dB' });
      expect(param.lfoTarget).toBeUndefined();
      expect(param.lfoAccordion).toBeUndefined();
    });
  });

  it('has no chorus block at all', () => {
    expect(AUDIO_RIG_CONFIG.map((b) => b.key as string)).not.toContain('chorus');
  });

  it('flags exactly the 8 GlobalLfoTargetId params — no more, no fewer', () => {
    const lfoTargets = AUDIO_RIG_CONFIG.flatMap((b) => b.params.map((p) => p.lfoTarget).filter(Boolean));
    expect([...lfoTargets].sort()).toEqual([...GLOBAL_LFO_TARGET_IDS].sort());
  });

  it('every LFO-flagged param carries its own lfoAccordion schema; every other param carries none', () => {
    for (const block of AUDIO_RIG_CONFIG) {
      for (const param of block.params) {
        if (param.lfoTarget) {
          expect(param.lfoAccordion).toMatchObject({ type: 'accordion' });
          expect(param.lfoAccordion?.id).not.toBe(block.accordion.id);
        } else {
          expect(param.lfoAccordion).toBeUndefined();
        }
      }
    }
  });

  it('remains JSON-serializable', () => {
    expect(() => JSON.stringify(AUDIO_RIG_CONFIG)).not.toThrow();
  });
});

describe('NATURAL_DECAY_SCHEMA / CONTROLLED_DECAY_SCHEMA', () => {
  it('share the same id — one toggle, schema swapped by current state', () => {
    expect(NATURAL_DECAY_SCHEMA.id).toBe('audioRig.compressorBeforeDelay');
    expect(CONTROLLED_DECAY_SCHEMA.id).toBe('audioRig.compressorBeforeDelay');
  });

  it('are both toggle schemas with distinct human labels', () => {
    expect(NATURAL_DECAY_SCHEMA.type).toBe('toggle');
    expect(CONTROLLED_DECAY_SCHEMA.type).toBe('toggle');
    expect(NATURAL_DECAY_SCHEMA.humanLabel).toBe('Natural Decay');
    expect(CONTROLLED_DECAY_SCHEMA.humanLabel).toBe('Controlled Decay');
  });
});
