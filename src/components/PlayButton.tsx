import { useState } from 'react';

import { AudioEngine } from '../engine/AudioEngine';

import './PlayButton.css';

// ========================================
// TYPES & INTERFACES
// ========================================
interface PlayButtonProps {
  onSuccess?: () => void;
}

type PlayButtonState = 'idle' | 'loading' | 'error';

// ========================================
// CONSTANTS
// ========================================
const BUTTON_TEXT = {
  idle: 'Play',
  loading: 'Starting...',
  error: 'Audio failed to initialize. Click to retry.',
};

// ========================================
// COMPONENT
// ========================================
export function PlayButton({ onSuccess }: PlayButtonProps) {
  const [playState, setPlayState] = useState<PlayButtonState>('idle');

  const handleClick = async () => {
    setPlayState('loading');

    try {
      await AudioEngine.start();
      setPlayState('idle');
      onSuccess?.();
    } catch (err) {
      console.error('[PlayButton] AudioEngine.start() failed:', err);
      setPlayState('error');
    }
  };

  return (
    <div className="play-button-overlay">
      <button
        className="play-button"
        onClick={handleClick}
        disabled={playState === 'loading'}
        aria-label={BUTTON_TEXT[playState]}
        aria-busy={playState === 'loading'}
      >
        {BUTTON_TEXT[playState]}
      </button>
    </div>
  );
}
