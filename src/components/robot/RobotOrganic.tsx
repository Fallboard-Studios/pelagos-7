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
  greebleCount?: number;
  greebleSize?: number;
  greeblePersistence?: number;
  greeblePlacementBias?: number;
}

// ========================================
// COMPONENT
// ========================================
/**
 * RobotOrganic - Rounded, biomechanical design for polyphonic synth voices
 * Industrial construction with curved organic hull
 */
export const RobotOrganic = React.memo(function RobotOrganic({ colors, scale, detailLevel, shapeParams }: RobotSVGProps) {
  const torsoAspect = shapeParams?.torsoAspect ?? 1;
  const appendageLength = shapeParams?.appendageLength ?? 1;
  const scaleBias = shapeParams?.scaleBias ?? 0;
  const overall = scale * (1 + scaleBias);

  return (
    <g transform={`scale(${overall})`}>
      <g transform={`scale(${torsoAspect},1)`}>
      <svg viewBox="0 0 96 72" width={96} height={72}>
        {/* Base hull - organic curved shape */}
        <ellipse cx="48" cy="36" rx="36" ry="28" fill={colors.primary} />

        {/* Hull highlight - curved upper */}
        <ellipse cx="48" cy="28" rx="32" ry="16" fill="#a9adb0" opacity="0.5" />

        {/* Hull shadow - curved lower */}
        <ellipse cx="48" cy="44" rx="32" ry="16" fill="#000000" opacity="0.2" />

        {/* Propeller mounting pod */}
        <g className="propeller-arm">
          <ellipse cx="84" cy="36" rx="6" ry={Math.max(6, Math.round(10 * appendageLength))} fill={colors.secondary} />
          <ellipse cx="84" cy="32" rx="4" ry="4" fill="#a9adb0" opacity="0.5" />
          <ellipse cx="84" cy="40" rx="4" ry="4" fill="#000000" opacity="0.3" />
        </g>

        {/* Propeller - rounded blades */}
        <g className="propeller" transform="translate(90, 36)">
          <ellipse cx="0" cy="0" rx="2" ry="8" fill={colors.secondary} />
          <ellipse cx="0" cy="0" rx="8" ry="2" fill={colors.secondary} />
        </g>

        {/* Central viewport - circular */}
        <circle cx="32" cy="36" r="12" fill="#78cce2" opacity="0.8" />
        <circle cx="32" cy="32" r="8" fill="#b3e5f2" opacity="0.6" />
        <circle cx="34" cy="30" r="3" fill="#e0ffff" opacity="0.8" />

        {/* Segmentation rivets */}
        <circle cx="20" cy="20" r="1.5" fill="#4f5458" />
        <circle cx="64" cy="20" r="1.5" fill="#4f5458" />
        <circle cx="20" cy="52" r="1.5" fill="#4f5458" />
        <circle cx="64" cy="52" r="1.5" fill="#4f5458" />

        {detailLevel > 0.5 && (
          <g className="details">
            {/* Panel seam lines */}
            <ellipse cx="48" cy="36" rx="28" ry="20" fill="none" stroke={colors.accent} strokeWidth="1" opacity="0.4" />
            <ellipse cx="48" cy="36" rx="20" ry="14" fill="none" stroke={colors.accent} strokeWidth="1" opacity="0.3" />

            {/* Bio-vent detail */}
            <ellipse cx="56" cy="36" rx="6" ry="8" fill="#6a6384" opacity="0.8" />
            <ellipse cx="56" cy="34" rx="4" ry="3" fill="#928ba9" opacity="0.5" />

            {/* Status light */}
            <circle cx="60" cy="24" r="3" fill="#39ff14" opacity="0.8" />
            <circle cx="60" cy="23" r="2" fill="#a2ff8a" opacity="0.9" />
          </g>
        )}
      </svg>
      </g>
    </g>
  );
});
