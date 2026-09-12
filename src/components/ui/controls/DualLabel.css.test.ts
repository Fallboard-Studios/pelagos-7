import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getCssRuleBody } from '@/testUtils/cssRuleBody';

// TYPE_SCALE.md Task 3 — DualLabel.css's migration onto the new size tokens
// plus its new compact container-query fallback (spec §1.4/§4).

const cssSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'DualLabel.css'),
  'utf-8',
);

describe('DualLabel.css', () => {
  it('sizes __lore with the new label-lore token, not the old 0.7rem literal', () => {
    const body = getCssRuleBody(cssSource, '.sc-dual-label__lore');
    expect(body).toContain('font-size: var(--font-size-label-lore);');
    expect(body).not.toContain('0.7rem');
  });

  it('sizes __human with the new label token, not the old 0.85rem literal', () => {
    const body = getCssRuleBody(cssSource, '.sc-dual-label__human');
    expect(body).toContain('font-size: var(--font-size-label);');
    expect(body).not.toContain('0.85rem');
  });

  it('drops both __lore and __human to the compact token inside the sc-control container query', () => {
    const containerBody = getCssRuleBody(cssSource, '@container sc-control (max-width: 120px)');
    expect(containerBody).not.toBeNull();

    const compactLore = getCssRuleBody(containerBody!, '.sc-dual-label__lore');
    const compactHuman = getCssRuleBody(containerBody!, '.sc-dual-label__human');
    expect(compactLore).toBe('font-size: var(--font-size-label-compact);');
    expect(compactHuman).toBe('font-size: var(--font-size-label-compact);');
  });

  it('keeps __lore/__human as a single comma-separated selector list inside the container query, not two separate rules', () => {
    // A single shared rule body means one const gets both, not two nearly-
    // identical rules that could silently drift apart later.
    const occurrences = cssSource.split('font-size: var(--font-size-label-compact);').length - 1;
    expect(occurrences).toBe(1);
  });

  it('leaves .sc-dual-label (the flex column wrapper) untouched', () => {
    const body = getCssRuleBody(cssSource, '.sc-dual-label');
    expect(body).toBe('display: flex;\n  flex-direction: column;\n  gap: 2px;');
  });
});
