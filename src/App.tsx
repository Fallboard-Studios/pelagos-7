import { useState } from 'react';

import { OceanScene } from './components/OceanScene';
import { PlayButton } from './components/PlayButton';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <>
      {!isPlaying && <PlayButton onSuccess={() => setIsPlaying(true)} />}
      <OceanScene />
    </>
  );
}

export default App;
