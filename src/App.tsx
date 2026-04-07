import { useState, useEffect } from 'react';

import { OceanScene } from './components/OceanScene';
import { PlayButton } from './components/PlayButton';
import { AudioStatus } from './components/debug/AudioStatus';
import { spawnRobot } from './systems/spawnSystem';
import { useOceanStore } from './stores/oceanStore';
import { subscribeToMeasure } from './engine/beatClock';
import { DAY_CYCLE_MEASURES } from './utils/lightingUtils';
import { DEV_TUNING } from './constants';

function App() {
  const [isAudioReady, setAudioReady] = useState(false);

  // Wire the BeatClock measure tick → store so factories can react to day/night
  const handleAudioReady = () => {
    // Keep world time when Play is clicked: map the transport's 96-measure
    // beat clock into the configured world day length and add the
    // pre-existing world measure so audio starts at 0 while the world keeps
    // its loaded time-of-day.
    const initialWorldMeasure = useOceanStore.getState().currentMeasure;
    subscribeToMeasure((m) => {
      const dayLength = useOceanStore.getState().settings.dayLengthMeasures || 96;
      const scaled = Math.floor((m / DAY_CYCLE_MEASURES) * dayLength);
      useOceanStore.getState().setCurrentMeasure((initialWorldMeasure + scaled) % dayLength);
    });
    setAudioReady(true);
  };

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
      {!isAudioReady && <PlayButton onSuccess={handleAudioReady} />}
      <OceanScene />
      <AudioStatus />
    </>
  );
}

export default App;
