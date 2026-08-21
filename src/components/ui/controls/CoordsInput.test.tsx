import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { CoordsInput } from './CoordsInput';
import type { CoordsInputSchema } from '@/types/controls';

const schema: CoordsInputSchema = { id: 'sectorCoords', type: 'coordsInput', humanLabel: 'Sector Coordinates' };

describe('CoordsInput', () => {
  it('renders two actual TextInput instances', () => {
    render(<CoordsInput schema={schema} value={{ x: 0, y: 0 }} onChange={() => {}} />);
    const textboxes = screen.getAllByRole('textbox');
    expect(textboxes).toHaveLength(2);
  });

  it('renders the controlled x/y values as strings in each field', () => {
    render(<CoordsInput schema={schema} value={{ x: 12, y: -7 }} onChange={() => {}} />);
    const [xInput, yInput] = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(xInput.value).toBe('12');
    expect(yInput.value).toBe('-7');
  });

  it('calls onChange({ x, y }) with parsed numbers when the X field changes', () => {
    const onChange = vi.fn();
    render(<CoordsInput schema={schema} value={{ x: 0, y: 5 }} onChange={onChange} />);
    const [xInput] = screen.getAllByRole('textbox');
    fireEvent.change(xInput, { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledWith({ x: 42, y: 5 });
  });

  it('calls onChange({ x, y }) with parsed numbers when the Y field changes', () => {
    const onChange = vi.fn();
    render(<CoordsInput schema={schema} value={{ x: 3, y: 0 }} onChange={onChange} />);
    const [, yInput] = screen.getAllByRole('textbox');
    fireEvent.change(yInput, { target: { value: '-9' } });
    expect(onChange).toHaveBeenCalledWith({ x: 3, y: -9 });
  });

  it('renders its own schema label via an internally-composed DualLabel', () => {
    render(<CoordsInput schema={schema} value={{ x: 0, y: 0 }} onChange={() => {}} />);
    expect(screen.getByText('Sector Coordinates')).toBeTruthy();
  });

  it('does not throw and does not call onChange with NaN on a non-numeric entry', () => {
    const onChange = vi.fn();
    render(<CoordsInput schema={schema} value={{ x: 0, y: 0 }} onChange={onChange} />);
    const [xInput] = screen.getAllByRole('textbox');
    expect(() => fireEvent.change(xInput, { target: { value: 'abc' } })).not.toThrow();
    expect(onChange).not.toHaveBeenCalled();
  });
});
