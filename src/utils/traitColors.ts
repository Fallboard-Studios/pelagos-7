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
 *
 * Rebalanced (2026-09-12, Crawford's own request) when emerald/indigo were added: Header's
 * original pairing of the two new hues sat 96° apart on the hue wheel — the only pair in the
 * palette breaking the ≤60° analogous-hue rule every other pair follows, and it looked it.
 * Splitting them into 2 different pairs instead of retuning strict hue-sorted neighbors (which
 * would have produced 2 pairs tighter than 14°, e.g. plum+indigo at 10°) took some hand-rebalancing:
 * Spectral gives up teal for indigo (cyan+indigo, 52°) and Composition gives up green for emerald
 * (emerald+lime, 46°); Header inherits both leftovers as its own new pair (teal+green, 24°).
 * Time/Space, Output, Company, and Seed are untouched. See docs/intent/
 * color-scheme-trait-theming.md's own amendment note for the full hue-wheel reasoning.
 */
export const TRAIT_COLORS: Record<Trait, [string, string]> = {
  spectral: [ACCENT_COLORS.cyan, ACCENT_COLORS.indigo],
  timeSpace: [ACCENT_COLORS.blue, ACCENT_COLORS.plum],
  output: [ACCENT_COLORS.red, ACCENT_COLORS.orange],
  composition: [ACCENT_COLORS.emerald, ACCENT_COLORS.lime],
  company: [ACCENT_COLORS.purple, ACCENT_COLORS.pink],
  seed: [ACCENT_COLORS.tangerine, ACCENT_COLORS.yellow],
  header: [ACCENT_COLORS.teal, ACCENT_COLORS.green],
};

/** The 4 custom properties buildAccentStyle below always sets, typed explicitly (rather than a
 *  blanket `as CSSProperties` cast) so a typo'd property name fails to compile instead of
 *  silently producing a dead custom property. */
type AccentCSSProperties = CSSProperties &
  Record<'--color-accent-a' | '--color-accent-b' | '--color-accent' | '--color-accent-gradient', string>;

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
function buildAccentStyle(a: string, b: string): AccentCSSProperties {
  return {
    '--color-accent-a': a,
    '--color-accent-b': b,
    '--color-accent': `color-mix(in srgb, ${a} 50%, ${b} 50%)`,
    '--color-accent-gradient': `linear-gradient(135deg, ${a}, ${b})`,
  };
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
