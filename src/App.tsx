import { useEffect } from 'react';

import { OceanScene } from './components/OceanScene';
import { AudioStatus } from './components/debug/AudioStatus';
import SleeveContainer from './components/layout/SleeveContainer';
import GlassViewport from './components/layout/GlassViewport';
import { TransportBar } from './components/ui/TransportBar';
import { spawnRobot } from './systems/spawnSystem';
import { useOceanStore } from './stores/oceanStore';
import { DEV_TUNING } from './constants';

function App() {
  // Expose debug functions globally in dev mode
  useEffect(() => {
    if (DEV_TUNING) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).spawnRobot = spawnRobot;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).removeRobot = (id: string) => useOceanStore.getState().removeRobot(id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).oceanStore = useOceanStore;
      console.log('[Dev] Debug functions exposed: spawnRobot(), removeRobot(id), oceanStore');
    }
  }, []);

  // Ensure derived time-dependent values are computed from the initial measure
  // so visuals reflect the loaded time immediately on app mount.
  useEffect(() => {
    const m = useOceanStore.getState().currentMeasure;
    useOceanStore.getState().setCurrentMeasure(m);
    // run only once on mount
  }, []);

  return (
    <>
      <SleeveContainer />
      <GlassViewport>
        <TransportBar />
        <OceanScene />
        <AudioStatus />
      </GlassViewport>
    </>
  );
}

export default App;
