import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

// jsdom has no real CSS cascade/media-query engine, so these assert directly
// on the stylesheet source. Per docs/tasks/LAYOUT.md Task 6: the ≥64em
// two-column `.screen-content` grid goes, and the `robotlist` grid area is
// dropped now that RobotList is deleted (Task 5) — but the *unrelated*
// ≥48em decorative rail/stripe block stays untouched (Task 11 territory,
// still awaiting a human decision per spec §7.3).
//
// Note: deliberately NOT `new URL('./ScreenViewport.css', import.meta.url)`
// — Vite special-cases that exact literal pattern as an asset-URL import and
// rewrites it to a dev-server URL, not a real file path.

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'ScreenViewport.css'), 'utf-8');

describe('ScreenViewport.css — drop two-column grid + robotlist area (Task 6)', () => {
  it('has no min-width: 64em block', () => {
    expect(css).not.toMatch(/min-width:\s*64em/);
  });

  it('never sets grid-template-columns to more than one column', () => {
    // Edge case: the two-column grid (`2fr 1fr`) only ever existed inside
    // the removed 64em block — if it survived outside one, content would
    // still reorient into two columns.
    expect(css).not.toMatch(/grid-template-columns:\s*2fr 1fr/);
  });

  it('does not reference the robotlist grid area anywhere', () => {
    expect(css).not.toMatch(/robotlist/);
  });

  it('keeps exactly transport/worldview/console as the grid areas, in that order, with nothing after', () => {
    // Anchored with a trailing `;` so this fails while a 4th ("robotlist")
    // area still follows — a match on just the first three lines as a
    // prefix would be a false pass.
    expect(css).toMatch(
      /grid-template-areas:\s*"transport"\s*"worldview"\s*"console"\s*;/
    );
  });

  it('sets grid-template-rows to auto 1fr 1fr (one track per remaining area)', () => {
    expect(css).toMatch(/grid-template-rows:\s*auto 1fr 1fr/);
  });

  it('still has exactly one @media block — the unrelated ≥48em decorative rail/stripe rule', () => {
    // Edge case: confirms Task 6 doesn't touch the 48em block, which is
    // still gated on an unanswered open question (spec §7.3 / plan Task 11).
    expect(css.match(/@media/g)?.length ?? 0).toBe(1);
    expect(css).toMatch(/@media screen and \(min-width: 48em\)/);
  });
});
