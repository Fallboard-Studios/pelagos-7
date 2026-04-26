import { vi } from 'vitest';

// Minimal GSAP mock for unit tests to avoid DOM queries and timing issues.
vi.mock('gsap', () => {
  type TimelineConfig = { onComplete?: () => void } | undefined;
  interface TimelineObj {
    to(target?: unknown, config?: TimelineConfig): TimelineObj;
    fromTo(a?: unknown, b?: unknown, config?: TimelineConfig): TimelineObj;
    call(fn?: () => void): TimelineObj;
    eventCallback(): TimelineObj;
  }

  const noop = (): TimelineObj => {
    const obj = {
      to: (_target?: unknown, config?: TimelineConfig) => {
        if (config && typeof config.onComplete === 'function') {
          Promise.resolve().then(() => config.onComplete && config.onComplete());
        }
        return obj as TimelineObj;
      },
      fromTo: (_a?: unknown, _b?: unknown, config?: TimelineConfig) => {
        if (config && typeof config.onComplete === 'function') {
          Promise.resolve().then(() => config.onComplete && config.onComplete());
        }
        return obj as TimelineObj;
      },
      call: (fn?: () => void) => {
        if (typeof fn === 'function') Promise.resolve().then(() => fn());
        return obj as TimelineObj;
      },
      eventCallback: () => obj as TimelineObj,
    };
    return obj as TimelineObj;
  };
  const mocked = {
    // timeline accepts an optional config; if onComplete provided, call it synchronously
    timeline: (config?: TimelineConfig) => {
      if (config && typeof config.onComplete === 'function') {
        // call on next microtask to emulate async completion
        Promise.resolve().then(() => config.onComplete && config.onComplete());
      }
      return noop();
    },
    set: () => { },
    to: () => { },
    fromTo: () => { },
    utils: { selector: () => () => [] },
  };
  return { default: mocked, ...mocked };
});

// Polyfill ResizeObserver for test environment (Radix use-size expects it).
if ((globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver === undefined) {
  // Minimal no-op ResizeObserver mock sufficient for tests
  class MockResizeObserver {
    observe(_target: Element) {}
    unobserve(_target: Element) {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver?: typeof MockResizeObserver }).ResizeObserver = MockResizeObserver;
}
