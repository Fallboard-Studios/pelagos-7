import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SliderLog } from './SliderLog';
import { LOG_EPSILON, sliderLogTToValue, sliderLogValueToT } from './sliderLogMath';
import type { SliderLogSchema } from '@/types/controls';

// Attack/Decay/Release bounds (docs/reference/ROBOT_DATA_GRID.md), the min = 0 fixture.
const schema: SliderLogSchema = { id: 'attack', type: 'sliderLog', min: 0, max: 10, humanLabel: 'Attack', unit: 's', orientation: 'horizontal' };

describe('sliderLogTToValue / sliderLogValueToT (exact math, min = 0)', () => {
  it('maps t = 0 to exactly schema.min, including the min = 0 case', () => {
    expect(sliderLogTToValue(0, 0, 10)).toBe(0);
  });

  it('maps t = 1 to exactly schema.max', () => {
    expect(sliderLogTToValue(1, 0, 10)).toBeCloseTo(10, 10);
  });

  it('the midpoint (t = 0.5) is not the arithmetic mean of min/max — proves genuine log spacing', () => {
    const midpoint = sliderLogTToValue(0.5, 0, 10);
    expect(midpoint).not.toBeCloseTo(5, 5);
    // Exact value per the resolved epsilon-floor formula: floor * (max/floor)^0.5, floor = LOG_EPSILON.
    expect(midpoint).toBeCloseTo(Math.sqrt(LOG_EPSILON * 10), 10);
  });

  it('round-trips value -> t -> value accurately across the full range', () => {
    for (const value of [0, 0.01, 0.1, 1, 5, 10]) {
      const t = sliderLogValueToT(value, 0, 10);
      const roundTripped = sliderLogTToValue(t, 0, 10);
      expect(roundTripped).toBeCloseTo(value, 5);
    }
  });

  it('value <= min maps to exactly t = 0', () => {
    expect(sliderLogValueToT(0, 0, 10)).toBe(0);
  });
});

describe('SliderLog (min > 0 fixture)', () => {
  it('round-trips accurately when min > LOG_EPSILON', () => {
    const t = sliderLogValueToT(1000, 20, 20000);
    const roundTripped = sliderLogTToValue(t, 20, 20000);
    expect(roundTripped).toBeCloseTo(1000, 5);
  });
});

describe('SliderLog component', () => {
  it('renders its own schema labels via an internally-composed DualLabel', () => {
    render(<SliderLog schema={schema} value={2} onChange={() => {}} />);
    expect(screen.getByText('Attack')).toBeTruthy();
  });

  it('renders {value}{unit} from the display value, not the internal t', () => {
    render(<SliderLog schema={schema} value={2} onChange={() => {}} />);
    expect(screen.getByText('2s')).toBeTruthy();
  });

  it('still renders the bare value when schema.unit is absent — a unitless param like Resonance/Q must not be left blank', () => {
    const noUnitSchema: SliderLogSchema = { id: 'q', type: 'sliderLog', min: 0.1, max: 20, humanLabel: 'Resonance', orientation: 'horizontal' };
    render(<SliderLog schema={noUnitSchema} value={5} onChange={() => {}} />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('caps the displayed value at 3 decimal places, hiding floating-point noise', () => {
    render(<SliderLog schema={schema} value={4.999999999999999} onChange={() => {}} />);
    expect(screen.getByText('5s')).toBeTruthy();
  });

  it('onChange receives the mapped display value, never the raw internal t', () => {
    const onChange = vi.fn();
    render(<SliderLog schema={schema} value={0} onChange={onChange} />);
    const thumb = screen.getByRole('slider');
    thumb.focus();
    // Starting at value 0 (t = 0), one ArrowRight step advances the internal
    // t by the Slider.Root `step` (0.001) — the mapped display value at that
    // t is a genuine log-curve point, not the raw 0.001 t-delta itself.
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledTimes(1);
    const received = onChange.mock.calls[0][0];
    const rawTDelta = 0.001;
    expect(received).not.toBe(rawTDelta);
    expect(received).toBeCloseTo(sliderLogTToValue(rawTDelta, schema.min, schema.max), 10);
  });

  it('falls back to schema.id for the accessible name when neither label is present, never leaving it unlabeled', () => {
    const bareSchema: SliderLogSchema = { id: 'attack', type: 'sliderLog', min: 0, max: 10, orientation: 'horizontal' };
    render(<SliderLog schema={bareSchema} value={2} onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: 'attack' })).toBeTruthy();
  });

  it('is not disabled by default — no existing behavior changes', () => {
    render(<SliderLog schema={schema} value={2} onChange={() => {}} />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('data-disabled')).toBeNull();
    expect(thumb.getAttribute('tabindex')).toBe('0');
  });

  it('marks the thumb data-disabled and removes it from tab order when disabled is true', () => {
    render(<SliderLog schema={schema} value={2} onChange={() => {}} disabled />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('data-disabled')).toBe('');
    expect(thumb.getAttribute('tabindex')).toBeNull();
  });

  it('does not call onChange on a disabled slider when a keyboard step is attempted', () => {
    const onChange = vi.fn();
    render(<SliderLog schema={schema} value={2} onChange={onChange} disabled />);
    const thumb = screen.getByRole('slider');
    thumb.focus();
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  describe('orientation', () => {
    const verticalSchema: SliderLogSchema = { ...schema, orientation: 'vertical' };
    const autoSchema: SliderLogSchema = { ...schema, orientation: 'auto' };

    it("'vertical': passes orientation=\"vertical\" through to the underlying Radix root", () => {
      const { container } = render(<SliderLog schema={verticalSchema} value={2} onChange={() => {}} />);
      const root = container.querySelector('.sc-slider-log__root');
      expect(root?.getAttribute('data-orientation')).toBe('vertical');
    });

    it("'vertical': renders the value readout before the track in DOM order — a dragging thumb must never cover it", () => {
      const { container } = render(<SliderLog schema={verticalSchema} value={2} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-log')!;
      const children = Array.from(wrapper.children);
      const valueIndex = children.findIndex((c) => c.classList.contains('sc-slider-log__value'));
      const rootIndex = children.findIndex((c) => c.classList.contains('sc-slider-log__root'));
      expect(valueIndex).toBeGreaterThanOrEqual(0);
      expect(rootIndex).toBeGreaterThanOrEqual(0);
      expect(valueIndex).toBeLessThan(rootIndex);
    });

    it("'horizontal' (default): renders the value readout after the track, unchanged from before orientation existed", () => {
      const { container } = render(<SliderLog schema={schema} value={2} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-log')!;
      const children = Array.from(wrapper.children);
      const valueIndex = children.findIndex((c) => c.classList.contains('sc-slider-log__value'));
      const rootIndex = children.findIndex((c) => c.classList.contains('sc-slider-log__root'));
      expect(rootIndex).toBeLessThan(valueIndex);
    });

    it("'vertical': does not set an inline height when verticalHeight is omitted — the default comes from the --slider-vertical-height CSS custom property", () => {
      const { container } = render(<SliderLog schema={verticalSchema} value={2} onChange={() => {}} />);
      const root = container.querySelector<HTMLElement>('.sc-slider-log__root');
      expect(root?.style.height).toBe('');
    });

    it("'vertical': sets an inline height from the verticalHeight prop when provided, overriding the CSS default", () => {
      const { container } = render(
        <SliderLog schema={verticalSchema} value={2} onChange={() => {}} verticalHeight={300} />,
      );
      const root = container.querySelector<HTMLElement>('.sc-slider-log__root');
      expect(root?.style.height).toBe('300px');
    });

    it("'horizontal': ignores a verticalHeight prop entirely (no inline height set)", () => {
      const { container } = render(
        <SliderLog schema={schema} value={2} onChange={() => {}} verticalHeight={300} />,
      );
      const root = container.querySelector<HTMLElement>('.sc-slider-log__root');
      expect(root?.style.height).toBe('');
    });

    it("'auto': renders without throwing, resolving to horizontal-looking output before any ResizeObserver measurement fires", () => {
      const { container } = render(<SliderLog schema={autoSchema} value={2} onChange={() => {}} />);
      const root = container.querySelector('.sc-slider-log__root');
      expect(root?.getAttribute('data-orientation')).toBe('horizontal');
    });

    it("orientation has no effect on the log-curve mapping — onChange still receives the mapped display value", () => {
      const onChange = vi.fn();
      render(<SliderLog schema={verticalSchema} value={0} onChange={onChange} />);
      const thumb = screen.getByRole('slider');
      thumb.focus();
      fireEvent.keyDown(thumb, { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledTimes(1);
      const received = onChange.mock.calls[0][0];
      expect(received).toBeCloseTo(sliderLogTToValue(0.001, schema.min, schema.max), 10);
    });
  });
});
