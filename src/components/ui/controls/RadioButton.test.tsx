import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mocked the same way Button.test.tsx/Toggle.test.tsx mock CabinetBox — keeps
// this file's assertions about RadioButton's own event-to-prop wiring
// isolated from CabinetBox's already-proven internals (11.1.1). None of the
// existing tests below depend on CabinetBox's real rendering (role/aria-label/
// data-state/data-disabled all live on ToggleGroup.Item itself), so the mock
// is safe for the whole file rather than needing a separate unmocked block.
vi.mock('./CabinetBox', () => ({
  CabinetBox: ({ popped, timelineKey, boxHeight, frontWidth, frontHeight, children }: {
    popped: boolean;
    timelineKey: string;
    boxHeight?: number;
    frontWidth?: number;
    frontHeight?: number;
    children?: React.ReactNode;
  }) => (
    <div
      data-testid="cabinet-box"
      data-popped={popped}
      data-timeline-key={timelineKey}
      data-box-height={boxHeight}
      data-front-width={frontWidth}
      data-front-height={frontHeight}
    >{children}</div>
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

  // docs/specs/HEADER_HUB_CONSOLIDATION.md §1.4 (correction found during
  // Header's own implementation, Task 8) — every existing consumer relies on
  // the deselect-to-empty event being silently swallowed (the test above),
  // so it can't just start forwarding '' to onChange without risking a
  // behavior change for Audio Setting/Decay Mode/LFO Shape/CompanyButtonRow.
  // onDeselect is a separate, optional, additive hook specifically for the
  // event onChange already swallows.
  it('calls onDeselect (not onChange) on a deselect-to-empty event, when provided', () => {
    const onChange = vi.fn();
    const onDeselect = vi.fn();
    render(<RadioButton schema={schema} value="sine" onChange={onChange} onDeselect={onDeselect} />);
    fireEvent.click(screen.getByRole('radio', { name: 'SINE' }));
    expect(onDeselect).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onDeselect on a genuine selection of a different option', () => {
    const onDeselect = vi.fn();
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} onDeselect={onDeselect} />);
    fireEvent.click(screen.getByRole('radio', { name: 'SQUARE' }));
    expect(onDeselect).not.toHaveBeenCalled();
  });

  it('omitting onDeselect does not throw on a deselect-to-empty event — every existing consumer omits it', () => {
    const onChange = vi.fn();
    expect(() => {
      render(<RadioButton schema={schema} value="sine" onChange={onChange} />);
      fireEvent.click(screen.getByRole('radio', { name: 'SINE' }));
    }).not.toThrow();
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

  // Hover-pop, matching Button's own hover behavior — reverses 11.1.6's original
  // "no hover/partial-pop on unselected options" exclusion (docs/specs/OBLIQUE_CABINETRY_RADIO_BUTTON.md §3).
  it('pops an unselected option on mouseEnter and flattens again on mouseLeave', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} />);
    const item = screen.getByRole('radio', { name: 'TRIANGLE' });
    const box = () => item.querySelector('[data-testid="cabinet-box"]');

    expect(box()?.getAttribute('data-popped')).toBe('false');
    fireEvent.mouseEnter(item);
    expect(box()?.getAttribute('data-popped')).toBe('true');
    fireEvent.mouseLeave(item);
    expect(box()?.getAttribute('data-popped')).toBe('false');
  });

  it('the selected option stays popped through a hover+unhover — hover only adds pop, never removes the selected state\'s own pop', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} />);
    const item = screen.getByRole('radio', { name: 'SINE' });
    const box = () => item.querySelector('[data-testid="cabinet-box"]');

    fireEvent.mouseEnter(item);
    fireEvent.mouseLeave(item);
    expect(box()?.getAttribute('data-popped')).toBe('true');
  });

  it('hovering one option does not pop any other option', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} />);
    fireEvent.mouseEnter(screen.getByRole('radio', { name: 'TRIANGLE' }));

    const boxFor = (name: string) =>
      screen.getByRole('radio', { name }).querySelector('[data-testid="cabinet-box"]');
    expect(boxFor('TRIANGLE')?.getAttribute('data-popped')).toBe('true');
    expect(boxFor('SQUARE')?.getAttribute('data-popped')).toBe('false');
    expect(boxFor('SAWTOOTH')?.getAttribute('data-popped')).toBe('false');
  });

  it('never pops on hover while disabled, matching Button\'s own disabled-blocks-hover rule', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} disabled />);
    const item = screen.getByRole('radio', { name: 'TRIANGLE' });
    fireEvent.mouseEnter(item);
    expect(item.querySelector('[data-testid="cabinet-box"]')?.getAttribute('data-popped')).toBe('false');
  });

  // docs/specs/HEADER_HUB_CONSOLIDATION.md §1.4 — literal square box size,
  // overriding the responsive useCabinetBoxHeight() tier every other
  // consumer relies on by omitting these props entirely.
  it('passes boxSize as boxHeight/frontWidth/frontHeight on every option\'s CabinetBox when provided', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} boxSize={44} />);
    const boxFor = (name: string) =>
      screen.getByRole('radio', { name }).querySelector('[data-testid="cabinet-box"]');

    for (const name of ['TRIANGLE', 'SINE', 'SQUARE', 'SAWTOOTH']) {
      const box = boxFor(name);
      expect(box?.getAttribute('data-box-height')).toBe('44');
      expect(box?.getAttribute('data-front-width')).toBe('44');
      expect(box?.getAttribute('data-front-height')).toBe('44');
    }
  });

  it('omitting boxSize passes none of boxHeight/frontWidth/frontHeight — every existing consumer\'s responsive-tier behavior is unaffected (regression guard)', () => {
    render(<RadioButton schema={schema} value="sine" onChange={() => {}} />);
    const box = screen.getByRole('radio', { name: 'SINE' }).querySelector('[data-testid="cabinet-box"]');
    expect(box?.getAttribute('data-box-height')).toBeNull();
    expect(box?.getAttribute('data-front-width')).toBeNull();
    expect(box?.getAttribute('data-front-height')).toBeNull();
  });
});
