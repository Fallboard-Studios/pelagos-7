import { useState } from 'react';

import { OceanScene } from './components/OceanScene';
import { PlayButton } from './components/PlayButton';
import { AudioStatus } from './components/debug/AudioStatus';

function App() {
  const [isAudioReady, setAudioReady] = useState(false);

  return (
    <>
      {!isAudioReady && <PlayButton onSuccess={() => setAudioReady(true)} />}
      <OceanScene />
      <AudioStatus />
    </>
  );
}

export default App;
