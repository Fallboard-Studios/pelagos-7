import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SliderLinear } from './SliderLinear';
import type { SliderLinearSchema } from '@/types/controls';

const schema: SliderLinearSchema = { id: 'lfoRate', type: 'sliderLinear', min: 0.1, max: 10, humanLabel: 'Oscillation Rate', unit: 'Hz' };

describe('SliderLinear', () => {
  it('renders a slider reflecting min/max/value from schema', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('aria-valuemin')).toBe('0.1');
    expect(thumb.getAttribute('aria-valuemax')).toBe('10');
    expect(thumb.getAttribute('aria-valuenow')).toBe('2');
  });

  it('renders {value}{unit} only when schema.unit is present', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    expect(screen.getByText('2Hz')).toBeTruthy();
  });

  it('omits the value/unit label when schema.unit is absent', () => {
    const noUnitSchema: SliderLinearSchema = { id: 'x', type: 'sliderLinear', min: 0, max: 1 };
    render(<SliderLinear schema={noUnitSchema} value={0.5} onChange={() => {}} />);
    expect(screen.queryByText('0.5')).toBeNull();
  });

  it('renders its own schema labels via an internally-composed DualLabel', () => {
    render(<SliderLinear schema={schema} value={2} onChange={() => {}} />);
    expect(screen.getByText('Oscillation Rate')).toBeTruthy();
  });

  it('falls back to schema.id for the accessible name when neither label is present, never leaving it unlabeled', () => {
    const bareSchema: SliderLinearSchema = { id: 'lfoRate', type: 'sliderLinear', min: 0.1, max: 10 };
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
});
