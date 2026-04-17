import { useEffect } from 'react';

import Tablet from './components/tablet/Tablet';

import { usePlanetStore, DEFAULT_PELAGOS } from '@/stores/planetStore';
import useLocaleStore from '@/stores/localeStore';
import { getActiveLocaleId } from '@/utils/localeHelpers';
import { PLANET_DURATION_MS } from '@/constants';

import './App.css';

function App() {

  // Ensure derived time-dependent values are computed from the initial measure
  // so visuals reflect the loaded time immediately on app mount.
  useEffect(() => {
    const activeLocaleId = getActiveLocaleId();
    const locale = useLocaleStore.getState().getLocaleById(activeLocaleId);
    if (locale) {
      useLocaleStore.getState().setLocaleData(activeLocaleId, { currentMeasure: locale.currentMeasure });
    }
    // run only once on mount
  }, []);

  // Time-of-day tick: advance `currentHour` from real wall-clock time.
  // Runs for the lifetime of the app regardless of tablet power state.
  useEffect(() => {
    const tick = () => {
      const planetId = DEFAULT_PELAGOS.id;
      const planetState = usePlanetStore.getState();
      const planet = planetState.planets.find((p) => p.id === planetId) ?? DEFAULT_PELAGOS;
      const dayStart = planet.dayStartTimestamp ?? Date.now();
      const planetSize = planet.size ?? 'medium';
      const dayMs = PLANET_DURATION_MS[planetSize];
      const elapsed = Date.now() - dayStart;
      const totalMinutes = (elapsed / dayMs) * 24 * 60; // total in-world minutes elapsed

      const rawHourFloat = (elapsed / dayMs) * 24; // fractional hour used for lighting

      // Quantise display to 15-minute increments
      const hour = Math.floor(totalMinutes / 60) % 24;
      const minute = Math.floor(totalMinutes % 60);
      const quantMinute = Math.floor(minute / 15) * 15;

      if (totalMinutes >= 24 * 60) {
        usePlanetStore.getState().setDayStartTimestamp(planetId, Date.now());
        usePlanetStore.getState().setCurrentHour(planetId, rawHourFloat % 24);
        usePlanetStore.getState().setCurrentHour(planetId, (hour % 24) + quantMinute / 60);
      } else {
        usePlanetStore.getState().setCurrentHour(planetId, rawHourFloat);
        usePlanetStore.getState().setCurrentHour(planetId, hour + quantMinute / 60);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
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
