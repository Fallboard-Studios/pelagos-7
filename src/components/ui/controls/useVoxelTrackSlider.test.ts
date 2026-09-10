import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useVoxelTrackSlider } from './useVoxelTrackSlider';
import {
  computeFittedBoxCount,
  computeVoxelTrackLength,
  computeVoxelTrackTrailingReserve,
  VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT,
} from '@/utils/voxelTrackMath';

// Desktop-tier box geometry (no window.matchMedia in this jsdom environment
// -> useCabinetBoxHeight()/useVoxelTrackGap() both fall back to 'desktop',
// same assumption SliderLinear.test.tsx/CabinetBox.test.tsx already make).
const BOX_SIZE = 48;
const GAP = 12;

/**
 * Controllable ResizeObserver mock, mirroring useVoxelTrackBoxCount.test.ts's
 * own MockResizeObserver exactly — captures its callback, records observed
 * targets, and can be fired manually with a fake contentRect.
 */
class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  callback: ResizeObserverCallback;
  observedTargets: Element[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observedTargets.push(target);
  }

  unobserve() {}
  disconnect() {}

  fire(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

/** A detached child element, appended under a parent — mirrors
 *  useVoxelTrackBoxCount.test.ts's own makeRef helper. */
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

describe('useVoxelTrackSlider', () => {
  it('returns boxCount: VOXEL_TRACK_MIN_BOX_COUNT before any ResizeObserver callback fires (horizontal)', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackSlider(ref, 'horizontal'));
    const reserve = computeVoxelTrackTrailingReserve('horizontal');
    expect(result.current.boxCount).toBe(computeFittedBoxCount(0 - reserve, BOX_SIZE, GAP));
  });

  it('returns the resolved boxSize/gap for the current (desktop, unmocked matchMedia) tier', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackSlider(ref, 'horizontal'));
    expect(result.current.boxSize).toBe(BOX_SIZE);
    expect(result.current.gap).toBe(GAP);
  });

  it("horizontal: after a fired measurement, rootStyle is exactly { width: trackLength, height: boxSize }, where trackLength matches computeVoxelTrackLength(...) + the horizontal trailing reserve for that measurement", () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackSlider(ref, 'horizontal'));
    const observer = MockResizeObserver.instances[0];
    act(() => observer.fire(500, 0));

    const reserve = computeVoxelTrackTrailingReserve('horizontal');
    const boxCount = computeFittedBoxCount(500 - reserve, BOX_SIZE, GAP);
    const expectedTrackLength = computeVoxelTrackLength(boxCount, BOX_SIZE, GAP) + reserve;

    expect(result.current.boxCount).toBe(boxCount);
    expect(result.current.trackLength).toBe(expectedTrackLength);
    expect(result.current.rootStyle).toEqual({ width: expectedTrackLength, height: BOX_SIZE });
  });

  it('vertical, verticalHeight omitted: fits against the fixed VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT budget synchronously — correct before any ResizeObserver fires, no live measurement attempted', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackSlider(ref, 'vertical'));

    expect(MockResizeObserver.instances).toHaveLength(0);
    const boxCount = computeFittedBoxCount(VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT, BOX_SIZE, GAP);
    const expectedTrackLength = computeVoxelTrackLength(boxCount, BOX_SIZE, GAP);
    expect(result.current.boxCount).toBe(boxCount);
    expect(result.current.trackLength).toBe(expectedTrackLength);
    expect(result.current.rootStyle).toEqual({ height: expectedTrackLength, width: BOX_SIZE });
  });

  it('vertical, verticalHeight supplied and not an exact multiple of (boxSize + gap): trackLength is the box-quantized computeVoxelTrackLength output, not verticalHeight verbatim', () => {
    // 310 is deliberately not a multiple of (48 + 12) = 60.
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackSlider(ref, 'vertical', 310));

    const boxCount = computeFittedBoxCount(310, BOX_SIZE, GAP);
    const expectedTrackLength = computeVoxelTrackLength(boxCount, BOX_SIZE, GAP);
    expect(result.current.trackLength).toBe(expectedTrackLength);
    expect(result.current.trackLength).not.toBe(310);
    expect(result.current.rootStyle).toEqual({ height: expectedTrackLength, width: BOX_SIZE });
  });

  it("horizontal: a container width landing on an exact multiple of (boxSize + gap) still leaves trackLength room for the trailing pop-out reserve beyond the tight box-row length — re-verifies the 11.1.3 §1.13 fix now that this logic lives in the shared hook, not inline in SliderLinear.tsx", () => {
    // 4 boxes of 48px with 3 gaps of 12px is exactly 228px — zero natural
    // slack for computeFittedBoxCount to leave behind.
    const exactFitWidth = 4 * BOX_SIZE + 3 * GAP;
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackSlider(ref, 'horizontal'));
    const observer = MockResizeObserver.instances[0];
    act(() => observer.fire(exactFitWidth, 0));

    const reserve = computeVoxelTrackTrailingReserve('horizontal');
    const tightRowLength = computeVoxelTrackLength(result.current.boxCount, BOX_SIZE, GAP);
    expect(reserve).toBeGreaterThan(0);
    expect(result.current.trackLength).toBe(tightRowLength + reserve);
    expect(tightRowLength + reserve).toBeLessThanOrEqual(exactFitWidth);
  });

  it('returns exactly the VoxelTrackSliderLayout shape — boxSize, gap, boxCount, trackLength, rootStyle, no more, no fewer', () => {
    const ref = makeRef(document.createElement('div'));
    const { result } = renderHook(() => useVoxelTrackSlider(ref, 'horizontal'));
    expect(Object.keys(result.current).sort()).toEqual(
      ['boxCount', 'boxSize', 'gap', 'rootStyle', 'trackLength'].sort(),
    );
  });
});
