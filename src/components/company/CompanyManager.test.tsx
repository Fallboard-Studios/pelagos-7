import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CompanyManager } from './CompanyManager';

describe('CompanyManager', () => {
  it('renders the company button row, CRUD controls, and options section, in that order', () => {
    const { container } = render(<CompanyManager />);

    const buttonRow = container.querySelector('.company-button-row');
    const crudControls = container.querySelector('.company-crud-controls');
    const optionsSection = container.querySelector('.company-options-section');

    expect(buttonRow).toBeTruthy();
    expect(crudControls).toBeTruthy();
    expect(optionsSection).toBeTruthy();

    // DOCUMENT_POSITION_FOLLOWING: buttonRow comes before crudControls, which comes before
    // optionsSection, in document order.
    expect(buttonRow!.compareDocumentPosition(crudControls!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(crudControls!.compareDocumentPosition(optionsSection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders the "None" company button by default (no company selected)', () => {
    render(<CompanyManager />);
    expect(screen.getByRole('radio', { name: 'None' })).toBeTruthy();
  });

  // Roadmap Phase 14 (docs/specs/COLOR_SCHEME_TRAIT_THEMING.md §1.5, Task 14) — the Company
  // trait's own colors (purple/pink) on the manager's own root.
  it("scopes its root to the Company trait's colors (purple/pink)", () => {
    const { container } = render(<CompanyManager />);
    const root = container.querySelector('.company-manager') as HTMLElement;
    expect(root.style.getPropertyValue('--color-accent-a')).toBe('#7a5484');
    expect(root.style.getPropertyValue('--color-accent-b')).toBe('#ae5378');
  });
});
