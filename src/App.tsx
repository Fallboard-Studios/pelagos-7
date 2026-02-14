import { useState, useEffect } from 'react';

import { OceanScene } from './components/OceanScene';
import { PlayButton } from './components/PlayButton';
import { AudioStatus } from './components/debug/AudioStatus';
import { spawnRobot } from './systems/spawnSystem';
import { useOceanStore } from './stores/oceanStore';
import { DEV_TUNING } from './constants';

function App() {
  const [isAudioReady, setAudioReady] = useState(false);

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

  return (
    <>
      {!isAudioReady && <PlayButton onSuccess={() => setAudioReady(true)} />}
      <OceanScene />
      <AudioStatus />
    </>
  );
}

export default App;
