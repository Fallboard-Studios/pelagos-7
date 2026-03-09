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

let initBeatClock: () => void;
let getCurrentBeat: () => number;
let getCurrentMeasure: () => number;
let getCurrentHour: () => number;
let scheduleAtBeat: (beat: number, cb: () => void) => string;
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
      scheduleAtBeat,
      scheduleRepeat,
      cancelSchedule,
    } = await import('./beatClock'));
  });

  it('initializes once and tracks beat/measure from transport position', () => {
    initBeatClock();
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

  it('returns stub id for scheduleAtBeat', () => {
    const id = scheduleAtBeat(4, () => undefined);
    expect(id).toBe('stub-id');
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
});
