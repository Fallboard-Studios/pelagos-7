import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./CabinetBox', () => ({
  CabinetBox: (props: { popped: boolean; boxHeight?: number; timelineKey: string }) => (
    <div
      data-testid="cabinet-box"
      data-popped={String(props.popped)}
      data-box-height={props.boxHeight}
      data-timeline-key={props.timelineKey}
    />
  ),
}));

import { Toggle } from './Toggle';
import type { ToggleSchema } from '@/types/controls';

const schema: ToggleSchema = { id: 'layerActive', type: 'toggle', loreLabel: 'LAYER ACTIVE', humanLabel: 'Layer Active' };

describe('Toggle', () => {
  it('renders role="switch" reflecting a false controlled value', () => {
    render(<Toggle schema={schema} value={false} onChange={() => {}} />);
    const el = screen.getByRole('switch');
    expect(el.getAttribute('aria-checked')).toBe('false');
  });

  it('renders role="switch" reflecting a true controlled value', () => {
    render(<Toggle schema={schema} value={true} onChange={() => {}} />);
    const el = screen.getByRole('switch');
    expect(el.getAttribute('aria-checked')).toBe('true');
  });

  it('does not flip its own visual state when clicked without a value prop update (controlled, no internal state)', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Toggle schema={schema} value={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    // Still reflects the prop, not an internally-flipped state, until the parent re-renders with a new value.
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    rerender(<Toggle schema={schema} value={true} onChange={onChange} />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('calls onChange(!value) on click', () => {
    const onChange = vi.fn();
    render(<Toggle schema={schema} value={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders its own schema labels via an internally-composed DualLabel', () => {
    render(<Toggle schema={schema} value={false} onChange={() => {}} />);
    expect(screen.getByText('LAYER ACTIVE')).toBeTruthy();
    expect(screen.getByText('Layer Active')).toBeTruthy();
  });

  it('adds an isActive class to the component root when value is true, for a plain CSS hook (e.g. .sc-toggle.isActive)', () => {
    const { container } = render(<Toggle schema={schema} value={true} onChange={() => {}} />);
    expect(container.querySelector('.sc-toggle.isActive')).toBeTruthy();
  });

  it('omits the isActive class from the component root when value is false', () => {
    const { container } = render(<Toggle schema={schema} value={false} onChange={() => {}} />);
    expect(container.querySelector('.sc-toggle.isActive')).toBeNull();
    expect(container.querySelector('.sc-toggle')).toBeTruthy();
  });

  it('falls back to schema.id for the accessible name when neither label is present, never leaving it unlabeled', () => {
    const bareSchema: ToggleSchema = { id: 'layerActive', type: 'toggle' };
    render(<Toggle schema={bareSchema} value={false} onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'layerActive' })).toBeTruthy();
  });

  it('is not disabled by default — no existing behavior changes', () => {
    render(<Toggle schema={schema} value={false} onChange={() => {}} />);
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables the underlying switch when disabled is true', () => {
    render(<Toggle schema={schema} value={false} onChange={() => {}} disabled />);
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not call onChange when clicked while disabled', () => {
    const onChange = vi.fn();
    render(<Toggle schema={schema} value={false} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders through CabinetBox with popped="true" when value is true (Oblique Cabinetry, roadmap 11.1.2)', () => {
    render(<Toggle schema={schema} value={true} onChange={() => {}} />);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('true');
  });

  it('renders through CabinetBox with popped="false" when value is false', () => {
    render(<Toggle schema={schema} value={false} onChange={() => {}} />);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('false');
  });

  it('passes a fixed 32px boxHeight to CabinetBox, regardless of viewport', () => {
    render(<Toggle schema={schema} value={false} onChange={() => {}} />);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-box-height')).toBe('32');
  });

  it('passes a schema-scoped timelineKey distinct from Button\'s own cabinet-button- prefix', () => {
    render(<Toggle schema={schema} value={false} onChange={() => {}} />);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-timeline-key')).toBe('cabinet-toggle-layerActive');
  });

  it('keeps CabinetBox popped="true" reflecting a checked value even when disabled', () => {
    render(<Toggle schema={schema} value={true} onChange={() => {}} disabled />);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('true');
  });

  it('renders no separate thumb element — CabinetBox is the switch\'s only visual child', () => {
    const { container } = render(<Toggle schema={schema} value={false} onChange={() => {}} />);
    expect(container.querySelector('.sc-toggle__thumb')).toBeNull();
  });
});
