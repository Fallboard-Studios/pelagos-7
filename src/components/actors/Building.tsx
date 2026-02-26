import React from 'react';

import { Actor } from '../../types/Actor';
import { useSilhouette } from './silhouetteUtils';
import { FactoryVariant, VARIANT_CONF } from './factoryVariants';

interface BuildingSilhouetteProps {
  variant: FactoryVariant;
  noiseValue: number;
  nativeSizes?: { width: number; height: number };
  actor: Actor;
}



function BuildingSilhouetteImpl({
  variant,
  noiseValue,
  nativeSizes,
  actor,
}: BuildingSilhouetteProps) {
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

  // optional second clip for body-only decoration (Stacks stacks)
  const bodyClipId = config.bodyClipPath ? `${variant.toLowerCase()}-body-clip-${String(actor.id).replace(/[^a-zA-Z0-9-_]/g, '-')}` : undefined;

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

      {/* scale 0..100 coordinates up to computed width/height, then apply
          the actor-level random scale so render size matches placement logic */}
      <g transform={`scale(${(width * (actor.scaleX ?? 1)) / 100}, ${(height * (actor.scaleY ?? 1)) / 100})`}>
        {/* Scale group applies visual compression/expansion to path and decorations */}
        {/* silhouette fill */}
        <path d={pathD} fill={fill} />

        {/* decorations clipped appropriately */}
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
      </g> {/* close width/height scale group */}
      {/* </svg> */}
    </g>
  );
}

// export the generic building
export const BuildingSilhouette = React.memo(BuildingSilhouetteImpl);
