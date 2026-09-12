import type { CSSProperties } from 'react';

import { ACCENT_COLORS } from '@/constants/accentColors';
import type { Trait } from '@/types/traits';

/**
 * One 2-color pair per trait, hand-picked from ACCENT_COLORS — analogous hues only (see
 * docs/intent/color-scheme-trait-theming.md), so both the color-mix() midpoint (--color-accent)
 * and the literal linear-gradient (--color-accent-gradient) stay clean rather than muddy. Header's
 * pair doubles as src/index.css's app-wide ambient default (see that file's own :root block) —
 * kept here too so it isn't a value declared in two places, just referenced from one call site.
 * ACCENT_COLORS.beige is deliberately unused by any pair — reserved for later, not an oversight
 * (see docs/specs/COLOR_SCHEME_TRAIT_THEMING.md §1.3).
 */
export const TRAIT_COLORS: Record<Trait, [string, string]> = {
  spectral: [ACCENT_COLORS.cyan, ACCENT_COLORS.teal],
  timeSpace: [ACCENT_COLORS.blue, ACCENT_COLORS.plum],
  output: [ACCENT_COLORS.red, ACCENT_COLORS.orange],
  composition: [ACCENT_COLORS.green, ACCENT_COLORS.lime],
  company: [ACCENT_COLORS.purple, ACCENT_COLORS.pink],
  seed: [ACCENT_COLORS.tangerine, ACCENT_COLORS.yellow],
  header: [ACCENT_COLORS.emerald, ACCENT_COLORS.indigo],
};

/**
 * Builds all 4 accent custom properties from 2 literal colors. Bug fix, found live via browser
 * DevTools (jsdom never resolves real CSS cascade/color-mix(), so this was invisible to every test
 * in this file until it was rewritten): --color-accent/--color-accent-gradient must NEVER be
 * expressed as a nested var()-derivation of --color-accent-a/-b (e.g.
 * `linear-gradient(var(--color-accent-a), var(--color-accent-b))`, declared once at :root). That
 * pattern does not correctly re-substitute using a descendant's own overridden -a/-b — confirmed
 * directly in DevTools: -a/-b themselves cascade correctly to an overridden subtree, but a
 * DIFFERENT custom property whose specified value nests var() references to them stays pinned to
 * whatever they resolved to wherever that outer property was first read, not the local override.
 * The fix computes --color-accent/--color-accent-gradient with the 2 literal colors baked directly
 * into the color-mix()/linear-gradient() calls, right here — no second layer of custom-property
 * indirection left for a browser to get wrong. See docs/specs/COLOR_SCHEME_TRAIT_THEMING.md §1.2's
 * amendment.
 */
function buildAccentStyle(a: string, b: string): CSSProperties {
  return {
    '--color-accent-a': a,
    '--color-accent-b': b,
    '--color-accent': `color-mix(in srgb, ${a} 50%, ${b} 50%)`,
    '--color-accent-gradient': `linear-gradient(135deg, ${a}, ${b})`,
  } as CSSProperties;
}

/**
 * Inline-style object a component spreads onto whichever DOM element should root that trait's
 * color scope — every descendant CabinetBox/outline/fill inherits all 4 accent properties via
 * plain CSS cascade, no other wiring needed.
 */
export function getTraitColorStyle(trait: Trait): CSSProperties {
  const [a, b] = TRAIT_COLORS[trait];
  return buildAccentStyle(a, b);
}

/**
 * A robot's own identity color reuses the identical mechanism with both slots set to the same
 * value — color-mix()-ing a color with itself returns itself, and a 2-stop gradient of identical
 * stops renders as a solid fill, so every existing consumer (outline, backing, front-face gradient)
 * already does the right thing with no special-casing.
 */
export function getRobotColorStyle(identityColor: string): CSSProperties {
  return buildAccentStyle(identityColor, identityColor);
}
