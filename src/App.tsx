import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import Tablet from './components/tablet/Tablet';
import { SkippedNotesCounter } from './components/debug/SkippedNotesCounter';
import { PaletteSample } from './components/debug/PaletteSample';

import { useAttenuationStyleStore, selectCurrentAttenuationStyle } from '@/stores/attenuationStyleStore';
import useLocaleStore from '@/stores/localeStore';
import { generateRealWorldGradients } from '@/utils/realWorldGradient';
import { DEV_TUNING } from '@/constants';

import './App.css';

function App() {
  const localeId = useAttenuationStyleStore((s) => selectCurrentAttenuationStyle(s)?.currentLocaleId ?? '');

  // Lazy initializer — runs once, during the very first render, so the
  // randomized backdrop is present from first paint (no flash of the
  // CSS-default gradient a useEffect would leave visible for a tick first).
  const [realWorldGradients] = useState(() => generateRealWorldGradients());
  const realWorldStyle = {
    '--real-world-gradient-before': realWorldGradients.before,
    '--real-world-gradient-after': realWorldGradients.after,
  } as CSSProperties;

  // Ensure derived time-dependent values are computed from the initial measure
  // so visuals reflect the loaded time immediately on app mount.
  useEffect(() => {
    const locale = useLocaleStore.getState().getLocaleById(localeId);
    if (locale) {
      useLocaleStore.getState().setLocaleData(localeId, { currentMeasure: locale.currentMeasure });
    }
    // run only once on mount — localeId is stable; re-running would re-sync an already-current value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-root">
      <div className="real-world" style={realWorldStyle}>
        <Tablet />
      </div>
      {DEV_TUNING && (
        <div className="debug-hud">
          <PaletteSample />
          <SkippedNotesCounter />
        </div>
      )}
    </div>
  );
}

export default App;
