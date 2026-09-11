import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useHeaderRowFit, MIN_VOLUME_RESERVE_PX } from './useHeaderRowFit';

/** Controllable ResizeObserver mock, mirroring
 *  useVoxelTrackBoxCount.test.ts's own MockResizeObserver exactly. */
class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observedTargets: Element[] = [];
  disconnected = false;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observedTargets.push(target);
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true;
  }

  fire(width: number) {
    this.callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

function makeRef(el: HTMLElement | null) {
  return { current: el };
}

let originalResizeObserver: typeof ResizeObserver;

beforeEach(() => {
  MockResizeObserver.instances = [];
  originalResizeObserver = globalThis.ResizeObserver;
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;
});

afterEach(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = originalResizeObserver;
});

describe('useHeaderRowFit', () => {
  // 3 buttons at 44px + 2 gaps at 8px = 132 + 16 = 148. Plus MIN_VOLUME_RESERVE_PX.
  const BUTTON_COUNT = 3;
  const BOX_SIZE = 44;
  const GAP = 8;
  const BUTTONS_ROW_MIN_WIDTH = BUTTON_COUNT * BOX_SIZE + (BUTTON_COUNT - 1) * GAP; // 148
  const THRESHOLD = BUTTONS_ROW_MIN_WIDTH + MIN_VOLUME_RESERVE_PX;

  it('returns false before any ResizeObserver callback fires', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useHeaderRowFit(ref, BUTTON_COUNT, BOX_SIZE, GAP));
    expect(result.current).toBe(false);
  });

  it('observes the ref\'s own element', () => {
    const el = document.createElement('div');
    const ref = makeRef(el);
    renderHook(() => useHeaderRowFit(ref, BUTTON_COUNT, BOX_SIZE, GAP));

    expect(MockResizeObserver.instances).toHaveLength(1);
    expect(MockResizeObserver.instances[0].observedTargets).toEqual([el]);
  });

  it('returns false just below the fit threshold', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useHeaderRowFit(ref, BUTTON_COUNT, BOX_SIZE, GAP));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(THRESHOLD - 1));
    expect(result.current).toBe(false);
  });

  it('returns true exactly at the fit threshold', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useHeaderRowFit(ref, BUTTON_COUNT, BOX_SIZE, GAP));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(THRESHOLD));
    expect(result.current).toBe(true);
  });

  it('returns true well above the fit threshold', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useHeaderRowFit(ref, BUTTON_COUNT, BOX_SIZE, GAP));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(THRESHOLD + 200));
    expect(result.current).toBe(true);
  });

  it('re-computes when the observer fires a new size, not just on mount', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useHeaderRowFit(ref, BUTTON_COUNT, BOX_SIZE, GAP));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(THRESHOLD + 200));
    expect(result.current).toBe(true);

    act(() => observer.fire(0));
    expect(result.current).toBe(false);
  });

  it('resolves to false without throwing when ref.current is null', () => {
    const ref = makeRef(null);
    expect(() => {
      renderHook(() => useHeaderRowFit(ref, BUTTON_COUNT, BOX_SIZE, GAP));
    }).not.toThrow();
    const { result } = renderHook(() => useHeaderRowFit(ref, BUTTON_COUNT, BOX_SIZE, GAP));
    expect(result.current).toBe(false);
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it('disconnects the observer on unmount', () => {
    const ref = makeRef(document.createElement('div'));
    const { unmount } = renderHook(() => useHeaderRowFit(ref, BUTTON_COUNT, BOX_SIZE, GAP));
    const observer = MockResizeObserver.instances[0];

    expect(observer.disconnected).toBe(false);
    unmount();
    expect(observer.disconnected).toBe(true);
  });

  it('a larger buttonCount raises the threshold (4 buttons need more width than 3 at the same box/gap size)', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useHeaderRowFit(ref, 4, BOX_SIZE, GAP));
    const observer = MockResizeObserver.instances[0];

    // Width that fit 3 buttons + reserve is no longer enough for 4.
    act(() => observer.fire(THRESHOLD));
    expect(result.current).toBe(false);
  });
});
