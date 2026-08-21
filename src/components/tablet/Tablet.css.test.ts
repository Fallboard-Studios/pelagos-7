import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

// jsdom has no real CSS cascade/media-query engine, so these assert directly
// on the stylesheet source. Per docs/tasks/LAYOUT.md Task 2: `.tablet` must
// stop reorienting (row-flip + progressive widening) at every breakpoint and
// gain `position: relative` as the containing block Task 7 will need.
//
// Note: deliberately NOT `new URL('./Tablet.css', import.meta.url)` — Vite
// special-cases that exact literal pattern as an asset-URL import and
// rewrites it to a dev-server URL, not a real file path.

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'Tablet.css'), 'utf-8');

describe('Tablet.css — remove reorientation, add position: relative (Task 2)', () => {
  it('has no @media blocks at all', () => {
    expect(css).not.toMatch(/@media/);
  });

  it('never sets flex-direction: row anywhere in the file', () => {
    // Edge case: the row-flip only ever existed inside the removed media
    // queries — if it survived outside one, the reorientation isn't actually gone.
    expect(css).not.toMatch(/flex-direction:\s*row/);
  });

  it('keeps flex-direction: column as the unconditional (base) rule', () => {
    expect(css).toMatch(/\.tablet\s*{[^}]*flex-direction:\s*column/s);
  });

  it('gives .tablet position: relative', () => {
    expect(css).toMatch(/\.tablet\s*{[^}]*position:\s*relative/s);
  });

  it('no longer references the desktop-only --tablet-width/--tablet-aspect-ratio scaling tokens', () => {
    // Edge case: those tokens were only ever set inside the removed
    // min-width blocks — confirms the progressive-widening rules are gone,
    // not just reformatted.
    expect(css).not.toMatch(/--tablet-width/);
    expect(css).not.toMatch(/--tablet-aspect-ratio/);
  });
});
