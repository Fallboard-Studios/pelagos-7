import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getCssRuleBody } from '@/testUtils/cssRuleBody';

// TYPE_SCALE.md Task 6 — beyond the shared root-selector contract already
// covered by leafControlContainerQuery.test.ts, the 3 voxel-track sliders
// each have their own __value readout that migrates off its old 0.75rem
// literal and gains a compact-fallback rule inside the same sc-control
// container query DualLabel.css's own fallback uses (spec §1.4/§4).

const controlsDir = dirname(fileURLToPath(import.meta.url));

const SLIDER_VALUE_SELECTORS = [
  { file: 'SliderLinear.css', selector: '.sc-slider-linear__value' },
  { file: 'SliderLog.css', selector: '.sc-slider-log__value' },
  { file: 'SliderCenteredZero.css', selector: '.sc-slider-centered-zero__value' },
];

describe.each(SLIDER_VALUE_SELECTORS)('$file $selector', ({ file, selector }) => {
  const cssSource = readFileSync(resolve(controlsDir, file), 'utf-8');

  it('sizes the default (non-compact) value readout with --font-size-label, not the old 0.75rem literal', () => {
    const body = getCssRuleBody(cssSource, selector);
    expect(body).not.toBeNull();
    expect(body).toContain('font-size: var(--font-size-label);');
    expect(body).not.toContain('0.75rem');
  });

  it('drops the value readout to --font-size-label-compact inside the sc-control container query', () => {
    const containerBody = getCssRuleBody(cssSource, '@container sc-control (max-width: 120px)');
    expect(containerBody).not.toBeNull();

    const compactBody = getCssRuleBody(containerBody!, selector);
    expect(compactBody).toBe('font-size: var(--font-size-label-compact);');
  });

  it('keeps color: var(--color-text-muted) on the default rule (regression guard — only size changes)', () => {
    const body = getCssRuleBody(cssSource, selector);
    expect(body).toContain('color: var(--color-text-muted);');
  });
});
