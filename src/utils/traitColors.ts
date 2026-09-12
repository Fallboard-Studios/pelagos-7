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
  header: [ACCENT_COLORS.white, ACCENT_COLORS.darkGray],
};

/**
 * Inline-style object a component spreads onto whichever DOM element should root that trait's
 * color scope — every descendant CabinetBox/outline/fill inherits --color-accent-a/-b via plain
 * CSS cascade (src/index.css derives --color-accent/--color-accent-gradient from these two), no
 * other wiring needed. Cast to CSSProperties the same way CabinetBox.tsx's own cabinetTokens/
 * AccordionContainer.tsx's cabinetTokens already do for custom properties.
 */
export function getTraitColorStyle(trait: Trait): CSSProperties {
  const [a, b] = TRAIT_COLORS[trait];
  return { '--color-accent-a': a, '--color-accent-b': b } as CSSProperties;
}

/**
 * A robot's own identity color reuses the identical 2-property mechanism with both slots set to
 * the same value — color-mix()-ing a color with itself returns itself, and a 2-stop gradient of
 * identical stops renders as a solid fill, so every existing consumer (outline, backing, front-face
 * gradient) already does the right thing with no special-casing.
 */
export function getRobotColorStyle(identityColor: string): CSSProperties {
  return { '--color-accent-a': identityColor, '--color-accent-b': identityColor } as CSSProperties;
}
