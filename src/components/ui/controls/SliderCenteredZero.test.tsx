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

  describe('orientation', () => {
    const verticalSchema: SliderCenteredZeroSchema = { ...detuneSchema, orientation: 'vertical' };
    const autoSchema: SliderCenteredZeroSchema = { ...detuneSchema, orientation: 'auto' };

    it("'vertical': passes orientation=\"vertical\" through to the underlying Radix root", () => {
      const { container } = render(<SliderCenteredZero schema={verticalSchema} value={0} onChange={() => {}} />);
      const root = container.querySelector('.sc-slider-centered-zero__root');
      expect(root?.getAttribute('data-orientation')).toBe('vertical');
    });

    it("'vertical': the outer wrapper carries data-orientation=\"vertical\" — CSS keys off this to go inline-flex and center its column", () => {
      const { container } = render(<SliderCenteredZero schema={verticalSchema} value={0} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-centered-zero');
      expect(wrapper?.getAttribute('data-orientation')).toBe('vertical');
    });

    it("'horizontal' (default): the outer wrapper carries data-orientation=\"horizontal\", not left unset", () => {
      const { container } = render(<SliderCenteredZero schema={detuneSchema} value={0} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-centered-zero');
      expect(wrapper?.getAttribute('data-orientation')).toBe('horizontal');
    });

    it("'vertical': renders the value readout before the track in DOM order — a dragging thumb must never cover it", () => {
      const { container } = render(<SliderCenteredZero schema={verticalSchema} value={0} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-centered-zero')!;
      const children = Array.from(wrapper.children);
      const valueIndex = children.findIndex((c) => c.classList.contains('sc-slider-centered-zero__value'));
      const rootIndex = children.findIndex((c) => c.classList.contains('sc-slider-centered-zero__root'));
      expect(valueIndex).toBeGreaterThanOrEqual(0);
      expect(rootIndex).toBeGreaterThanOrEqual(0);
      expect(valueIndex).toBeLessThan(rootIndex);
    });

    it("'horizontal' (default): renders the value readout after the track, unchanged from before orientation existed", () => {
      const { container } = render(<SliderCenteredZero schema={detuneSchema} value={0} onChange={() => {}} />);
      const wrapper = container.querySelector('.sc-slider-centered-zero')!;
      const children = Array.from(wrapper.children);
      const valueIndex = children.findIndex((c) => c.classList.contains('sc-slider-centered-zero__value'));
      const rootIndex = children.findIndex((c) => c.classList.contains('sc-slider-centered-zero__root'));
      expect(rootIndex).toBeLessThan(valueIndex);
    });

    it("'vertical': does not set an inline height when verticalHeight is omitted — the default comes from the --slider-vertical-height CSS custom property", () => {
      const { container } = render(<SliderCenteredZero schema={verticalSchema} value={0} onChange={() => {}} />);
      const root = container.querySelector<HTMLElement>('.sc-slider-centered-zero__root');
      expect(root?.style.height).toBe('');
    });

    it("'vertical': sets an inline height from the verticalHeight prop when provided, overriding the CSS default", () => {
      const { container } = render(
        <SliderCenteredZero schema={verticalSchema} value={0} onChange={() => {}} verticalHeight={300} />,
      );
      const root = container.querySelector<HTMLElement>('.sc-slider-centered-zero__root');
      expect(root?.style.height).toBe('300px');
    });

    it("'horizontal': ignores a verticalHeight prop entirely (no inline height set)", () => {
      const { container } = render(
        <SliderCenteredZero schema={detuneSchema} value={0} onChange={() => {}} verticalHeight={300} />,
      );
      const root = container.querySelector<HTMLElement>('.sc-slider-centered-zero__root');
      expect(root?.style.height).toBe('');
    });

    it("'auto': renders without throwing, resolving to horizontal-looking output before any ResizeObserver measurement fires", () => {
      const { container } = render(<SliderCenteredZero schema={autoSchema} value={0} onChange={() => {}} />);
      const root = container.querySelector('.sc-slider-centered-zero__root');
      expect(root?.getAttribute('data-orientation')).toBe('horizontal');
    });

    it("'horizontal': the fill's inline style still uses left/width (unchanged from before this task)", () => {
      const { container } = render(<SliderCenteredZero schema={detuneSchema} value={25} onChange={() => {}} />);
      const fillEl = container.querySelector<HTMLDivElement>('.sc-slider-centered-zero__fill');
      const rect = computeFillRect(25, -50, 50);
      expect(fillEl?.style.left).toBe(`${rect.left}%`);
      expect(fillEl?.style.width).toBe(`${rect.width}%`);
      expect(fillEl?.style.bottom).toBe('');
      expect(fillEl?.style.height).toBe('');
    });

    it("'vertical': the fill's inline style uses bottom/height, not left/width — reusing computeFillRect's existing percentages on the new axis", () => {
      const { container } = render(<SliderCenteredZero schema={verticalSchema} value={25} onChange={() => {}} />);
      const fillEl = container.querySelector<HTMLDivElement>('.sc-slider-centered-zero__fill');
      const rect = computeFillRect(25, -50, 50);
      expect(fillEl?.style.bottom).toBe(`${rect.left}%`);
      expect(fillEl?.style.height).toBe(`${rect.width}%`);
      expect(fillEl?.style.left).toBe('');
      expect(fillEl?.style.width).toBe('');
    });

    it("'vertical': a negative value's fill still spans from the zero point (asymmetric bounds, -20/+50)", () => {
      const asymmetricSchema: SliderCenteredZeroSchema = {
        id: 'asym', type: 'sliderCenteredZero', min: -20, max: 50, orientation: 'vertical',
      };
      const { container } = render(<SliderCenteredZero schema={asymmetricSchema} value={-10} onChange={() => {}} />);
      const fillEl = container.querySelector<HTMLDivElement>('.sc-slider-centered-zero__fill');
      const rect = computeFillRect(-10, -20, 50);
      expect(fillEl?.style.bottom).toBe(`${rect.left}%`);
      expect(fillEl?.style.height).toBe(`${rect.width}%`);
    });
  });
});
