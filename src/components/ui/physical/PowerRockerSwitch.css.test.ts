import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

// jsdom has no real CSS cascade/media-query engine, so these assert directly
// on the stylesheet source. Per docs/tasks/LAYOUT.md Task 4: the ≥48em
// `transform: none` override goes, so the rotated mobile transform applies
// at every size — but the unrelated prefers-reduced-motion block must survive.
//
// Note: deliberately NOT `new URL('./PowerRockerSwitch.css', import.meta.url)`
// — Vite special-cases that exact literal pattern as an asset-URL import and
// rewrites it to a dev-server URL, not a real file path.

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'PowerRockerSwitch.css'), 'utf-8');

describe('PowerRockerSwitch.css — remove transform: none override (Task 4)', () => {
  it('has exactly one @media block left', () => {
    // Edge case: must remove the reorientation override without also
    // dropping the unrelated accessibility block.
    expect(css.match(/@media/g)?.length ?? 0).toBe(1);
  });

  it('keeps the prefers-reduced-motion block', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it('never sets transform: none on .rocker-panel', () => {
    expect(css).not.toMatch(/\.rocker-panel\s*{\s*transform:\s*none/);
  });

  it('keeps the rotated transform as the unconditional (base) rule', () => {
    expect(css).toMatch(/\.rocker-panel\s*{[^}]*transform:\s*translateX\(100%\) rotate\(90deg\)/s);
  });
});
