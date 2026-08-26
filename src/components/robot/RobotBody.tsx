// ========================================
// IMPORTS
// ========================================
import { memo, useMemo } from 'react';

import type { Robot, AudioAttributes } from '../../types/Robot';
import {
  selectRobotShape,
  generateColors,
  shapeParamsFromAudio,
  calculateGreebleCount,
  calculateGreebleSize,
  calculateGreeblePersistence,
  calculateGreeblePlacementBias,
  calculateScale,
  calculateDetailLevel,
  applyLightnessMultiplier,
  computeBatteryDimOpacity,
} from './robotVisualHelpers';
import mapVisualAudioToProps from './robotVisualMapper';
import type { RobotColors, RobotSVGComponent, ShapeParams, MicroVariants } from './robotVisualHelpers';
import { useUIStore } from '../../stores/uiStore';

// ========================================
// TYPES
// ========================================
interface RobotBodyProps {
  robot: Robot;
}

// ========================================
// COMPONENT
// ========================================
/**
 * RobotBody - Selects appropriate robot shape variant and calculates visual properties
 * from audio attributes. Memoized to prevent unnecessary recalculations.
 */
export const RobotBody = memo(function RobotBody({ robot }: RobotBodyProps) {
  // Derive lightness from the active locale's local time so robots track the
  // same day/night cycle as buildings. activeLocaleLocalTime is a 0..24 float
  // written by PlanetView every second.
  const localTime = useUIStore((s) => s.activeLocaleLocalTime ?? 12);
  const lightnessMultiplier = 0.5 + 0.5 * Math.sin(((localTime - 6) / 24) * Math.PI * 2);

  // Window/status-light dim — battery-driven, deliberately kept separate from
  // the audio-derived `visual` memo below (battery isn't an audio attribute).
  const dimOpacity = computeBatteryDimOpacity(robot.batteryLevel);

  const visual = useMemo(() => {
    const { adsr, filterFreq, visualAudioMap } = robot.audioAttributes;
    const octaveRange = robot.audioAttributes.octaveRange ?? robot.octaveRange;

    const layerType = robot.audioAttributes.layers?.[0]?.type;
    const waveform = (layerType && layerType !== 'noise' ? layerType : robot.audioAttributes.waveform) as import('../../types/Robot').WaveformType;
    const attrsForColor = { ...robot.audioAttributes, waveform } as AudioAttributes;

    const baseColors = generateColors(attrsForColor);
    const colors = applyLightnessMultiplier(baseColors, lightnessMultiplier);

    const mapped = mapVisualAudioToProps(visualAudioMap);

    // Convert mapped bodyShapeProps (scale, roundness, detail) into the
    // component-specific ShapeParams expected by SVG components.
    const bodyShape = mapped.bodyShapeProps ?? { scale: 0.5, roundness: 0.5, detail: 0.3 };
    const adsrTorso = Math.max(0.7, Math.min(1.3, 0.85 + (bodyShape.roundness - 0.5) * 0.6));
    const shapeParams = {
      torsoAspect: adsrTorso, // blended with register below after fromAudio is computed
      appendageLength: Math.max(0.6, Math.min(1.4, 0.8 + bodyShape.detail * 0.9)),
      scaleBias: Math.max(-0.4, Math.min(0.4, (bodyShape.scale - 0.5) * 0.6)),
    };

    const fromAudio = shapeParamsFromAudio(robot.audioAttributes, octaveRange);
    const microVariants = fromAudio.microVariants;
    // Blend ADSR-driven torsoAspect (70%) with register-driven torsoAspect (30%)
    // so bass robots are visibly wider even when their sustain says otherwise.
    shapeParams.torsoAspect = Math.max(0.7, Math.min(1.3,
      adsrTorso * 0.7 + fromAudio.shapeParams.torsoAspect * 0.3
    ));

    // Greeble values come from mapped greebleProps when present, else fall back
    // to the original deterministic calculations.
    const detail = bodyShape.detail ?? calculateDetailLevel(filterFreq);
    const registerMid = (octaveRange[0] + octaveRange[1]) / 2;
    const registerGreebleBias = Math.round((registerMid - 3.5) * 2); // bass≈-2, mid≈0, treble≈+2
    const baseGreebleCount = mapped.greebleProps?.count ?? calculateGreebleCount(filterFreq, detail, robot.audioAttributes.waveform, adsr);
    const greebleCount = Math.max(0, Math.min(16, baseGreebleCount + registerGreebleBias));
    const greebleSize = mapped.greebleProps?.scale ? Math.max(1, Math.round(mapped.greebleProps.scale * 6)) : calculateGreebleSize(adsr.sustain);
    const greeblePersistence = calculateGreeblePersistence(adsr.release);
    const greeblePlacementBias = calculateGreeblePlacementBias(adsr.decay, adsr.release);

    return {
      Component: selectRobotShape(waveform),
      colors,
      scale: calculateScale(octaveRange),
      detailLevel: detail,
      shapeParams,
      microVariants,
      greebleCount,
      greebleSize,
      greeblePersistence,
      greeblePlacementBias,
      lightsProps: mapped.lightsProps,
    };
  }, [robot.audioAttributes, robot.octaveRange, lightnessMultiplier]) as {
    Component: RobotSVGComponent;
    colors: RobotColors;
    scale: number;
    detailLevel: number;
    shapeParams: ShapeParams;
    microVariants: MicroVariants;
    greebleCount: number;
    greebleSize: number;
    greeblePersistence: number;
    greeblePlacementBias: number;
    lightsProps?: { intensity: number; color: string };
  };

  const { Component, colors, scale, detailLevel, shapeParams, microVariants, greebleCount, greebleSize, greeblePersistence, greeblePlacementBias } = visual;

  return (
    <Component
      colors={colors}
      scale={scale}
      detailLevel={detailLevel}
      shapeParams={shapeParams}
      microVariants={microVariants}
      greebleCount={greebleCount}
      greebleSize={greebleSize}
      greeblePersistence={greeblePersistence}
      greeblePlacementBias={greeblePlacementBias}
      dimOpacity={dimOpacity}
    />
  );
});
