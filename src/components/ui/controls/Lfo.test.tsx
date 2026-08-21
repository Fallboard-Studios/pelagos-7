import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Lfo } from './Lfo';
import { LFO_RATE_MIN, LFO_RATE_MAX, LFO_DEPTH_MIN, LFO_DEPTH_MAX } from '@/types/lfo';
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

  it("the rate slider's bounds match LFO_RATE_MIN/MAX from src/types/lfo.ts", () => {
    render(<Lfo schema={schema} value={value} onChange={() => {}} />);
    const [rateSlider] = screen.getAllByRole('slider');
    expect(rateSlider.getAttribute('aria-valuemin')).toBe(String(LFO_RATE_MIN));
    expect(rateSlider.getAttribute('aria-valuemax')).toBe(String(LFO_RATE_MAX));
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
});
