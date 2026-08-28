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
});
