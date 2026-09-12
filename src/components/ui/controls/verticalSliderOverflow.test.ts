import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Roadmap 13 ("Vertical Slider Label Overflow") — regression guard. A vertical
// SliderLinear/SliderLog/SliderCenteredZero's own wrapper used to set
// overflow-y: auto, meant only for the rare 3-box overflow floor
// (voxelTrackMath.ts's VOXEL_TRACK_MIN_BOX_COUNT). In practice it also fired
// on ordinary sub-pixel layout rounding with nothing genuinely too tall to
// show — found live via DevTools on the Audio Rig's Filter Frequency/
// Resonance sliders (scrollHeight 1px taller than clientHeight at the
// slider's own wrapper, with every ancestor above measuring identical to a
// non-overflowing EQ3 slider at the same levels) — a native scrollbar renders
// its full arrow-button-and-track chrome for even 1px of overflow. Fixed to
// overflow-y: hidden, since this element is aria-hidden="true" (VoxelTrack.tsx,
// a decorative overlay never meant to be manually scrolled) — hidden clips
// the rare genuine 3-box-floor case exactly as invisibly as it clips the
// sub-pixel noise case, without ever exposing scrollbar chrome for either.
//
// Not written via getCssRuleBody: each file's own [data-orientation='vertical']
// selector is deliberately declared twice (once for display: inline-flex, once
// for this overflow rule — see SliderLinear.css's own comment on why they're
// kept separate), and that helper returns only the first match for a repeated
// selector. Matching the exact literal declaration block instead is precise
// enough here and avoids extending that helper just for this one repeated-
// selector case.

const controlsDir = dirname(fileURLToPath(import.meta.url));

const VERTICAL_SLIDER_FILES = ['SliderLinear.css', 'SliderLog.css', 'SliderCenteredZero.css'];

describe.each(VERTICAL_SLIDER_FILES)('%s vertical overflow rule', (file) => {
  // Normalized to \n up front — this repo's checked-out CSS files are CRLF on
  // Windows (same reasoning as testUtils/cssRuleBody.ts's own normalization).
  const cssSource = readFileSync(resolve(controlsDir, file), 'utf-8').replace(/\r\n/g, '\n');

  it('sets overflow-y: hidden, not auto — a native scrollbar must never render on this aria-hidden decorative element', () => {
    expect(cssSource).toContain('overflow-y: hidden;\n  overflow-x: visible;');
    expect(cssSource).not.toMatch(/data-orientation='vertical'\]\s*\{\s*overflow-y:\s*auto;/);
  });
});
