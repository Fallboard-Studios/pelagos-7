import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

// jsdom has no real CSS cascade/media-query engine, so these assert directly
// on the stylesheet source.
//
// Note: deliberately NOT `new URL('./SleeveContainer.css', import.meta.url)`
// — Vite special-cases that exact literal pattern as an asset-URL import and
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

describe('SleeveContainer.css — cutaway structure (Task 7)', () => {
  it('does not redefine --power-corner-width locally', () => {
    // It's defined once at :root (index.css) so ScreenViewport.css (a
    // sibling under .tablet, not a descendant of .sleeve-container — Task 8)
    // can reference the same value. A local redefinition here would let the
    // two files silently drift apart.
    expect(css).not.toMatch(/--power-corner-width\s*:/);
  });

  it('sizes .sleeve-container__power-corner with var(--power-corner-width)', () => {
    expect(css).toMatch(/\.sleeve-container__power-corner\s*{[^}]*width:\s*var\(--power-corner-width\)/s);
  });

  it('offsets .sleeve-container__top-strip with var(--power-corner-width), not a second hardcoded value', () => {
    expect(css).toMatch(/\.sleeve-container__top-strip\s*{[^}]*left:\s*var\(--power-corner-width\)/s);
  });

  it('positions both new elements absolutely, above ScreenViewport', () => {
    expect(css).toMatch(/\.sleeve-container__power-corner\s*{[^}]*position:\s*absolute/s);
    expect(css).toMatch(/\.sleeve-container__top-strip\s*{[^}]*position:\s*absolute/s);
  });

  it('takes the whole cutaway instance out of flex flow via a --cutaway modifier', () => {
    // Correction found while starting Task 8: making only the two children
    // absolute leaves the <aside> root still claiming its normal 64px flex
    // slot in .tablet's column — ScreenViewport never actually becomes
    // flush with the top. The modifier must position the root itself.
    expect(css).toMatch(/\.sleeve-container--cutaway\s*{[^}]*position:\s*absolute/s);
    expect(css).toMatch(/\.sleeve-container--cutaway\s*{[^}]*top:\s*0/s);
  });
});
