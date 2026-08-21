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

  it('renders as a plain text input by default (numeric prop omitted)', () => {
    const schema: TextInputSchema = { id: 'robotName', type: 'textInput' };
    render(<TextInput schema={schema} value="" onChange={() => {}} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).type).toBe('text');
  });

  it('renders as a native numeric input when numeric is true', () => {
    const schema: TextInputSchema = { id: 'coordX', type: 'textInput', humanLabel: 'X' };
    render(<TextInput schema={schema} value="12" onChange={() => {}} numeric />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.getAttribute('inputmode')).toBe('decimal');
    expect(input.value).toBe('12');
  });

  it('falls back to schema.id for the accessible name when neither label is present, never leaving it unlabeled', () => {
    const schema: TextInputSchema = { id: 'robotName', type: 'textInput' };
    render(<TextInput schema={schema} value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox', { name: 'robotName' })).toBeTruthy();
  });
});
