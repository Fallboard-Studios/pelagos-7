import { useEffect } from 'react';

import Tablet from './components/tablet/Tablet';

import { useOceanStore } from '@/stores/oceanStore';
import { PLANET_DURATION_MS } from '@/constants';

import './App.css';

function App() {

  // Ensure derived time-dependent values are computed from the initial measure
  // so visuals reflect the loaded time immediately on app mount.
  useEffect(() => {
    const m = useOceanStore.getState().currentMeasure;
    useOceanStore.getState().setCurrentMeasure(m);
    // run only once on mount
  }, []);

  // Time-of-day tick: advance `currentHour` from real wall-clock time.
  // Runs for the lifetime of the app regardless of tablet power state.
  useEffect(() => {
    const tick = () => {
      const state = useOceanStore.getState();
      const dayStart = state.dayStartTimestamp ?? Date.now();
      const planetSize = state.settings?.planetSize ?? 'medium';
      const dayMs = PLANET_DURATION_MS[planetSize];
      const elapsed = Date.now() - dayStart;
      const totalMinutes = (elapsed / dayMs) * 24 * 60; // total in-world minutes elapsed

      const rawHourFloat = (elapsed / dayMs) * 24; // fractional hour used for lighting

      // Quantise display to 15-minute increments
      const hour = Math.floor(totalMinutes / 60) % 24;
      const minute = Math.floor(totalMinutes % 60);
      const quantMinute = Math.floor(minute / 15) * 15;

      if (totalMinutes >= 24 * 60) {
        state.setDayStartTimestamp(Date.now());
        state.setCurrentHour(rawHourFloat % 24);
        state.setPlanetTime(hour % 24, quantMinute);
      } else {
        state.setCurrentHour(rawHourFloat);
        state.setPlanetTime(hour, quantMinute);
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
