import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DualLabel } from './DualLabel';

describe('DualLabel', () => {
  it('renders nothing when neither loreLabel nor humanLabel is present', () => {
    const { container } = render(<DualLabel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders only the lore label when only loreLabel is present', () => {
    render(<DualLabel loreLabel="CALIBRATE PING" />);
    expect(screen.getByText('CALIBRATE PING')).toBeTruthy();
    expect(screen.queryByText('Reset Melody')).toBeNull();
  });

  it('renders only the human label when only humanLabel is present', () => {
    render(<DualLabel humanLabel="Reset Melody" />);
    expect(screen.getByText('Reset Melody')).toBeTruthy();
    expect(screen.queryByText('CALIBRATE PING')).toBeNull();
  });

  it('renders both labels when both are present', () => {
    render(<DualLabel loreLabel="CALIBRATE PING" humanLabel="Reset Melody" />);
    expect(screen.getByText('CALIBRATE PING')).toBeTruthy();
    expect(screen.getByText('Reset Melody')).toBeTruthy();
  });
});
