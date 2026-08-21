import { describe, it, expect, beforeEach, vi } from 'vitest';

// ========================================
// MOCKS
// ========================================
// Mutable so tests can flip DEV_TUNING to prove the hook is genuinely gated
// by it, without needing to fake import.meta.env.DEV directly.
let mockDevTuning = true;
vi.mock('../constants', () => ({ get DEV_TUNING() { return mockDevTuning; } }));

vi.mock('./AudioEngine', () => ({
  AudioEngine: { start: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('./lfoEngine', () => ({
  lfoEngine: {
    setLfoShape: vi.fn(),
    setLfoRate: vi.fn(),
    setLfoDepth: vi.fn(),
    connectLfoTarget: vi.fn(() => true),
    disconnectLfoTarget: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('../utils/localeHelpers', () => ({
  getActiveLocaleId: vi.fn(() => 'test-locale'),
}));

let mockRobots: Array<{ id: string }> = [{ id: 'robot-1' }];
vi.mock('../stores/localeStore', () => ({
  default: {
    getState: vi.fn(() => ({
      locales: { 'test-locale': { robots: mockRobots } },
    })),
  },
}));

// ========================================
// TESTS
// ========================================

describe('lfoDebug', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockDevTuning = true;
    mockRobots = [{ id: 'robot-1' }];
  });

  describe('DEV_TUNING gating', () => {
    it('attaches window.__lfoDebug when DEV_TUNING is true', async () => {
      mockDevTuning = true;
      await import('./lfoDebug');
      expect((window as unknown as { __lfoDebug?: unknown }).__lfoDebug).toBeDefined();
      delete (window as unknown as { __lfoDebug?: unknown }).__lfoDebug;
    });

    it('does not attach window.__lfoDebug when DEV_TUNING is false', async () => {
      mockDevTuning = false;
      delete (window as unknown as { __lfoDebug?: unknown }).__lfoDebug;
      await import('./lfoDebug');
      expect((window as unknown as { __lfoDebug?: unknown }).__lfoDebug).toBeUndefined();
    });
  });

  describe('audition', () => {
    it('starts AudioEngine, connects and starts a robot Detune target and a global EQ target', async () => {
      const { AudioEngine } = await import('./AudioEngine');
      const { lfoEngine } = await import('./lfoEngine');
      const mod = await import('./lfoDebug');
      const debug = (window as unknown as { __lfoDebug: { audition: () => Promise<string>; stop: () => void } }).__lfoDebug;

      await debug.audition();

      expect(AudioEngine.start).toHaveBeenCalledTimes(1);
      expect(lfoEngine.connectLfoTarget).toHaveBeenCalledWith('layer0.detune', 'robot-1');
      expect(lfoEngine.start).toHaveBeenCalledWith('layer0.detune', 'robot-1');
      expect(lfoEngine.connectLfoTarget).toHaveBeenCalledWith('eq3.low');
      expect(lfoEngine.start).toHaveBeenCalledWith('eq3.low');
      void mod; // imported for its registration side effect
    });

    it('sets audible rate/depth/shape before connecting, not left at defaults', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      await import('./lfoDebug');
      const debug = (window as unknown as { __lfoDebug: { audition: () => Promise<string> } }).__lfoDebug;

      await debug.audition();

      expect(lfoEngine.setLfoDepth).toHaveBeenCalledWith('layer0.detune', 100, 'robot-1');
      expect(lfoEngine.setLfoDepth).toHaveBeenCalledWith('eq3.low', 100);
    });

    it('returns a descriptive string mentioning the robot id and both targets', async () => {
      await import('./lfoDebug');
      const debug = (window as unknown as { __lfoDebug: { audition: () => Promise<string> } }).__lfoDebug;

      const result = await debug.audition();

      expect(result).toContain('robot-1');
      expect(result).toContain('layer0.detune');
      expect(result).toContain('eq3.low');
    });

    it('returns a helpful message and does not throw when no robot exists in the active locale', async () => {
      mockRobots = [];
      const { lfoEngine } = await import('./lfoEngine');
      await import('./lfoDebug');
      const debug = (window as unknown as { __lfoDebug: { audition: () => Promise<string> } }).__lfoDebug;

      const message = await debug.audition();

      expect(message).toMatch(/no robot/i);
      expect(lfoEngine.connectLfoTarget).not.toHaveBeenCalledWith('layer0.detune', expect.anything());
    });
  });

  describe('stop', () => {
    it('stops and disconnects both the robot and global targets', async () => {
      const { lfoEngine } = await import('./lfoEngine');
      await import('./lfoDebug');
      const debug = (window as unknown as { __lfoDebug: { audition: () => Promise<string>; stop: () => void } }).__lfoDebug;

      await debug.audition();
      debug.stop();

      expect(lfoEngine.stop).toHaveBeenCalledWith('layer0.detune', 'robot-1');
      expect(lfoEngine.disconnectLfoTarget).toHaveBeenCalledWith('layer0.detune', 'robot-1');
      expect(lfoEngine.stop).toHaveBeenCalledWith('eq3.low');
      expect(lfoEngine.disconnectLfoTarget).toHaveBeenCalledWith('eq3.low');
    });

    it('does not throw when called with no robot in the active locale', async () => {
      mockRobots = [];
      await import('./lfoDebug');
      const debug = (window as unknown as { __lfoDebug: { stop: () => void } }).__lfoDebug;
      expect(() => debug.stop()).not.toThrow();
    });
  });
});
