/**
 * WCAG 2.x relative luminance / contrast ratio math. Pure, general-purpose —
 * no dependency on consoleTheme.ts's own bound constants. Used by
 * consoleTheme.test.ts to PROVE the chosen HSL bounds clear AA for every
 * possible seed (docs/specs/CONSOLE_THEMING.md §1.1: "this is the property
 * to test, not eyeball").
 */
export type RGB = [number, number, number]; // 0-255 each

export function hslToRgb(hue: number, saturation: number, lightness: number): RGB {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((hue % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let [r, g, b] = [0, 0, 0];
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function linearize(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([r, g, b]: RGB): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG contrast ratio between two colors: 1 (identical) to 21 (black/white). */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Alpha-composite a foreground color (0-1 alpha) over an OPAQUE background —
 *  resolves --color-text-primary/--color-text-muted's actual rendered color
 *  (both rgba() with alpha < 1) before measuring contrast against whatever
 *  seed-driven --color-surface it's painted on. */
export function blendOverBackground(fg: RGB, alpha: number, bg: RGB): RGB {
  return [
    alpha * fg[0] + (1 - alpha) * bg[0],
    alpha * fg[1] + (1 - alpha) * bg[1],
    alpha * fg[2] + (1 - alpha) * bg[2],
  ];
}
