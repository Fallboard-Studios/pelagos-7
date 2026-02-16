# Factory Visual Design Guide

## Overview
Factories in Pelagos-7 are gargantuan, modular industrial structures lining the ocean floor. Unlike the mobile robots, factory architecture is procedurally generated from a deterministic seed using the **Alea** PRNG and **Simplex Noise**. This ensures that every coordinate on the seabed has a unique, persistent industrial silhouette that remains consistent across sessions.

* **Seeding:** [alea](https://www.npmjs.com/package/alea)
* **Noise Logic:** [simplex-noise](https://www.npmjs.com/package/simplex-noise)

## Design Philosophy
**Key Principle:** Persistent terrain-integrated modularity.
* **Macro-Density:** Large functional landmarks (pipes, vents, stilts) rather than small rivets.
* **Seabed Integration:** Every factory module is responsible for drawing its own ground/foundation. Structures must appear "grown" from or heavily bolted into the specific terrain coordinates provided by the noise function.
* **Industrial Brutalism:** Visuals are strictly limited to 90° and 45° angles. No curves or strokes.

## SVG Structure

### File Organization

```

src/assets/factories/
├── FactoryFoundation.tsx  # Ground integration, stilts, and anchors
├── FactoryCore.tsx        # Main processing units and chassis
├── FactoryExhaust.tsx     # Cooling vents, chimneys, and outputs
└── FactoryConduit.tsx     # Connecting pipes and power lines

```

### Component Pattern
```typescript
interface FactorySVGProps {
  seed: string;               // Passed to Alea for deterministic randomness
  xPosition: number;          // Used as input for Simplex Noise
  audioSync: number;          // 0-1 value for pulsing lights/animations
}

export function FactoryCore({ seed, xPosition, audioSync }: FactorySVGProps) {
  // Logic: Use seed + xPosition to determine style via Simplex Noise
  // const style = getNoiseStyle(seed, xPosition); 
  
  return (
    <g className="factory-module">
      {/* GROUND INTEGRATION: Each module renders its own seabed segment */}
      <rect x="0" y="280" width="200" height="20" fill="var(--body-shadow)" />
      
      {/* Structural Chassis - Fixed 45-degree bevels */}
      <path d="M0 50 L40 10 H160 L200 50 V280 H0 Z" fill="var(--shell-base)" />
      
      {/* "Living" Vent - Brightness mapped to audioSync */}
      <rect x="40" y="80" width="120" height="60" fill="var(--body-shadow)" />
      <g className="vent-slats" opacity={0.5 + audioSync * 0.5}>
         <rect x="45" y="90" width="110" height="5" fill="var(--vent-base)" />
         <rect x="45" y="110" width="110" height="5" fill="var(--vent-base)" />
      </g>
    </g>
  );
}

```

## Attribute Mapping

Instead of audio attributes, the visual variety of factories is driven by the noise map:

* **Noise Value (-1 to 0):** Low-profile structures, heavy ground integration, stilted foundations.
* **Noise Value (0 to 1):** High-profile "Command Towers," massive exhaust stacks, increased glass observation strips.
* **Seed Logic:** The seed determines the "Theme" of the factory cluster (e.g., density of orange struts vs. density of yellow conduits).

## Color System

Color values are managed centrally and must be referenced from the project theme. **Strictly no strokes, only fills.**

**Source:** `./src/constants/colorTheme.json`

| Color Group | Variant | Hex Value | Application |
| --- | --- | --- | --- |
| **body** | base | `#2a3439` | Main structural foundations and stilts |
| | highlight | `#45535a` | Top edge highlights on body elements |
| | shadow | `#1a1f22` | Bottom edge shadows on body elements |
| **shell** | base | `#818589` | Outer armor plating and chassis |
| | highlight | `#a9adb0` | Top edge highlights on shell elements |
| | shadow | `#4f5458` | Bottom edge shadows on shell elements |
| **strut** | base | `#ff8c00` | Hydraulic pistons and mechanical joints |
| | highlight | `#ffae42` | Top edge highlights on struts |
| | shadow | `#a04000` | Bottom edge shadows on struts |
| **wire** | base | `#f1c40f` | Horizontal power conduits and wiring |
| | highlight | `#f7dc6f` | Top edge highlights on wires |
| | shadow | `#9a7d0a` | Bottom edge shadows on wires |
| **vent** | base | `#6a6384` | Vent panels and grills |
| | highlight | `#928ba9` | Top edge highlights on vents |
| | shadow | `#3b374d` | Bottom edge shadows on vents |
| **glass** | base | `#78cce2` | Observation strips and data windows |
| | highlight | `#b3e5f2` | Top edge highlights on glass |
| | shadow | `#3b6b7a` | Bottom edge shadows on glass |
| **indicator** | powered | `#39ff14` | Active machinery lights (on state) |
| | highlight | `#a2ff8a` | Indicator glow/halo effect |
| | off | `#145a32` | Inactive machinery lights |
| | flare | `#e0ffff` | Center flare on active indicators |
| **alert** | powered | `#e60d2e` | Alert/warning lights (on state) |
| | highlight | `#ff5c75` | Alert glow/halo effect |
| | off | `#7b091c` | Inactive alert lights |
| **shadowDepth** | | `#191919` | Deep shadow accents and depth |

## Vector Constraints

* **Lines:** Strictly horizontal, vertical, or 45-degree diagonals.
* **Fills Only:** Use `<rect>` and `<path>` with `fill`. No `stroke` or `stroke-width`.
* **Tiling:** All modules must have flat 90° side-edges to allow seamless horizontal repetition across the noise-generated terrain.

## Animation States (Audio Reactive)

* **The "Throb" (Peak):** `indicator` lights pulse opacity.
* **The "Hum" (Sustain):** Internal machinery (within vents) cycles brightness based on noise-offset frequencies.

## Procedural Generation Logic

```typescript
import Alea from 'alea';
import { createNoise2D } from 'simplex-noise';

function generateSeabed(seed: string, viewportWidth: number) {
  const prng = Alea(seed);
  const noise2D = createNoise2D(prng);
  
  // Use noise2D(x, 0) to determine which Factory component variant to mount
  // and how high the foundation stilts should extend.
}
```