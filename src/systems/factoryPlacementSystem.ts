import type { Actor } from '../types/Actor';
import { ActorType } from '../types/Actor';
import { useOceanStore } from '../stores/oceanStore';

// Simple world bounds matching spawnSystem defaults
const WORLD_BOUNDS = { width: 1920, height: 1080 };
const OCEAN_FLOOR_Y = 1080; // slightly above bottom so silhouettes sit nicely
const DEFAULT_FACTORY_COUNT = 4;
const PRODUCTION_INTERVAL = 60; // measures

export function createFactory(position: { x: number; y: number }): Actor {
  return {
    id: crypto.randomUUID(),
    type: ActorType.FACTORY,
    position: { x: Math.round(position.x), y: Math.round(position.y) },
    scale: 1,
    rotation: 0,
    isActive: true,
    cooldownRemaining: PRODUCTION_INTERVAL,
    config: { productionInterval: PRODUCTION_INTERVAL },
  };
}

/**
 * Place 3-5 factories evenly along the ocean floor and add them to the store.
 * Idempotent when called multiple times in a session (replaces existing actors).
 */
export function placeFactories(factoryCount = DEFAULT_FACTORY_COUNT) {
  const actors: Actor[] = [];

  for (let i = 0; i < factoryCount; i++) {
    const x = WORLD_BOUNDS.width / factoryCount * i; // full-width placement
    const y = OCEAN_FLOOR_Y;
    actors.push(createFactory({ x, y }));
  }

  useOceanStore.getState().setActors(actors);
}
