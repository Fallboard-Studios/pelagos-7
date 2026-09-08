import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('./VoxelTrack', () => ({
  VoxelTrack: ({
    states,
    boxSize,
    gap,
    axis,
    timelineKeyPrefix,
  }: {
    states: unknown[];
    boxSize: number;
    gap: number;
    axis: string;
    timelineKeyPrefix: string;
  }) => (
    <div
      data-testid="voxel-track"
      data-states={JSON.stringify(states)}
      data-box-size={boxSize}
      data-gap={gap}
      data-axis={axis}
      data-timeline-key-prefix={timelineKeyPrefix}
    />
  ),
}));

import { SliderLinear } from './SliderLinear';
import { computeFittedBoxCount, computeVoxelTrackLength, computeVoxelBoxStates } from '@/utils/voxelTrackMath';
import type { SliderLinearSchema } from '@/types/controls';

const schema: SliderLinearSchema = { id: 'lfoRate', type: 'sliderLinear', min: 0.1, max: 10, humanLabel: 'Oscillation Rate', unit: 'Hz', orientation: 'horizontal' };

// Desktop-tier box geometry (no window.matchMedia in this jsdom environment
// -> useCabinetBoxHeight()/useVoxelTrackGap() both fall back to 'desktop',
// same assumption CabinetBox.test.tsx's own stubMatchMedia(false) makes).
const BOX_SIZE = 48;
const GAP = 12;

/**
 * Controllable ResizeObserver mock, mirroring useAutoSliderOrientation.test.ts/
 * useVoxelTrackBoxCount.test.ts's own convention — captures the callback so a
 * test can fire it manually with a fake contentRect, and records how many
 * observers got constructed.
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

  fire(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
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

describe('SliderLinear', () => {
  it('renders a slider reflecting min/max/value from schema', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('aria-valuemin')).toBe('0.1');
    expect(thumb.getAttribute('aria-valuemax')).toBe('10');
    expect(thumb.getAttribute('aria-valuenow')).toBe('2');
  });

  it('renders {value}{unit} when schema.unit is present', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    expect(screen.getByText('2Hz')).toBeTruthy();
  });

  it('still renders the bare value when schema.unit is absent — a unitless param like Resonance/Q must not be left blank', () => {
    const noUnitSchema: SliderLinearSchema = { id: 'x', type: 'sliderLinear', min: 0, max: 1, orientation: 'horizontal' };
    render(<SliderLinear schema={noUnitSchema} value={0.5} onChange={() => {}} />);
    expect(screen.getByText('0.5')).toBeTruthy();
  });

  it('caps the displayed value at 3 decimal places, hiding floating-point noise — but leaves aria-valuenow at full precision', () => {
    render(<SliderLinear schema={schema} value={4.999999999999999} onChange={() => {}} />);
    expect(screen.getByText('5Hz')).toBeTruthy();
    expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('4.999999999999999');
  });

  it('renders its own schema labels via an internally-composed DualLabel', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    expect(screen.getByText('Oscillation Rate')).toBeTruthy();
  });

  it('falls back to schema.id for the accessible name when neither label is present, never leaving it unlabeled', () => {
    const bareSchema: SliderLinearSchema = { id: 'lfoRate', type: 'sliderLinear', min: 0.1, max: 10, orientation: 'horizontal' };
    render(<SliderLinear schema={bareSchema} value={2} onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: 'lfoRate' })).toBeTruthy();
  });

  it('is not disabled by default — no existing behavior changes', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('data-disabled')).toBeNull();
    expect(thumb.getAttribute('tabindex')).toBe('0');
  });

  it('marks the thumb data-disabled and removes it from tab order when disabled is true', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} disabled />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('data-disabled')).toBe('');
    expect(thumb.getAttribute('tabindex')).toBeNull();
  });

  it('does not call onChange on a disabled slider when a keyboard step is attempted', () => {
    const onChange = vi.fn();
    render(<SliderLinear schema={schema} value={2} onChange={onChange} disabled />);
    const thumb = screen.getByRole('slider');
    thumb.focus();
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("resolves to exactly one role='slider' element — the voxel boxes introduce no accessibility-tree ambiguity", () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    expect(screen.getAllByRole('slider')).toHaveLength(1);
  });

  it('renders VoxelTrack with states matching computeVoxelBoxStates for the currently-fitted box count', () => {
    const valueSchema: SliderLinearSchema = { ...schema, min: 0, max: 100 };
    render(<SliderLinear schema={valueSchema} value={37} onChange={() => {}} />);
    const observer = MockResizeObserver.instances[0];
    act(() => observer.fire(240, 0));

    const voxelTrack = screen.getByTestId('voxel-track');
    const boxCount = computeFittedBoxCount(240, BOX_SIZE, GAP);
    const expectedStates = computeVoxelBoxStates(37, 0, 100, boxCount);
    expect(JSON.parse(voxelTrack.getAttribute('data-states')!)).toEqual(expectedStates);
    expect(voxelTrack.getAttribute('data-box-size')).toBe(String(BOX_SIZE));
    expect(voxelTrack.getAttribute('data-gap')).toBe(String(GAP));
  });

  describe('orientation', () => {
    const verticalSchema: SliderLinearSchema = { ...schema, orientation: 'vertical' };
    const autoSchema: SliderLinearSchema = { ...schema, orientation: 'auto' };

    it("'vertical': passes orientation=\"vertical\" through to the underlying Radix root", () => {
      const { container } = render(<SliderLinear schema={verticalSchema} value={2} onChange={() => {}} />);
      const root = container.querySelector('.sc-slider-linear__root');
      expect(root?.getAttribute('data-orientation')).toBe('vertical');
    });

    it("'vertical': the outer wrapper carries data-orientation=\"vertical\" — CSS keys off this to go inline-flex and center its column", () => {
      const { container } = render(<SliderLinear schema={verticalSchema} value={2} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-linear');
      expect(wrapper?.getAttribute('data-orientation')).toBe('vertical');
    });

    it("'horizontal' (default): the outer wrapper carries data-orientation=\"horizontal\", not left unset", () => {
      const { container } = render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-linear');
      expect(wrapper?.getAttribute('data-orientation')).toBe('horizontal');
    });

    it("'vertical': renders the value readout before the track in DOM order — a dragging thumb must never cover it", () => {
      const { container } = render(<SliderLinear schema={verticalSchema} value={2} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-linear')!;
      const children = Array.from(wrapper.children);
      const valueIndex = children.findIndex((c) => c.classList.contains('sc-slider-linear__value'));
      const rootIndex = children.findIndex((c) => c.classList.contains('sc-slider-linear__root'));
      expect(valueIndex).toBeGreaterThanOrEqual(0);
      expect(rootIndex).toBeGreaterThanOrEqual(0);
      expect(valueIndex).toBeLessThan(rootIndex);
    });

    it("'horizontal' (default): renders the value readout after the track, unchanged from before orientation existed", () => {
      const { container } = render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-linear')!;
      const children = Array.from(wrapper.children);
      const valueIndex = children.findIndex((c) => c.classList.contains('sc-slider-linear__value'));
      const rootIndex = children.findIndex((c) => c.classList.contains('sc-slider-linear__root'));
      expect(rootIndex).toBeLessThan(valueIndex);
    });

    it("'vertical': always sets an inline height computed from the live-fitted box count, even when verticalHeight is omitted — no longer the old --slider-vertical-height CSS default", () => {
      const { container } = render(<SliderLinear schema={verticalSchema} value={2} onChange={() => {}} />);
      const observer = MockResizeObserver.instances[0];
      act(() => observer.fire(0, 300));

      const root = container.querySelector<HTMLElement>('.sc-slider-linear__root');
      const boxCount = computeFittedBoxCount(300, BOX_SIZE, GAP);
      const expectedLength = computeVoxelTrackLength(boxCount, BOX_SIZE, GAP);
      expect(root?.style.height).toBe(`${expectedLength}px`);
    });

    it("'vertical': verticalHeight is a fitting BUDGET, not a literal applied value — the rendered height is the box-quantized length, even for a verticalHeight that isn't an exact multiple of (boxSize + gap)", () => {
      // 310 is deliberately not a multiple of (48 + 12) = 60.
      const { container } = render(
        <SliderLinear schema={verticalSchema} value={2} onChange={() => {}} verticalHeight={310} />,
      );
      const root = container.querySelector<HTMLElement>('.sc-slider-linear__root');
      const boxCount = computeFittedBoxCount(310, BOX_SIZE, GAP);
      const expectedLength = computeVoxelTrackLength(boxCount, BOX_SIZE, GAP);
      expect(root?.style.height).toBe(`${expectedLength}px`);
      expect(root?.style.height).not.toBe('310px');
    });

    it("'horizontal': ignores a verticalHeight prop entirely (still no inline height) but now sets an inline width from the fitted box count", () => {
      const { container } = render(
        <SliderLinear schema={schema} value={2} onChange={() => {}} verticalHeight={300} />,
      );
      const observer = MockResizeObserver.instances[0];
      act(() => observer.fire(500, 0));

      const root = container.querySelector<HTMLElement>('.sc-slider-linear__root');
      expect(root?.style.height).toBe('');
      const boxCount = computeFittedBoxCount(500, BOX_SIZE, GAP);
      const expectedLength = computeVoxelTrackLength(boxCount, BOX_SIZE, GAP);
      expect(root?.style.width).toBe(`${expectedLength}px`);
    });

    it("'auto': renders without throwing, resolving to horizontal-looking output before any ResizeObserver measurement fires", () => {
      const { container } = render(<SliderLinear schema={autoSchema} value={2} onChange={() => {}} />);
      const root = container.querySelector('.sc-slider-linear__root');
      expect(root?.getAttribute('data-orientation')).toBe('horizontal');
    });
  });
});
