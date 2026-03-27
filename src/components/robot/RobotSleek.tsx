// ========================================
// IMPORTS
// ========================================
import React from 'react';

// ========================================
// TYPES
// ========================================
interface ShapeParams {
  torsoAspect: number;
  appendageLength: number;
  scaleBias: number;
}

interface MicroVariants {
  stripes?: boolean;
  smooth?: boolean;
  spikes?: boolean;
}

interface RobotSVGProps {
  colors: { primary: string; secondary: string; accent: string };
  scale: number;
  detailLevel: number; // 0-1, controls decoration complexity
  shapeParams?: ShapeParams;
  microVariants?: MicroVariants;
}

// ========================================
// COMPONENT
// ========================================
/**
 * RobotSleek - Smooth, streamlined design for AMSynth
 * Industrial submarine aesthetic with curved hull sections
 * Future: Body curvature, position, and details controlled by audio attributes
 */
export const RobotSleek = React.memo(function RobotSleek({ colors, scale, detailLevel, shapeParams, microVariants }: RobotSVGProps) {
  const torsoAspect = shapeParams?.torsoAspect ?? 1;
  const appendageLength = shapeParams?.appendageLength ?? 1;
  const scaleBias = shapeParams?.scaleBias ?? 0;

  const overall = scale * (1 + scaleBias);

  return (
    <g transform={`scale(${overall})`}>
      <g transform={`scale(${torsoAspect},1)`}>
      <svg viewBox="0 0 96 72" width={96} height={72}>
        {/* Base hull - streamlined curved shape */}
        <path
          d="M 8,16 L 12,12 H 72 L 80,20 V 52 L 72,60 H 12 L 8,56 Z"
          fill={colors.primary}
        />

        {/* Hull highlight */}
        <path
          d="M 8,16 L 9,17 H 71 L 79,25 V 20 L 72,13 H 13 L 9,17 L 8,16 Z"
          fill="#a9adb0"
          opacity="0.6"
        />

        {/* Hull shadow */}
        <path
          d="M 8,56 L 9,55 H 71 L 79,47 V 52 L 72,59 H 13 L 9,55 L 8,56 Z"
          fill="#000000"
          opacity="0.3"
        />

        {/* Propeller mounting strut */}
        <g className="propeller-arm">
          <rect x="80" y="32" width="10" height={Math.max(4, Math.round(8 * appendageLength))} fill={colors.secondary} />
          <path d="M 80,33 H 89 V 32 H 80 Z" fill="#a9adb0" opacity="0.5" />
          <path d="M 80,39 H 89 V 40 H 80 Z" fill="#000000" opacity="0.3" />
        </g>

        {/* Propeller - cross blade design */}
        <g className="propeller" transform="translate(90, 36)">
          <rect x="-1" y="-8" width="2" height="16" fill={colors.secondary} />
          <rect x="-8" y="-1" width="16" height="2" fill={colors.secondary} />
        </g>

        {/* Window */}
        <ellipse cx="24" cy="36" rx="8" ry="10" fill="#78cce2" opacity="0.8" />
        <ellipse cx="24" cy="34" rx="6" ry="4" fill="#b3e5f2" opacity="0.6" />

        {/* Corner rivets */}
        <circle cx="14" cy="14" r="1.5" fill="#4f5458" />
        <circle cx="70" cy="14" r="1.5" fill="#4f5458" />
        <circle cx="14" cy="58" r="1.5" fill="#4f5458" />
        <circle cx="70" cy="58" r="1.5" fill="#4f5458" />

        {/* Conditional details - shown when detailLevel > 0.5 */}
        {detailLevel > 0.5 && (
          <g className="details">
            {/* Panel lines */}
            <path d="M 40,12 L 40,60" stroke={colors.accent} strokeWidth="1" opacity="0.4" />
            <path d="M 60,12 L 60,60" stroke={colors.accent} strokeWidth="1" opacity="0.4" />

            {/* Vent detail */}
            <rect x="48" y="28" width="12" height="16" fill="#6a6384" opacity="0.8" />
            <path d="M 48,28 L 49,29 H 59 L 60,28 Z" fill="#928ba9" opacity="0.6" />
            <path d="M 48,44 L 49,43 H 59 L 60,44 Z" fill="#3b374d" opacity="0.6" />
            {/* Vent slats */}
            <path d="M 50,32 H 58" stroke="#928ba9" strokeWidth="1" opacity="0.5" />
            <path d="M 50,36 H 58" stroke="#928ba9" strokeWidth="1" opacity="0.5" />
            <path d="M 50,40 H 58" stroke="#928ba9" strokeWidth="1" opacity="0.5" />
          </g>
        )}
      </svg>
      </g>
    </g>
  );
});
