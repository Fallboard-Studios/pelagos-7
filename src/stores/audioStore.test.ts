import { describe, it, expect, beforeEach, vi } from 'vitest';

import { GLOBAL_LFO_TARGET_IDS, DRIFT_GROUP_IDS } from '../types/lfo';

// Ensure AudioEngine is mocked before importing the store so the module's
// import of AudioEngine receives the mock. The store now calls the full
// global-FX setter surface (Task 6), not just setBPM — keep this mock's
// shape matching what audioStore.ts actually depends on.
vi.mock('../engine/AudioEngine', () => ({
  AudioEngine: {
    setBPM: vi.fn(),
    setGlobalCompressor: vi.fn(),
    setGlobalEQ: vi.fn(),
    setGlobalFilterLPF: vi.fn(),
    setGlobalFilterHPF: vi.fn(),
    setGlobalLimiter: vi.fn(),
    setGlobalDelay: vi.fn(),
    setGlobalReverb: vi.fn(),
    setEffectBypass: vi.fn(),
    setGlobalBypass: vi.fn(),
  },
}));

// audioStore.ts imports wireGlobalFxChain directly from globalFx.ts (Task 9) —
// no circular-import risk here since globalFx.ts has zero store-layer imports.
vi.mock('../engine/audioEngine/globalFx', () => ({
  wireGlobalFxChain: vi.fn(),
}));

vi.mock('../engine/lfoEngine', () => ({
  lfoEngine: {
    getLfoSettings: vi.fn(),
    setLfoRate: vi.fn(),
    setLfoDepth: vi.fn(),
    setLfoShape: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    connectLfoTarget: vi.fn(() => true),
    disconnectLfoTarget: vi.fn(),
    setGlobalRateDrift: vi.fn(),
    setGlobalDepthDrift: vi.fn(),
  },
}));

describe('useAudioStore - setBPM', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('updates store bpm and delegates to AudioEngine.setBPM', async () => {
    // Import after mock so the store picks up the mocked AudioEngine
    const { useAudioStore } = await import('./audioStore');
    const { AudioEngine } = await import('../engine/AudioEngine');

    const initial = useAudioStore.getState().bpm;
    expect(typeof initial).toBe('number');

    // Call setter
    useAudioStore.getState().setBPM(140);

    // Store updated
    expect(useAudioStore.getState().bpm).toBe(140);

    // Delegated to AudioEngine
    expect(AudioEngine.setBPM).toHaveBeenCalledWith(140);
  });
});

describe('useAudioStore - regenerateGlobalAudioFromSeed', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('seeds globalAudio for the current Attenuation Style on module load (app init)', async () => {
    // Importing the store is the trigger under test — its module-scope sync
    // runs at import time, before any explicit action is called.
    await import('./audioStore');
    const { AudioEngine } = await import('../engine/AudioEngine');

    expect(AudioEngine.setGlobalReverb).toHaveBeenCalled();
    expect(AudioEngine.setGlobalCompressor).toHaveBeenCalled();
  });

  it('seeds enabled: true unconditionally for every effect except delay', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { globalAudio } = useAudioStore.getState();

    expect(globalAudio.compressor.enabled).toBe(true);
    expect(globalAudio.eq3.enabled).toBe(true);
    expect(globalAudio.filterLPF.enabled).toBe(true);
    expect(globalAudio.filterHPF.enabled).toBe(true);
    expect(globalAudio.reverb.enabled).toBe(true);
    expect(globalAudio.limiter.enabled).toBe(true);
  });

  it('no longer forces delay.enabled to true — the seeded ~25% chance survives regeneration unchanged', async () => {
    // The regression this task explicitly calls out as most likely to slip
    // back in silently: removing the force-enabled-true override must not be
    // masked by every sampled Attenuation Style coincidentally seeding delay.enabled true.
    // Same statistical-spot-check style as globalAudioSeed.test.ts's own
    // delay.enabled test — a wide tolerance band instead of an exact count,
    // to avoid flakiness while still clearly distinguishing this from "always true".
    const { useAudioStore } = await import('./audioStore');
    const SAMPLE_ATTENUATION_STYLES = 40;
    let enabledCount = 0;
    for (let i = 0; i < SAMPLE_ATTENUATION_STYLES; i++) {
      useAudioStore.getState().regenerateGlobalAudioFromSeed(`store-delay-sample-${i}`, `StoreDelaySample${i}`);
      if (useAudioStore.getState().globalAudio.delay.enabled) enabledCount++;
    }
    const enabledRate = enabledCount / SAMPLE_ATTENUATION_STYLES;
    expect(enabledRate).toBeGreaterThan(0.05);
    expect(enabledRate).toBeLessThan(0.5);
  });

  it('fixes filterLPF/filterHPF type to their identity', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { globalAudio } = useAudioStore.getState();
    expect(globalAudio.filterLPF.type).toBe('lowpass');
    expect(globalAudio.filterHPF.type).toBe('highpass');
  });

  it('calls every AudioEngine setGlobal* setter with the resulting values', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { AudioEngine } = await import('../engine/AudioEngine');
    const { globalAudio } = useAudioStore.getState();

    expect(AudioEngine.setGlobalCompressor).toHaveBeenCalledWith(globalAudio.compressor);
    expect(AudioEngine.setGlobalEQ).toHaveBeenCalledWith(globalAudio.eq3);
    expect(AudioEngine.setGlobalFilterLPF).toHaveBeenCalledWith(globalAudio.filterLPF);
    expect(AudioEngine.setGlobalFilterHPF).toHaveBeenCalledWith(globalAudio.filterHPF);
    expect(AudioEngine.setGlobalLimiter).toHaveBeenCalledWith(globalAudio.limiter);
    expect(AudioEngine.setGlobalDelay).toHaveBeenCalledWith(globalAudio.delay);
    expect(AudioEngine.setGlobalReverb).toHaveBeenCalledWith(globalAudio.reverb);
  });

  it('calls lfoEngine.setGlobalRateDrift/setGlobalDepthDrift for all 4 groups with each group\'s own resulting lfoDrift values, alongside the AudioEngine setGlobal* calls', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');
    const { globalAudio } = useAudioStore.getState();

    for (const group of DRIFT_GROUP_IDS) {
      expect(lfoEngine.setGlobalRateDrift, group).toHaveBeenCalledWith(group, globalAudio.lfoDrift[group].rateDrift);
      expect(lfoEngine.setGlobalDepthDrift, group).toHaveBeenCalledWith(group, globalAudio.lfoDrift[group].depthDrift);
    }
  });

  it('calls AudioEngine.setEffectBypass with each effect\'s actual seeded enabled value — not hardcoded true', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { AudioEngine } = await import('../engine/AudioEngine');
    const { globalAudio } = useAudioStore.getState();

    expect(AudioEngine.setEffectBypass).toHaveBeenCalledWith('reverb', globalAudio.reverb.enabled);
    expect(AudioEngine.setEffectBypass).toHaveBeenCalledWith('delay', globalAudio.delay.enabled);
    expect(AudioEngine.setEffectBypass).toHaveBeenCalledWith('eq3', globalAudio.eq3.enabled);
    expect(AudioEngine.setEffectBypass).toHaveBeenCalledWith('lpf', globalAudio.filterLPF.enabled);
    expect(AudioEngine.setEffectBypass).toHaveBeenCalledWith('hpf', globalAudio.filterHPF.enabled);
    expect(AudioEngine.setEffectBypass).toHaveBeenCalledWith('compressor', globalAudio.compressor.enabled);
    expect(AudioEngine.setEffectBypass).toHaveBeenCalledWith('limiter', globalAudio.limiter.enabled);
  });

  it('is deterministic — calling it twice with the same Attenuation Style produces the same globalAudio', async () => {
    const { useAudioStore } = await import('./audioStore');
    const first = useAudioStore.getState().globalAudio;
    useAudioStore.getState().regenerateGlobalAudioFromSeed('pelagos', 'Pelagos');
    const second = useAudioStore.getState().globalAudio;
    expect(second).toEqual(first);
  });

  it('produces different globalAudio for a different Attenuation Style', async () => {
    const { useAudioStore } = await import('./audioStore');
    const pelagos = useAudioStore.getState().globalAudio;
    useAudioStore.getState().regenerateGlobalAudioFromSeed('a-different-as-id', 'Zenith');
    const other = useAudioStore.getState().globalAudio;
    expect(other).not.toEqual(pelagos);
  });

  it('preserves globalBypass and compressorBeforeDelay across a reseed — neither is seeded, so an Attenuation Style switch must not silently reset a live user choice back to default', async () => {
    const { useAudioStore } = await import('./audioStore');
    useAudioStore.getState().setGlobalBypassEnabled(true);
    useAudioStore.getState().setCompressorBeforeDelay(true);

    useAudioStore.getState().regenerateGlobalAudioFromSeed('a-different-as-id', 'Zenith');

    expect(useAudioStore.getState().globalAudio.globalBypass).toBe(true);
    expect(useAudioStore.getState().globalAudio.compressorBeforeDelay).toBe(true);
  });

  it('follows setCurrentAttenuationStyleId — switching the active Attenuation Style reseeds globalAudio automatically', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { useAttenuationStyleStore, DEFAULT_PELAGOS } = await import('./attenuationStyleStore');
    const { AudioEngine } = await import('../engine/AudioEngine');

    const before = useAudioStore.getState().globalAudio;
    useAttenuationStyleStore.getState().addAttenuationStyle({ ...DEFAULT_PELAGOS, id: 'zenith', name: 'Zenith' });
    vi.clearAllMocks();

    useAttenuationStyleStore.getState().setCurrentAttenuationStyleId('zenith');

    expect(useAudioStore.getState().globalAudio).not.toEqual(before);
    expect(AudioEngine.setGlobalReverb).toHaveBeenCalled();
  });

  it('does not throw and leaves globalAudio unchanged when currentAttenuationStyleId matches no Attenuation Style', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { useAttenuationStyleStore } = await import('./attenuationStyleStore');
    const before = useAudioStore.getState().globalAudio;

    expect(() => useAttenuationStyleStore.getState().setCurrentAttenuationStyleId('does-not-exist')).not.toThrow();
    expect(useAudioStore.getState().globalAudio).toEqual(before);
  });

  it('does not redundantly recompute when currentAttenuationStyleId is set to its current value', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { useAttenuationStyleStore } = await import('./attenuationStyleStore');
    const { AudioEngine } = await import('../engine/AudioEngine');

    void useAudioStore.getState();
    vi.clearAllMocks();
    useAttenuationStyleStore.getState().setCurrentAttenuationStyleId(useAttenuationStyleStore.getState().currentAttenuationStyleId);

    expect(AudioEngine.setGlobalReverb).not.toHaveBeenCalled();
  });
});

describe('useAudioStore - setGlobalAudio pushes to AudioEngine', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('updates globalAudio state for the given effect/partial', async () => {
    const { useAudioStore } = await import('./audioStore');
    useAudioStore.getState().setGlobalAudio('compressor', { threshold: -30 });
    expect(useAudioStore.getState().globalAudio.compressor.threshold).toBe(-30);
  });

  it('calls the matching AudioEngine setter with the partial', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { AudioEngine } = await import('../engine/AudioEngine');
    vi.clearAllMocks();

    useAudioStore.getState().setGlobalAudio('compressor', { threshold: -30 });
    expect(AudioEngine.setGlobalCompressor).toHaveBeenCalledWith({ threshold: -30 });

    useAudioStore.getState().setGlobalAudio('eq3', { low: 4 });
    expect(AudioEngine.setGlobalEQ).toHaveBeenCalledWith({ low: 4 });

    useAudioStore.getState().setGlobalAudio('filterLPF', { frequency: 8000 });
    expect(AudioEngine.setGlobalFilterLPF).toHaveBeenCalledWith({ frequency: 8000 });

    useAudioStore.getState().setGlobalAudio('filterHPF', { Q: 5 });
    expect(AudioEngine.setGlobalFilterHPF).toHaveBeenCalledWith({ Q: 5 });

    useAudioStore.getState().setGlobalAudio('limiter', { threshold: -6 });
    expect(AudioEngine.setGlobalLimiter).toHaveBeenCalledWith({ threshold: -6 });

    useAudioStore.getState().setGlobalAudio('delay', { feedback: 0.4 });
    expect(AudioEngine.setGlobalDelay).toHaveBeenCalledWith({ feedback: 0.4 });

    useAudioStore.getState().setGlobalAudio('reverb', { wet: 0.6 });
    expect(AudioEngine.setGlobalReverb).toHaveBeenCalledWith({ wet: 0.6 });
  });
});

describe('useAudioStore - setEffectEnabled', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('updates the given effect\'s enabled field in state', async () => {
    const { useAudioStore } = await import('./audioStore');
    useAudioStore.getState().setEffectEnabled('reverb', false);
    expect(useAudioStore.getState().globalAudio.reverb.enabled).toBe(false);
  });

  it('calls AudioEngine.setEffectBypass with the short-form key and the enabled value', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { AudioEngine } = await import('../engine/AudioEngine');
    vi.clearAllMocks();

    useAudioStore.getState().setEffectEnabled('filterLPF', false);
    expect(AudioEngine.setEffectBypass).toHaveBeenCalledWith('lpf', false);

    useAudioStore.getState().setEffectEnabled('filterHPF', true);
    expect(AudioEngine.setEffectBypass).toHaveBeenCalledWith('hpf', true);

    useAudioStore.getState().setEffectEnabled('compressor', false);
    expect(AudioEngine.setEffectBypass).toHaveBeenCalledWith('compressor', false);
  });
});

describe('useAudioStore - setGlobalBypassEnabled', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('updates globalBypass in state', async () => {
    const { useAudioStore } = await import('./audioStore');
    useAudioStore.getState().setGlobalBypassEnabled(true);
    expect(useAudioStore.getState().globalAudio.globalBypass).toBe(true);
  });

  it('calls AudioEngine.setGlobalBypass with the value', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { AudioEngine } = await import('../engine/AudioEngine');
    vi.clearAllMocks();

    useAudioStore.getState().setGlobalBypassEnabled(true);
    expect(AudioEngine.setGlobalBypass).toHaveBeenCalledWith(true);

    useAudioStore.getState().setGlobalBypassEnabled(false);
    expect(AudioEngine.setGlobalBypass).toHaveBeenCalledWith(false);
  });
});

describe('useAudioStore - setCompressorBeforeDelay', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('starts false (Natural Decay) before any action runs', async () => {
    const { useAudioStore } = await import('./audioStore');
    expect(useAudioStore.getState().globalAudio.compressorBeforeDelay).toBe(false);
  });

  it('setting true updates state and calls wireGlobalFxChain(true)', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { wireGlobalFxChain } = await import('../engine/audioEngine/globalFx');
    vi.clearAllMocks();

    useAudioStore.getState().setCompressorBeforeDelay(true);

    expect(useAudioStore.getState().globalAudio.compressorBeforeDelay).toBe(true);
    expect(wireGlobalFxChain).toHaveBeenCalledWith(true);
  });

  it('setting false updates state and calls wireGlobalFxChain(false)', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { wireGlobalFxChain } = await import('../engine/audioEngine/globalFx');
    useAudioStore.getState().setCompressorBeforeDelay(true);
    vi.clearAllMocks();

    useAudioStore.getState().setCompressorBeforeDelay(false);

    expect(useAudioStore.getState().globalAudio.compressorBeforeDelay).toBe(false);
    expect(wireGlobalFxChain).toHaveBeenCalledWith(false);
  });
});

describe('useAudioStore - setGlobalLfoDrift', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('updates only rateDrift for the given group and calls lfoEngine.setGlobalRateDrift with that group, leaving depthDrift and every other group untouched', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');
    const before = useAudioStore.getState().globalAudio.lfoDrift;
    vi.clearAllMocks();

    useAudioStore.getState().setGlobalLfoDrift('eq3', { rateDrift: 0.5 });

    expect(useAudioStore.getState().globalAudio.lfoDrift.eq3.rateDrift).toBe(0.5);
    expect(useAudioStore.getState().globalAudio.lfoDrift.eq3.depthDrift).toBe(before.eq3.depthDrift);
    expect(useAudioStore.getState().globalAudio.lfoDrift.filterLPF).toEqual(before.filterLPF);
    expect(useAudioStore.getState().globalAudio.lfoDrift.filterHPF).toEqual(before.filterHPF);
    expect(useAudioStore.getState().globalAudio.lfoDrift.robots).toEqual(before.robots);
    expect(lfoEngine.setGlobalRateDrift).toHaveBeenCalledWith('eq3', 0.5);
    expect(lfoEngine.setGlobalDepthDrift).not.toHaveBeenCalled();
  });

  it('updates only depthDrift for the given group and calls lfoEngine.setGlobalDepthDrift with that group, leaving rateDrift untouched', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');
    const rateBefore = useAudioStore.getState().globalAudio.lfoDrift.filterLPF.rateDrift;
    vi.clearAllMocks();

    useAudioStore.getState().setGlobalLfoDrift('filterLPF', { depthDrift: -0.3 });

    expect(useAudioStore.getState().globalAudio.lfoDrift.filterLPF.depthDrift).toBe(-0.3);
    expect(useAudioStore.getState().globalAudio.lfoDrift.filterLPF.rateDrift).toBe(rateBefore);
    expect(lfoEngine.setGlobalDepthDrift).toHaveBeenCalledWith('filterLPF', -0.3);
    expect(lfoEngine.setGlobalRateDrift).not.toHaveBeenCalled();
  });

  it('updates both fields for the given group and calls both engine setters with that group when both are provided together', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');
    vi.clearAllMocks();

    useAudioStore.getState().setGlobalLfoDrift('robots', { rateDrift: 0.2, depthDrift: 0.9 });

    expect(useAudioStore.getState().globalAudio.lfoDrift.robots).toEqual({ rateDrift: 0.2, depthDrift: 0.9 });
    expect(lfoEngine.setGlobalRateDrift).toHaveBeenCalledWith('robots', 0.2);
    expect(lfoEngine.setGlobalDepthDrift).toHaveBeenCalledWith('robots', 0.9);
  });

  it('calling it twice on the same group with one field each time accumulates rather than clobbering the other field', async () => {
    const { useAudioStore } = await import('./audioStore');
    useAudioStore.getState().setGlobalLfoDrift('filterHPF', { rateDrift: 0.4 });

    useAudioStore.getState().setGlobalLfoDrift('filterHPF', { depthDrift: 0.6 });

    expect(useAudioStore.getState().globalAudio.lfoDrift.filterHPF).toEqual({ rateDrift: 0.4, depthDrift: 0.6 });
  });

  it('setting one group never touches another group\'s stored values — cross-group isolation', async () => {
    const { useAudioStore } = await import('./audioStore');
    const before = useAudioStore.getState().globalAudio.lfoDrift;

    useAudioStore.getState().setGlobalLfoDrift('eq3', { rateDrift: 0.7, depthDrift: 0.7 });

    expect(useAudioStore.getState().globalAudio.lfoDrift.filterLPF).toEqual(before.filterLPF);
    expect(useAudioStore.getState().globalAudio.lfoDrift.filterHPF).toEqual(before.filterHPF);
    expect(useAudioStore.getState().globalAudio.lfoDrift.robots).toEqual(before.robots);
  });
});

describe('useAudioStore - globalLfo state', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('has one entry per GlobalLfoTargetId, JSON-serializable', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { globalLfo } = useAudioStore.getState();
    expect(Object.keys(globalLfo).sort()).toEqual([...GLOBAL_LFO_TARGET_IDS].sort());
    expect(() => JSON.stringify(globalLfo)).not.toThrow();
  });
});

describe('useAudioStore - setGlobalLfo', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('updates globalLfo state for the given target', async () => {
    const { useAudioStore } = await import('./audioStore');
    useAudioStore.getState().setGlobalLfo('eq3.low', { shape: 'square', rate: 3, depth: 40, active: false });
    expect(useAudioStore.getState().globalLfo['eq3.low']).toEqual({ shape: 'square', rate: 3, depth: 40, active: false });
  });

  it('always calls setLfoShape/setLfoRate/setLfoDepth with the value\'s fields', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');
    vi.clearAllMocks();

    useAudioStore.getState().setGlobalLfo('lpf.frequency', { shape: 'triangle', rate: 5, depth: 60, active: false });

    expect(lfoEngine.setLfoShape).toHaveBeenCalledWith('lpf.frequency', 'triangle');
    expect(lfoEngine.setLfoRate).toHaveBeenCalledWith('lpf.frequency', 5);
    expect(lfoEngine.setLfoDepth).toHaveBeenCalledWith('lpf.frequency', 60);
  });

  it('connects and starts when active is true and connect succeeds', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');
    vi.clearAllMocks();
    vi.mocked(lfoEngine.connectLfoTarget).mockReturnValue(true);

    useAudioStore.getState().setGlobalLfo('hpf.Q', { shape: 'sine', rate: 1, depth: 20, active: true });

    expect(lfoEngine.connectLfoTarget).toHaveBeenCalledWith('hpf.Q');
    expect(lfoEngine.start).toHaveBeenCalledWith('hpf.Q');
    expect(lfoEngine.disconnectLfoTarget).not.toHaveBeenCalled();
    expect(lfoEngine.stop).not.toHaveBeenCalled();
  });

  it('does not call start when active is true but connect fails', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');
    vi.clearAllMocks();
    vi.mocked(lfoEngine.connectLfoTarget).mockReturnValue(false);

    useAudioStore.getState().setGlobalLfo('hpf.frequency', { shape: 'sine', rate: 1, depth: 20, active: true });

    expect(lfoEngine.connectLfoTarget).toHaveBeenCalledWith('hpf.frequency');
    expect(lfoEngine.start).not.toHaveBeenCalled();
  });

  it('disconnects and stops when active is false', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');
    vi.clearAllMocks();

    useAudioStore.getState().setGlobalLfo('eq3.high', { shape: 'sine', rate: 1, depth: 20, active: false });

    expect(lfoEngine.disconnectLfoTarget).toHaveBeenCalledWith('eq3.high');
    expect(lfoEngine.stop).toHaveBeenCalledWith('eq3.high');
    expect(lfoEngine.connectLfoTarget).not.toHaveBeenCalled();
    expect(lfoEngine.start).not.toHaveBeenCalled();
  });
});

describe('useAudioStore - globalLfo Attenuation-Style-sync seeding', () => {
  beforeEach(() => {
    vi.resetModules();
    // The lfoEngine mock's call history persists across vi.resetModules() (same
    // established quirk documented in LFO_INTEGRATION_PLAN.md's Task 11 notes for
    // the Tone mock) — clear it so each test only sees its own fresh import's calls.
    vi.clearAllMocks();
  });

  it('seeds globalLfo for the current Attenuation Style on module load (app init)', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { globalLfo } = useAudioStore.getState();
    // Seeded, not left at the DEFAULT_LFO_SETTINGS-inert values (rate would be
    // pinned to LFO_RATE_MIN and depth to LFO_DEPTH_MIN for every target if
    // seeding hadn't run) — at least one target should differ from the inert default.
    const rates = GLOBAL_LFO_TARGET_IDS.map((t) => globalLfo[t].rate);
    expect(new Set(rates).size).toBeGreaterThan(1);
  });

  it('does not touch lfoEngine during seeding — data-only, deferred to AudioEngine.start() (Task 9)', async () => {
    // AS-sync runs at module load / on every Attenuation Style switch, before any user
    // gesture — pushing to lfoEngine here would construct a real Tone.LFO node
    // before an AudioContext exists (found via the Phase 2 checkpoint's full
    // suite run: TransportBar.test.tsx, which imports the real audioStore
    // module, threw "param must be an AudioParam" until this was fixed).
    await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');

    expect(lfoEngine.setLfoShape).not.toHaveBeenCalled();
    expect(lfoEngine.setLfoRate).not.toHaveBeenCalled();
    expect(lfoEngine.setLfoDepth).not.toHaveBeenCalled();
    expect(lfoEngine.connectLfoTarget).not.toHaveBeenCalled();
    expect(lfoEngine.start).not.toHaveBeenCalled();
  });

  it('follows setCurrentAttenuationStyleId — switching the active Attenuation Style reseeds globalLfo automatically', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { useAttenuationStyleStore, DEFAULT_PELAGOS } = await import('./attenuationStyleStore');

    const before = useAudioStore.getState().globalLfo;
    useAttenuationStyleStore.getState().addAttenuationStyle({ ...DEFAULT_PELAGOS, id: 'zenith-lfo', name: 'ZenithLfo' });
    useAttenuationStyleStore.getState().setCurrentAttenuationStyleId('zenith-lfo');

    expect(useAudioStore.getState().globalLfo).not.toEqual(before);
  });
});

describe('useAudioStore - audioSwellsEnabled / setAudioSwellsEnabled', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('defaults to true', async () => {
    const { useAudioStore } = await import('./audioStore');
    expect(useAudioStore.getState().audioSwellsEnabled).toBe(true);
  });

  it('setAudioSwellsEnabled updates the store directly — a plain toggle, no AudioEngine call', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { AudioEngine } = await import('../engine/AudioEngine');
    // The AudioEngine mock is shared module-wide and other describe blocks in
    // this file leave calls on it — compare counts before/after this action
    // rather than asserting "never called at all".
    const bypassCallsBefore = vi.mocked(AudioEngine.setGlobalBypass).mock.calls.length;
    const effectBypassCallsBefore = vi.mocked(AudioEngine.setEffectBypass).mock.calls.length;

    useAudioStore.getState().setAudioSwellsEnabled(false);
    expect(useAudioStore.getState().audioSwellsEnabled).toBe(false);

    useAudioStore.getState().setAudioSwellsEnabled(true);
    expect(useAudioStore.getState().audioSwellsEnabled).toBe(true);

    // Unlike setGlobalBypassEnabled, this is a pure UI preference — it
    // never reaches into AudioEngine itself; audioSwells.ts reads the flag
    // directly each tick instead.
    expect(vi.mocked(AudioEngine.setGlobalBypass).mock.calls.length).toBe(bypassCallsBefore);
    expect(vi.mocked(AudioEngine.setEffectBypass).mock.calls.length).toBe(effectBypassCallsBefore);
  });
});
