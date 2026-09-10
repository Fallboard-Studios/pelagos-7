import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mocked the same way Button.test.tsx/Toggle.test.tsx mock CabinetBox — keeps
// this file's assertions about RadioButton's own event-to-prop wiring
// isolated from CabinetBox's already-proven internals (11.1.1). None of the
// existing tests below depend on CabinetBox's real rendering (role/aria-label/
// data-state/data-disabled all live on ToggleGroup.Item itself), so the mock
// is safe for the whole file rather than needing a separate unmocked block.
vi.mock('./CabinetBox', () => ({
  CabinetBox: ({ popped, timelineKey, children }: { popped: boolean; timelineKey: string; children?: React.ReactNode }) => (
    <div data-testid="cabinet-box" data-popped={popped} data-timeline-key={timelineKey}>{children}</div>
  ),
}));

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

  // Roadmap 11.1.6 — one CabinetBox per option, popped only for the
  // currently-selected one. See docs/specs/OBLIQUE_CABINETRY_RADIO_BUTTON.md §1.1.
  it('renders one CabinetBox per option, popped only for the option matching value', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} />);
    expect(screen.getAllByTestId('cabinet-box')).toHaveLength(4);

    const boxFor = (name: string) =>
      screen.getByRole('radio', { name }).querySelector('[data-testid="cabinet-box"]');

    expect(boxFor('SINE')?.getAttribute('data-popped')).toBe('true');
    expect(boxFor('TRIANGLE')?.getAttribute('data-popped')).toBe('false');
    expect(boxFor('SQUARE')?.getAttribute('data-popped')).toBe('false');
    expect(boxFor('SAWTOOTH')?.getAttribute('data-popped')).toBe('false');
  });

  it('passes a distinct timelineKey per option, derived from schema.id and the option\'s own value', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} />);
    const boxFor = (name: string) =>
      screen.getByRole('radio', { name }).querySelector('[data-testid="cabinet-box"]');

    expect(boxFor('TRIANGLE')?.getAttribute('data-timeline-key')).toBe('cabinet-radio-lfoShape-triangle');
    expect(boxFor('SQUARE')?.getAttribute('data-timeline-key')).toBe('cabinet-radio-lfoShape-square');
  });

  it('renders the option\'s label as CabinetBox\'s own children, not directly inside the toggle item', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} />);
    const box = screen.getByRole('radio', { name: 'SINE' }).querySelector('[data-testid="cabinet-box"]');
    expect(box?.textContent).toBe('SINE');
  });

  it('reflects selection via Radix\'s own data-state attribute, which the accent-tint CSS rule depends on', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} />);
    expect(screen.getByRole('radio', { name: 'SINE' }).getAttribute('data-state')).toBe('on');
    expect(screen.getByRole('radio', { name: 'TRIANGLE' }).getAttribute('data-state')).toBe('off');
  });
});
