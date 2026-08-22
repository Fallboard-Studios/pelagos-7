import { describe, it, expect, beforeEach, vi } from 'vitest';

import { GLOBAL_LFO_TARGET_IDS } from '../types/lfo';

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
    setGlobalChorus: vi.fn(),
    setGlobalDelay: vi.fn(),
    setGlobalReverb: vi.fn(),
    setEffectBypass: vi.fn(),
    setGlobalBypass: vi.fn(),
  },
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

  it('seeds globalAudio for the current planet on module load (app init)', async () => {
    // Importing the store is the trigger under test — its module-scope sync
    // runs at import time, before any explicit action is called.
    await import('./audioStore');
    const { AudioEngine } = await import('../engine/AudioEngine');

    expect(AudioEngine.setGlobalReverb).toHaveBeenCalled();
    expect(AudioEngine.setGlobalCompressor).toHaveBeenCalled();
  });

  it('forces every effect enabled, regardless of the seeded generator output', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { globalAudio } = useAudioStore.getState();

    expect(globalAudio.compressor.enabled).toBe(true);
    expect(globalAudio.eq3.enabled).toBe(true);
    expect(globalAudio.filterLPF.enabled).toBe(true);
    expect(globalAudio.filterHPF.enabled).toBe(true);
    expect(globalAudio.chorus.enabled).toBe(true);
    expect(globalAudio.delay.enabled).toBe(true);
    expect(globalAudio.reverb.enabled).toBe(true);
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
    expect(AudioEngine.setGlobalChorus).toHaveBeenCalledWith(globalAudio.chorus);
    expect(AudioEngine.setGlobalDelay).toHaveBeenCalledWith(globalAudio.delay);
    expect(AudioEngine.setGlobalReverb).toHaveBeenCalledWith(globalAudio.reverb);
  });

  it('calls AudioEngine.setEffectBypass(effect, true) for all 7 effects', async () => {
    const { useAudioStore } = await import('./audioStore');
    void useAudioStore.getState(); // ensure the store (and its init sync) has run
    const { AudioEngine } = await import('../engine/AudioEngine');

    for (const effect of ['reverb', 'delay', 'chorus', 'eq3', 'lpf', 'hpf', 'compressor']) {
      expect(AudioEngine.setEffectBypass).toHaveBeenCalledWith(effect, true);
    }
  });

  it('is deterministic — calling it twice with the same planet produces the same globalAudio', async () => {
    const { useAudioStore } = await import('./audioStore');
    const first = useAudioStore.getState().globalAudio;
    useAudioStore.getState().regenerateGlobalAudioFromSeed('pelagos', 'Pelagos');
    const second = useAudioStore.getState().globalAudio;
    expect(second).toEqual(first);
  });

  it('produces different globalAudio for a different planet', async () => {
    const { useAudioStore } = await import('./audioStore');
    const pelagos = useAudioStore.getState().globalAudio;
    useAudioStore.getState().regenerateGlobalAudioFromSeed('a-different-planet-id', 'Zenith');
    const other = useAudioStore.getState().globalAudio;
    expect(other).not.toEqual(pelagos);
  });

  it('follows setCurrentPlanetId — switching the active planet reseeds globalAudio automatically', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { usePlanetStore, DEFAULT_PELAGOS } = await import('./planetStore');
    const { AudioEngine } = await import('../engine/AudioEngine');

    const before = useAudioStore.getState().globalAudio;
    usePlanetStore.getState().addPlanet({ ...DEFAULT_PELAGOS, id: 'zenith', name: 'Zenith' });
    vi.clearAllMocks();

    usePlanetStore.getState().setCurrentPlanetId('zenith');

    expect(useAudioStore.getState().globalAudio).not.toEqual(before);
    expect(AudioEngine.setGlobalReverb).toHaveBeenCalled();
  });

  it('does not throw and leaves globalAudio unchanged when currentPlanetId matches no planet', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { usePlanetStore } = await import('./planetStore');
    const before = useAudioStore.getState().globalAudio;

    expect(() => usePlanetStore.getState().setCurrentPlanetId('does-not-exist')).not.toThrow();
    expect(useAudioStore.getState().globalAudio).toEqual(before);
  });

  it('does not redundantly recompute when currentPlanetId is set to its current value', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { usePlanetStore } = await import('./planetStore');
    const { AudioEngine } = await import('../engine/AudioEngine');

    void useAudioStore.getState();
    vi.clearAllMocks();
    usePlanetStore.getState().setCurrentPlanetId(usePlanetStore.getState().currentPlanetId);

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

    useAudioStore.getState().setGlobalAudio('chorus', { rate: 2 });
    expect(AudioEngine.setGlobalChorus).toHaveBeenCalledWith({ rate: 2 });

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

    useAudioStore.getState().setGlobalLfo('delay.delayTime', { shape: 'sine', rate: 1, depth: 20, active: true });

    expect(lfoEngine.connectLfoTarget).toHaveBeenCalledWith('delay.delayTime');
    expect(lfoEngine.start).toHaveBeenCalledWith('delay.delayTime');
    expect(lfoEngine.disconnectLfoTarget).not.toHaveBeenCalled();
    expect(lfoEngine.stop).not.toHaveBeenCalled();
  });

  it('does not call start when active is true but connect fails', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');
    vi.clearAllMocks();
    vi.mocked(lfoEngine.connectLfoTarget).mockReturnValue(false);

    useAudioStore.getState().setGlobalLfo('chorus.delayTime', { shape: 'sine', rate: 1, depth: 20, active: true });

    expect(lfoEngine.connectLfoTarget).toHaveBeenCalledWith('chorus.delayTime');
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

describe('useAudioStore - globalLfo planet-sync seeding', () => {
  beforeEach(() => {
    vi.resetModules();
    // The lfoEngine mock's call history persists across vi.resetModules() (same
    // established quirk documented in LFO_INTEGRATION_PLAN.md's Task 11 notes for
    // the Tone mock) — clear it so each test only sees its own fresh import's calls.
    vi.clearAllMocks();
  });

  it('seeds globalLfo for the current planet on module load (app init)', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { globalLfo } = useAudioStore.getState();
    // Seeded, not left at the DEFAULT_LFO_SETTINGS-inert values (rate would be
    // pinned to LFO_RATE_MIN and depth to LFO_DEPTH_MIN for every target if
    // seeding hadn't run) — at least one target should differ from the inert default.
    const rates = GLOBAL_LFO_TARGET_IDS.map((t) => globalLfo[t].rate);
    expect(new Set(rates).size).toBeGreaterThan(1);
  });

  it('calls setLfoShape/setLfoRate/setLfoDepth for every target on seed', async () => {
    await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');

    for (const target of GLOBAL_LFO_TARGET_IDS) {
      expect(lfoEngine.setLfoShape).toHaveBeenCalledWith(target, expect.any(String));
      expect(lfoEngine.setLfoRate).toHaveBeenCalledWith(target, expect.any(Number));
      expect(lfoEngine.setLfoDepth).toHaveBeenCalledWith(target, expect.any(Number));
    }
  });

  it('calls connectLfoTarget only for targets seeded active: true, and never calls start', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { lfoEngine } = await import('../engine/lfoEngine');
    const { globalLfo } = useAudioStore.getState();

    for (const target of GLOBAL_LFO_TARGET_IDS) {
      if (globalLfo[target].active) {
        expect(lfoEngine.connectLfoTarget).toHaveBeenCalledWith(target);
      } else {
        expect(lfoEngine.connectLfoTarget).not.toHaveBeenCalledWith(target);
      }
    }
    expect(lfoEngine.start).not.toHaveBeenCalled();
  });

  it('follows setCurrentPlanetId — switching the active planet reseeds globalLfo automatically', async () => {
    const { useAudioStore } = await import('./audioStore');
    const { usePlanetStore, DEFAULT_PELAGOS } = await import('./planetStore');

    const before = useAudioStore.getState().globalLfo;
    usePlanetStore.getState().addPlanet({ ...DEFAULT_PELAGOS, id: 'zenith-lfo', name: 'ZenithLfo' });
    usePlanetStore.getState().setCurrentPlanetId('zenith-lfo');

    expect(useAudioStore.getState().globalLfo).not.toEqual(before);
  });
});
