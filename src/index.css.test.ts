import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// TYPE_SCALE.md Task 2 — index.css's new type-scale tokens. Vitest's default
// config treats CSS imports as a no-op (no `css: true` in vitest.config.ts),
// so no existing component test ever exercises real computed styles; these
// are text-contract assertions against the real source file instead, the
// same class of test main.fonts.test.ts already uses for main.tsx.

const cssSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), 'index.css'),
  'utf-8',
);

describe('index.css type-scale tokens', () => {
  it('defines --font-controls falling back to Rajdhani then the system stack', () => {
    expect(cssSource).toContain(
      "--font-controls: 'Titillium Web', 'Rajdhani', system-ui, Avenir, Helvetica, Arial, sans-serif;",
    );
  });

  it('defines all 7 semantic font-size tokens with the spec-mandated rem values', () => {
    const expectedSizeTokens = [
      '--font-size-label-compact: 0.6875rem;',
      '--font-size-label-lore: 0.75rem;',
      '--font-size-label: 0.9375rem;',
      '--font-size-body: 1rem;',
      '--font-size-heading-sm: 1.125rem;',
      '--font-size-heading-md: 1.375rem;',
      '--font-size-heading-lg: 1.75rem;',
    ];
    for (const token of expectedSizeTokens) {
      expect(cssSource).toContain(token);
    }
  });

  it('defines all 4 font-weight tokens with the spec-mandated numeric values', () => {
    const expectedWeightTokens = [
      '--font-weight-control: 400;',
      '--font-weight-regular: 500;',
      '--font-weight-medium: 600;',
      '--font-weight-bold: 700;',
    ];
    for (const token of expectedWeightTokens) {
      expect(cssSource).toContain(token);
    }
  });

  it(":root's document-wide font-weight reads var(--font-weight-regular), not a bare 400", () => {
    expect(cssSource).toContain('font-weight: var(--font-weight-regular);');
    expect(cssSource).not.toMatch(/\n\s*font-weight:\s*400;/);
  });

  it('keeps the old --font-size-sm/md/lg tokens for now (removed only in Task 10, after every consumer migrates)', () => {
    expect(cssSource).toContain('--font-size-sm: 12px;');
    expect(cssSource).toContain('--font-size-md: 16px;');
    expect(cssSource).toContain('--font-size-lg: 20px;');
  });

  it('removes the dead Vite-scaffold h1 font-size rule (zero real <h1> consumers)', () => {
    expect(cssSource).not.toContain('font-size: 3.2em;');
  });

  it('removes the dead Vite-scaffold bare button rule (zero real bare <button> consumers)', () => {
    expect(cssSource).not.toContain('padding: 0.6em 1.2em;');
  });

  it('leaves button:hover/:focus and the light-scheme media query untouched (out of this task\'s scope)', () => {
    expect(cssSource).toContain('button:hover {');
    expect(cssSource).toContain('button:focus,');
    expect(cssSource).toContain('@media (prefers-color-scheme: light)');
  });
});
