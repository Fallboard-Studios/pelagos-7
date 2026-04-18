import { useEffect, useMemo } from 'react';

import './OceanScene.css';

// import { Robot } from '../robot/Robot';
import { Robot } from '@/components/robot/Robot'
import { useLocaleStore } from '@/stores/localeStore';
import { usePlanetStore } from '@/stores/planetStore';
import { spawnRobot, startSpawnScheduler, stopSpawnScheduler } from '@/systems/spawnSystem';
import { Factory } from '@/components/actors/Factory';
import { placeFactories, getRowConfig } from '@/systems/factoryPlacementSystem';
import { ActorType } from '@/types/Actor';
import { startFactoryProduction } from '@/systems/factorySystem';
import { startCollisionDetection, stopCollisionDetection } from '@/systems/collisionSystem';
import colorTheme from '@/constants/colorTheme.json';
import { hslToString } from '@/utils/colorUtils';

// ========================================
// TYPES & INTERFACES
// ========================================
interface OceanSceneProps {
  width?: number;
  height?: number;
  backgroundColor?: string;
}

// ========================================
// COMPONENT
// ========================================

/**
 * Root SVG scene component. Renders factory building layers (background →
 * midground → foreground), depth-gradient overlays, the robot layer, and the
 * debug UI overlay. Kicks off factory placement, robot spawning, factory
 * production scheduling, and collision detection on mount.
 *
 * @param width           - SVG viewBox width in pixels (default 1920).
 * @param height          - SVG viewBox height in pixels (default 1080).
 * @param backgroundColor - CSS colour string for the ocean background rect.
 */
export function OceanScene({
  width = 1920,
  height = 1080,
  backgroundColor = '#0a1128',
}: OceanSceneProps) {

  const localeId = usePlanetStore((s) => s.planets[0]?.currentLocaleId ?? '');
  const robots = useLocaleStore((s) => s.locales[localeId]?.robots ?? []);
  const actors = useLocaleStore((s) => s.locales[localeId]?.actors ?? []);

  // categorize factory actors by row — memoised so robot updates don't
  // create new array references and trigger unnecessary Factory re-renders
  const backgroundFactories = useMemo(
    () => actors.filter((a) => {
      if (a.type !== ActorType.FACTORY) return false;
      return getRowConfig(a.config?.row ?? -1)?.row === 'background';
    }),
    [actors],
  );
  const midgroundFactories = useMemo(
    () => actors.filter((a) => {
      if (a.type !== ActorType.FACTORY) return false;
      return getRowConfig(a.config?.row ?? -1)?.row === 'midground';
    }),
    [actors],
  );
  const foregroundFactories = useMemo(
    () => actors.filter((a) => {
      if (a.type !== ActorType.FACTORY) return false;
      return getRowConfig(a.config?.row ?? -1)?.row === 'foreground';
    }),
    [actors],
  );

  // Spawn initial robots and place factories on mount
  useEffect(() => {
    // Place factories in 3 depth rows only if none exist in the store yet.
    // This prevents re-placing factories on power cycles where the scene
    // is unmounted/remounted — actors persist in the store and should not
    // be recreated.
    const existing = useLocaleStore.getState().locales[localeId]?.actors;
    if (!existing || existing.length === 0) {
      placeFactories();
    }

    spawnRobot(localeId);
    spawnRobot(localeId);

    // Start factory production for all placed factories
    const { actors } = useLocaleStore.getState().locales[localeId] ?? { actors: [] };
    actors.forEach((actor) => {
      if (actor.type === ActorType.FACTORY) {
        startFactoryProduction(actor.id);
      }
    });

    // Start periodic robot spawning
    startSpawnScheduler(localeId);

    // Start proximity-based robot interaction detection
    startCollisionDetection(localeId);

    // Cleanup on unmount
    return () => {
      stopSpawnScheduler();
      stopCollisionDetection();
    };
    // Intentionally mount-only: localeId is stable (locale only changes via user menu)
    // and re-running would double-spawn robots/factories
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Time-of-day is handled globally in App.tsx so the clock runs regardless of
  // tablet power state. OceanScene does not start its own interval.


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
            <stop offset="0%" stopColor="#0c1c4f" stopOpacity=".7" />
            <stop offset="100%" stopColor={hslToString(colorTheme.vent.shadow)} stopOpacity=".7" />
          </linearGradient>
          <linearGradient id="gradient-1-2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={hslToString(colorTheme.vent.shadow)} stopOpacity=".5" />
            <stop offset="100%" stopColor={hslToString(colorTheme.vent.shadow)} stopOpacity=".5" />
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
        <g id="factory-foreground-layer">
          {/* edge-type rows (foreground) */}
          {foregroundFactories.map((actor) => (
            <Factory key={actor.id} actor={actor} />
          ))}
        </g>
        <g id="ui-layer" />
      </svg>
    </>
  );
}
