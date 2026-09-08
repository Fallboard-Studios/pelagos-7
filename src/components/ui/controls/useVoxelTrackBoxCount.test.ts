import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useVoxelTrackBoxCount } from './useVoxelTrackBoxCount';
import { VOXEL_TRACK_MIN_BOX_COUNT } from '@/utils/voxelTrackMath';

/**
 * Controllable ResizeObserver mock, mirroring useAutoSliderOrientation.test.ts's
 * own local class exactly.
 */
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

  fire(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

/** A detached child element, optionally appended under a parent — mirrors
 *  useAutoSliderOrientation.test.ts's own makeRef helper. */
function makeRef(parent: HTMLElement | null) {
  const el = document.createElement('div');
  if (parent) parent.appendChild(el);
  return { current: el as HTMLElement | null };
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

describe('useVoxelTrackBoxCount', () => {
  it('returns VOXEL_TRACK_MIN_BOX_COUNT before any ResizeObserver callback fires', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 32, 8));
    expect(result.current).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
  });

  it("observes the ref's parent element, never the ref's own element", () => {
    const parent = document.createElement('div');
    const ref = makeRef(parent);
    renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 32, 8));

    expect(MockResizeObserver.instances).toHaveLength(1);
    const observer = MockResizeObserver.instances[0];
    expect(observer.observedTargets).toEqual([parent]);
    expect(observer.observedTargets).not.toContain(ref.current);
  });

  it("axis 'horizontal' reads width from the fired entry", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 32, 8));
    const observer = MockResizeObserver.instances[0];

    // width=192 fits exactly 5 boxes of 32px/8px gap; height is deliberately
    // different (would fit a different count) to prove width, not height, is read.
    act(() => observer.fire(192, 500));
    expect(result.current).toBe(5);
  });

  it("axis 'vertical' reads height from the fired entry", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'vertical', 32, 8));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(500, 192));
    expect(result.current).toBe(5);
  });

  it('re-computes when the observer fires a new size, not just on mount', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 32, 8));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(192, 100));
    expect(result.current).toBe(5);

    act(() => observer.fire(392, 100));
    expect(result.current).toBe(10);
  });

  it('explicitAvailableLength provided: constructs no ResizeObserver at all', () => {
    const ref = makeRef(document.createElement('div'));
    renderHook(() => useVoxelTrackBoxCount(ref, 'vertical', 32, 8, 150));
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it('explicitAvailableLength provided: the returned count is computed directly from that number', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'vertical', 32, 8, 192));
    expect(result.current).toBe(5);
  });
});
