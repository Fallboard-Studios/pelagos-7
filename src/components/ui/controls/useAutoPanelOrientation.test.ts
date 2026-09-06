import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useAutoPanelOrientation, AUTO_PANEL_ROW_MIN_WIDTH } from './useAutoPanelOrientation';
import type { PanelOrientation } from '@/types/controls';

/**
 * Controllable ResizeObserver mock — same shape as useAutoSliderOrientation.test.ts's own,
 * overriding the repo's no-op polyfill (vitest.setup.ts) for the duration of each test here.
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

/** A detached child element, optionally appended under a parent — a plain ref object is enough,
 *  no React-rendered tree needed since the hook only reads ref.current/ref.current.parentElement. */
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

describe('useAutoPanelOrientation', () => {
  it("resolves 'row' to 'row' and constructs no ResizeObserver", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useAutoPanelOrientation(ref, 'row'));
    expect(result.current).toBe('row');
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it("resolves 'column' to 'column' and constructs no ResizeObserver", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useAutoPanelOrientation(ref, 'column'));
    expect(result.current).toBe('column');
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it("'auto' resolves to 'column' before any measurement — the narrower, safer fallback", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useAutoPanelOrientation(ref, 'auto'));
    expect(result.current).toBe('column');
  });

  it("'auto' observes the parent element, not the ref's own element", () => {
    const parent = document.createElement('div');
    const ref = makeRef(parent);
    renderHook(() => useAutoPanelOrientation(ref, 'auto'));

    expect(MockResizeObserver.instances).toHaveLength(1);
    const observer = MockResizeObserver.instances[0];
    expect(observer.observedTargets).toEqual([parent]);
    expect(observer.observedTargets).not.toContain(ref.current);
  });

  it(`'auto' resolves to 'row' once the measured parent is at least ${AUTO_PANEL_ROW_MIN_WIDTH}px wide`, () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useAutoPanelOrientation(ref, 'auto'));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(AUTO_PANEL_ROW_MIN_WIDTH, 200));
    expect(result.current).toBe('row');
  });

  it("'auto' resolves to 'column' when the measured parent is narrower than the threshold", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useAutoPanelOrientation(ref, 'auto'));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(AUTO_PANEL_ROW_MIN_WIDTH - 1, 200));
    expect(result.current).toBe('column');
  });

  it("'auto' resolves back to 'column' when a later measurement narrows below the threshold", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useAutoPanelOrientation(ref, 'auto'));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(1000, 200));
    expect(result.current).toBe('row');

    act(() => observer.fire(300, 200));
    expect(result.current).toBe('column');
  });

  it("'auto' with no parent element resolves to 'column' without throwing", () => {
    const ref = makeRef(null);
    expect(() => {
      renderHook(() => useAutoPanelOrientation(ref, 'auto'));
    }).not.toThrow();
    const { result } = renderHook(() => useAutoPanelOrientation(ref, 'auto'));
    expect(result.current).toBe('column');
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it('disconnects the observer on unmount', () => {
    const ref = makeRef(document.createElement('div'));
    const { unmount } = renderHook(() => useAutoPanelOrientation(ref, 'auto'));
    const observer = MockResizeObserver.instances[0];

    expect(observer.disconnected).toBe(false);
    unmount();
    expect(observer.disconnected).toBe(true);
  });

  it("switching from 'auto' to a fixed orientation on re-render disconnects the observer and resolves to the fixed value", () => {
    const ref = makeRef(document.createElement('div'));
    const { result, rerender } = renderHook(
      ({ orientation }: { orientation: PanelOrientation }) => useAutoPanelOrientation(ref, orientation),
      { initialProps: { orientation: 'auto' as PanelOrientation } },
    );
    const observer = MockResizeObserver.instances[0];
    expect(observer.disconnected).toBe(false);

    rerender({ orientation: 'row' });
    expect(result.current).toBe('row');
    expect(observer.disconnected).toBe(true);
  });
});
