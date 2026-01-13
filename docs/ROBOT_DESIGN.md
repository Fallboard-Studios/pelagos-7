# Robot Visual Design Guide

## Overview

Robots in Pelagos-7 are modular SVG constructs with swappable parts. Each robot's appearance is procedurally generated from its musical attributes.

## SVG Part System

### Robot Anatomy (5 Parts)

1. **Chassis** (body)
   - Main structural component
   - Contains attachment points for other parts
   - Size: ~40-60px base dimension
   - Variants: Sleek, Boxy, Organic, Industrial

2. **Head** (front module)
   - Sensor array or camera unit
   - Attached to front of chassis
   - Size: ~20-30px
   - Variants: Dome, Angular, Cylindrical, Flat

3. **Propeller** (rear propulsion)
   - Rotating element (animated)
   - Attached to rear of chassis
   - Size: ~15-25px
   - Variants: 2-blade, 3-blade, 4-blade, Turbine

4. **Top Antenna** (sensor)
   - Extends upward from chassis
   - Size: ~10-20px height
   - Variants: Rod, Dish, Array, Spiral

5. **Bottom Antenna** (stabilizer)
   - Extends downward from chassis
   - Size: ~10-20px height
   - Variants: Rod, Fin, Paddle, Wire

## SVG Structure

### File Organization
```
src/assets/robots/
├── chassis/
│   ├── ChassisSleek.tsx
│   ├── ChassisBoxey.tsx
│   └── ...
├── heads/
├── propellers/
└── antennae/
```

### Component Pattern
```typescript
interface RobotPartProps {
  color: string;
  scale?: number;
}

export function ChassisSleek({ color, scale = 1 }: RobotPartProps) {
  return (
    <g transform={`scale(${scale})`}>
      <path d="..." fill={color} />
      {/* Attachment point markers */}
      <circle cx="0" cy="0" r="2" fill="none" data-attach="center" />
      <circle cx="20" cy="0" r="2" fill="none" data-attach="head" />
      <circle cx="-20" cy="0" r="2" fill="none" data-attach="propeller" />
    </g>
  );
}
```

## Attribute Mapping

### Synth Type → Head Shape
- **AMSynth** → Dome head (smooth, rounded)
- **FMSynth** → Angular head (sharp edges)
- **PolySynth** → Cylindrical head (stacked layers)
- **MembraneSynth** → Flat head (wide, thin)

### ADSR → Color Palette
- **Fast Attack** → Bright colors (high saturation)
- **Slow Attack** → Muted colors (lower saturation)
- **Long Decay** → Cool hues (blue, cyan)
- **Short Decay** → Warm hues (red, orange)

### Pitch Range → Propeller Type
- **High Range** → Small, fast propeller (2-blade)
- **Mid Range** → Medium propeller (3-blade)
- **Low Range** → Large, slow propeller (4-blade)
- **Wide Range** → Turbine (omni-directional)

### Filter Frequency → Antenna Configuration
- **High Filter** → Long, thin antennae
- **Low Filter** → Short, thick antennae
- **No Filter** → Minimal antennae

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
- **Chassis:** Base color (from attribute)
- **Head:** Lighter shade (+20% lightness)
- **Propeller:** Darker shade (-20% lightness)
- **Antennae:** Accent color (complementary hue)

## Animation States

### Idle (Floating)
- Gentle vertical bob: ±3px, 2s cycle
- Slight rotation: ±2°, 3s cycle
- Propeller slow spin: 1 rotation/2s

### Swimming
- Propeller fast spin: 3 rotations/s
- Chassis tilt: 5-10° toward destination
- Antennae sway: ±5°, 0.5s cycle

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
function generateRobotParts(audioAttributes: AudioAttributes): RobotParts {
  const { synthType, adsr, pitchRange, filterFreq } = audioAttributes;
  
  return {
    chassis: selectChassis(synthType),
    head: selectHead(synthType),
    propeller: selectPropeller(pitchRange),
    topAntenna: selectAntenna(filterFreq, 'top'),
    bottomAntenna: selectAntenna(filterFreq, 'bottom'),
    colors: generateColorPalette(adsr),
  };
}
```

### Variant Weighting
```typescript
const CHASSIS_WEIGHTS = {
  sleek: 0.35,
  boxy: 0.30,
  organic: 0.20,
  industrial: 0.15,
};
```

## Size Variations

### Base Size Classes
- **Small:** 0.7x scale (high-pitched robots)
- **Medium:** 1.0x scale (default)
- **Large:** 1.3x scale (low-pitched robots)

### Size Mapping
- Pitch range < 200Hz → Large
- Pitch range 200-600Hz → Medium
- Pitch range > 600Hz → Small

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
- [ ] Dynamic part swapping (upgrade animation)
- [ ] Battle damage (visual degradation over time)
- [ ] Electronic glow effects
- [ ] Particle trails (exhaust from propellers)

## Examples

### Example 1: High-Pitched Scout
```typescript
{
  chassis: 'sleek',
  head: 'dome',
  propeller: '2-blade',
  topAntenna: 'rod-long',
  bottomAntenna: 'fin-small',
  colors: {
    base: '#00FFFF',
    accent: '#FF00FF',
  },
  size: 'small',
}
```

### Example 2: Low-Frequency Hauler
```typescript
{
  chassis: 'industrial',
  head: 'flat',
  propeller: '4-blade',
  topAntenna: 'dish',
  bottomAntenna: 'paddle',
  colors: {
    base: '#8B4513',
    accent: '#CD853F',
  },
  size: 'large',
}
```

## Reference Images

[To be added: Sketch wireframes of each part type]

## SVG Template

```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <g id="robot" transform="translate(50, 50)">
    <!-- Chassis -->
    <g id="chassis">
      <path d="M -20,-10 L 20,-10 L 20,10 L -20,10 Z" fill="currentColor" />
    </g>
    
    <!-- Head -->
    <g id="head" transform="translate(20, 0)">
      <circle r="8" fill="currentColor" opacity="0.9" />
    </g>
    
    <!-- Propeller (animated) -->
    <g id="propeller" transform="translate(-20, 0)">
      <line x1="-10" y1="0" x2="10" y2="0" stroke="currentColor" stroke-width="2" />
      <line x1="0" y1="-10" x2="0" y2="10" stroke="currentColor" stroke-width="2" />
    </g>
    
    <!-- Top Antenna -->
    <g id="top-antenna" transform="translate(0, -10)">
      <line x1="0" y1="0" x2="0" y2="-15" stroke="currentColor" stroke-width="1" />
      <circle cx="0" cy="-15" r="2" fill="currentColor" />
    </g>
    
    <!-- Bottom Antenna -->
    <g id="bottom-antenna" transform="translate(0, 10)">
      <path d="M 0,0 L -5,10 L 5,10 Z" fill="currentColor" opacity="0.7" />
    </g>
  </g>
</svg>
```