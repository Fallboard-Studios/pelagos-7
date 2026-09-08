import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { SliderLinear } from './SliderLinear';
import type { SliderLinearSchema } from '@/types/controls';

const schema: SliderLinearSchema = { id: 'lfoRate', type: 'sliderLinear', min: 0.1, max: 10, humanLabel: 'Oscillation Rate', unit: 'Hz', orientation: 'horizontal' };

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

    it("'vertical': does not set an inline height when verticalHeight is omitted — the default comes from the --slider-vertical-height CSS custom property", () => {
      const { container } = render(<SliderLinear schema={verticalSchema} value={2} onChange={() => {}} />);
      const root = container.querySelector<HTMLElement>('.sc-slider-linear__root');
      expect(root?.style.height).toBe('');
    });

    it("'vertical': sets an inline height from the verticalHeight prop when provided, overriding the CSS default", () => {
      const { container } = render(
        <SliderLinear schema={verticalSchema} value={2} onChange={() => {}} verticalHeight={300} />,
      );
      const root = container.querySelector<HTMLElement>('.sc-slider-linear__root');
      expect(root?.style.height).toBe('300px');
    });

    it("'horizontal': ignores a verticalHeight prop entirely (no inline height set)", () => {
      const { container } = render(
        <SliderLinear schema={schema} value={2} onChange={() => {}} verticalHeight={300} />,
      );
      const root = container.querySelector<HTMLElement>('.sc-slider-linear__root');
      expect(root?.style.height).toBe('');
    });

    it("'auto': renders without throwing, resolving to horizontal-looking output before any ResizeObserver measurement fires", () => {
      const { container } = render(<SliderLinear schema={autoSchema} value={2} onChange={() => {}} />);
      const root = container.querySelector('.sc-slider-linear__root');
      expect(root?.getAttribute('data-orientation')).toBe('horizontal');
    });
  });
});
