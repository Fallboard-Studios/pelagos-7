import { useEffect, useState } from 'react';

import { useOceanStore } from '../../stores/oceanStore';
import { AudioEngine } from '../../engine/AudioEngine';
import { DEV_TUNING } from '../../constants';
import './AudioStatus.css';

// ========================================
// TYPES
// ========================================
interface PolyphonyStats {
  voices: number;
  maxVoices: number;
  step: number;
}

// ========================================
// CONSTANTS
// ========================================
const UPDATE_INTERVAL_MS = 100;

// ========================================
// COMPONENT
// ========================================
export function AudioStatus() {
  const robots = useOceanStore((s) => s.robots);
  const [stats, setStats] = useState<PolyphonyStats>({
    voices: 0,
    maxVoices: 0,
    step: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(AudioEngine.getPolyphonyStats());
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  if (!DEV_TUNING) return null;

  return (
    <div className="audio-status">
      <div>Voices: {stats.voices}/{stats.maxVoices}</div>
      <div>Robots: {robots.length}</div>
      <div>Step: {stats.step}/16</div>
    </div>
  );
}
