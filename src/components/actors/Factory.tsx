import React, { useMemo } from 'react';

import type { Actor } from '../../types/Actor';
import { BuildingSilhouette, FactoryVariant } from './Building';
import { selectVariantFromSeed } from './factoryVariants';

// Stable reference — defined outside component so it never triggers new prop identity
const NATIVE_SIZES: Record<FactoryVariant, { width: number; height: number }> = {
  Monolith: { width: 200, height: 300 },
  Stacks: { width: 140, height: 360 },
  Refinery: { width: 220, height: 300 },
};

interface FactoryProps {
  actor: Actor;
}

export const Factory: React.FC<FactoryProps> = ({ actor }) => {
  // Procedurally generate silhouette from actor.id seed
  const config = useMemo(() => selectVariantFromSeed(actor.id, actor.position.x), [actor.id, actor.position.x]);

  const native = NATIVE_SIZES[config.variant];

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
