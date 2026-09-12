import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getCssRuleBody } from '@/testUtils/cssRuleBody';

// TYPE_SCALE.md Tasks 4-6 — every one of the 11 leaf ControlSchema
// primitives' own root CSS selector gets the same 4-declaration addition
// (spec §1.4/§1.5): --font-controls family, --font-weight-control weight,
// and the container-type/container-name pair establishing the shared
// sc-control size-container context DualLabel.css's own compact fallback
// (Task 3) queries. AccordionContainer/DirectionalPanel are deliberately
// excluded — they keep --font-sans and never establish this container
// (spec §1.4's explicit scope decision; §1.6 covers their own separate fix).
//
// This list grows across Tasks 4 (4 entries), 5 (+4), and 6 (+3) rather than
// three near-duplicate test files, since the contract being checked is
// identical for all 11 — only the slider trio (Task 6) has additional,
// slider-specific behavior beyond this shared contract, covered separately
// in SliderValueContainerQuery.test.ts.

const controlsDir = dirname(fileURLToPath(import.meta.url));

const LEAF_CONTROLS = [
  { file: 'Button.css', selector: '.sc-button' },
  { file: 'CoordsInput.css', selector: '.sc-coords-input' },
  { file: 'TextInput.css', selector: '.sc-text-input' },
  { file: 'Toggle.css', selector: '.sc-toggle' },
];

describe.each(LEAF_CONTROLS)('$file root selector ($selector)', ({ file, selector }) => {
  const cssSource = readFileSync(resolve(controlsDir, file), 'utf-8');
  const body = getCssRuleBody(cssSource, selector);

  it('is a real rule in the file', () => {
    expect(body).not.toBeNull();
  });

  it('sets font-family to --font-controls', () => {
    expect(body).toContain('font-family: var(--font-controls);');
  });

  it('sets font-weight to --font-weight-control', () => {
    expect(body).toContain('font-weight: var(--font-weight-control);');
  });

  it('establishes the shared sc-control size container', () => {
    expect(body).toContain('container-type: inline-size;');
    expect(body).toContain('container-name: sc-control;');
  });
});
