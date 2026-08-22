import { describe, it, expect, beforeEach, vi } from 'vitest';

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
