import { beforeEach, describe, expect, it, vi } from 'vitest';

let currentHour = 0;

const callbacks: Array<() => void> = [];

const mockTransport = {
  scheduleRepeat: vi.fn<(cb: () => void, interval: string) => string>((cb) => {
    callbacks.push(cb);
    return 'repeat-id';
  }),
  clear: vi.fn<(id: unknown) => void>(),
};

vi.mock('./beatClock', () => ({
  getCurrentHour: () => currentHour,
}));

vi.mock('tone', () => ({
  getTransport: () => mockTransport,
}));

type TestTransport = {
  scheduleRepeat: (cb: () => void, interval: string) => string;
  clear: (id: unknown) => void;
};

let getAvailableNotes: () => string[];
let setAvailableNotes: (notes: [string, string, string, string, string, string, string, string]) => void;
let resetHarmony: () => void;
let scheduleHarmonyCycle: (transport: TestTransport) => void;
let stopHarmonyCycle: () => void;

describe('harmonySystem', () => {
  beforeEach(async () => {
    currentHour = 0;
    callbacks.length = 0;
    mockTransport.scheduleRepeat.mockClear();
    mockTransport.clear.mockClear();
    vi.resetModules();
    ({
      getAvailableNotes,
      setAvailableNotes,
      resetHarmony,
      scheduleHarmonyCycle,
      stopHarmonyCycle,
    } = await import('./harmonySystem'));
  });

  it('returns palette copies and respects manual overrides', () => {
    const original = getAvailableNotes();
    expect(original).toHaveLength(8);
    const custom = ['A1', 'B1', 'C2', 'D2', 'E2', 'F2', 'G2', 'A2'] as const;
    setAvailableNotes([...custom]);
    const updated = getAvailableNotes();
    expect(updated).toEqual(custom);
    updated.push('X');
    expect(getAvailableNotes()).toHaveLength(8);
  });

  it('resetHarmony restores the hour-0 palette', () => {
    setAvailableNotes(['A1', 'B1', 'C2', 'D2', 'E2', 'F2', 'G2', 'A2']);
    expect(getAvailableNotes()[0]).not.toBe('C');

    resetHarmony();
    expect(getAvailableNotes()).toEqual(['C', 'G', 'E', 'D', 'B', 'C', 'E', 'G']);
  });

  it('schedules harmony cycle once and updates when hour changes', () => {
    scheduleHarmonyCycle(mockTransport);
    expect(mockTransport.scheduleRepeat).toHaveBeenCalledTimes(1);
    currentHour = 5;
    callbacks[0]?.();
    expect(getAvailableNotes()[0]).toBe('A');
  });

  it('stops harmony cycle and clears scheduled event', () => {
    scheduleHarmonyCycle(mockTransport);
    stopHarmonyCycle();
    expect(mockTransport.clear).toHaveBeenCalledWith('repeat-id');
    scheduleHarmonyCycle(mockTransport);
    expect(mockTransport.scheduleRepeat).toHaveBeenCalledTimes(2);
  });
});
