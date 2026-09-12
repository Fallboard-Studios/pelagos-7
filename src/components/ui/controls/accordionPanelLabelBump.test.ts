import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getCssRuleBody } from '@/testUtils/cssRuleBody';

// TYPE_SCALE.md Task 7 — the direct fix for the named "accordion/directional-
// panel labels read too small" complaint (spec §1.6). Both stay --font-sans
// (Rajdhani, untouched here — confirmed by the "no container-type" guard
// below, the same signal §1.4/§1.5 use to mean "not a leaf control") but get
// an explicit size + weight bump on their own DualLabel human label only.

const controlsDir = dirname(fileURLToPath(import.meta.url));

describe('AccordionContainer.css label bump', () => {
  const cssSource = readFileSync(resolve(controlsDir, 'AccordionContainer.css'), 'utf-8');

  it('bumps the trigger label (scoped to .sc-accordion__row, not the bare selector) to heading-sm/medium weight', () => {
    const body = getCssRuleBody(cssSource, '.sc-accordion__row .sc-dual-label__human');
    expect(body).not.toBeNull();
    expect(body).toContain('font-size: var(--font-size-heading-sm);');
    expect(body).toContain('font-weight: var(--font-weight-medium);');
  });

  it('leaves the lore caption untouched — no rule targets .sc-accordion__row .sc-dual-label__lore', () => {
    expect(getCssRuleBody(cssSource, '.sc-accordion__row .sc-dual-label__lore')).toBeNull();
  });

  it('does not bump every .sc-dual-label__human in the app — only ones inside .sc-accordion__row', () => {
    // A bare, unscoped rule would leak into every nested control's own
    // label. This asserts the ONLY human-label rule in the file is the
    // scoped one above by checking the bare selector has no rule of its own
    // here (AccordionContainer.css never defines .sc-dual-label__human
    // outside the .sc-accordion__row scope — that selector belongs to
    // DualLabel.css, not here).
    expect(getCssRuleBody(cssSource, '.sc-dual-label__human')).toBeNull();
  });

  it("tokenizes the indicator glyph's weight to --font-weight-medium (same 600 value, not renumbered)", () => {
    const body = getCssRuleBody(cssSource, '.sc-accordion__indicator');
    expect(body).toContain('font-weight: var(--font-weight-medium);');
    expect(body).not.toContain('font-weight: 600;');
  });

  it('gains no container-type/container-name (out of scope per spec §1.4 — this stays chrome, not a leaf control)', () => {
    expect(cssSource).not.toContain('container-type');
    expect(cssSource).not.toContain('container-name');
  });
});

describe('DirectionalPanel.css label bump', () => {
  const cssSource = readFileSync(resolve(controlsDir, 'DirectionalPanel.css'), 'utf-8');

  it("bumps the panel's own group label (direct child, not descendant) to heading-sm/medium weight", () => {
    // No spaces around '>' — matches this file's own existing child-combinator
    // convention (.sc-directional-panel-facade>.sc-cabinet-box, etc.).
    const body = getCssRuleBody(cssSource, '.sc-directional-panel>.sc-dual-label__human');
    expect(body).not.toBeNull();
    expect(body).toContain('font-size: var(--font-size-heading-sm);');
    expect(body).toContain('font-weight: var(--font-weight-medium);');
  });

  it('leaves the lore caption untouched — no rule targets .sc-directional-panel>.sc-dual-label__lore', () => {
    expect(getCssRuleBody(cssSource, '.sc-directional-panel>.sc-dual-label__lore')).toBeNull();
  });

  it("uses a direct-child combinator, not a descendant selector — a nested DirectionalPanel's own DualLabel (inside .sc-directional-panel__content) must not be caught", () => {
    // A descendant selector `.sc-directional-panel .sc-dual-label__human`
    // (space, no '>') would also match a DualLabel nested arbitrarily deep
    // inside .sc-directional-panel__content — e.g. a control composed
    // inside this panel's own children. Only the direct-child form should
    // exist in this file.
    expect(cssSource).not.toContain('.sc-directional-panel .sc-dual-label__human');
  });

  it('gains no container-type/container-name (out of scope per spec §1.4 — this stays chrome, not a leaf control)', () => {
    expect(cssSource).not.toContain('container-type');
    expect(cssSource).not.toContain('container-name');
  });
});
