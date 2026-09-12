import { describe, expect, it } from 'vitest';

import { getCssRuleBody } from './cssRuleBody';

// Shared by every TYPE_SCALE.md Phase 2+ CSS-migration test — verifies that a
// declaration lands inside the CORRECT selector's rule body, not just
// somewhere in the file (a plain string .toContain() can't tell ".sc-button"
// from ".sc-button-facade", or a declaration accidentally added to the wrong
// rule of two same-file rules sharing a line of text).

describe('getCssRuleBody', () => {
  it('extracts a simple rule body', () => {
    const css = `.sc-button {\n  display: flex;\n  color: red;\n}\n`;
    expect(getCssRuleBody(css, '.sc-button')).toBe('display: flex;\n  color: red;');
  });

  it('returns null when the selector does not exist', () => {
    const css = `.sc-button {\n  display: flex;\n}\n`;
    expect(getCssRuleBody(css, '.sc-toggle')).toBeNull();
  });

  it('does not match a longer selector that merely starts with the target (prefix collision)', () => {
    const css = `.sc-button-facade {\n  width: 100%;\n}\n`;
    expect(getCssRuleBody(css, '.sc-button')).toBeNull();
  });

  it('does not confuse a target selector with one nested inside a combinator selector', () => {
    const css = `.sc-button .sc-cabinet-box__front {\n  background-color: red;\n}\n`;
    expect(getCssRuleBody(css, '.sc-button')).toBeNull();
  });

  it('finds the right rule when multiple rules exist in the file, selecting the exact match', () => {
    const css = [
      '.sc-button:focus-visible {',
      '  outline: 2px solid red;',
      '}',
      '',
      '.sc-button {',
      '  display: inline-flex;',
      '  width: fit-content;',
      '}',
      '',
      '.sc-button .sc-cabinet-box__front {',
      '  background-color: blue;',
      '}',
      '',
    ].join('\n');
    expect(getCssRuleBody(css, '.sc-button')).toBe('display: inline-flex;\n  width: fit-content;');
  });

  it('extracts an @container at-rule body, tolerating the parenthesized condition', () => {
    const css = [
      '@container sc-control (max-width: 120px) {',
      '  .sc-dual-label__lore,',
      '  .sc-dual-label__human {',
      '    font-size: var(--font-size-label-compact);',
      '  }',
      '}',
      '',
    ].join('\n');
    const body = getCssRuleBody(css, '@container sc-control (max-width: 120px)');
    expect(body).toContain('.sc-dual-label__lore,');
    expect(body).toContain('font-size: var(--font-size-label-compact);');
  });

  it('handles a selector list (comma-separated) sharing one rule body', () => {
    const css = `.sc-dual-label__lore,\n.sc-dual-label__human {\n  font-size: 1rem;\n}\n`;
    expect(getCssRuleBody(css, '.sc-dual-label__human')).toBe('font-size: 1rem;');
  });

  it('does not match a selector that is only the LATER part of a descendant-combinator selector (found via a real bug, TYPE_SCALE.md Task 7)', () => {
    // Searching for '.sc-dual-label__human' alone must not match inside
    // '.sc-accordion__row .sc-dual-label__human' — the forward-boundary
    // check alone can't catch this, since a space legitimately precedes
    // both a real standalone selector (comma-list continuation) and a
    // descendant-combinator target; only checking what precedes the space
    // (a comma/brace vs. another selector token) can tell them apart.
    const css = '.sc-accordion__row .sc-dual-label__human {\n  font-size: 1rem;\n}\n';
    expect(getCssRuleBody(css, '.sc-dual-label__human')).toBeNull();
  });

  it('does not match a selector that is the LATER part of a child-combinator selector, no-space style', () => {
    const css = '.sc-directional-panel>.sc-dual-label__human {\n  font-size: 1rem;\n}\n';
    expect(getCssRuleBody(css, '.sc-dual-label__human')).toBeNull();
  });

  it('still finds a real standalone rule even when preceded by a comment block (this codebase\'s own leading-comment style)', () => {
    const css = [
      '/* Some explanatory comment',
      '   spanning multiple lines. */',
      '.sc-button {',
      '  display: inline-flex;',
      '}',
      '',
    ].join('\n');
    expect(getCssRuleBody(css, '.sc-button')).toBe('display: inline-flex;');
  });

  it('still rejects a descendant-combinator target even when the whole rule is preceded by a comment block', () => {
    const css = [
      '/* comment */',
      '.sc-accordion__row .sc-dual-label__human {',
      '  font-size: 1rem;',
      '}',
      '',
    ].join('\n');
    expect(getCssRuleBody(css, '.sc-dual-label__human')).toBeNull();
  });
});
