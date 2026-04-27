import { useEffect } from 'react';

import Tablet from './components/tablet/Tablet';

import { usePlanetStore } from '@/stores/planetStore';
import useLocaleStore from '@/stores/localeStore';
import { initLinkPropagation, teardownLinkPropagation } from '@/systems/linkPropagationSystem';

import './App.css';

function App() {
  const localeId = usePlanetStore((s) => s.planets[0]?.currentLocaleId ?? '');

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

  // Start the robot-link propagation subscriber once on app mount.
  // Runs off the Transport tick (Zustand subscriber + queueMicrotask).
  useEffect(() => {
    initLinkPropagation();
    return () => teardownLinkPropagation();
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
