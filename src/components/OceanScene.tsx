import { useEffect } from 'react';

import './OceanScene.css';
import { Robot } from './robot/Robot';
import { InteractionStatus } from './debug/InteractionStatus';
import { useOceanStore } from '../stores/oceanStore';
import { spawnRobot } from '../systems/spawnSystem';
import { handleRobotIdle } from '../systems/idleSystem';
import {
  startCollisionDetection,
  stopCollisionDetection,
} from '../systems/collisionSystem';
import { Factory } from './actors/Factory';
import { placeFactories } from '../systems/factoryPlacementSystem';
import { ActorType } from '../types/Actor';
import { startFactoryProduction } from '../systems/factorySystem';

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
  const actors = useOceanStore((s) => s.actors);

  // Spawn initial robots and place factories on mount
  useEffect(() => {
    // Place a dense row of factories (overlap allowed) so you can preview them
    placeFactories(6);

    spawnRobot();
    spawnRobot();

    // Start factory production for all placed factories
    const { actors } = useOceanStore.getState();
    actors.forEach((actor) => {
      if (actor.type === ActorType.FACTORY) {
        startFactoryProduction(actor.id);
      }
    });

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
    <>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="ocean-scene"
        width={width}
        height={height}
      >
        <rect fill={BACKGROUND_COLOR} width={width} height={height} />
        <g id="factory-layer">
          {
            actors
              .filter((a) => a.type === ActorType.FACTORY)
              .map((actor) => (
                <Factory key={actor.id} actor={actor} />
              ))
          }
        </g>
        <g id="robot-layer">
          {robots.map((robot) => (
            <Robot key={robot.id} robot={robot} />
          ))}
        </g>
        <g id="ui-layer" />
      </svg>
      <InteractionStatus />
    </>
  );
}
