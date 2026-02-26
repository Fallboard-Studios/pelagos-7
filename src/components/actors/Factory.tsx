import React, { useMemo } from 'react';

import type { Actor } from '../../types/Actor';
import { BuildingSilhouette } from './Building';
import type { FactoryVariant } from './factoryVariants';
import { selectVariantFromSeed, VARIANT_CONF } from './factoryVariants';
import { getRowConfig } from '../../systems/factoryPlacementSystem';

interface FactoryProps {
  actor: Actor;
}

export const Factory: React.FC<FactoryProps> = ({ actor }) => {
  // Procedurally generate silhouette from actor.id seed
  const config = useMemo(() => {
    const row = actor.config?.row ?? 1;
    const rowCfg = getRowConfig(row);
    const available = rowCfg?.availableFactoryTypes;
    return selectVariantFromSeed(actor.id, actor.position.x, row, available);
  }, [actor.id, actor.position.x, actor.config?.row]);

  const native = VARIANT_CONF[config.variant].nativeSizes;
  return (
    <g>
      <BuildingSilhouette
        variant={config.variant as FactoryVariant}
        noiseValue={config.noiseValue}
        nativeSizes={native}
        actor={actor}
      />
    </g>
  );
};

export default Factory;
