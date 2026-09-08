import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

vi.mock('@/animation/timelineMap', () => ({ setTimeline: vi.fn(), killTimeline: vi.fn() }));
vi.mock('@/utils/cabinetGeometry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/cabinetGeometry')>();
  return { ...actual, computeCabinetGeometry: vi.fn(actual.computeCabinetGeometry) };
});

// Local gsap mock (overriding vitest.setup.ts's global noop for this file
// only), capturing every .fromTo() and .set() call so the --cabinet-glow
// tween and the instant-reposition path can both be asserted on directly —
// the global mock doesn't expose call args. Mirrors useLfoTargetGroup.test.ts's
// own local-gsap-mock precedent.
const { fromToMock, setMock } = vi.hoisted(() => ({ fromToMock: vi.fn(), setMock: vi.fn() }));
vi.mock('gsap', () => {
  const chainable = {
    fromTo: (...args: unknown[]) => {
      fromToMock(...args);
      return chainable;
    },
  };
  return { default: { timeline: vi.fn(() => chainable), set: setMock } };
});

import { CabinetBox } from './CabinetBox';
import { setTimeline, killTimeline } from '@/animation/timelineMap';
import { computeCabinetGeometry, CABINET_POP_DISTANCE } from '@/utils/cabinetGeometry';

/**
 * Controllable ResizeObserver mock, mirroring useAutoSliderOrientation.test.ts's
 * own local class exactly — captures its callback so tests can fire it
 * manually with a fake contentRect/borderBoxSize pair (the front face's own
 * padding makes these differ — border-box is what CabinetBox must measure).
 */
class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe() {}
  unobserve() {}
  disconnect() {}

  /** `borderBoxWidth` defaults to `width` (no padding difference) unless a
   *  test explicitly supplies a distinct value. */
  fire(width: number, height: number, borderBoxWidth: number = width) {
    this.callback(
      [{
        contentRect: { width, height },
        borderBoxSize: [{ inlineSize: borderBoxWidth, blockSize: height }],
      } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }

  /** Simulates an environment/mock with no borderBoxSize at all. */
  fireContentRectOnly(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

/** Stubs window.matchMedia for both prefers-reduced-motion and the
 *  cabinet breakpoint queries useCabinetBoxHeight reads internally —
 *  defaults every query to non-matching (desktop tier, motion allowed). */
function stubMatchMedia(prefersReducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') && prefersReducedMotion,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

let originalResizeObserver: typeof ResizeObserver;

beforeEach(() => {
  MockResizeObserver.instances = [];
  originalResizeObserver = globalThis.ResizeObserver;
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;
  stubMatchMedia(false);
});

afterEach(() => {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = originalResizeObserver;
  cleanup();
  vi.clearAllMocks();
});

describe('CabinetBox', () => {
  it('renders children inside the front face', () => {
    render(<CabinetBox popped={false} timelineKey="test-box">Reset Melody</CabinetBox>);
    expect(screen.getByText('Reset Melody')).toBeTruthy();
  });

  it('renders exactly one top-face and one left-face polygon, both inside an aria-hidden svg', () => {
    const { container } = render(<CabinetBox popped={false} timelineKey="test-box">x</CabinetBox>);
    expect(container.querySelectorAll('.sc-cabinet-box__top-face')).toHaveLength(1);
    expect(container.querySelectorAll('.sc-cabinet-box__left-face')).toHaveLength(1);
    const svg = container.querySelector('.sc-cabinet-box__walls');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
  });

  it('registers a GSAP timeline via setTimeline once a non-zero width has been measured', () => {
    render(<CabinetBox popped={true} timelineKey="test-box">x</CabinetBox>);
    expect(setTimeline).not.toHaveBeenCalled();

    const observer = MockResizeObserver.instances[0];
    act(() => observer.fire(100, 48));
    expect(setTimeline).toHaveBeenCalledWith('test-box', expect.anything());
  });

  it('calls killTimeline on unmount', () => {
    const { unmount } = render(<CabinetBox popped={false} timelineKey="test-box">x</CabinetBox>);
    unmount();
    expect(killTimeline).toHaveBeenCalledWith('test-box');
  });

  it('still registers a timeline under prefers-reduced-motion — snapped, not skipped', () => {
    stubMatchMedia(true);
    render(<CabinetBox popped={true} timelineKey="test-box">x</CabinetBox>);
    const observer = MockResizeObserver.instances[0];
    act(() => observer.fire(100, 48));
    expect(setTimeline).toHaveBeenCalled();
  });

  it('re-registers a timeline when popped flips after the initial measurement', () => {
    const { rerender } = render(<CabinetBox popped={false} timelineKey="test-box">x</CabinetBox>);
    const observer = MockResizeObserver.instances[0];
    act(() => observer.fire(100, 48));
    const callsAfterMeasure = (setTimeline as ReturnType<typeof vi.fn>).mock.calls.length;

    rerender(<CabinetBox popped={true} timelineKey="test-box">x</CabinetBox>);
    expect((setTimeline as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(callsAfterMeasure);
  });

  it('measures the front face using its border-box size (padding included), not content-box', () => {
    render(<CabinetBox popped={true} timelineKey="test-box">x</CabinetBox>);
    const observer = MockResizeObserver.instances[0];
    // content-box (no padding) = 100; border-box (padding included) = 128 — a
    // real gap the front face's own `padding: 0 14px` produces (14+14=28px).
    act(() => observer.fire(100, 48, 128));

    const widthsUsed = (computeCabinetGeometry as ReturnType<typeof vi.fn>).mock.calls.map((args) => args[0]);
    expect(widthsUsed).toContain(128);
    expect(widthsUsed).not.toContain(100);
  });

  it('falls back to contentRect.width when borderBoxSize is unavailable', () => {
    render(<CabinetBox popped={true} timelineKey="test-box">x</CabinetBox>);
    const observer = MockResizeObserver.instances[0];
    act(() => observer.fireContentRectOnly(100, 48));

    const widthsUsed = (computeCabinetGeometry as ReturnType<typeof vi.fn>).mock.calls.map((args) => args[0]);
    expect(widthsUsed).toContain(100);
  });

  it('tweens --cabinet-glow from 0 to 1 on the wrapper element (not the front face) when popping in', () => {
    const { container } = render(<CabinetBox popped={true} timelineKey="test-box">x</CabinetBox>);
    const observer = MockResizeObserver.instances[0];
    act(() => observer.fire(100, 48));

    const wrapper = container.querySelector('.sc-cabinet-box');
    const front = container.querySelector('.sc-cabinet-box__front');
    const glowCalls = fromToMock.mock.calls.filter(([target]) => target === wrapper);
    expect(glowCalls).toHaveLength(1);
    const [, fromVars, toVars] = glowCalls[0] as [unknown, Record<string, unknown>, Record<string, unknown>];
    expect(fromVars['--cabinet-glow']).toBe(0);
    expect(toVars['--cabinet-glow']).toBe(1);

    // Never on the front face itself — the glow belongs to the "back".
    const frontCalls = fromToMock.mock.calls.filter(([target]) => target === front);
    expect(frontCalls.every(([, vars]) => !('--cabinet-glow' in (vars as object)))).toBe(true);
  });

  it('tweens --cabinet-glow from 1 to 0 when popping back out', () => {
    const { container, rerender } = render(<CabinetBox popped={true} timelineKey="test-box">x</CabinetBox>);
    const observer = MockResizeObserver.instances[0];
    act(() => observer.fire(100, 48));
    fromToMock.mockClear();

    rerender(<CabinetBox popped={false} timelineKey="test-box">x</CabinetBox>);
    const wrapper = container.querySelector('.sc-cabinet-box');
    const glowCalls = fromToMock.mock.calls.filter(([target]) => target === wrapper);
    expect(glowCalls).toHaveLength(1);
    const [, fromVars, toVars] = glowCalls[0] as [unknown, Record<string, unknown>, Record<string, unknown>];
    expect(fromVars['--cabinet-glow']).toBe(1);
    expect(toVars['--cabinet-glow']).toBe(0);
  });

  it('applies --cabinet-box-height and --cabinet-pop-distance as inline custom properties on the wrapper, computed from JS — CSS no longer duplicates either', () => {
    const { container } = render(<CabinetBox popped={false} timelineKey="test-box">x</CabinetBox>);
    const wrapper = container.querySelector('.sc-cabinet-box') as HTMLElement;
    // stubMatchMedia(false) (beforeEach) never matches a breakpoint query,
    // so useCabinetBoxHeight resolves desktop (48) — same assumption every
    // other test in this file already makes (fire(100, 48), etc.).
    expect(wrapper.style.getPropertyValue('--cabinet-box-height')).toBe('48px');
    expect(wrapper.style.getPropertyValue('--cabinet-pop-distance')).toBe(`${CABINET_POP_DISTANCE}px`);
  });

  it('does not replay the pop/flat animation when only the measured width changes while popped stays the same — repositions instantly instead', () => {
    render(<CabinetBox popped={true} timelineKey="test-box">x</CabinetBox>);
    const observer = MockResizeObserver.instances[0];
    act(() => observer.fire(100, 48)); // initial measurement — a real popped transition, animates
    expect(fromToMock).toHaveBeenCalled();

    fromToMock.mockClear();
    setMock.mockClear();
    (setTimeline as ReturnType<typeof vi.fn>).mockClear();

    // A breakpoint-crossing resize (or any width change) while `popped`
    // hasn't changed — must NOT re-run the flat↔full tween (that would
    // visibly flatten and re-pop an already-popped box for no reason).
    act(() => observer.fire(120, 48));

    expect(fromToMock).not.toHaveBeenCalled();
    expect(setTimeline).not.toHaveBeenCalled();
    expect(setMock).toHaveBeenCalled();
  });

  it('still animates a real transition normally after a width-only reposition has occurred', () => {
    const { rerender } = render(<CabinetBox popped={true} timelineKey="test-box">x</CabinetBox>);
    const observer = MockResizeObserver.instances[0];
    act(() => observer.fire(100, 48));
    act(() => observer.fire(120, 48)); // width-only reposition, no tween
    fromToMock.mockClear();
    (setTimeline as ReturnType<typeof vi.fn>).mockClear();

    rerender(<CabinetBox popped={false} timelineKey="test-box">x</CabinetBox>);

    expect(fromToMock).toHaveBeenCalled();
    expect(setTimeline).toHaveBeenCalled();
  });

  it('renders no content in the front face when children is omitted', () => {
    const { container } = render(<CabinetBox popped={false} timelineKey="test-box" />);
    const front = container.querySelector('.sc-cabinet-box__front');
    expect(front).toBeTruthy();
    expect(front?.textContent).toBe('');
  });

  it('applies a boxHeight override instead of the resolved breakpoint value, when provided', () => {
    // stubMatchMedia(false) (beforeEach) never matches a breakpoint query,
    // so useCabinetBoxHeight would otherwise resolve desktop (48) — the
    // override must win over that resolved value, not merely be accepted.
    const { container } = render(
      <CabinetBox popped={false} timelineKey="test-box" boxHeight={32}>x</CabinetBox>,
    );
    const wrapper = container.querySelector('.sc-cabinet-box') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--cabinet-box-height')).toBe('32px');
  });
});
