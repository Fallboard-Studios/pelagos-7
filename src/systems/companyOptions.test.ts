import { describe, it, expect } from 'vitest';

import { resolveCompanyOptions } from './companyOptions';
import type { Company } from '@/types/Company';
import type { Robot } from '@/types/Robot';

function makeRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: 'r1',
    name: 'Test Robot',
    state: 'idle',
    position: { x: 0, y: 0 },
    destination: null,
    direction: 'right',
    melody: [],
    audioAttributes: {
      adsr: { attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 },
      filterFreq: 0,
      waveform: 'sine',
      layers: [{ type: 'sine', gain: 1, detune: 0, phase: 0, active: true }],
    },
    octaveRange: [3, 5],
    createdAt: Date.now(),
    masterVolume: 0.6,
    docking: 'active',
    batteryLevel: 100,
    rhythmicDensity: 42,
    rhythmicMotifLength: { active: true, value: 6 },
    noteVariance: { active: true, value: 2 },
    audioMode: 'solo',
    ...overrides,
  } as Robot;
}

function makeCompany(overrides: Partial<Company> = {}): Company {
  return { id: 'c1', name: 'Iron Consortium', robotIds: ['r1'], ...overrides };
}

describe('resolveCompanyOptions', () => {
  it('with no lastEditedOptions, every field equals the first member\'s current value', () => {
    const firstMember = makeRobot();
    const company = makeCompany();

    const resolved = resolveCompanyOptions(company, firstMember);

    expect(resolved.audioMode).toBe('solo');
    expect(resolved.masterVolume).toBe(0.6);
    expect(resolved.rhythmicDensity).toBe(42);
    expect(resolved.rhythmicMotifLength).toEqual({ active: true, value: 6 });
    expect(resolved.noteVariance).toEqual({ active: true, value: 2 });
    expect(resolved.octaveRange).toEqual([3, 5]);
    expect(resolved.adsr).toEqual({ attack: 0.2, decay: 0.3, sustain: 0.8, release: 1.5 });
    expect(resolved.layers).toEqual(firstMember.audioAttributes.layers);
  });

  it('falls back to documented defaults for fields the first member has never had set', () => {
    const firstMember = makeRobot({
      audioMode: undefined,
      rhythmicDensity: undefined,
      rhythmicMotifLength: undefined,
      noteVariance: undefined,
      lfoSettings: undefined,
    });
    const company = makeCompany();

    const resolved = resolveCompanyOptions(company, firstMember);

    expect(resolved.audioMode).toBe('none');
    expect(resolved.rhythmicDensity).toBe(50);
    expect(resolved.rhythmicMotifLength).toEqual({ active: true, value: 8 });
    expect(resolved.noteVariance).toEqual({ active: false, value: 1 });
    expect(resolved.volumeLfo).toEqual({ shape: 'sine', rate: 0.1, depth: 0, active: false });
  });

  it('with lastEditedOptions partially populated, only the recorded fields override — everything else still falls back to the first member', () => {
    const firstMember = makeRobot({ masterVolume: 0.6, rhythmicDensity: 42 });
    const company = makeCompany({ lastEditedOptions: { masterVolume: 0.9 } });

    const resolved = resolveCompanyOptions(company, firstMember);

    expect(resolved.masterVolume).toBe(0.9); // recorded override wins
    expect(resolved.rhythmicDensity).toBe(42); // untouched field still falls back live
  });

  it('the first member\'s own subsequent live changes are reflected for any field the snapshot does not cover — never frozen at first-selection time', () => {
    const company = makeCompany({ lastEditedOptions: { masterVolume: 0.9 } });

    const before = resolveCompanyOptions(company, makeRobot({ rhythmicDensity: 10 }));
    expect(before.rhythmicDensity).toBe(10);

    // The "first member" robot object drifted (e.g. edited individually) between two calls —
    // resolveCompanyOptions has no memory of its own; it re-reads whatever is passed in.
    const after = resolveCompanyOptions(company, makeRobot({ rhythmicDensity: 77 }));
    expect(after.rhythmicDensity).toBe(77);
    // The recorded override is unaffected by the drift.
    expect(after.masterVolume).toBe(0.9);
  });
});
