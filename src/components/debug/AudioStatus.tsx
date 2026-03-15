import { useEffect, useState } from 'react';
import gsap from 'gsap';

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
    let ticker: (() => void) | null = null;
    let lastUpdate = 0;

    ticker = () => {
      const now = gsap.ticker.time;
      if (now - lastUpdate >= UPDATE_INTERVAL_MS / 1000) {
        lastUpdate = now;
        setStats(AudioEngine.getPolyphonyStats());
      }
    };

    gsap.ticker.add(ticker);
    return () => {
      if (ticker) gsap.ticker.remove(ticker);
    };
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
