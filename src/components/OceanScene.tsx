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
import { placeFactories, getRowConfig } from '../systems/factoryPlacementSystem';
import { ActorType } from '../types/Actor';
import { startFactoryProduction } from '../systems/factorySystem';
import colorTheme from '../constants/colorTheme.json';

// ========================================
// TYPES & INTERFACES
// ========================================
interface OceanSceneProps {
  width: number;
  height: number;
  backgroundColor: string;
}


// ========================================
// CONSTANTS
// ========================================


// ========================================
// COMPONENT
// ========================================
export function OceanScene({
  width = 1920,
  height = 1080,
  backgroundColor = '#0a1128',
}: OceanSceneProps) {

  const robots = useOceanStore((s) => s.robots);
  const actors = useOceanStore((s) => s.actors);

  // categorize factory actors by spreadType
  const backgroundFactories = actors.filter((a) => {
    if (a.type !== ActorType.FACTORY) return false;
    const cfg = getRowConfig(a.config?.row ?? -1);
    return cfg?.spreadType === 'center';
  });
  const midgroundFactories = actors.filter((a) => {
    if (a.type !== ActorType.FACTORY) return false;
    const cfg = getRowConfig(a.config?.row ?? -1);
    return cfg?.spreadType === 'full';
  });
  const frontgroundFactories = actors.filter((a) => {
    if (a.type !== ActorType.FACTORY) return false;
    const cfg = getRowConfig(a.config?.row ?? -1);
    return cfg?.spreadType === 'edges';
  });

  // Spawn initial robots and place factories on mount
  useEffect(() => {
    // Place factories in 3 depth rows
    placeFactories();

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
        <defs>
          {/* Gradients between factory rows */}
          <linearGradient id="gradient-0-1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0c1c4f" stopOpacity=".5" />
            <stop offset="100%" stopColor={colorTheme.vent.shadow} stopOpacity=".5" />
          </linearGradient>
          <linearGradient id="gradient-1-2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colorTheme.vent.shadow} stopOpacity=".5" />
            <stop offset="100%" stopColor={colorTheme.vent.shadow} stopOpacity=".1" />
          </linearGradient>
        </defs>

        <rect fill={backgroundColor} width={width} height={height} />

        {/* Factory rows rendered back-to-front for proper depth perception */}
        <g id="factory-background-layer">
          {/* center-type rows (should appear furthest back) */}
          {backgroundFactories.map((actor) => (
            <Factory key={actor.id} actor={actor} />
          ))}
        </g>
        {/* Gradient between row 2 and row 1 */}
        <rect
          id="gradient-back-mid"
          x="0"
          y="0"
          width={width}
          height={height}
          fill="url(#gradient-0-1)"
          pointerEvents="none"
        />

        <g id="factory-midground-layer">
          {/* full-type rows */}
          {midgroundFactories.map((actor) => (
            <Factory key={actor.id} actor={actor} />
          ))}
        </g>
        {/* Gradient between row 1 and row 0 */}
        <rect
          id="gradient-mid-front"
          x="0"
          y="0"
          width={width}
          height={height}
          fill="url(#gradient-1-2)"
          pointerEvents="none"
        />



        <g id="robot-layer">
          {robots.map((robot) => (
            <Robot key={robot.id} robot={robot} />
          ))}
        </g>
        <g id="factory-frontground-layer">
          {/* edge-type rows (foreground) */}
          {frontgroundFactories.map((actor) => (
            <Factory key={actor.id} actor={actor} />
          ))}
        </g>
        <g id="ui-layer" />
      </svg>
      <InteractionStatus />
    </>
  );
}
