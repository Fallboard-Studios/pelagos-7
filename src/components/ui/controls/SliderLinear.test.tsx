import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

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
});
