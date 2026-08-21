import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SliderCenteredZero } from './SliderCenteredZero';
import { computeFillRect, zeroPointPercent } from './sliderCenteredZeroMath';
import type { SliderCenteredZeroSchema } from '@/types/controls';

const detuneSchema: SliderCenteredZeroSchema = { id: 'detune', type: 'sliderCenteredZero', min: -50, max: 50, humanLabel: 'Detune', unit: 'ct' };

describe('sliderCenteredZeroMath', () => {
  it('computes the zero point generally, not hardcoded to 50% (asymmetric -20/+50 fixture)', () => {
    // (0 - (-20)) / (50 - (-20)) * 100 = 20/70*100 ≈ 28.57%, not 50%.
    expect(zeroPointPercent(-20, 50)).toBeCloseTo((20 / 70) * 100, 5);
    expect(zeroPointPercent(-20, 50)).not.toBeCloseTo(50, 0);
  });

  it('computes a symmetric zero point at 50% for symmetric bounds', () => {
    expect(zeroPointPercent(-50, 50)).toBeCloseTo(50, 5);
  });

  it('value = 0 renders a zero-width fill (symmetric bounds)', () => {
    const rect = computeFillRect(0, -50, 50);
    expect(rect.width).toBeCloseTo(0, 10);
  });

  it('value = 0 renders a zero-width fill (asymmetric bounds)', () => {
    const rect = computeFillRect(0, -20, 50);
    expect(rect.width).toBeCloseTo(0, 10);
  });

  it('fills from the zero point rightward for positive values', () => {
    const zero = zeroPointPercent(-50, 50);
    const rect = computeFillRect(25, -50, 50);
    expect(rect.left).toBeCloseTo(zero, 5);
    expect(rect.width).toBeGreaterThan(0);
  });

  it('fills from the zero point leftward for negative values', () => {
    const zero = zeroPointPercent(-50, 50);
    const rect = computeFillRect(-25, -50, 50);
    expect(rect.left).toBeLessThan(zero);
    expect(rect.left + rect.width).toBeCloseTo(zero, 5);
  });
});

describe('SliderCenteredZero component', () => {
  it('renders its own schema labels via an internally-composed DualLabel', () => {
    render(<SliderCenteredZero schema={detuneSchema} value={0} onChange={() => {}} />);
    expect(screen.getByText('Detune')).toBeTruthy();
  });

  it('renders {value}{unit} when schema.unit is present', () => {
    render(<SliderCenteredZero schema={detuneSchema} value={-15} onChange={() => {}} />);
    expect(screen.getByText('-15ct')).toBeTruthy();
  });

  it('reflects min/max/value on the underlying slider', () => {
    render(<SliderCenteredZero schema={detuneSchema} value={10} onChange={() => {}} />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('aria-valuemin')).toBe('-50');
    expect(thumb.getAttribute('aria-valuemax')).toBe('50');
    expect(thumb.getAttribute('aria-valuenow')).toBe('10');
  });

  it('falls back to schema.id for the accessible name when neither label is present, never leaving it unlabeled', () => {
    const bareSchema: SliderCenteredZeroSchema = { id: 'detune', type: 'sliderCenteredZero', min: -50, max: 50 };
    render(<SliderCenteredZero schema={bareSchema} value={0} onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: 'detune' })).toBeTruthy();
  });
});
