# Robot Visual Design Guide

## Overview

Robots in Pelagos-7 are single unified SVG entities. Each robot's visual appearance (shape, colors, decorations) is procedurally generated from its audio attributes, creating a direct visual representation of its sonic character.

## Design Philosophy

**Key Principle:** Audio attributes drive visual appearance
- **LayeredWave descriptor** → Overall body shape and silhouette
- **Averaged ADSR envelope** → Color palette and saturation
- **Pitch range** → Size scaling
- **Filter frequency** → Detail complexity and decorative elements

## SVG Structure

### File Organization
```
src/assets/robots/
├── RobotSleek.tsx      # Smooth, flowing lines (low-frequency layers)
├── RobotAngular.tsx    # Sharp, geometric (high-frequency layers)
├── RobotOrganic.tsx    # Rounded, biological (mixed sine/noise layers)
└── RobotIndustrial.tsx # Mechanical, boxy (sawtooth-dominant layers)
```

### Component Pattern
```typescript
interface RobotSVGProps {
  colors: RobotColorPalette;
  scale: number;
  detailLevel: number; // 0-1, controls decoration complexity
}

export function RobotSleek({ colors, scale, detailLevel }: RobotSVGProps) {
  return (
    <g transform={`scale(${scale})`}>
      {/* Main body shape */}
      <path d="..." fill={colors.primary} />
      
      {/* Propeller (animated element) */}
      <g className="propeller">
        <path d="..." fill={colors.secondary} />
      </g>
      
      {/* Decorative details (conditional based on detailLevel) */}
      {detailLevel > 0.5 && (
        <g className="details">
          <circle cx="..." cy="..." r="..." fill={colors.accent} />
        </g>
      )}
    </g>
  );
}
```

## Attribute Mapping

### LayeredWave Base Waveform → Body Shape
- **sine** → Sleek profile (smooth curves, streamlined)
- **square** → Angular profile (sharp edges, geometric)
- **triangle** → Organic profile (rounded, flowing)
- **sawtooth** → Industrial profile (boxy, mechanical)

### ADSR → Color Palette
- **Fast Attack** → Bright, saturated colors
- **Slow Attack** → Muted, desaturated colors
- **Long Decay** → Cool hues (blues, cyans, purples)
- **Short Decay** → Warm hues (reds, oranges, yellows)
- **High Sustain** → Higher luminance
- **Low Sustain** → Lower luminance

### Pitch Range → Size Scaling
- **High Range (>600Hz)** → Small scale (0.7x)
- **Mid Range (200-600Hz)** → Medium scale (1.0x)
- **Low Range (<200Hz)** → Large scale (1.3x)

### Filter Frequency → Detail Complexity
- **High Filter (>2000Hz)** → Complex decorations (many details)
- **Mid Filter (500-2000Hz)** → Moderate decorations
- **Low Filter (<500Hz)** → Minimal decorations (clean silhouette)
- **No Filter** → Base shape only

### Phase → Oscillator Stereo Character
- `audioAttributes.phase` (0–360°) shifts the oscillator start phase at voice reservation time.
- Visual hint only: extreme phase values (>180°) can subtly widen perceived stereo width in layered visuals.

### Detune → Pitch Drift Visual
- `audioAttributes.detune` (cents, e.g. −100..100) controls micro-pitch drift at voice reservation.
- Influences greeble "shimmer" intensity in the `layerVisuals` descriptor when non-zero.

### Name → Display Label
- `robot.name` (string, generated at spawn by `spawnSystem`) provides the human-readable label shown in the Robot Gallery and Synthesis Module A UI.

### masterVolume → Gain / Brightness
- `robot.masterVolume` (0–1) is the base velocity/loudness for all notes this robot plays.
- Mapped to the Gain Power Bar in Synthesis Module B (UI Issue 12).

## Color System

### Base Palette (Post-Apocalyptic Theme)
```typescript
const ROBOT_COLORS = {
  rusty: ['#8B4513', '#A0522D', '#CD853F'],
  corroded: ['#2F4F4F', '#556B2F', '#6B8E23'],
  neon: ['#00FF00', '#00FFFF', '#FF00FF'],
  industrial: ['#696969', '#808080', '#A9A9A9'],
};
```

### Color Application
- **Primary:** Main body fill color
- **Secondary:** Propeller and structural elements
- **Accent:** Sensors, lights, decorative details

## Animation States

### Idle (Floating)
- Gentle vertical bob: ±3px, 2s cycle
- Slight rotation: ±2°, 3s cycle
- Propeller slow spin: 1 rotation/2s

### Swimming
- Propeller fast spin: 3 rotations/s
- Body tilt: 5-10° toward destination
- Slight undulation animation

### Interacting
- Scale pulse: 1.0 → 1.15 → 1.0, 0.4s
- Rotation burst: ±15°
- Propeller rapid spin: 5 rotations/s

### Selected
- Outline glow: 2px stroke, pulsing opacity
- Elevated z-index
- Propeller stopped (frozen)

## Procedural Generation

### Generation Algorithm
```typescript
function generateRobotVisuals(audioAttributes: AudioAttributes): RobotVisuals {
  const { visualAudioMap } = audioAttributes;
  const { layeredWave, averagedADSR, shapeParams } = visualAudioMap;

  return {
    svgComponent: selectRobotShape(layeredWave.base),  // Which SVG shape variant
    colors: generateColorPalette(averagedADSR),        // Color scheme
    scale: shapeParams.scale,                          // Size scaling
    detailLevel: shapeParams.detail,                   // Decoration complexity
  };
}

function selectRobotShape(base: WaveformType): RobotSVGComponent {
  switch (base) {
    case 'sine': return RobotSleek;
    case 'square': return RobotAngular;
    case 'triangle': return RobotOrganic;
    case 'sawtooth': return RobotIndustrial;
    default: return RobotSleek;
  }
}

function calculateScale(pitchRange: { min: number; max: number }): number {
  const avgFreq = (pitchRange.min + pitchRange.max) / 2;
  if (avgFreq > 600) return 0.7;  // Small
  if (avgFreq < 200) return 1.3;  // Large
  return 1.0;                     // Medium
}

function calculateDetailLevel(filterFreq: number): number {
  // Returns 0-1 value for decoration complexity
  if (filterFreq > 2000) return 1.0;   // Maximum detail
  if (filterFreq < 500) return 0.2;    // Minimal detail
  return (filterFreq - 500) / 1500;    // Linear interpolation
}
```

## Spawn-time Visual Mapping (`visualAudioMap`)

The audio systems produce a compact `visualAudioMap` at spawn time that is stored on each robot's `audioAttributes`. This map is intentionally serializable and contains a small `LayeredWave` descriptor plus derived visuals used by the rendering pipeline:

- `layeredWave` — compact layered descriptor (base + optional per-layer gain/detune/adsr)
- `averagedADSR` — gain-weighted averaged ADSR envelope derived from layers
- `averagedGain` — overall loudness proxy used for color/luminance mapping
- `shapeParams` — compact shape values (`scale`, `roundness`, `detail`) in 0..1 used by the SVG components
- `layerVisuals` — optional per-layer color/scale/offset hints for greebles and lights

Practical guidelines:
- Prefer `visualAudioMap` when rendering — it guarantees deterministic visuals in editor previews and snapshots without initializing Tone.js.
- Keep the map serializable; never store Tone.js nodes or functions in state.
- The runtime `AudioEngine` may create an isolated composite synth from the same `LayeredWave` for real synthesis, but the visual system continues to use the spawn-time map for deterministic presentation.

See `src/types/layeredAudio.ts`, `src/systems/spawnSystem.ts` and `src/components/robot/robotVisualMapper.ts` for the canonical shapes and mapping logic.

## Accessibility

### Color Contrast
- Minimum contrast ratio: 3:1 (against background)
- Use luminance calculations for automatic adjustment

### Hover States
- Show subtle outline

### Selection Indicators
- Clear visual distinction from unselected state
- Non-color-dependent (use a glow effect, not just color change)

## Performance Considerations

### SVG Optimization
- Use `<use>` for repeated elements
- Minimize path complexity (< 20 points per path)
- Avoid filters on many elements (slow)

### Rendering
- Pool and reuse SVG elements when possible
- Use CSS transforms (GPU-accelerated) for motion
- Limit simultaneous propeller animations (max 12)

## Future Enhancements

- [ ] Procedural texture generation (rust, scratches)
- [ ] Dynamic shape morphing (visual evolution over time)
- [ ] Battle damage (visual degradation)
- [ ] Electronic glow effects
- [ ] Particle trails (exhaust from propellers)

## Examples

### Example 1: High-Pitched Scout
```typescript
{
  audioAttributes: {
    // Use a compact layered descriptor at spawn-time for both audio and visuals
    layeredWave: { base: 'sine', layers: [] },
    adsr: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5 },
    pitchRange: { min: 600, max: 1200 },
    filterFreq: 2500,
  },
  visualOutput: {
    svgComponent: RobotSleek,
    colors: {
      primary: '#00FFFF',    // Bright cyan (fast attack, high sustain)
      secondary: '#0088CC',  // Dark cyan
      accent: '#FF00FF',     // Magenta accent
    },
    scale: 0.7,              // Small (high pitch)
    detailLevel: 0.9,        // High detail (high filter)
  },
}
```

### Example 2: Low-Frequency Industrial
```typescript
{
  audioAttributes: {
    // Layered descriptor with a lower-frequency base
    layeredWave: { base: 'sawtooth', layers: [{ type: 'noise', gain: 0.2 }] },
    adsr: { attack: 0.1, decay: 0.5, sustain: 0.6, release: 1.0 },
    pitchRange: { min: 80, max: 200 },
    filterFreq: 400,
  },
  visualOutput: {
    svgComponent: RobotIndustrial,
    colors: {
      primary: '#8B4513',    // Rusty brown (slow attack, low pitch)
      secondary: '#654321',  // Dark brown
      accent: '#CD853F',     // Light brown
    },
    scale: 1.3,              // Large (low pitch)
    detailLevel: 0.3,        // Minimal detail (low filter)
  },
}
```

## Reference Images

[To be added: Sketch wireframes of each robot shape variant]

## SVG Template (Sleek Variant)

```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g id="robot" transform="translate(50, 50)">
    <!-- Main body (smooth, streamlined shape) -->
    <g id="body">
      <ellipse cx="0" cy="0" rx="25" ry="15" fill="var(--primary-color)" />
      <path d="M -15,-8 Q -20,0 -15,8" fill="var(--secondary-color)" />
      <path d="M 15,-8 Q 20,0 15,8" fill="var(--secondary-color)" />
    </g>
    
    <!-- Propeller (animated rotation) -->
    <g id="propeller" className="propeller" transform="translate(-22, 0)">
      <ellipse cx="0" cy="0" rx="8" ry="2" fill="var(--secondary-color)" opacity="0.8" />
      <ellipse cx="0" cy="0" rx="2" ry="8" fill="var(--secondary-color)" opacity="0.6" />
    </g>
    
    <!-- Sensor window -->
    <g id="sensor">
      <circle cx="18" cy="-2" r="4" fill="var(--accent-color)" opacity="0.7" />
    </g>
    
    <!-- Decorative details (conditional based on detailLevel) -->
    <g id="details" opacity="0.6">
      <line x1="-5" y1="-10" x2="5" y2="-10" stroke="var(--accent-color)" stroke-width="1" />
      <circle cx="0" cy="10" r="2" fill="var(--accent-color)" />
    </g>
  </g>
</svg>
```

**Note:** Color values use CSS custom properties that are dynamically set based on the robot's audio attributes.