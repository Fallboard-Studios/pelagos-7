import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

// jsdom has no real CSS cascade/media-query engine, so these assert directly
// on the stylesheet source. Per docs/tasks/LAYOUT.md Task 3: `.sleeve-container`
// must stop flipping to a vertical bar (and rotating its logo) at ≥48em —
// the horizontal-bar base rules apply at every size now.
//
// Note: deliberately NOT `new URL('./SleeveContainer.css', import.meta.url)` —
// Vite special-cases that exact literal pattern as an asset-URL import and
// rewrites it to a dev-server URL, not a real file path.

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'SleeveContainer.css'), 'utf-8');

describe('SleeveContainer.css — remove column-flip block (Task 3)', () => {
  it('has no @media blocks at all', () => {
    expect(css).not.toMatch(/@media/);
  });

  it('never rotates .sleeve-logo anywhere in the file', () => {
    // Edge case: the -90deg rotation only ever existed inside the removed
    // media query — if it survived, the logo would still flip on desktop.
    expect(css).not.toMatch(/rotate\(-90deg\)/);
  });

  it('never sets flex-direction: column on .sleeve-container', () => {
    expect(css).not.toMatch(/flex-direction:\s*column/);
  });

  it('keeps the base horizontal-bar sizing unconditionally', () => {
    expect(css).toMatch(/\.sleeve-container\s*{[^}]*height:\s*var\(--sleeve-width\)/s);
    expect(css).toMatch(/\.sleeve-container\s*{[^}]*width:\s*100%/s);
  });
});
