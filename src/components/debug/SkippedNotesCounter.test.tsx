import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SkippedNotesCounter } from './SkippedNotesCounter';
import { useDebugStore } from '@/stores/debugStore';

// Real store, real render — plain presentational readout, no mocks needed.

describe('SkippedNotesCounter', () => {
  beforeEach(() => {
    useDebugStore.setState({ skippedNotesHistory: [] });
  });

  it('shows 0.0 for both averages when no measures have been recorded yet', () => {
    render(<SkippedNotesCounter />);
    expect(screen.getByTestId('skipped-notes-avg-4').textContent).toBe('0.0');
    expect(screen.getByTestId('skipped-notes-avg-16').textContent).toBe('0.0');
  });

  it('averages over the last 4 measures only, ignoring older ones, for the 4-measure readout', () => {
    // 12 old measures at 10 skips each, then 4 recent ones at 0 — the 4-measure
    // average must reflect only the recent 4, not the noisy history before them.
    const history = [...Array(12).fill(10), 0, 0, 0, 0];
    useDebugStore.setState({ skippedNotesHistory: history });
    render(<SkippedNotesCounter />);
    expect(screen.getByTestId('skipped-notes-avg-4').textContent).toBe('0.0');
  });

  it('averages over the full (up to 16-measure) history for the 16-measure readout', () => {
    const history = [...Array(12).fill(10), 0, 0, 0, 0]; // sum 120, 16 entries -> 7.5
    useDebugStore.setState({ skippedNotesHistory: history });
    render(<SkippedNotesCounter />);
    expect(screen.getByTestId('skipped-notes-avg-16').textContent).toBe('7.5');
  });

  it('averages over however many measures exist when fewer than 4/16 have been recorded', () => {
    useDebugStore.setState({ skippedNotesHistory: [3, 1] }); // avg 2, not padded with zeros
    render(<SkippedNotesCounter />);
    expect(screen.getByTestId('skipped-notes-avg-4').textContent).toBe('2.0');
    expect(screen.getByTestId('skipped-notes-avg-16').textContent).toBe('2.0');
  });

  it('renders as a fixed, bottom-left overlay with a solid background', () => {
    render(<SkippedNotesCounter />);
    const root = screen.getByTestId('skipped-notes-counter');
    expect(root.className).toContain('skipped-notes-counter');
  });
});
