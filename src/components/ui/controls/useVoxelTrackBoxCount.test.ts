import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useVoxelTrackBoxCount } from './useVoxelTrackBoxCount';
import { VOXEL_TRACK_MIN_BOX_COUNT, computeFittedBoxCount } from '@/utils/voxelTrackMath';

/**
 * Controllable ResizeObserver mock, mirroring
 * useAutoSliderOrientation.test.ts's own MockResizeObserver exactly —
 * captures its callback, records observed targets, and can be fired
 * manually with a fake contentRect.
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

  /** Manually invoke the captured callback with a fake contentRect. */
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
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 40, 10));
    expect(result.current).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
  });

  it("'horizontal': observes the ref's own element directly, never its parent — the element's width is externally determined (a plain block box) and never inflated by its own oversized content (overflow-x: auto contains that), so self-observation carries none of the circularity risk 'auto' orientation has", () => {
    const parent = document.createElement('div');
    const ref = makeRef(parent);
    renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 40, 10));

    expect(MockResizeObserver.instances).toHaveLength(1);
    const observer = MockResizeObserver.instances[0];
    expect(observer.observedTargets).toEqual([ref.current]);
    expect(observer.observedTargets).not.toContain(parent);
  });

  it("'vertical': observes the ref's parent element, never the ref's own element — display: inline-flex there DOES shrink-wrap height to content by default, so self-observation would be genuinely circular the way 'auto' orientation's own convention already warns about", () => {
    const parent = document.createElement('div');
    const ref = makeRef(parent);
    renderHook(() => useVoxelTrackBoxCount(ref, 'vertical', 40, 10));

    expect(MockResizeObserver.instances).toHaveLength(1);
    const observer = MockResizeObserver.instances[0];
    expect(observer.observedTargets).toEqual([parent]);
    expect(observer.observedTargets).not.toContain(ref.current);
  });

  it("reads width from its own measured size when axis is 'horizontal'", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 40, 10));
    const observer = MockResizeObserver.instances[0];

    // width=240 fits exactly 5 boxes; height=999 must be ignored.
    act(() => observer.fire(240, 999));
    expect(result.current).toBe(computeFittedBoxCount(240, 40, 10));
    expect(result.current).toBe(5);
  });

  it("reads height from the parent's measured size when axis is 'vertical'", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'vertical', 40, 10));
    const observer = MockResizeObserver.instances[0];

    // height=190 fits exactly 4 boxes; width=999 must be ignored.
    act(() => observer.fire(999, 190));
    expect(result.current).toBe(computeFittedBoxCount(190, 40, 10));
    expect(result.current).toBe(4);
  });

  it('re-computes when the observer fires a new size, not just on mount', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 40, 10));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(240, 0));
    expect(result.current).toBe(5);

    act(() => observer.fire(1000, 0));
    expect(result.current).toBe(20);
  });

  it('constructs no ResizeObserver at all when explicitAvailableLength is provided', () => {
    const ref = makeRef(document.createElement('div'));
    renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 40, 10, 240));
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it('fits directly against explicitAvailableLength, skipping live measurement entirely', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 40, 10, 240));
    expect(result.current).toBe(computeFittedBoxCount(240, 40, 10));
    expect(result.current).toBe(5);
  });

  it("'vertical': resolves to the 3-box minimum without throwing when no parent element exists", () => {
    const ref = makeRef(null);
    expect(() => {
      renderHook(() => useVoxelTrackBoxCount(ref, 'vertical', 40, 10));
    }).not.toThrow();
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'vertical', 40, 10));
    expect(result.current).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it("'horizontal': resolves to the 3-box minimum without throwing when ref.current itself is null", () => {
    const ref = { current: null as HTMLElement | null };
    expect(() => {
      renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 40, 10));
    }).not.toThrow();
    const { result } = renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 40, 10));
    expect(result.current).toBe(VOXEL_TRACK_MIN_BOX_COUNT);
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it("'horizontal': still observes and fits correctly even when the ref DOES have a parent — a parent's presence is irrelevant to the horizontal case now", () => {
    const ref = makeRef(document.createElement('div'));
    renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 40, 10));
    expect(MockResizeObserver.instances).toHaveLength(1);
    expect(MockResizeObserver.instances[0].observedTargets).toEqual([ref.current]);
  });

  it('disconnects the observer on unmount', () => {
    const ref = makeRef(document.createElement('div'));
    const { unmount } = renderHook(() => useVoxelTrackBoxCount(ref, 'horizontal', 40, 10));
    const observer = MockResizeObserver.instances[0];

    expect(observer.disconnected).toBe(false);
    unmount();
    expect(observer.disconnected).toBe(true);
  });
});
