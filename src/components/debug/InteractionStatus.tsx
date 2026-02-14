// ========================================
// IMPORTS
// ========================================
import { useEffect, useState } from 'react';
import gsap from 'gsap';

import { DEV_TUNING } from '../../constants';
import { useOceanStore } from '../../stores/oceanStore';
import { getCollisionChecksPerSecond } from '../../systems/collisionSystem';
import { getCurrentMeasure } from '../../engine/beatClock';
import type { Robot } from '../../types/Robot';

// ========================================
// TYPES
// ========================================
interface InteractionStats {
  totalInteractions: number;
  cooldownCount: number;
  collisionChecksPerSecond: number;
  currentMeasure: number;
}

// ========================================
// COMPONENT
// ========================================
export function InteractionStatus() {
  const robots = useOceanStore((s) => s.robots);
  const totalInteractions = useOceanStore((s) => s.totalInteractions);
  const [stats, setStats] = useState<InteractionStats>({
    totalInteractions: 0,
    cooldownCount: 0,
    collisionChecksPerSecond: 0,
    currentMeasure: 0,
  });

  useEffect(() => {
    if (!DEV_TUNING) return;

    let tickerCallback: (() => void) | null = null;

    tickerCallback = () => {
      // Count robots currently on cooldown (have lastInteractionMeasure and within cooldown window)
      const currentMeasure = getCurrentMeasure();
      const cooldownCount = robots.filter((robot: Robot) => {
        if (!robot.lastInteractionMeasure) return false;
        const measuresSinceInteraction = currentMeasure - robot.lastInteractionMeasure;
        return measuresSinceInteraction < 8; // 8 measure cooldown
      }).length;

      setStats({
        totalInteractions,
        cooldownCount,
        collisionChecksPerSecond: getCollisionChecksPerSecond(),
        currentMeasure: Math.floor(currentMeasure),
      });
    };

    gsap.ticker.add(tickerCallback);

    return () => {
      if (tickerCallback) {
        gsap.ticker.remove(tickerCallback);
      }
    };
  }, [robots, totalInteractions]);

  if (!DEV_TUNING) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: '12px',
        padding: '8px 12px',
        borderRadius: '4px',
        zIndex: 9999,
        pointerEvents: 'none',
        lineHeight: '1.4',
      }}
    >
      <div>Interactions: {stats.totalInteractions}</div>
      <div>
        Cooldowns: {stats.cooldownCount}/{robots.length}
      </div>
      <div>Checks/sec: {stats.collisionChecksPerSecond}</div>
      <div>Measure: {stats.currentMeasure}</div>
    </div>
  );
}
