import type { VisualAudioMap, ShapeParams } from '../../types/layeredAudio';

/**
 * Minimal adapter to convert the canonical `visualAudioMap` produced at spawn
 * into component-friendly props: `bodyShapeProps`, `greebleProps`, `lightsProps`.
 * Keep outputs serializable and small — components may animate these values.
 */
export function mapVisualAudioToProps(vm?: VisualAudioMap) {
  // Fallback defaults for shape parameters if no audio mapping is present.
  // If you change the mapping logic, update spawnSystem and docs for consistency.
  const defaultShape: ShapeParams = { scale: 0.5, roundness: 0.5, detail: 0.3 };

  if (!vm) {
    return {
      bodyShapeProps: { ...defaultShape },
      greebleProps: { count: 2, scale: 0.5 },
      lightsProps: { intensity: 0.4, color: '#ffffff' },
    };
  }

  const shape = vm.shapeParams ?? defaultShape;

  // Body shape mapping: pass through but clamp to 0..1 for safety.
  // These props are used by SVG robot components for geometry.
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const bodyShapeProps = {
    scale: clamp01(shape.scale),
    roundness: clamp01(shape.roundness),
    detail: clamp01(shape.detail),
  };

  // Greebles: derive count from detail (more detail → more greebles)
  // If you want more/less greebles, adjust the multiplier here.
  const greebleCount = Math.max(0, Math.round(bodyShapeProps.detail * 6));
  const greebleProps = {
    count: greebleCount,
    scale: clamp01(0.3 + bodyShapeProps.detail * 0.7),
  };

  // Lights: intensity is a blend of averagedGain (loudness) and detail (release time).
  // Color is mapped from scale (attack time) for visual variety.
  const intensity = clamp01((vm.averagedGain ?? 1) * 0.6 + bodyShapeProps.detail * 0.4);
  const hue = Math.round(200 - bodyShapeProps.scale * 120); // 80..200
  const lightsProps = {
    intensity,
    color: `hsl(${hue} 80% 60%)`,
  };

  return { bodyShapeProps, greebleProps, lightsProps };
}

export default mapVisualAudioToProps;
