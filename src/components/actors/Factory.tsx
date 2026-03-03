import React, { useMemo } from 'react';

import type { Actor } from '../../types/Actor';
import { useSilhouette } from './silhouetteUtils';
import type { FactoryVariant } from './factoryVariants';
import { selectVariantFromSeed, VARIANT_CONF } from './factoryVariants';
import { getRowConfig } from '../../systems/factoryPlacementSystem';

interface FactoryProps {
  actor: Actor;
}

// ----------------------------------------
// Factory silhouette (merged from Building.tsx)
// ----------------------------------------

interface FactorySilhouetteProps {
  variant: FactoryVariant;
  noiseValue: number;
  nativeSizes?: { width: number; height: number };
  actor: Actor;
}

const FactorySilhouetteImpl: React.FC<FactorySilhouetteProps> = ({
  variant,
  noiseValue,
  nativeSizes,
  actor,
}) => {
  const config = VARIANT_CONF[variant];
  const sizes = nativeSizes ?? config.nativeSizes;

  const { width, height, fill, greebleFill, transform, greebles } = useSilhouette({
    noiseValue,
    nativeSizes: sizes,
    colors: config.colors,
    actor,
    greebleConfig: config.greebleConfig,
  });

  const clipId = `${variant.toLowerCase()}-clip-${String(actor.id).replace(/[^a-zA-Z0-9-_]/g, '-')}`;
  const pathD = config.pathD;

  const bodyClipId = config.bodyClipPath
    ? `${variant.toLowerCase()}-body-clip-${String(actor.id).replace(/[^a-zA-Z0-9-_]/g, '-')}`
    : undefined;

  return (
    <g transform={transform}>
      <defs>
        <clipPath id={clipId}>
          <path d={pathD} />
        </clipPath>
        {config.bodyClipPath && bodyClipId && (
          <clipPath id={bodyClipId}>
            <path d={config.bodyClipPath} />
          </clipPath>
        )}
      </defs>

      <g transform={`scale(${(width * (actor.scaleX ?? 1)) / 100}, ${(height * (actor.scaleY ?? 1)) / 100})`}>
        <path d={pathD} fill={fill} />
        <g clipPath={`url(#${bodyClipId ?? clipId})`}>
          {greebles &&
            greebles.map((r, i) => (
              <rect
                key={i}
                x={r.x}
                y={r.y}
                width="4"
                height="6"
                fill={greebleFill}
                opacity={r.opacity}
              />
            ))}
        </g>
      </g>
    </g>
  );
};

const FactorySilhouette = React.memo(FactorySilhouetteImpl);


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
      <FactorySilhouette
        variant={config.variant as FactoryVariant}
        noiseValue={config.noiseValue}
        nativeSizes={native}
        actor={actor}
      />
    </g>
  );
};

export default Factory;
