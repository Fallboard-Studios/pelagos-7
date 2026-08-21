import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { TextInput } from './TextInput';
import type { TextInputSchema } from '@/types/controls';

describe('TextInput', () => {
  it('renders placeholder from schema when present', () => {
    const schema: TextInputSchema = { id: 'robotName', type: 'textInput', placeholder: 'Enter name' };
    render(<TextInput schema={schema} value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText('Enter name')).toBeTruthy();
  });

  it('respects maxLength from schema when present', () => {
    const schema: TextInputSchema = { id: 'robotName', type: 'textInput', maxLength: 12 };
    render(<TextInput schema={schema} value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.maxLength).toBe(12);
  });

  it('calls onChange with the raw string value on every keystroke, no buffering', () => {
    const onChange = vi.fn();
    const schema: TextInputSchema = { id: 'robotName', type: 'textInput' };
    render(<TextInput schema={schema} value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Uni' } });
    expect(onChange).toHaveBeenCalledWith('Uni');
  });

  it('reflects the controlled value prop', () => {
    const schema: TextInputSchema = { id: 'robotName', type: 'textInput' };
    render(<TextInput schema={schema} value="Unit 7" onChange={() => {}} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Unit 7');
  });

  it('renders its own schema labels via an internally-composed DualLabel', () => {
    const schema: TextInputSchema = { id: 'robotName', type: 'textInput', loreLabel: 'DESIGNATION', humanLabel: 'Robot Name' };
    render(<TextInput schema={schema} value="" onChange={() => {}} />);
    expect(screen.getByText('DESIGNATION')).toBeTruthy();
    expect(screen.getByText('Robot Name')).toBeTruthy();
  });
});
