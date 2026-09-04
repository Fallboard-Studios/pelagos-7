import { useMemo } from 'react';

import { useAttenuationStyleStore, selectCurrentAttenuationStyle } from '@/stores/attenuationStyleStore';
import { useLocaleStore } from '@/stores/localeStore';
import { computeConsoleTheme, type ConsoleTheme } from '@/utils/consoleTheme';

import './PaletteSample.css';

const SWATCHES: Array<{ key: keyof ConsoleTheme; label: string }> = [
  { key: 'bg', label: 'BG' },
  { key: 'surface', label: 'Surface' },
  { key: 'accent', label: 'Accent' },
  { key: 'border', label: 'Border' },
];

/**
 * Fixed, always-on-top debug overlay showing the 4 seed-driven console
 * theme values (--color-bg/--color-surface/--color-accent/--color-border)
 * for the active Attenuation Style + Locale — a quick visual/numeric read
 * on what consoleTheme.ts (Console Theming, Phase 11) actually produced,
 * without having to inspect .tablet's inline style by hand.
 *
 * Independently computes the same theme Tablet.tsx applies (both call
 * computeConsoleTheme with the same active AS/locale inputs) rather than
 * reading .tablet's rendered CSS custom properties — this stays correct
 * regardless of where in the DOM it's mounted, and each chip's color comes
 * from the computed hsl(...) string directly (inline style), not a var()
 * reference, so it renders correctly even outside .tablet's subtree.
 *
 * Dev-only: mounted in App.tsx behind `DEV_TUNING`, alongside
 * SkippedNotesCounter, so it never renders in a production build.
 */
export function PaletteSample() {
  const attenuationStyle = useAttenuationStyleStore(selectCurrentAttenuationStyle);
  const localeId = attenuationStyle?.currentLocaleId;
  const locale = useLocaleStore((s) => (localeId ? s.locales[localeId] : undefined));

  // Flat primitives read before the memo — see Tablet.tsx's own comment on
  // why (react-hooks/preserve-manual-memoization flags nested optional-
  // chained property access inside a useMemo body as a dependency mismatch).
  const attenuationStyleId = attenuationStyle?.id;
  const attenuationStyleName = attenuationStyle?.name;
  const activeLocaleId = locale?.id;
  const localeX = locale?.coordinates.x;
  const localeY = locale?.coordinates.y;

  const theme = useMemo(() => {
    if (!attenuationStyleId || !attenuationStyleName || !activeLocaleId || localeX === undefined || localeY === undefined) {
      return undefined;
    }
    return computeConsoleTheme(attenuationStyleId, attenuationStyleName, activeLocaleId, localeX, localeY);
  }, [attenuationStyleId, attenuationStyleName, activeLocaleId, localeX, localeY]);

  if (!theme) return null;

  return (
    <div className="palette-sample" data-testid="palette-sample">
      <div className="palette-sample__label">Console Palette</div>
      <div className="palette-sample__row">
        {SWATCHES.map(({ key, label }) => (
          <div className="palette-sample__swatch" key={key} data-testid={`palette-sample-${key}`}>
            <div className="palette-sample__chip" style={{ backgroundColor: theme[key] }} />
            <span className="palette-sample__chip-label">{label}</span>
            <span className="palette-sample__chip-value">{theme[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
