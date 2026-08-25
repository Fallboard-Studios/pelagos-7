import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { RadioButton } from './RadioButton';
import type { RadioButtonSchema } from '@/types/controls';

const schema: RadioButtonSchema = {
  id: 'lfoShape',
  type: 'radio',
  humanLabel: 'LFO Shape',
  options: [
    { value: 'triangle', label: 'TRIANGLE' },
    { value: 'sine', label: 'SINE' },
    { value: 'square', label: 'SQUARE' },
    { value: 'sawtooth', label: 'SAWTOOTH' },
  ],
};

describe('RadioButton', () => {
  it('renders one item per schema.options entry', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'TRIANGLE' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'SINE' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'SQUARE' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'SAWTOOTH' })).toBeTruthy();
  });

  it('marks exactly the option matching value as pressed/selected', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'SINE' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'TRIANGLE' }).getAttribute('aria-checked')).toBe('false');
  });

  it('calls onChange(newValue) on selection', () => {
    const onChange = vi.fn();
    render(<RadioButton schema={schema} value="sine" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'SQUARE' }));
    expect(onChange).toHaveBeenCalledWith('square');
  });

  it('does not call onChange on a deselect-to-empty event (clicking the already-selected option)', () => {
    const onChange = vi.fn();
    render(<RadioButton schema={schema} value="sine" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'SINE' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('falls back to schema.id for the group\'s accessible name when neither label is present, never leaving it unlabeled', () => {
    const bareSchema: RadioButtonSchema = { id: 'lfoShape', type: 'radio', options: schema.options };
    render(<RadioButton schema={bareSchema} value="sine" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'lfoShape' })).toBeTruthy();
  });

  it('is not disabled by default — no existing behavior changes', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} />);
    const item = screen.getByRole('radio', { name: 'SINE' });
    expect(item.getAttribute('data-disabled')).toBeNull();
    expect(item.getAttribute('tabindex')).not.toBeNull();
  });

  it('marks every item data-disabled when disabled is true', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} disabled />);
    expect(screen.getByRole('radio', { name: 'SINE' }).getAttribute('data-disabled')).toBe('');
    expect(screen.getByRole('radio', { name: 'TRIANGLE' }).getAttribute('data-disabled')).toBe('');
  });

  it('does not call onChange on a disabled item when clicked', () => {
    const onChange = vi.fn();
    render(<RadioButton schema={schema} value="sine" onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('radio', { name: 'SQUARE' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
