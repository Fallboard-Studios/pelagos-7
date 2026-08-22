import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SliderLog } from './SliderLog';
import { LOG_EPSILON, sliderLogTToValue, sliderLogValueToT } from './sliderLogMath';
import type { SliderLogSchema } from '@/types/controls';

// Attack/Decay/Release bounds (docs/reference/ROBOT_DATA_GRID.md), the min = 0 fixture.
const schema: SliderLogSchema = { id: 'attack', type: 'sliderLog', min: 0, max: 10, humanLabel: 'Attack', unit: 's' };

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
    const bareSchema: SliderLogSchema = { id: 'attack', type: 'sliderLog', min: 0, max: 10 };
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
});
