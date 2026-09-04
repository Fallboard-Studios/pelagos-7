import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useAutoSliderOrientation } from './useAutoSliderOrientation';
import type { SliderOrientation } from '@/types/controls';

/**
 * Controllable ResizeObserver mock — captures its callback so tests can fire
 * it manually with a fake contentRect, and records observe()/disconnect()
 * calls for assertion. Overrides the repo's own no-op polyfill
 * (vitest.setup.ts, added for Radix's internal useSize hook) for the
 * duration of each test in this file.
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

/** A detached child element, optionally appended under a parent — a plain
 *  ref object is enough, no React-rendered tree needed since the hook only
 *  reads `ref.current`/`ref.current.parentElement`. */
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

describe('useAutoSliderOrientation', () => {
  it("resolves 'horizontal' to 'horizontal' and constructs no ResizeObserver", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useAutoSliderOrientation(ref, 'horizontal'));
    expect(result.current).toBe('horizontal');
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it("resolves 'vertical' to 'vertical' and constructs no ResizeObserver", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useAutoSliderOrientation(ref, 'vertical'));
    expect(result.current).toBe('vertical');
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it("'auto' resolves to 'horizontal' before any measurement", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useAutoSliderOrientation(ref, 'auto'));
    expect(result.current).toBe('horizontal');
  });

  it("'auto' observes the parent element, not the ref's own element", () => {
    const parent = document.createElement('div');
    const ref = makeRef(parent);
    renderHook(() => useAutoSliderOrientation(ref, 'auto'));

    expect(MockResizeObserver.instances).toHaveLength(1);
    const observer = MockResizeObserver.instances[0];
    expect(observer.observedTargets).toEqual([parent]);
    expect(observer.observedTargets).not.toContain(ref.current);
  });

  it("'auto' resolves to 'vertical' when the measured parent is taller than wide", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useAutoSliderOrientation(ref, 'auto'));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(100, 300));
    expect(result.current).toBe('vertical');
  });

  it("'auto' resolves back to 'horizontal' when a later measurement is wider than tall", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useAutoSliderOrientation(ref, 'auto'));
    const observer = MockResizeObserver.instances[0];

    act(() => observer.fire(100, 300));
    expect(result.current).toBe('vertical');

    act(() => observer.fire(300, 100));
    expect(result.current).toBe('horizontal');
  });

  it("'auto' with no parent element resolves to 'horizontal' without throwing", () => {
    const ref = makeRef(null);
    expect(() => {
      renderHook(() => useAutoSliderOrientation(ref, 'auto'));
    }).not.toThrow();
    const { result } = renderHook(() => useAutoSliderOrientation(ref, 'auto'));
    expect(result.current).toBe('horizontal');
    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it('disconnects the observer on unmount', () => {
    const ref = makeRef(document.createElement('div'));
    const { unmount } = renderHook(() => useAutoSliderOrientation(ref, 'auto'));
    const observer = MockResizeObserver.instances[0];

    expect(observer.disconnected).toBe(false);
    unmount();
    expect(observer.disconnected).toBe(true);
  });

  it("switching from 'auto' to a fixed orientation on re-render disconnects the observer and resolves to the fixed value", () => {
    const ref = makeRef(document.createElement('div'));
    const { result, rerender } = renderHook(
      ({ orientation }: { orientation: SliderOrientation }) => useAutoSliderOrientation(ref, orientation),
      { initialProps: { orientation: 'auto' as SliderOrientation } },
    );
    const observer = MockResizeObserver.instances[0];
    expect(observer.disconnected).toBe(false);

    rerender({ orientation: 'vertical' });
    expect(result.current).toBe('vertical');
    expect(observer.disconnected).toBe(true);
  });
});
