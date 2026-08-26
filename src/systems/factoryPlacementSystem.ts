// ========================================
// IMPORTS
// ========================================
import type { Actor } from '../types/Actor';
import { ActorType } from '../types/Actor';
import useLocaleStore from '../stores/localeStore';
import type { FactoryVariant } from '../components/actors/factoryVariants';
import { VARIANT_CONF, selectVariantFromSeed } from '../components/actors/factoryVariants';
import { calcSilhouetteSize } from '../components/actors/silhouetteUtils';

// ========================================
// CONSTANTS
// ========================================
const WORLD_BOUNDS = { width: 1920, height: 1080 };
interface FactoryRowConfig {
  y: number;
  spreadType?: 'edges' | 'full' | 'center'; // How to spread factories across row width (default: full)
  availableFactoryTypes?: FactoryVariant[]; // Optional filter for which factory variants can be placed in this row
  factoriesPerRow: number; // Maximum number of factories in this row
  edgeWidth?: number; // For 'edges' spreadType, width of each edge segment (default: 20% of screen width)
  centerWidth?: number; // For 'center' spreadType, width of center segment (default: 40% of screen width)
  row?: 'background' | 'midground' | 'foreground'; // Optional label for rendering order and floor layering
}
// Factory placement rows (3 depth layers)
const FACTORY_ROWS: FactoryRowConfig[] = [
  // BACKGROUND
  { y: 700, spreadType: 'center', factoriesPerRow: 3, centerWidth: 0.3, availableFactoryTypes: ['Skyscraper'], row: 'background' },
  { y: 1000, spreadType: 'center', factoriesPerRow: 5, centerWidth: 0.5, availableFactoryTypes: ['Skyscraper'], row: 'background' },
  { y: 980, spreadType: 'full', factoriesPerRow: 24, centerWidth: 0.7, availableFactoryTypes: ['Monolith'], row: 'background' },
  // MIDGROUND
  { y: 1019, spreadType: 'full', factoriesPerRow: 5, availableFactoryTypes: ['Refinery', 'Stacks'], row: 'midground' },
  { y: 1030, spreadType: 'full', factoriesPerRow: 4, availableFactoryTypes: ['Refinery', 'Stacks', 'Warehouse'], row: 'midground' },
  // FOREGROUND
  { y: 1180, spreadType: 'center', factoriesPerRow: 8, centerWidth: 0.5, availableFactoryTypes: ['Refinery'], row: 'foreground' },
  { y: 900, spreadType: 'edges', factoriesPerRow: 4, edgeWidth: 0.05, availableFactoryTypes: ['Warehouse'], row: 'foreground' },
  { y: 1000, spreadType: 'edges', factoriesPerRow: 3, edgeWidth: 0.2, availableFactoryTypes: ['Warehouse', 'Monolith'], row: 'foreground' },
  { y: 1200, spreadType: 'edges', factoriesPerRow: 8, edgeWidth: 0.3, availableFactoryTypes: ['Warehouse'], row: 'foreground' },
];

const PRODUCTION_INTERVAL = 60; // measures

const DEFAULT_ROW_EDGE_WIDTH = 0.3; // 30% of screen width on each edge
const DEFAULT_CENTER_WIDTH = 0.4; // 40% of screen width for center spread

// ========================================
// EXPORTS
// ========================================

/**
 * Create a single factory actor with position and scale.
 */
export function createFactory(position: { x: number; y: number }, row = 0): Actor {
  const rand = 0.9 + Math.random() * 0.2; // 0.9–1.1

  const id = crypto.randomUUID();

  // Use the same availableTypes that Factory.tsx will use, so the variant —
  // and therefore greeble pools — are consistent between spawn and render.
  const availableTypes = getRowConfig(row)?.availableFactoryTypes;

  const { hueShift, satShift, rooftopGreeble, facadeGreeble, beltCourseCount, purpose } = selectVariantFromSeed(id, position.x, row, availableTypes);

  return {
    id,
    type: ActorType.FACTORY,
    position: { x: Math.round(position.x), y: Math.round(position.y) },
    scaleX: rand,
    scaleY: rand,
    rotation: 0,
    isActive: true,
    cooldownRemaining: PRODUCTION_INTERVAL,
    config: {
      productionInterval: PRODUCTION_INTERVAL,
      row,
      hueShift,
      satShift,
      rooftopGreeble,
      facadeGreeble,
      beltCourseCount,
      purpose,
    },
  };
}

/**
 * Place factories along the ocean floor using the `FACTORY_ROWS` config (9 rows
 * across background/midground/foreground depth groups, each with its own y position,
 * factory type filter, and spread type — 'edges', 'full', or 'center').
 * Random scale variation is applied uniformly to every factory (0.9–1.1) rather than
 * being tied to a row.
 * Returns array of actors (factories only; floor rects rendered in OceanScene)
 */
export function placeFactories(localeId: string): Actor[] {
  const actors: Actor[] = [];

  function computeFactoryWidth(
    factory: Actor,
    rowIndex: number,
    rowConfig: FactoryRowConfig,
    currX: number,
  ): number {
    const { variant, noiseValue } = selectVariantFromSeed(
      factory.id,
      currX,
      rowIndex,
      rowConfig.availableFactoryTypes
    );
    const range = VARIANT_CONF[variant].sizeRange;
    return calcSilhouetteSize(noiseValue, range).width;
  }

  FACTORY_ROWS.forEach((rowConfig, rowIndex) => {
    const y = rowConfig.y;

    if (rowConfig.spreadType === 'edges') {
      const FRONT_ROW_LEFT_MAX = WORLD_BOUNDS.width * (rowConfig.edgeWidth ?? DEFAULT_ROW_EDGE_WIDTH);
      const FRONT_ROW_RIGHT_MIN = WORLD_BOUNDS.width * (1 - (rowConfig.edgeWidth ?? DEFAULT_ROW_EDGE_WIDTH));
      let currX = -20;
      const leftLimit = FRONT_ROW_LEFT_MAX;
      let placedLeft = 0;
      const half = Math.ceil(rowConfig.factoriesPerRow / 2);
      while (currX < leftLimit && placedLeft < half) {
        const factory = createFactory({ x: currX, y }, rowIndex);
        actors.push(factory);
        placedLeft++;
        const w = computeFactoryWidth(factory, rowIndex, rowConfig, currX);
        currX += w - 20;
      }

      // fill right edge, currX increasing rightward from FRONT_ROW_RIGHT_MIN toward rightLimit
      currX = FRONT_ROW_RIGHT_MIN;
      const rightLimit = WORLD_BOUNDS.width + 100; // account for max factory width to prevent overflow
      let placedRight = 0;
      const halfRight = Math.floor(rowConfig.factoriesPerRow / 2);
      while (currX < rightLimit && placedRight < halfRight) {
        const factory = createFactory({ x: currX, y }, rowIndex);
        actors.push(factory);
        placedRight++;
        const w = computeFactoryWidth(factory, rowIndex, rowConfig, currX);
        currX += w - 20;
      }
    } else if (rowConfig.spreadType === 'full') {
      let currX = -20;
      const rightBoundary = WORLD_BOUNDS.width;
      let placed = 0;
      while (currX < rightBoundary && placed < rowConfig.factoriesPerRow) {
        const factory = createFactory({ x: currX, y }, rowIndex);
        actors.push(factory);
        placed++;
        currX = WORLD_BOUNDS.width / rowConfig.factoriesPerRow * placed; // ideal even spacing
      }
    } else if (rowConfig.spreadType === 'center') {
      let currX = (WORLD_BOUNDS.width * (1 - (rowConfig.centerWidth ?? DEFAULT_CENTER_WIDTH)) / 2) - 20; // start at left edge of center segment
      const rightBoundary = (WORLD_BOUNDS.width * (1 + (rowConfig.centerWidth ?? DEFAULT_CENTER_WIDTH)) / 2) + 20; // end at right edge of center segment, account for max factory width
      let placedCenter = 0;
      while (currX < rightBoundary && placedCenter < rowConfig.factoriesPerRow) {
        const factory = createFactory({ x: currX, y }, rowIndex);
        actors.push(factory);
        placedCenter++;
        const w = computeFactoryWidth(factory, rowIndex, rowConfig, currX);
        const mult = 0.8 + Math.random() * 0.4;
        currX += (w - 20) * mult;
      }
    } else {
      // default fallback: no spread type defined
    }
  });



  useLocaleStore.getState().setLocaleData(localeId, { actors });
  return actors;
}

/**
 * Get factory row metadata (y position, scale, floor height)
 */
export function getRowConfig(rowIndex: number) {
  if (rowIndex < 0 || rowIndex >= FACTORY_ROWS.length) {
    return null;
  }
  return FACTORY_ROWS[rowIndex];
}

/**
 * Get all factory rows for rendering floor and gradient layers
 */
export function getAllRowConfigs() {
  return FACTORY_ROWS;
}
