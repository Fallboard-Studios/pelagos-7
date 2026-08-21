import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

// jsdom has no real CSS cascade/media-query engine (see vitest.config.ts —
// environment: 'jsdom'), so a rendering-based test can't observe whether a
// custom property is actually referenced anywhere. These tests assert
// directly on the stylesheet source instead, per docs/tasks/LAYOUT.md Task 1.
//
// Note: deliberately NOT `new URL('./index.css', import.meta.url)` — Vite
// special-cases that exact literal pattern as an asset-URL import and
// rewrites it to a dev-server URL, not a real file path.

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'index.css'), 'utf-8');

describe('index.css — dead sleeve-width tokens (Task 1)', () => {
  it('does not define --sleeve-width-tablet', () => {
    expect(css).not.toMatch(/--sleeve-width-tablet\s*:/);
  });

  it('does not define --sleeve-width-desktop', () => {
    expect(css).not.toMatch(/--sleeve-width-desktop\s*:/);
  });

  it('still defines --sleeve-width (the token that IS used)', () => {
    // Edge case: guards against an overzealous removal deleting the one
    // sleeve-width token that SleeveContainer.css actually references.
    expect(css).toMatch(/--sleeve-width\s*:\s*64px/);
  });

  it('leaves the unrelated prefers-color-scheme media query untouched', () => {
    // Edge case: this task must not touch index.css's other @media block.
    expect(css).toMatch(/@media \(prefers-color-scheme: light\)/);
  });
});

describe('index.css — --power-corner-width lives at :root (Task 7)', () => {
  it('defines --power-corner-width exactly once', () => {
    // Per docs/tasks/LAYOUT.md Task 7: SleeveContainer.css and
    // ScreenViewport.css (Task 8) are siblings under .tablet, not
    // ancestor/descendant — a var() defined on .sleeve-container wouldn't be
    // visible to ScreenViewport.css. It has to live at :root, alongside
    // --sleeve-width, so both files can reference the same value.
    const definitions = css.match(/--power-corner-width\s*:\s*[^;]+;/g) ?? [];
    expect(definitions.length).toBe(1);
  });

  it('defines it inside :root, not some other selector', () => {
    expect(css).toMatch(/:root\s*{[^}]*--power-corner-width\s*:/s);
  });
});
