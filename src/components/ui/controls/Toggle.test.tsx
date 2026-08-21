import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
});
