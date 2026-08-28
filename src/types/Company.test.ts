// ========================================
// IMPORTS
// ========================================
import { describe, it, expect } from 'vitest';

import type { Company, CompanyOptionsSnapshot } from './Company';

// ========================================
// TESTS
// ========================================

describe('CompanyOptionsSnapshot', () => {
  it('accepts an empty object — every field is optional', () => {
    const empty: CompanyOptionsSnapshot = {};
    expect(empty.audioMode).toBeUndefined();
    expect(empty.masterVolume).toBeUndefined();
    expect(empty.volumeLfo).toBeUndefined();
    expect(empty.rhythmicDensity).toBeUndefined();
    expect(empty.rhythmicMotifLength).toBeUndefined();
    expect(empty.noteVariance).toBeUndefined();
    expect(empty.octaveRange).toBeUndefined();
    expect(empty.adsr).toBeUndefined();
    expect(empty.layers).toBeUndefined();
    expect(empty.lfoSettings).toBeUndefined();
  });

  it('accepts every field populated', () => {
    const full: CompanyOptionsSnapshot = {
      audioMode: 'solo',
      masterVolume: 0.75,
      volumeLfo: { shape: 'sine', rate: 2, depth: 40, active: true },
      rhythmicDensity: 60,
      rhythmicMotifLength: { active: true, value: 4 },
      noteVariance: { active: false, value: 1 },
      octaveRange: [3, 5],
      adsr: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.5 },
      layers: [{ type: 'sine', gain: 1, detune: 0, phase: 0, active: true }],
      lfoSettings: { volume: { shape: 'triangle', rate: 1, depth: 20, active: false } },
    };
    expect(full.audioMode).toBe('solo');
    expect(full.masterVolume).toBe(0.75);
    expect(full.octaveRange).toEqual([3, 5]);
    expect(full.layers).toHaveLength(1);
  });

  it('accepts a partially populated object — only some fields set', () => {
    const partial: CompanyOptionsSnapshot = { masterVolume: 0.5 };
    expect(partial.masterVolume).toBe(0.5);
    expect(partial.audioMode).toBeUndefined();
  });
});

describe('Company', () => {
  it('requires id, name, and robotIds; lastEditedOptions is optional', () => {
    const fresh: Company = { id: 'company-0-abc', name: 'Iron Consortium', robotIds: [] };
    expect(fresh.lastEditedOptions).toBeUndefined();

    const edited: Company = {
      id: 'company-1-def',
      name: 'Null Syndicate',
      robotIds: ['robot-0-xyz', 'robot-1-uvw'],
      lastEditedOptions: { masterVolume: 0.9 },
    };
    expect(edited.robotIds).toEqual(['robot-0-xyz', 'robot-1-uvw']);
    expect(edited.lastEditedOptions?.masterVolume).toBe(0.9);
  });
});
