import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CompanyManager } from './CompanyManager';

describe('CompanyManager', () => {
  it('renders the company button row and CRUD controls, in that order', () => {
    const { container } = render(<CompanyManager />);

    const buttonRow = container.querySelector('.company-button-row');
    const crudControls = container.querySelector('.company-crud-controls');

    expect(buttonRow).toBeTruthy();
    expect(crudControls).toBeTruthy();
    // Roadmap: Robot Selection Filter Panel — CompanyOptionsSection no longer renders here; it
    // moved to be RobotsTab's own direct child (RobotsTab.test.tsx covers its new position).
    expect(container.querySelector('.company-options-section')).toBeNull();

    // DOCUMENT_POSITION_FOLLOWING: buttonRow comes before crudControls, in document order.
    expect(buttonRow!.compareDocumentPosition(crudControls!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders "All" checked by default, and no "Reset" button', () => {
    render(<CompanyManager />);
    expect(screen.getByRole('radio', { name: 'All' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('radio', { name: 'Reset' })).toBeNull();
  });

  // Roadmap Phase 14 (docs/specs/COLOR_SCHEME_TRAIT_THEMING.md §1.5, Task 14) — the Company
  // trait's own colors (blue/plum, since the 2026-09-12 rebalance swapped Company and Time/Space's
  // pairs so the 4 audio-page traits stop clustering in the blue family) on the manager's own root.
  it("scopes its root to the Company trait's colors (blue/plum)", () => {
    const { container } = render(<CompanyManager />);
    const root = container.querySelector('.company-manager') as HTMLElement;
    expect(root.style.getPropertyValue('--color-accent-a')).toBe('#4f6d7a');
    expect(root.style.getPropertyValue('--color-accent-b')).toBe('#65617f');
  });
});
