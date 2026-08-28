import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Select } from './Select';
import type { SelectSchema } from '@/types/controls';

const schema: SelectSchema = {
  id: 'company.assign',
  type: 'select',
  humanLabel: 'Company',
  options: [
    { value: '__freelance__', label: 'Freelance' },
    { value: 'company-0-abc', label: 'Iron Consortium' },
    { value: 'company-1-def', label: 'Null Syndicate' },
  ],
};

describe('Select', () => {
  it('renders a trigger showing the label matching the current value', () => {
    render(<Select schema={schema} value="company-0-abc" onChange={() => {}} />);
    expect(screen.getByRole('combobox').textContent).toContain('Iron Consortium');
  });

  it('renders one item per schema.options entry when opened', () => {
    render(<Select schema={schema} value="__freelance__" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Freelance' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Iron Consortium' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Null Syndicate' })).toBeTruthy();
  });

  it('calls onChange(newValue) on selection', () => {
    const onChange = vi.fn();
    render(<Select schema={schema} value="__freelance__" onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Null Syndicate' }));
    expect(onChange).toHaveBeenCalledWith('company-1-def');
  });

  it('composes DualLabel internally, rendering the schema\'s humanLabel', () => {
    render(<Select schema={schema} value="__freelance__" onChange={() => {}} />);
    expect(screen.getByText('Company')).toBeTruthy();
  });

  it('falls back to schema.id for the accessible name when neither label is present', () => {
    const bareSchema: SelectSchema = { id: 'company.assign', type: 'select', options: schema.options };
    render(<Select schema={bareSchema} value="__freelance__" onChange={() => {}} />);
    expect(screen.getByRole('combobox', { name: 'company.assign' })).toBeTruthy();
  });

  it('is not disabled by default', () => {
    render(<Select schema={schema} value="__freelance__" onChange={() => {}} />);
    expect(screen.getByRole('combobox').getAttribute('data-disabled')).toBeNull();
  });

  it('disables the trigger when disabled is true', () => {
    render(<Select schema={schema} value="__freelance__" onChange={() => {}} disabled />);
    expect(screen.getByRole('combobox').getAttribute('data-disabled')).toBe('');
  });

  it('does not open when disabled', () => {
    render(<Select schema={schema} value="__freelance__" onChange={() => {}} disabled />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('option', { name: 'Freelance' })).toBeNull();
  });
});
