import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Button } from './Button';
import type { ButtonSchema } from '@/types/controls';

describe('Button', () => {
  it('renders its own schema labels via an internally-composed DualLabel', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', loreLabel: 'CALIBRATE PING', humanLabel: 'Reset Melody' };
    render(<Button schema={schema} onClick={() => {}} />);
    expect(screen.getByText('CALIBRATE PING')).toBeTruthy();
    expect(screen.getByText('Reset Melody')).toBeTruthy();
  });

  it('calls onClick exactly once per click', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', humanLabel: 'Reset Melody' };
    const onClick = vi.fn();
    render(<Button schema={schema} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('resolves its accessible name from humanLabel', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', loreLabel: 'CALIBRATE PING', humanLabel: 'Reset Melody' };
    render(<Button schema={schema} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Reset Melody' })).toBeTruthy();
  });

  it('falls back to loreLabel for the accessible name when humanLabel is absent', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', loreLabel: 'CALIBRATE PING' };
    render(<Button schema={schema} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'CALIBRATE PING' })).toBeTruthy();
  });
});
