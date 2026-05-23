import { beforeEach, describe, expect, it, vi } from 'vitest';

const callbacks: Array<() => void> = [];

const mockTransport = {
  position: '0:0:0',
  scheduleRepeat: vi.fn<(cb: () => void, interval: string) => string>((cb) => {
    callbacks.push(cb);
    return 'repeat-id';
  }),
  clear: vi.fn<(id: unknown) => void>(),
};

vi.mock('tone', () => ({
  getTransport: () => mockTransport,
}));

let initBeatClock: (transport?: typeof mockTransport) => void;
let getCurrentBeat: () => number;
let getCurrentMeasure: () => number;
let getCurrentHour: () => number;
let parseTransportPosition: (rawPosition: unknown) => { measure: number; beat: number; sixteenths: number };
let subscribeToMeasure: (cb: (m: number) => void) => () => void;
let resetBeatClock: () => void;
let scheduleRepeat: (interval: string, callback: () => void) => string;
let cancelSchedule: (scheduleId: string) => void;

describe('beatClock', () => {
  beforeEach(async () => {
    callbacks.length = 0;
    mockTransport.position = '0:0:0';
    mockTransport.scheduleRepeat.mockClear();
    mockTransport.clear.mockClear();
    vi.resetModules();
    ({
      initBeatClock,
      getCurrentBeat,
      getCurrentMeasure,
      getCurrentHour,
      parseTransportPosition,
      subscribeToMeasure,
      resetBeatClock,
      scheduleRepeat,
      cancelSchedule,
    } = await import('./beatClock'));
    // Initialize the beatClock with the mocked transport for tests
    initBeatClock(mockTransport);
  });

  it('initializes once and tracks beat/measure from transport position', () => {
    initBeatClock(mockTransport);
    expect(mockTransport.scheduleRepeat).toHaveBeenCalledTimes(1);
    mockTransport.position = '2:1:2';
    callbacks[0]?.();
    expect(getCurrentMeasure()).toBe(2);
    expect(getCurrentBeat()).toBeCloseTo(9.5);
    expect(getCurrentHour()).toBe(0);
  });

  it('does not register duplicate schedules when called twice', () => {
    initBeatClock();
    initBeatClock();
    expect(mockTransport.scheduleRepeat).toHaveBeenCalledTimes(1);
  });

  describe('parseTransportPosition', () => {
    it('parses standard transport position strings', () => {
      expect(parseTransportPosition('2:1:2')).toEqual({ measure: 2, beat: 1, sixteenths: 2 });
    });

    it('returns zeros for empty or invalid inputs', () => {
      expect(parseTransportPosition('')).toEqual({ measure: 0, beat: 0, sixteenths: 0 });
      expect(parseTransportPosition(undefined)).toEqual({ measure: 0, beat: 0, sixteenths: 0 });
    });

    it('parses numeric input by treating it as measure only', () => {
      expect(parseTransportPosition(42)).toEqual({ measure: 42, beat: 0, sixteenths: 0 });
    });
  });

  it('scheduleRepeat registers with transport and returns a schedule id', () => {
    const cb = vi.fn();
    const id = scheduleRepeat('4m', cb);
    expect(id).toMatch(/^schedule-/);
    expect(mockTransport.scheduleRepeat).toHaveBeenCalledWith(expect.any(Function), '4m', '4m');
  });

  it('cancelSchedule calls transport.clear and removes the entry', () => {
    const cb = vi.fn();
    const id = scheduleRepeat('4m', cb);
    cancelSchedule(id);
    expect(mockTransport.clear).toHaveBeenCalledWith(expect.anything());
  });

  it('cancelSchedule does nothing for an unknown id', () => {
    cancelSchedule('unknown-id');
    expect(mockTransport.clear).not.toHaveBeenCalled();
  });

  it('promotes pending schedules registered before init', () => {
    // Use resetBeatClock to simulate the pre-init state within the describe scope
    resetBeatClock();
    mockTransport.scheduleRepeat.mockClear();
    callbacks.length = 0;

    const cb = vi.fn();
    scheduleRepeat('4m', cb);
    // No transport yet — must NOT have called mockTransport.scheduleRepeat
    expect(mockTransport.scheduleRepeat).not.toHaveBeenCalled();

    // Init: should register 16n tick (1) + promote pending '4m' (1) = 2 calls
    initBeatClock(mockTransport);
    expect(mockTransport.scheduleRepeat).toHaveBeenCalledTimes(2);
    expect(mockTransport.scheduleRepeat).toHaveBeenCalledWith(expect.any(Function), '4m', '4m');
  });

  describe('resetBeatClock', () => {
    it('zeroes counters after reset', () => {
      mockTransport.position = '4:2:0';
      callbacks[0]?.();
      expect(getCurrentMeasure()).toBe(4);
      resetBeatClock();
      expect(getCurrentMeasure()).toBe(0);
      expect(getCurrentBeat()).toBe(0);
      expect(getCurrentHour()).toBe(0);
    });

    it('calls transport.clear with the internal tick id on reset', () => {
      mockTransport.clear.mockClear();
      resetBeatClock();
      expect(mockTransport.clear).toHaveBeenCalledWith('repeat-id');
    });

    it('clears measure listeners so they no longer fire after re-init', () => {
      const listener = vi.fn();
      subscribeToMeasure(listener);
      resetBeatClock();
      initBeatClock(mockTransport);
      mockTransport.position = '1:0:0';
      callbacks[callbacks.length - 1]?.();
      expect(listener).not.toHaveBeenCalled();
    });

    it('allows re-initialization to register a new tick', () => {
      resetBeatClock();
      mockTransport.scheduleRepeat.mockClear();
      callbacks.length = 0;
      initBeatClock(mockTransport);
      expect(mockTransport.scheduleRepeat).toHaveBeenCalledTimes(1);
    });
  });
});
