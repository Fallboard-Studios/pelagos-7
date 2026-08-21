import { useEffect } from 'react';

import Tablet from './components/tablet/Tablet';

import { usePlanetStore, selectCurrentPlanet } from '@/stores/planetStore';
import useLocaleStore from '@/stores/localeStore';

import './App.css';

function App() {
  const localeId = usePlanetStore((s) => selectCurrentPlanet(s)?.currentLocaleId ?? '');

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
      <div className="real-world">
        <Tablet />
      </div>
    </div>
  );
}

export default App;
