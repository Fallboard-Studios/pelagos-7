import { useEffect } from 'react';

import './OceanScene.css';
import { Robot } from './robot/Robot';
import { useOceanStore } from '../stores/oceanStore';
import { spawnRobot } from '../systems/spawnSystem';
import { handleRobotIdle } from '../systems/idleSystem';
import {
  startCollisionDetection,
  stopCollisionDetection,
} from '../systems/collisionSystem';

// ========================================
// TYPES & INTERFACES
// ========================================
interface OceanSceneProps {
  width?: number;
  height?: number;
}

// ========================================
// CONSTANTS
// ========================================
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const BACKGROUND_COLOR = '#0a1128';

// ========================================
// COMPONENT
// ========================================
export function OceanScene({
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: OceanSceneProps = {}) {
  const robots = useOceanStore((s) => s.robots);

  // Spawn initial robots on mount
  useEffect(() => {
    spawnRobot();
    spawnRobot();

    // Wait for robots to mount before starting idle behavior
    // (refs need to exist for GSAP animations)
    const timer = setTimeout(() => {
      const currentRobots = useOceanStore.getState().robots;
      currentRobots.forEach((robot) => {
        handleRobotIdle(robot.id);
      });
    }, 100);

    // Start collision detection
    startCollisionDetection();

    // Cleanup on unmount
    return () => {
      clearTimeout(timer);
      stopCollisionDetection();
    };
  }, []);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="ocean-scene"
      width={width}
      height={height}
    >
      <rect fill={BACKGROUND_COLOR} width={width} height={height} />
      <g id="background-layer" />
      <g id="robot-layer">
        {robots.map((robot) => (
          <Robot key={robot.id} robot={robot} />
        ))}
      </g>
      <g id="foreground-layer" />
      <g id="ui-layer" />
    </svg>
  );
}
