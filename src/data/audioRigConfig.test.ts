// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import { AUDIO_RIG_CONFIG, DECAY_MODE_SCHEMA, LFO_DRIFT_GROUPS, PING_VARIANCE_AUTOMATION_SCHEMA } from './audioRigConfig';
import { DRIFT_GROUP_IDS } from '../types/lfo';
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

    it('every sliderLinear param carries an explicit fine-grained step — bug repro: a full range <= 1 with no explicit step defaults to step=1 in SliderLinear, collapsing the whole slider into just min/max (reported: "acting as a toggle")', () => {
      for (const field of ['delayTime', 'feedback', 'wet']) {
        const schema = findParam('delay', field).schema as { step?: number; min: number; max: number };
        expect(schema.step, `delay.${field}.step`).toBeDefined();
        expect(schema.step!, `delay.${field}.step should be well under its own range`).toBeLessThan(schema.max - schema.min);
      }
    });

    it('delayTime is a linear slider, seconds, 0 to 1, not LFO-flagged — LFO removed from Delay\'s delayTime', () => {
      const param = findParam('delay', 'delayTime');
      expect(param.schema).toMatchObject({ type: 'sliderLinear', loreLabel: 'PROPAGATION LAG', min: 0, max: 1, unit: 's' });
      expect(param.lfoTarget).toBeUndefined();
      expect(param.lfoAccordion).toBeUndefined();
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

    it('preDelay and wet (both sliderLinear, full range <= 1) carry an explicit fine-grained step — same toggle-collapse bug as Delay\'s params', () => {
      for (const field of ['preDelay', 'wet']) {
        const schema = findParam('reverb', field).schema as { step?: number; min: number; max: number };
        expect(schema.step, `reverb.${field}.step`).toBeDefined();
        expect(schema.step!, `reverb.${field}.step should be well under its own range`).toBeLessThan(schema.max - schema.min);
      }
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

  it('flags exactly the 7 GlobalLfoTargetId params — no more, no fewer', () => {
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

describe('DECAY_MODE_SCHEMA', () => {
  it('is a radio schema bound to compressorBeforeDelay', () => {
    expect(DECAY_MODE_SCHEMA.id).toBe('audioRig.compressorBeforeDelay');
    expect(DECAY_MODE_SCHEMA.type).toBe('radio');
  });

  it('has exactly two options — Natural Decay and Controlled Decay, in that order', () => {
    expect(DECAY_MODE_SCHEMA.options).toEqual([
      { value: 'natural', label: 'Natural Decay' },
      { value: 'controlled', label: 'Controlled Decay' },
    ]);
  });
});

describe('LFO_DRIFT_GROUPS', () => {
  it('has exactly 4 entries, one per DriftGroupId', () => {
    expect(LFO_DRIFT_GROUPS.map((g) => g.group).sort()).toEqual([...DRIFT_GROUP_IDS].sort());
  });

  it('every entry has a valid, global chain-level accordion — not nested inside any effect block', () => {
    for (const driftGroup of LFO_DRIFT_GROUPS) {
      expect(driftGroup.accordion).toMatchObject({ id: `audioRig.lfoDrift.${driftGroup.group}`, type: 'accordion' });
    }
  });

  it('every entry\'s rate/depth schemas are sliderCenteredZero, -100 to 100, percent — matching the UI-facing bipolar percent, not lfoEngine\'s internal -1..1 fraction', () => {
    for (const driftGroup of LFO_DRIFT_GROUPS) {
      expect(driftGroup.rateSchema, driftGroup.group).toMatchObject({ type: 'sliderCenteredZero', min: -100, max: 100, unit: '%' });
      expect(driftGroup.depthSchema, driftGroup.group).toMatchObject({ type: 'sliderCenteredZero', min: -100, max: 100, unit: '%' });
    }
  });

  it('every id across all 4 entries (4 accordions + 8 sliders) is unique', () => {
    const allIds = LFO_DRIFT_GROUPS.flatMap((g) => [g.accordion.id, g.rateSchema.id, g.depthSchema.id]);
    expect(allIds).toHaveLength(12);
    expect(new Set(allIds).size).toBe(12);
  });

  it('every entry\'s rate and depth schemas have distinct human labels — never a shared generic "Drift" indistinguishable to a screen reader', () => {
    for (const driftGroup of LFO_DRIFT_GROUPS) {
      expect(driftGroup.rateSchema.humanLabel, driftGroup.group).not.toBe(driftGroup.depthSchema.humanLabel);
      expect(driftGroup.rateSchema.humanLabel, driftGroup.group).toBeTruthy();
      expect(driftGroup.depthSchema.humanLabel, driftGroup.group).toBeTruthy();
    }
  });

  it('none of LFO_DRIFT_GROUPS\' schema ids appear anywhere inside AUDIO_RIG_CONFIG\'s array — lfoDrift is a top-level GlobalAudioSettings flag, not a matching AudioRigEffectBlock key', () => {
    expect(AUDIO_RIG_CONFIG.map((b) => b.key as string)).not.toContain('lfoDrift');
    const allConfigSchemaIds = AUDIO_RIG_CONFIG.flatMap((b) => [
      b.accordion.id,
      b.enabledSchema.id,
      ...b.params.flatMap((p) => [p.schema.id, p.lfoAccordion?.id].filter((id): id is string => Boolean(id))),
    ]);
    const driftSchemaIds = LFO_DRIFT_GROUPS.flatMap((g) => [g.accordion.id, g.rateSchema.id, g.depthSchema.id]);
    for (const id of driftSchemaIds) {
      expect(allConfigSchemaIds, id).not.toContain(id);
    }
  });

  it('the closed-set coverage assertion over AUDIO_RIG_CONFIG\'s own param schema types is unaffected — LFO_DRIFT_GROUPS is a standalone export, not part of that array', () => {
    expect(AUDIO_RIG_CONFIG.length).toBe(7); // still exactly the 7 GLOBAL_CHAIN_GRID.md effect blocks
  });
});

describe('PING_VARIANCE_AUTOMATION_SCHEMA', () => {
  it('is a linear slider, 0-100%, id audioRig.pingVarianceAutomation', () => {
    expect(PING_VARIANCE_AUTOMATION_SCHEMA).toMatchObject({
      id: 'audioRig.pingVarianceAutomation',
      type: 'sliderLinear',
      min: 0,
      max: 100,
      unit: '%',
    });
  });

  it('carries the confirmed lore label and human label', () => {
    expect(PING_VARIANCE_AUTOMATION_SCHEMA.loreLabel).toBe('PING VARIANCE AUTOMATION');
    expect(PING_VARIANCE_AUTOMATION_SCHEMA.humanLabel).toBe('Automatic Effects');
  });

  it('carries an explicit fine-grained step, same regression guard as every other sliderLinear schema in this file', () => {
    expect(PING_VARIANCE_AUTOMATION_SCHEMA.step).toBeDefined();
    expect(PING_VARIANCE_AUTOMATION_SCHEMA.step!).toBeLessThan(PING_VARIANCE_AUTOMATION_SCHEMA.max - PING_VARIANCE_AUTOMATION_SCHEMA.min);
  });

  it('is not part of AUDIO_RIG_CONFIG\'s per-effect array — it is a bare, Rig-wide meta-setting, not an effect param', () => {
    const allConfigSchemaIds = AUDIO_RIG_CONFIG.flatMap((b) => [
      b.accordion.id,
      b.enabledSchema.id,
      ...b.params.flatMap((p) => [p.schema.id, p.lfoAccordion?.id].filter((id): id is string => Boolean(id))),
    ]);
    expect(allConfigSchemaIds).not.toContain(PING_VARIANCE_AUTOMATION_SCHEMA.id);
  });

  it('remains JSON-serializable', () => {
    expect(() => JSON.stringify(PING_VARIANCE_AUTOMATION_SCHEMA)).not.toThrow();
  });
});
