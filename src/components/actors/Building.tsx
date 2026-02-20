import React from 'react';

import colorTheme from '../../constants/colorTheme.json';
import { Actor } from '../../types/Actor';
import { SVG_VIEWBOX, SVG_PRESERVE_ASPECT, useSilhouette } from './silhouetteUtils';

export type FactoryVariant = 'Monolith' | 'Stacks' | 'Refinery';

interface BuildingSilhouetteProps {
  variant: FactoryVariant;
  noiseValue: number;
  nativeSizes?: { width: number; height: number };
  actor: Actor;
}

// configuration for each variant; values copied from the old individual components
const VARIANT_CONF: Record<FactoryVariant, {
  nativeSizes: { width: number; height: number };
  baseScale: number;
  colors: { light: string; base: string; dark: string };
  greebleConfig: { cols: number; rows: number };
  pathD: string;
  bodyClipPath?: string;
}> = {
  Monolith: {
    nativeSizes: { width: 200, height: 300 },
    baseScale: 1.25,
    colors: {
      light: colorTheme.vent.shadow,
      base: colorTheme.shell.base,
      dark: colorTheme.body.shadow,
    },
    greebleConfig: { cols: 2, rows: 3 },
    pathD: 'M20,100 V20 L50,0 L80,20 V100 Z',
    // inset by ~3px to keep rects away from silhouette edges
    bodyClipPath: 'M23,97 V23 L50,3 L77,23 V97 Z',
  },
  Stacks: {
    nativeSizes: { width: 140, height: 360 },
    baseScale: 1,
    colors: {
      light: colorTheme.vent.shadow,
      base: colorTheme.body.base,
      dark: colorTheme.shell.highlight,
    },
    greebleConfig: { cols: 6, rows: 2 },
    pathD: 'M0,100 V40 H20 V0 H40 V40 H60 V0 H80 V40 H100 V100 Z',
    // inset contours to give padding around stacks
    bodyClipPath: 'M3,97 V43 H23 V3 H43 V43 H63 V3 H83 V43 H97 V97 Z',
  },
  Refinery: {
    nativeSizes: { width: 220, height: 300 },
    baseScale: 1,
    colors: {
      light: colorTheme.vent.shadow,
      base: colorTheme.body.base,
      dark: colorTheme.shell.shadow,
    },
    greebleConfig: { cols: 5, rows: 3 },
    pathD: 'M0,100 V60 H30 V40 H70 V60 H100 V100 Z',
    // keep greebles off the outermost edge
    bodyClipPath: 'M3,97 V63 H33 V43 H67 V63 H97 V97 Z',
  },
};

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
    baseScale: config.baseScale,
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
      <svg
        viewBox={SVG_VIEWBOX}
        width={width}
        height={height}
        preserveAspectRatio={SVG_PRESERVE_ASPECT}
      >
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
      </svg>
    </g>
  );
}

// export the generic building
export const BuildingSilhouette = React.memo(BuildingSilhouetteImpl);
