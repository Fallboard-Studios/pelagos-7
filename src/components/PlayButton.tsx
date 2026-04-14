import { useState } from 'react';

import { AudioEngine } from '../engine/AudioEngine';
import { swallow } from '../utils/helpers';

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

/**
 * Overlay button that initialises the AudioEngine on first user interaction.
 * Browsers require a user gesture before the Web Audio API context can start;
 * this component satisfies that requirement and calls `onSuccess` once the
 * engine is ready.
 *
 * @param onSuccess - Optional callback invoked after `AudioEngine.start()`
 *                    resolves successfully.
 */
export function PlayButton({ onSuccess }: PlayButtonProps) {
  const [playState, setPlayState] = useState<PlayButtonState>('idle');

  const handleClick = async () => {
    setPlayState('loading');

    try {
      await AudioEngine.start();
      setPlayState('idle');
      onSuccess?.();
    } catch (err) {
      swallow(err, 'PlayButton.handleClick');
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
