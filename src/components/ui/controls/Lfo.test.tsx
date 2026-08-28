import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Lfo } from './Lfo';
import { LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX } from '@/types/lfo';
import type { LfoSchema, LfoValue } from '@/types/controls';

const schema: LfoSchema = { id: 'volumeLfo', type: 'lfo', humanLabel: 'Volume LFO' };
const value: LfoValue = { shape: 'sine', rate: 2, depth: 40, active: true };

describe('Lfo', () => {
  it('renders an actual RadioButton (4 shape options), two SliderLinears, and a Toggle', () => {
    render(<Lfo schema={schema} value={value} onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'TRIANGLE' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'SINE' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'SQUARE' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'SAWTOOTH' })).toBeTruthy();
    expect(screen.getAllByRole('slider')).toHaveLength(2);
    expect(screen.getByRole('switch')).toBeTruthy();
  });

  it("the rate slider's own draggable minimum is 0.25Hz (a clean step-grid anchor), not LFO_RATE_MIN (0.1Hz, the true floor used elsewhere)", () => {
    render(<Lfo schema={schema} value={value} onChange={() => {}} />);
    const [rateSlider] = screen.getAllByRole('slider');
    expect(rateSlider.getAttribute('aria-valuemin')).toBe('0.25');
    expect(rateSlider.getAttribute('aria-valuemax')).toBe(String(LFO_RATE_MAX));
  });

  it('steps the rate slider by clean 0.25 increments per arrow-key press, not the default step of 1', () => {
    const onChange = vi.fn();
    render(<Lfo schema={schema} value={value} onChange={onChange} />);
    const [rateSlider] = screen.getAllByRole('slider');
    rateSlider.focus();
    fireEvent.keyDown(rateSlider, { key: 'ArrowRight' });
    // Radix's step grid anchors to min (0.25) — 0.25, 0.5, 0.75, ..., 2.0,
    // 2.25, 2.5... — landing exactly on 2.25 from a starting value of 2,
    // not the old default step of 1 (which would land on 3).
    expect(onChange).toHaveBeenCalledWith({ shape: 'sine', rate: 2.25, depth: 40, active: true });
  });

  it("the depth slider's bounds match LFO_DEPTH_MIN/MAX from src/types/lfo.ts", () => {
    render(<Lfo schema={schema} value={value} onChange={() => {}} />);
    const [, depthSlider] = screen.getAllByRole('slider');
    expect(depthSlider.getAttribute('aria-valuemin')).toBe(String(LFO_DEPTH_MIN));
    expect(depthSlider.getAttribute('aria-valuemax')).toBe(String(LFO_DEPTH_MAX));
  });

  it('calls onChange with the complete LfoValue when the shape changes', () => {
    const onChange = vi.fn();
    render(<Lfo schema={schema} value={value} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'SQUARE' }));
    expect(onChange).toHaveBeenCalledWith({ shape: 'square', rate: 2, depth: 40, active: true });
  });

  it('calls onChange with the complete LfoValue when the toggle changes', () => {
    const onChange = vi.fn();
    render(<Lfo schema={schema} value={value} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith({ shape: 'sine', rate: 2, depth: 40, active: false });
  });

  it('adds an isActive class to the component root when value.active is true', () => {
    const { container } = render(<Lfo schema={schema} value={value} onChange={() => {}} />);
    expect(container.querySelector('.sc-lfo.isActive')).toBeTruthy();
  });

  it('omits the isActive class from the component root when value.active is false', () => {
    const { container } = render(<Lfo schema={schema} value={{ ...value, active: false }} onChange={() => {}} />);
    expect(container.querySelector('.sc-lfo.isActive')).toBeNull();
    expect(container.querySelector('.sc-lfo')).toBeTruthy();
  });

  it('is not disabled by default', () => {
    render(<Lfo schema={schema} value={value} onChange={() => {}} />);
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables every internal control (shape radio, both sliders, active toggle) when disabled is true', () => {
    render(<Lfo schema={schema} value={value} onChange={() => {}} disabled />);
    expect(screen.getByRole('radio', { name: 'SINE' }).getAttribute('data-disabled')).toBe('');
    screen.getAllByRole('slider').forEach((slider) => {
      expect(slider.getAttribute('data-disabled')).toBe('');
    });
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true);
  });
});
