import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./CabinetBox', () => ({
  CabinetBox: ({ popped, children }: { popped: boolean; children: React.ReactNode }) => (
    <div data-testid="cabinet-box" data-popped={popped}>{children}</div>
  ),
}));

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

  it('falls back to schema.id for the accessible name when neither label is present, never leaving it unlabeled', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button' };
    render(<Button schema={schema} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'resetMelody' })).toBeTruthy();
  });

  it('is not disabled by default', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', humanLabel: 'Reset Melody' };
    render(<Button schema={schema} onClick={() => {}} />);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables the button and blocks onClick when disabled is true', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', humanLabel: 'Reset Melody' };
    const onClick = vi.fn();
    render(<Button schema={schema} onClick={onClick} disabled />);
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders through CabinetBox, flat (not popped) at rest', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', humanLabel: 'Reset Melody' };
    render(<Button schema={schema} onClick={() => {}} />);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('false');
  });

  it('pops on mouseEnter and flattens again on mouseLeave', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', humanLabel: 'Reset Melody' };
    render(<Button schema={schema} onClick={() => {}} />);
    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('true');
    fireEvent.mouseLeave(button);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('false');
  });

  it('pops on focus and flattens again on blur, independently of hover', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', humanLabel: 'Reset Melody' };
    render(<Button schema={schema} onClick={() => {}} />);
    const button = screen.getByRole('button');
    fireEvent.focus(button);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('true');
    fireEvent.blur(button);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('false');
  });

  it('pops on pointerDown and flattens again on pointerUp, independently of hover/focus', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', humanLabel: 'Reset Melody' };
    render(<Button schema={schema} onClick={() => {}} />);
    const button = screen.getByRole('button');
    fireEvent.pointerDown(button);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('true');
    fireEvent.pointerUp(button);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('false');
  });

  it('flattens on pointerCancel and pointerLeave the same way pointerUp does', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', humanLabel: 'Reset Melody' };
    render(<Button schema={schema} onClick={() => {}} />);
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button);
    fireEvent.pointerCancel(button);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('false');

    fireEvent.pointerDown(button);
    fireEvent.pointerLeave(button);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('false');
  });

  it('never pops while disabled, regardless of hover, focus, or pointer events', () => {
    const schema: ButtonSchema = { id: 'resetMelody', type: 'button', humanLabel: 'Reset Melody' };
    render(<Button schema={schema} onClick={() => {}} disabled />);
    const button = screen.getByRole('button');

    fireEvent.mouseEnter(button);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('false');

    fireEvent.focus(button);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('false');

    fireEvent.pointerDown(button);
    expect(screen.getByTestId('cabinet-box').getAttribute('data-popped')).toBe('false');
  });
});
