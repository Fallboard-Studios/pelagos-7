import { useMemo } from 'react';
import type { CSSProperties } from 'react';

import SleeveContainer from '@/components/panels/physical/SleeveContainer';
import ScreenViewport from '@/components/panels/physical/ScreenViewport';

import { useUIStore } from '@/stores/uiStore';
import { useAttenuationStyleStore, selectCurrentAttenuationStyle } from '@/stores/attenuationStyleStore';
import { useLocaleStore } from '@/stores/localeStore';
import { computeConsoleTheme, consoleThemeToCSSProperties } from '@/utils/consoleTheme';

import './Tablet.css'

function Tablet() {
  const isPoweredOn = useUIStore((s) => s.isPoweredOn);

  const attenuationStyle = useAttenuationStyleStore(selectCurrentAttenuationStyle);
  const localeId = attenuationStyle?.currentLocaleId;
  const locale = useLocaleStore((s) => (localeId ? s.locales[localeId] : undefined));

  // Flat primitives, read once here rather than via nested property access
  // inside the memo below — keeps the memo body's dependency shape
  // identical to its own dependency array (react-hooks/preserve-manual-
  // memoization otherwise flags `locale.coordinates.y` vs
  // `locale?.coordinates.y` as a mismatch).
  const attenuationStyleId = attenuationStyle?.id;
  const attenuationStyleName = attenuationStyle?.name;
  const activeLocaleId = locale?.id;
  const localeX = locale?.coordinates.x;
  const localeY = locale?.coordinates.y;

  // Computed once per AS/locale activation (useMemo's own guarantee, per its
  // dependency array) — not recomputed on every render, per
  // docs/CONSOLE_THEMING.md's Forbidden Patterns.
  const consoleThemeStyle = useMemo(() => {
    if (!attenuationStyleId || !attenuationStyleName || !activeLocaleId || localeX === undefined || localeY === undefined) {
      return undefined;
    }
    const theme = computeConsoleTheme(attenuationStyleId, attenuationStyleName, activeLocaleId, localeX, localeY);
    return consoleThemeToCSSProperties(theme) as CSSProperties;
  }, [attenuationStyleId, attenuationStyleName, activeLocaleId, localeX, localeY]);

  return (
    <div className="tablet" style={consoleThemeStyle}>
      <div className="sleeve-container__top-strip" aria-hidden="true" />
      <SleeveContainer hasPowerSwitch={true} />
      <ScreenViewport isPoweredOn={isPoweredOn} />
      <SleeveContainer />
    </div>
  );
}

export default Tablet;
