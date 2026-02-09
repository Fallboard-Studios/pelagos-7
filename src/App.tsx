import { useState } from 'react';

import { OceanScene } from './components/OceanScene';
import { PlayButton } from './components/PlayButton';

function App() {
  const [isAudioReady, setAudioReady] = useState(false);

  return (
    <>
      {!isAudioReady && <PlayButton onSuccess={() => setAudioReady(true)} />}
      <OceanScene />
    </>
  );
}

export default App;
