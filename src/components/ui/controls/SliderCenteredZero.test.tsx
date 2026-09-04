import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SliderCenteredZero } from './SliderCenteredZero';
import { computeFillRect, zeroPointPercent } from './sliderCenteredZeroMath';
import type { SliderCenteredZeroSchema } from '@/types/controls';

const detuneSchema: SliderCenteredZeroSchema = { id: 'detune', type: 'sliderCenteredZero', min: -50, max: 50, humanLabel: 'Detune', unit: 'ct', orientation: 'horizontal' };

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

  it('caps the displayed value at 3 decimal places, hiding floating-point noise', () => {
    render(<SliderCenteredZero schema={detuneSchema} value={-14.999999999999998} onChange={() => {}} />);
    expect(screen.getByText('-15ct')).toBeTruthy();
  });

  it('still renders the bare value when schema.unit is absent', () => {
    const noUnitSchema: SliderCenteredZeroSchema = { id: 'x', type: 'sliderCenteredZero', min: -50, max: 50, orientation: 'horizontal' };
    render(<SliderCenteredZero schema={noUnitSchema} value={-15} onChange={() => {}} />);
    expect(screen.getByText('-15')).toBeTruthy();
  });

  it('reflects min/max/value on the underlying slider', () => {
    render(<SliderCenteredZero schema={detuneSchema} value={10} onChange={() => {}} />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('aria-valuemin')).toBe('-50');
    expect(thumb.getAttribute('aria-valuemax')).toBe('50');
    expect(thumb.getAttribute('aria-valuenow')).toBe('10');
  });

  it('falls back to schema.id for the accessible name when neither label is present, never leaving it unlabeled', () => {
    const bareSchema: SliderCenteredZeroSchema = { id: 'detune', type: 'sliderCenteredZero', min: -50, max: 50, orientation: 'horizontal' };
    render(<SliderCenteredZero schema={bareSchema} value={0} onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: 'detune' })).toBeTruthy();
  });

  it('is not disabled by default — no existing behavior changes', () => {
    render(<SliderCenteredZero schema={detuneSchema} value={0} onChange={() => {}} />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('data-disabled')).toBeNull();
    expect(thumb.getAttribute('tabindex')).toBe('0');
  });

  it('marks the thumb data-disabled and removes it from tab order when disabled is true', () => {
    render(<SliderCenteredZero schema={detuneSchema} value={0} onChange={() => {}} disabled />);
    const thumb = screen.getByRole('slider');
    expect(thumb.getAttribute('data-disabled')).toBe('');
    expect(thumb.getAttribute('tabindex')).toBeNull();
  });

  it('does not call onChange on a disabled slider when a keyboard step is attempted', () => {
    const onChange = vi.fn();
    render(<SliderCenteredZero schema={detuneSchema} value={0} onChange={onChange} disabled />);
    const thumb = screen.getByRole('slider');
    thumb.focus();
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('still renders the correct zero-anchored fill when disabled (visual state unaffected)', () => {
    const { container } = render(<SliderCenteredZero schema={detuneSchema} value={25} onChange={() => {}} disabled />);
    const fillEl = container.querySelector<HTMLDivElement>('.sc-slider-centered-zero__fill');
    const rect = computeFillRect(25, -50, 50);
    expect(fillEl?.style.left).toBe(`${rect.left}%`);
    expect(fillEl?.style.width).toBe(`${rect.width}%`);
  });
});
