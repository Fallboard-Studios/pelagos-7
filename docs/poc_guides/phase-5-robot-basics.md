# Phase 5: Robot Basics (M2) - Detailed Steps

**Timeline:** Week 2-3, Days 5-7 (2-3 days, ~16 hours)  
**Goal:** Make robots visible and animated. Implement spawning, GSAP swim animations, idle behavior, and selection system. No audio integration yet - that's Phase 6.

---

## Prerequisites

- [ ] Phase 4 complete (M1 milestone done)
- [ ] Timeline management utilities ready
- [ ] Complete Robot type defined (with melody field for future use)
- [ ] All M2 issues created and in project backlog
- [ ] Understanding of SVG structure and GSAP basics

---

## Why This Phase Matters

**First visible robots!** This is when the project becomes "real" - moving shapes on screen with autonomous behavior. The architecture proves itself here: GSAP drives animation, state tracks positions, timelines are managed properly.

**What makes this impressive:**
- Autonomous behavior (robots pick destinations, swim, arrive, repeat)
- GSAP-driven animation (smooth, curved paths, rotation)
- Modular SVG system (5 swappable parts per robot)
- Selection system (click to select, affects state)
- Timeline lifecycle management (spawn/swim/cleanup)

**After Phase 5:** Robots swim autonomously with no sound. Phase 6 (M3) will add melody generation and audio playback. Phase 7 (M4) adds interactions.

---

## Phase Overview

You'll implement 7 issues from Milestone M2:

1. **M2.0:** Unit Testing Setup (Vitest infrastructure and initial tests)
2. **M2.1:** Robot SVG Components (chassis, head, propeller, 2 antennae)
3. **M2.2:** RobotBody Component (assembles SVG parts)
4. **M2.3:** Robot Component (wrapper with position and selection)
5. **M2.4:** Robot Spawning System (manual spawn button)
6. **M2.5:** GSAP Swim Animation (point-to-point with curves)
7. **M2.6:** Idle State and Destination Picking (autonomous loop)

**End state:** 1-3 robots swimming around autonomously. Click to select/deselect. Silent robots - audio integration comes in Phase 6. Test suite covers core utilities from Phase 4.

---

## Issue M2.0: Unit Testing Setup (2-3 hours)

**Goal:** Set up Vitest testing infrastructure and write initial tests for Phase 4 utilities.

**Why first:** Establishes testing culture early. Tests Phase 4 code (BeatClock, harmony, store) while it's fresh. Makes "test alongside development" the norm for rest of project.

### 0.1 Install Testing Dependencies

```bash
npm install -D vitest @testing-library/react jsdom @vitest/ui
```

### 0.2 Configure Vitest

**File:** `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

### 0.3 Add Test Scripts

**File:** `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

### 0.4 Create Test Setup File

**File:** `src/test/setup.ts`

```typescript
// Add any global test setup here
// For now, just ensure jsdom is available
```

### 0.5 Write BeatClock Tests

**File:** `src/engine/beatClock.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { convertBeatsToSeconds, convertSecondsToBeats, getCurrentMeasure } from './beatClock';

describe('BeatClock', () => {
  describe('convertBeatsToSeconds', () => {
    it('converts beats to seconds at 60 BPM', () => {
      const seconds = convertBeatsToSeconds(4, 60);
      expect(seconds).toBe(4); // 4 beats at 60 BPM = 4 seconds
    });

    it('converts beats to seconds at 120 BPM', () => {
      const seconds = convertBeatsToSeconds(4, 120);
      expect(seconds).toBe(2); // 4 beats at 120 BPM = 2 seconds
    });
  });

  describe('getCurrentMeasure', () => {
    it('calculates measure and beat correctly', () => {
      const result = getCurrentMeasure(17); // 17 total beats
      expect(result.measure).toBe(4); // Measure 4 (0-indexed: 4 * 4 = 16 beats)
      expect(result.beat).toBe(1); // Beat 1 (17th beat = 1st beat of measure 5)
    });
  });
});
```

### 0.6 Write Harmony System Tests

**File:** `src/engine/harmonySystem.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { getAvailableNotes, setAvailableNotes } from './harmonySystem';
import type { EightNotes } from './harmonySystem';

describe('harmonySystem', () => {
  it('returns exactly 8 notes', () => {
    const notes = getAvailableNotes();
    expect(notes).toHaveLength(8);
  });

  it('returns a copy (not mutable reference)', () => {
    const notes1 = getAvailableNotes();
    const notes2 = getAvailableNotes();
    expect(notes1).not.toBe(notes2); // Different array instances
    expect(notes1).toEqual(notes2); // Same content
  });

  it('allows setting custom palette', () => {
    const customNotes: EightNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    setAvailableNotes(customNotes);
    const notes = getAvailableNotes();
    expect(notes).toEqual(customNotes);
  });
});
```

### 0.7 Write Ocean Store Tests

**File:** `src/stores/oceanStore.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useOceanStore } from './oceanStore';
import type { Robot } from '../types/Robot';

describe('oceanStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useOceanStore.setState({ robots: [], actors: [] });
  });

  it('starts with empty robots array', () => {
    const state = useOceanStore.getState();
    expect(state.robots).toEqual([]);
  });

  it('adds robot to array', () => {
    const robot: Robot = {
      id: 'test-1',
      position: { x: 0, y: 0 },
      destination: null,
      state: 'idle',
      melody: [],
      audio: { synthType: 'am', adsr: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 0.8 } },
    };

    useOceanStore.getState().addRobot(robot);
    
    const state = useOceanStore.getState();
    expect(state.robots).toHaveLength(1);
    expect(state.robots[0]).toEqual(robot);
  });

  it('removes robot by id', () => {
    const robot: Robot = {
      id: 'test-1',
      position: { x: 0, y: 0 },
      destination: null,
      state: 'idle',
      melody: [],
      audio: { synthType: 'am', adsr: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 0.8 } },
    };

    useOceanStore.getState().addRobot(robot);
    useOceanStore.getState().removeRobot('test-1');
    
    const state = useOceanStore.getState();
    expect(state.robots).toHaveLength(0);
  });

  it('state remains serializable', () => {
    const robot: Robot = {
      id: 'test-1',
      position: { x: 0, y: 0 },
      destination: null,
      state: 'idle',
      melody: [],
      audio: { synthType: 'am', adsr: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 0.8 } },
    };

    useOceanStore.getState().addRobot(robot);
    const state = useOceanStore.getState();
    
    // Should serialize without errors
    expect(() => JSON.stringify(state)).not.toThrow();
    
    // Should deserialize correctly
    const serialized = JSON.stringify(state);
    const deserialized = JSON.parse(serialized);
    expect(deserialized.robots[0]).toEqual(robot);
  });
});
```

### 0.8 Run Tests

```bash
# Run tests
npm test

# Run with UI (optional)
npm run test:ui

# Check coverage (optional)
npm run test:coverage
```

**Expected output:**
```
✓ src/engine/beatClock.test.ts (3 tests)
✓ src/engine/harmonySystem.test.ts (3 tests)
✓ src/stores/oceanStore.test.ts (4 tests)

Test Files  3 passed (3)
     Tests  10 passed (10)
```

### 0.9 Commit

```bash
git add .
git commit -m "feat(testing): add Vitest infrastructure and initial test suite

- Install vitest, @testing-library/react, jsdom
- Configure vite.config.ts for testing
- Add test scripts to package.json
- Write tests for BeatClock, harmonySystem, oceanStore
- All Phase 4 utilities now covered

Part of M2"
```

**Success criteria:**
- ✅ `npm test` passes
- ✅ 10+ tests passing
- ✅ BeatClock, harmony, and store utilities tested
- ✅ Test scripts available in package.json
- ✅ Testing culture established for rest of project

**Resume talking point:** "Established comprehensive unit testing strategy using Vitest from day 1"

---

## Issue M2.1: Create Robot SVG Components (3-4 hours)

### 1.1 Create SVG Asset Directory

```bash
mkdir -p src/assets/robots
```

### 1.2 Create Chassis Variants

**File: `src/assets/robots/ChassisVariants.tsx`**

```typescript
import React from 'react';

interface ChassisProps {
  className?: string;
}

/**
 * Boxy chassis - industrial, angular
 */
export function ChassisBox({ className }: ChassisProps) {
  return (
    <g className={className}>
      <rect
        x="-40"
        y="-30"
        width="80"
        height="60"
        rx="5"
        fill="currentColor"
      />
      {/* Panel lines */}
      <line x1="-40" y1="0" x2="40" y2="0" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
      <line x1="0" y1="-30" x2="0" y2="30" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
      {/* Rivets */}
      <circle cx="-30" cy="-20" r="3" fill="rgba(0,0,0,0.2)" />
      <circle cx="30" cy="-20" r="3" fill="rgba(0,0,0,0.2)" />
      <circle cx="-30" cy="20" r="3" fill="rgba(0,0,0,0.2)" />
      <circle cx="30" cy="20" r="3" fill="rgba(0,0,0,0.2)" />
    </g>
  );
}

/**
 * Rounded chassis - friendly, smooth
 */
export function ChassisRound({ className }: ChassisProps) {
  return (
    <g className={className}>
      <ellipse
        cx="0"
        cy="0"
        rx="45"
        ry="32"
        fill="currentColor"
      />
      {/* Window */}
      <ellipse cx="0" cy="0" rx="25" ry="15" fill="rgba(255,255,255,0.2)" />
      {/* Highlight */}
      <ellipse cx="-10" cy="-8" rx="12" ry="8" fill="rgba(255,255,255,0.4)" />
    </g>
  );
}

/**
 * Angular chassis - aggressive, geometric
 */
export function ChassisAngular({ className }: ChassisProps) {
  return (
    <g className={className}>
      <polygon
        points="-50,0 -30,-25 30,-25 50,0 30,25 -30,25"
        fill="currentColor"
      />
      {/* Center detail */}
      <polygon
        points="-20,0 -10,-12 10,-12 20,0 10,12 -10,12"
        fill="rgba(0,0,0,0.3)"
      />
    </g>
  );
}

/**
 * Get chassis component by variant name
 */
export function getChassis(variant: string): React.FC<ChassisProps> {
  switch (variant) {
    case 'rounded':
      return ChassisRound;
    case 'angular':
      return ChassisAngular;
    case 'boxy':
    default:
      return ChassisBox;
  }
}
```

### 1.3 Create Head Variants

**File: `src/assets/robots/HeadVariants.tsx`**

```typescript
import React from 'react';

interface HeadProps {
  className?: string;
}

/**
 * Dome head - classic robot
 */
export function HeadDome({ className }: HeadProps) {
  return (
    <g className={className} transform="translate(0, -35)">
      <circle cx="0" cy="0" r="20" fill="currentColor" />
      {/* Visor */}
      <rect x="-12" y="-5" width="24" height="8" rx="2" fill="rgba(0,0,0,0.4)" />
      {/* Eyes */}
      <circle cx="-6" cy="0" r="3" fill="#4fc3f7" />
      <circle cx="6" cy="0" r="3" fill="#4fc3f7" />
    </g>
  );
}

/**
 * Square head - utilitarian
 */
export function HeadSquare({ className }: HeadProps) {
  return (
    <g className={className} transform="translate(0, -35)">
      <rect x="-18" y="-18" width="36" height="36" rx="3" fill="currentColor" />
      {/* Screen */}
      <rect x="-14" y="-10" width="28" height="20" rx="2" fill="rgba(0,0,0,0.5)" />
      {/* Scanline */}
      <line x1="-14" y1="0" x2="14" y2="0" stroke="#4fc3f7" strokeWidth="2" opacity="0.6" />
    </g>
  );
}

/**
 * Antenna head - communication focus
 */
export function HeadAntenna({ className }: HeadProps) {
  return (
    <g className={className} transform="translate(0, -35)">
      <ellipse cx="0" cy="0" rx="16" ry="22" fill="currentColor" />
      {/* Antenna spike */}
      <line x1="0" y1="-22" x2="0" y2="-35" stroke="currentColor" strokeWidth="4" />
      <circle cx="0" cy="-35" r="4" fill="#f44336" />
      {/* Eyes */}
      <circle cx="-6" cy="-5" r="3" fill="#4fc3f7" />
      <circle cx="6" cy="-5" r="3" fill="#4fc3f7" />
    </g>
  );
}

/**
 * Get head component by variant name
 */
export function getHead(variant: string): React.FC<HeadProps> {
  switch (variant) {
    case 'square':
      return HeadSquare;
    case 'antenna':
      return HeadAntenna;
    case 'dome':
    default:
      return HeadDome;
  }
}
```

### 1.4 Create Propeller Variants

**File: `src/assets/robots/PropellerVariants.tsx`**

```typescript
import React from 'react';

interface PropellerProps {
  className?: string;
}

/**
 * Dual propeller - side mounted
 */
export function PropellerDual({ className }: PropellerProps) {
  return (
    <g className={className}>
      {/* Left propeller */}
      <g transform="translate(-45, 0)">
        <ellipse cx="0" cy="0" rx="15" ry="4" fill="currentColor" opacity="0.6" />
        <ellipse cx="0" cy="0" rx="4" ry="15" fill="currentColor" opacity="0.6" />
      </g>
      {/* Right propeller */}
      <g transform="translate(45, 0)">
        <ellipse cx="0" cy="0" rx="15" ry="4" fill="currentColor" opacity="0.6" />
        <ellipse cx="0" cy="0" rx="4" ry="15" fill="currentColor" opacity="0.6" />
      </g>
    </g>
  );
}

/**
 * Single propeller - rear mounted
 */
export function PropellerSingle({ className }: PropellerProps) {
  return (
    <g className={className} transform="translate(50, 0)">
      <ellipse cx="0" cy="0" rx="20" ry="6" fill="currentColor" opacity="0.6" />
      <ellipse cx="0" cy="0" rx="6" ry="20" fill="currentColor" opacity="0.6" />
    </g>
  );
}

/**
 * Fan propeller - multiple blades
 */
export function PropellerFan({ className }: PropellerProps) {
  return (
    <g className={className} transform="translate(0, 0)">
      {/* 6 blades in circle */}
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <ellipse
          key={angle}
          cx="0"
          cy="0"
          rx="25"
          ry="4"
          fill="currentColor"
          opacity="0.5"
          transform={`rotate(${angle})`}
        />
      ))}
    </g>
  );
}

/**
 * Get propeller component by variant name
 */
export function getPropeller(variant: string): React.FC<PropellerProps> {
  switch (variant) {
    case 'single':
      return PropellerSingle;
    case 'fan':
      return PropellerFan;
    case 'dual':
    default:
      return PropellerDual;
  }
}
```

### 1.5 Create Antenna Variants

**File: `src/assets/robots/AntennaVariants.tsx`**

```typescript
import React from 'react';

interface AntennaProps {
  className?: string;
  position: 'top' | 'bottom';
}

/**
 * Spiral antenna - decorative
 */
export function AntennaSpiral({ className, position }: AntennaProps) {
  const y = position === 'top' ? -50 : 35;
  
  return (
    <g className={className}>
      <path
        d={`M 0,0 Q 5,${y * 0.3} 0,${y * 0.6} Q -5,${y * 0.8} 0,${y}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle cx="0" cy={y} r="5" fill="#ff9800" />
    </g>
  );
}

/**
 * Straight antenna - simple
 */
export function AntennaStraight({ className, position }: AntennaProps) {
  const y = position === 'top' ? -50 : 35;
  
  return (
    <g className={className}>
      <line x1="0" y1="0" x2="0" y2={y} stroke="currentColor" strokeWidth="4" />
      <circle cx="0" cy={y} r="6" fill="#4caf50" />
    </g>
  );
}

/**
 * Dish antenna - communication
 */
export function AntennaDish({ className, position }: AntennaProps) {
  const y = position === 'top' ? -50 : 35;
  const dishY = y + (position === 'top' ? 0 : 0);
  
  return (
    <g className={className}>
      <line x1="0" y1="0" x2="0" y2={y * 0.7} stroke="currentColor" strokeWidth="3" />
      <ellipse
        cx="0"
        cy={dishY}
        rx="15"
        ry="8"
        fill="currentColor"
        opacity="0.8"
      />
    </g>
  );
}

/**
 * Claw antenna - bottom only
 */
export function AntennaClaw({ className, position }: AntennaProps) {
  const y = position === 'bottom' ? 40 : -40;
  
  return (
    <g className={className}>
      <line x1="-8" y1="0" x2="-10" y2={y} stroke="currentColor" strokeWidth="3" />
      <line x1="8" y1="0" x2="10" y2={y} stroke="currentColor" strokeWidth="3" />
      <circle cx="-10" cy={y} r="5" fill="#f44336" />
      <circle cx="10" cy={y} r="5" fill="#f44336" />
    </g>
  );
}

/**
 * Sensor antenna - technical
 */
export function AntennaSensor({ className, position }: AntennaProps) {
  const y = position === 'top' ? -45 : 40;
  
  return (
    <g className={className}>
      <line x1="0" y1="0" x2="0" y2={y * 0.8} stroke="currentColor" strokeWidth="3" />
      <rect
        x="-8"
        y={y * 0.8 - 10}
        width="16"
        height="20"
        rx="2"
        fill="currentColor"
      />
      <circle cx="0" cy={y * 0.8} r="4" fill="#2196f3" />
    </g>
  );
}

/**
 * Light antenna - glowing
 */
export function AntennaLight({ className, position }: AntennaProps) {
  const y = position === 'bottom' ? 35 : -35;
  
  return (
    <g className={className}>
      <line x1="0" y1="0" x2="0" y2={y} stroke="currentColor" strokeWidth="4" />
      <circle cx="0" cy={y} r="8" fill="#ffeb3b" opacity="0.8" />
      <circle cx="0" cy={y} r="5" fill="#fff" opacity="0.6" />
    </g>
  );
}

/**
 * Get antenna component by variant name
 */
export function getAntenna(variant: string): React.FC<AntennaProps> {
  switch (variant) {
    case 'straight':
      return AntennaStraight;
    case 'dish':
      return AntennaDish;
    case 'claw':
      return AntennaClaw;
    case 'sensor':
      return AntennaSensor;
    case 'light':
      return AntennaLight;
    case 'spiral':
    default:
      return AntennaSpiral;
  }
}
```

### 1.6 Acceptance Criteria

- [ ] 3 chassis variants (boxy, rounded, angular)
- [ ] 3 head variants (dome, square, antenna)
- [ ] 3 propeller variants (dual, single, fan)
- [ ] 6 antenna variants (spiral, straight, dish, claw, sensor, light)
- [ ] Each component uses `currentColor` for theming
- [ ] Getter functions for each type
- [ ] All components are React functional components
- [ ] SVG viewBox coordinates make sense (centered at origin)

### 1.7 Commit, Push, PR

```bash
git checkout -b feature/m2-1-robot-svg-components
git add src/assets/robots/
git commit -m "feat(assets): add robot SVG components with variants

Implements M2.1: Robot SVG components

- ChassisVariants: boxy, rounded, angular
- HeadVariants: dome, square, antenna
- PropellerVariants: dual, single, fan
- AntennaVariants: spiral, straight, dish, claw, sensor, light
- Getter functions for dynamic variant selection
- currentColor for theming support
- 15 total component variants

Closes #13"
git push origin feature/m2-1-robot-svg-components
```

---

## Issue M2.2: Create RobotBody Component (2 hours)

### 2.1 Create RobotBody Component

**File: `src/components/RobotBody.tsx`**

```typescript
import React from 'react';
import type { RobotSVGParts } from '../types/Robot';
import { getChassis } from '../assets/robots/ChassisVariants';
import { getHead } from '../assets/robots/HeadVariants';
import { getPropeller } from '../assets/robots/PropellerVariants';
import { getAntenna } from '../assets/robots/AntennaVariants';

interface RobotBodyProps {
  parts: RobotSVGParts;
  size?: number;
  color?: string;
}

/**
 * RobotBody
 * 
 * Assembles 5 SVG parts into a complete robot.
 * Parts render in this order (back to front):
 * 1. Propeller (background)
 * 2. Bottom antenna
 * 3. Chassis (main body)
 * 4. Head
 * 5. Top antenna
 */
export function RobotBody({ parts, size = 1.0, color = '#64b5f6' }: RobotBodyProps) {
  // Get component functions for each part
  const Chassis = getChassis(parts.chassis);
  const Head = getHead(parts.head);
  const Propeller = getPropeller(parts.propeller);
  const TopAntenna = getAntenna(parts.topAntenna);
  const BottomAntenna = getAntenna(parts.bottomAntenna);

  return (
    <g
      className="robot-body"
      style={{ color }}
      transform={`scale(${size})`}
    >
      {/* Layer 1: Propeller (background) */}
      <Propeller className="robot-propeller" />

      {/* Layer 2: Bottom antenna */}
      <BottomAntenna className="robot-antenna-bottom" position="bottom" />

      {/* Layer 3: Chassis (main body) */}
      <Chassis className="robot-chassis" />

      {/* Layer 4: Head */}
      <Head className="robot-head" />

      {/* Layer 5: Top antenna */}
      <TopAntenna className="robot-antenna-top" position="top" />
    </g>
  );
}
```

### 2.2 Create Styles

**File: `src/components/RobotBody.css`**

```css
.robot-body {
  /* Smooth rendering */
  shape-rendering: geometricPrecision;
}

.robot-chassis {
  /* Main body color from parent */
  color: inherit;
}

.robot-head {
  /* Slightly darker than chassis */
  filter: brightness(0.9);
}

.robot-propeller {
  /* Spinning animation (will be added in M2.5) */
  transform-origin: center;
}

.robot-antenna-top,
.robot-antenna-bottom {
  /* Subtle antenna coloring */
  opacity: 0.9;
}
```

### 2.3 Import CSS in Component

Add at top of `src/components/RobotBody.tsx`:
```typescript
import './RobotBody.css';
```

### 2.4 Create Test Component

**File: `src/debug/RobotBodyPreview.tsx`**

```typescript
import React from 'react';
import { RobotBody } from '../components/RobotBody';
import type { RobotSVGParts } from '../types/Robot';

/**
 * Preview grid showing different robot configurations
 */
export function RobotBodyPreview() {
  const variants: Array<{ parts: RobotSVGParts; color: string; label: string }> = [
    {
      parts: {
        chassis: 'boxy',
        head: 'dome',
        propeller: 'dual',
        topAntenna: 'straight',
        bottomAntenna: 'sensor',
      },
      color: '#64b5f6',
      label: 'Classic',
    },
    {
      parts: {
        chassis: 'rounded',
        head: 'square',
        propeller: 'single',
        topAntenna: 'spiral',
        bottomAntenna: 'light',
      },
      color: '#81c784',
      label: 'Friendly',
    },
    {
      parts: {
        chassis: 'angular',
        head: 'antenna',
        propeller: 'fan',
        topAntenna: 'dish',
        bottomAntenna: 'claw',
      },
      color: '#e57373',
      label: 'Aggressive',
    },
  ];

  return (
    <svg viewBox="0 0 1920 1080" style={{ width: '100%', height: '100vh', background: '#0a1128' }}>
      {variants.map((variant, i) => (
        <g key={i} transform={`translate(${400 + i * 400}, 540)`}>
          <RobotBody
            parts={variant.parts}
            size={1.2}
            color={variant.color}
          />
          <text
            x="0"
            y="150"
            textAnchor="middle"
            fill="white"
            fontSize="24"
          >
            {variant.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
```

### 2.5 Temporarily Show Preview in App

**Update `src/App.tsx` temporarily:**

```typescript
import { RobotBodyPreview } from './debug/RobotBodyPreview';

function App() {
  return <RobotBodyPreview />;
}
```

### 2.6 Test Visually

1. Run dev server
2. Should see 3 robots side by side
3. Verify:
   - All parts visible
   - Colors apply correctly
   - Different variants show different shapes
   - No console errors
   - SVG renders cleanly

### 2.7 Restore App.tsx

After verification, restore the Play button flow:
```typescript
// Restore original App.tsx with PlayButton → OceanScene
```

### 2.8 Acceptance Criteria

- [ ] RobotBody component created
- [ ] Assembles 5 parts correctly
- [ ] Layer ordering correct (propeller → bottom antenna → chassis → head → top antenna)
- [ ] Size prop scales entire robot
- [ ] Color prop applies via currentColor
- [ ] CSS file with basic styling
- [ ] Preview component shows variants
- [ ] Visual verification passed

### 2.9 Commit, Push, PR

```bash
git checkout -b feature/m2-2-robot-body
git add src/components/RobotBody.tsx src/components/RobotBody.css src/debug/RobotBodyPreview.tsx src/App.tsx
git commit -m "feat(components): add RobotBody component with part assembly

Implements M2.2: RobotBody component

- Assembles 5 SVG parts into complete robot
- Proper layer ordering
- Size and color props
- currentColor theming support
- CSS for subtle effects
- Preview component for testing variants

Closes #14"
git push origin feature/m2-2-robot-body
```

---

## Issue M2.3: Create Robot Component (2 hours)

### 3.1 Create Robot Component

**File: `src/components/Robot.tsx`**

```typescript
import React, { useRef } from 'react';
import { RobotBody } from './RobotBody';
import { useOceanStore } from '../stores/oceanStore';
import type { Robot as RobotType } from '../types/Robot';
import './Robot.css';

interface RobotProps {
  robot: RobotType;
}

/**
 * Robot
 * 
 * Wrapper component for a single robot.
 * Handles positioning, selection, and refs for GSAP animation.
 */
export function Robot({ robot }: RobotProps) {
  const robotRef = useRef<SVGGElement>(null);
  const selectedId = useOceanStore((state) => state.selectedRobotId);
  const selectRobot = useOceanStore((state) => state.selectRobot);

  const isSelected = selectedId === robot.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Toggle selection
    if (isSelected) {
      selectRobot(null);
    } else {
      selectRobot(robot.id);
    }
  };

  return (
    <g
      ref={robotRef}
      className={`robot ${isSelected ? 'robot--selected' : ''}`}
      transform={`translate(${robot.position.x}, ${robot.position.y})`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
      data-robot-id={robot.id}
    >
      {/* Selection indicator */}
      {isSelected && (
        <circle
          cx="0"
          cy="0"
          r="80"
          fill="none"
          stroke="#ffeb3b"
          strokeWidth="3"
          strokeDasharray="10 5"
          className="robot-selection"
        />
      )}

      {/* Robot body */}
      <RobotBody
        parts={robot.svgParts}
        size={robot.size}
        color="#64b5f6"
      />

      {/* Debug: ID label (will remove in production) */}
      {import.meta.env.DEV && (
        <text
          x="0"
          y="100"
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize="12"
        >
          {robot.id.slice(0, 8)}
        </text>
      )}
    </g>
  );
}

/**
 * Export ref for GSAP animations
 */
export function useRobotRef(robotId: string): SVGGElement | null {
  const element = document.querySelector(`[data-robot-id="${robotId}"]`) as SVGGElement;
  return element;
}
```

### 3.2 Create Styles

**File: `src/components/Robot.css`**

```css
.robot {
  /* Smooth transitions */
  transition: opacity 0.3s;
}

.robot--selected {
  /* Slightly brighter when selected */
  filter: brightness(1.2);
}

.robot-selection {
  /* Animated dashed outline */
  animation: rotate-selection 20s linear infinite;
}

@keyframes rotate-selection {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: 94; /* circumference of dashed circle */
  }
}

.robot:hover {
  /* Subtle hover effect */
  filter: brightness(1.1);
}
```

### 3.3 Update OceanScene to Render Robots

**File: `src/components/OceanScene.tsx`** (update)

```typescript
import React from 'react';
import { useOceanStore } from '../stores/oceanStore';
import { Robot } from './Robot';
import './OceanScene.css';

export function OceanScene() {
  const robots = useOceanStore((state) => state.robots);
  const selectRobot = useOceanStore((state) => state.selectRobot);

  // Deselect when clicking background
  const handleBackgroundClick = () => {
    selectRobot(null);
  };

  return (
    <svg
      viewBox="0 0 1920 1080"
      className="ocean-scene"
      preserveAspectRatio="xMidYMid slice"
      onClick={handleBackgroundClick}
    >
      {/* Background */}
      <rect
        width="1920"
        height="1080"
        fill="#0a1128"
        className="ocean-background"
      />

      {/* Layer groups */}
      <g id="background-layer" />
      
      {/* Robot layer */}
      <g id="robot-layer">
        {robots.map((robot) => (
          <Robot key={robot.id} robot={robot} />
        ))}
      </g>
      
      <g id="foreground-layer" />
      <g id="ui-layer" />
    </svg>
  );
}
```

### 3.4 Acceptance Criteria

- [ ] Robot component created
- [ ] Positioned via transform
- [ ] Click to select/deselect
- [ ] Selection indicator (yellow dashed circle)
- [ ] Hover effect
- [ ] Data attribute for GSAP ref access
- [ ] useRobotRef hook for external ref access
- [ ] OceanScene renders all robots
- [ ] Background click deselects

### 3.5 Commit, Push, PR

```bash
git checkout -b feature/m2-3-robot-component
git add src/components/Robot.tsx src/components/Robot.css src/components/OceanScene.tsx
git commit -m "feat(components): add Robot component with selection system

Implements M2.3: Robot wrapper component

- Position via SVG transform
- Click to select/deselect
- Selection indicator (animated dashed circle)
- Hover effects
- Data attribute for GSAP ref access
- useRobotRef hook for animation access
- OceanScene renders all robots from store
- Background click deselects

Closes #15"
git push origin feature/m2-3-robot-component
```

---

## Issue M2.4: Implement Robot Spawning System (2 hours)

### 4.1 Create Spawner Utility

**File: `src/systems/spawner.ts`**

```typescript
import { createRobot } from '../types/Robot';

/**
 * Spawn a robot at a random position
 */
export function spawnRobotAtRandom(): ReturnType<typeof createRobot> {
  // Random position within canvas bounds (with margin)
  const x = 200 + Math.random() * 1520; // 200-1720
  const y = 200 + Math.random() * 680;  // 200-880

  // Random size and speed
  const size = 0.7 + Math.random() * 0.6; // 0.7-1.3
  const speed = 0.8 + Math.random() * 0.4; // 0.8-1.2

  // Random SVG parts
  const chassisVariants = ['boxy', 'rounded', 'angular'];
  const headVariants = ['dome', 'square', 'antenna'];
  const propellerVariants = ['dual', 'single', 'fan'];
  const topAntennaVariants = ['spiral', 'straight', 'dish'];
  const bottomAntennaVariants = ['claw', 'sensor', 'light'];

  const parts = {
    chassis: chassisVariants[Math.floor(Math.random() * chassisVariants.length)],
    head: headVariants[Math.floor(Math.random() * headVariants.length)],
    propeller: propellerVariants[Math.floor(Math.random() * propellerVariants.length)],
    topAntenna: topAntennaVariants[Math.floor(Math.random() * topAntennaVariants.length)],
    bottomAntenna: bottomAntennaVariants[Math.floor(Math.random() * bottomAntennaVariants.length)],
  };

  // Melody will be generated in Phase 6 (M3)
  const melody: [] = [];

  return createRobot({
    position: { x, y },
    size,
    speed,
    svgParts: parts,
    melody,
  });
}
```

### 4.2 Create Spawn Button Component

**File: `src/components/ui/SpawnButton.tsx`**

```typescript
import React from 'react';
import { useOceanStore } from '../../stores/oceanStore';
import { spawnRobotAtRandom } from '../../systems/spawner';
import './SpawnButton.css';

/**
 * SpawnButton
 * 
 * Manual spawn button for testing (M2).
 * Will be replaced with automatic spawning in M4.
 */
export function SpawnButton() {
  const robots = useOceanStore((state) => state.robots);
  const addRobot = useOceanStore((state) => state.addRobot);
  const maxRobots = useOceanStore((state) => state.settings.maxRobots);

  const canSpawn = robots.length < maxRobots;

  const handleSpawn = () => {
    if (!canSpawn) {
      console.warn('Max robots reached');
      return;
    }

    const robot = spawnRobotAtRandom();
    addRobot(robot);
    console.log('[SpawnButton] Spawned robot:', robot.id);
  };

  return (
    <button
      className="spawn-button"
      onClick={handleSpawn}
      disabled={!canSpawn}
      title={canSpawn ? 'Spawn a robot' : 'Max robots reached'}
    >
      + Spawn Robot ({robots.length}/{maxRobots})
    </button>
  );
}
```

### 4.3 Create Styles

**File: `src/components/ui/SpawnButton.css`**

```css
.spawn-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 100;
  
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 25px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}

.spawn-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
}

.spawn-button:active:not(:disabled) {
  transform: translateY(0);
}

.spawn-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### 4.4 Add to OceanScene

**Update `src/components/OceanScene.tsx`:**

```typescript
import { SpawnButton } from './ui/SpawnButton';

export function OceanScene() {
  // ... existing code

  return (
    <>
      <svg ...>
        {/* ... existing SVG content */}
      </svg>
      
      <SpawnButton />
    </>
  );
}
```

### 4.5 Test Spawning

1. Start app, click Play
2. Click "Spawn Robot" button
3. Verify:
   - Robot appears at random position
   - Robot is clickable/selectable
   - Can spawn up to max (12)
   - Button disables at max
   - No audio yet (Phase 6)
4. Spawn 3-4 robots for testing

### 4.6 Acceptance Criteria

- [ ] spawnRobotAtRandom() creates random robot
- [ ] Random position within bounds
- [ ] Random size (0.7-1.3)
- [ ] Random speed (0.8-1.2)
- [ ] Random SVG parts
- [ ] Empty melody array (Phase 6 will populate)
- [ ] SpawnButton component created
- [ ] Button shows count (current/max)
- [ ] Button disables at max robots
- [ ] Robots appear on canvas

### 4.7 Commit, Push, PR

```bash
git checkout -b feature/m2-4-robot-spawning
git add src/systems/spawner.ts src/components/ui/SpawnButton.tsx src/components/ui/SpawnButton.css src/components/OceanScene.tsx
git commit -m "feat(systems): add robot spawning system with manual button

Implements M2.4: Robot spawning

- spawnRobotAtRandom() utility
- Random position, size, speed
- Random SVG part selection
- Empty melody array (Phase 6 adds generation)
- SpawnButton UI component
- Max robot limit enforcement

Closes #16"
git push origin feature/m2-4-robot-spawning
```

---

## Issue M2.5: Implement GSAP Swim Animation (3-4 hours)

### 5.1 Create Animation Module

**File: `src/animation/robotAnimation.ts`**

```typescript
import { gsap } from 'gsap';
import type { Robot } from '../types/Robot';
import type { Vec2 } from '../types/Robot';
import { setTimeline, killTimeline } from './timelineMap';

/**
 * Create swim animation from current position to destination
 */
export function createSwimAnimation(robot: Robot, destination: Vec2): gsap.core.Timeline {
  // Kill any existing timeline
  killTimeline(robot.id);

  const start = robot.position;
  const distance = Math.sqrt(
    Math.pow(destination.x - start.x, 2) +
    Math.pow(destination.y - start.y, 2)
  );

  // Duration based on distance and speed
  // Base: 5 seconds per 500px at speed 1.0
  const baseDuration = (distance / 500) * 5;
  const duration = baseDuration / robot.speed;

  // Calculate rotation angle
  const angle = Math.atan2(destination.y - start.y, destination.x - start.x) * (180 / Math.PI);

  // Get robot element
  const element = document.querySelector(`[data-robot-id="${robot.id}"]`) as SVGGElement;
  if (!element) {
    console.warn('[robotAnimation] Element not found for', robot.id);
    return gsap.timeline();
  }

  // Create timeline
  const tl = gsap.timeline({
    paused: true,
    onComplete: () => {
      console.log('[robotAnimation] Arrived at destination:', robot.id);
      // Timeline will be killed and removed by idle system
    },
  });

  // Animate position with slight curve
  tl.to(element, {
    x: destination.x,
    y: destination.y,
    duration,
    ease: 'power1.inOut',
    // Add slight curve to path (bezier would be more complex)
    modifiers: {
      y: (y: number) => {
        // Add sinusoidal vertical wobble (10px amplitude)
        const progress = tl.progress();
        const wobble = Math.sin(progress * Math.PI) * 10;
        return parseFloat(y) + wobble;
      },
    },
  }, 0);

  // Rotate to face direction
  tl.to(element, {
    rotation: angle,
    duration: duration * 0.2,
    ease: 'power2.out',
  }, 0);

  // Animate propeller spin
  const propeller = element.querySelector('.robot-propeller') as SVGGElement;
  if (propeller) {
    tl.to(propeller, {
      rotation: '+=360',
      duration: 1,
      ease: 'none',
      repeat: Math.ceil(duration),
      transformOrigin: '50% 50%',
    }, 0);
  }

  // Store timeline
  setTimeline(robot.id, tl);

  return tl;
}

/**
 * Create idle bobbing animation
 */
export function createIdleAnimation(robot: Robot): gsap.core.Timeline {
  killTimeline(robot.id);

  const element = document.querySelector(`[data-robot-id="${robot.id}"]`) as SVGGElement;
  if (!element) {
    console.warn('[robotAnimation] Element not found for', robot.id);
    return gsap.timeline();
  }

  const tl = gsap.timeline({
    paused: true,
    repeat: -1,
    yoyo: true,
  });

  // Gentle vertical bob
  tl.to(element, {
    y: `+=${5}`,
    duration: 2,
    ease: 'sine.inOut',
  });

  // Slow propeller spin
  const propeller = element.querySelector('.robot-propeller') as SVGGElement;
  if (propeller) {
    tl.to(propeller, {
      rotation: '+=360',
      duration: 4,
      ease: 'none',
      repeat: -1,
      transformOrigin: '50% 50%',
    }, 0);
  }

  setTimeline(robot.id, tl);

  return tl;
}

/**
 * Stop animation and clean up
 */
export function stopAnimation(robotId: string): void {
  killTimeline(robotId);
}
```

### 5.2 Create Animation Hook

**File: `src/hooks/useRobotAnimation.ts`**

```typescript
import { useEffect } from 'react';
import { useOceanStore } from '../stores/oceanStore';
import { createSwimAnimation, createIdleAnimation, stopAnimation } from '../animation/robotAnimation';
import { RobotState } from '../types/Robot';

/**
 * Hook to manage robot animations based on state
 */
export function useRobotAnimation(robotId: string) {
  const robot = useOceanStore((state) => state.getRobotById(robotId));

  useEffect(() => {
    if (!robot) return;

    // Handle animation based on state
    if (robot.state === RobotState.Idle && !robot.destination) {
      // Idle bobbing
      const tl = createIdleAnimation(robot);
      tl.play();
    } else if (robot.state === RobotState.Swimming && robot.destination) {
      // Swimming to destination
      const tl = createSwimAnimation(robot, robot.destination);
      tl.play();
    } else if (robot.state === RobotState.Selected) {
      // Stop animation when selected (optional)
      stopAnimation(robotId);
    }

    // Cleanup on unmount
    return () => {
      stopAnimation(robotId);
    };
  }, [robot?.state, robot?.destination, robotId]);
}
```

### 5.3 Integrate Animation into Robot Component

**Update `src/components/Robot.tsx`:**

```typescript
import { useRobotAnimation } from '../hooks/useRobotAnimation';

export function Robot({ robot }: RobotProps) {
  const robotRef = useRef<SVGGElement>(null);
  
  // Add animation hook
  useRobotAnimation(robot.id);

  // ... rest of component
}
```

### 5.4 Test Animations

1. Spawn a robot
2. In console, test swim animation:
```javascript
import { useOceanStore } from './src/stores/oceanStore.js';

const robot = useOceanStore.getState().robots[0];
useOceanStore.getState().updateRobot(robot.id, {
  state: 'swimming',
  destination: { x: 1000, y: 600 }
});
```

3. Watch robot swim to destination
4. Verify:
   - Smooth motion
   - Rotation faces direction
   - Propeller spins
   - Slight vertical wobble
   - Arrives at destination

### 5.5 Acceptance Criteria

- [ ] createSwimAnimation() creates timeline
- [ ] Duration based on distance and speed
- [ ] Rotation faces movement direction
- [ ] Propeller spins during swim
- [ ] Slight curve/wobble in path
- [ ] createIdleAnimation() creates bobbing loop
- [ ] useRobotAnimation hook manages state-based animation
- [ ] Timeline stored in timelineMap
- [ ] Timeline cleanup on unmount
- [ ] Smooth visual motion

### 5.6 Commit, Push, PR

```bash
git checkout -b feature/m2-5-swim-animation
git add src/animation/robotAnimation.ts src/hooks/useRobotAnimation.ts src/components/Robot.tsx
git commit -m "feat(animation): implement GSAP swim animation system

Implements M2.5: GSAP swim animation

- createSwimAnimation() with distance/speed-based duration
- Rotation to face direction of travel
- Propeller spin animation
- Slight vertical wobble (sinusoidal modifier)
- createIdleAnimation() for bobbing at rest
- useRobotAnimation hook for state-based animation
- Timeline management via timelineMap
- Proper cleanup on unmount

Closes #17"
git push origin feature/m2-5-swim-animation
```

---

## Issue M2.6: Implement Idle State and Destination Picking (2-3 hours)

### 6.1 Create Idle System

**File: `src/systems/idleSystem.ts`**

```typescript
import type { Vec2 } from '../types/Robot';
import { RobotState } from '../types/Robot';

/**
 * Pick a random destination within bounds
 */
export function pickRandomDestination(currentPosition: Vec2): Vec2 {
  // Bounds with margin
  const minX = 200;
  const maxX = 1720;
  const minY = 200;
  const maxY = 880;

  let attempts = 0;
  let destination: Vec2;

  do {
    destination = {
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
    };
    attempts++;
  } while (
    attempts < 10 &&
    distance(currentPosition, destination) < 100 // Avoid very short moves
  );

  return destination;
}

/**
 * Calculate distance between two points
 */
function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

/**
 * Check if robot has arrived at destination (within threshold)
 */
export function hasArrived(position: Vec2, destination: Vec2, threshold = 10): boolean {
  return distance(position, destination) < threshold;
}
```

### 6.2 Create Idle Hook

**File: `src/hooks/useIdleSystem.ts`**

```typescript
import { useEffect } from 'react';
import { gsap } from 'gsap';
import { useOceanStore } from '../stores/oceanStore';
import { pickRandomDestination } from '../systems/idleSystem';
import { RobotState } from '../types/Robot';
import { getTimeline } from '../animation/timelineMap';

/**
 * Hook to manage idle state and destination picking
 */
export function useIdleSystem() {
  const robots = useOceanStore((state) => state.robots);
  const updateRobot = useOceanStore((state) => state.updateRobot);

  useEffect(() => {
    // Check each robot's state every frame (via gsap ticker)
    const ticker = () => {
      robots.forEach((robot) => {
        // Skip selected robots
        if (robot.state === RobotState.Selected) return;

        // If idle and no destination, pick one
        if (robot.state === RobotState.Idle && !robot.destination) {
          const destination = pickRandomDestination(robot.position);
          updateRobot(robot.id, {
            state: RobotState.Swimming,
            destination,
          });
          return;
        }

        // If swimming, check if timeline is complete
        if (robot.state === RobotState.Swimming && robot.destination) {
          const timeline = getTimeline(robot.id);
          
          // If timeline is complete or doesn't exist, robot has arrived
          if (!timeline || timeline.progress() >= 1) {
            // Update position to destination
            updateRobot(robot.id, {
              position: robot.destination,
              destination: null,
              state: RobotState.Idle,
            });
          }
        }
      });
    };

    // Add ticker
    gsap.ticker.add(ticker);

    // Cleanup
    return () => {
      gsap.ticker.remove(ticker);
    };
  }, [robots, updateRobot]);
}
```

### 6.3 Integrate Idle System into OceanScene

**Update `src/components/OceanScene.tsx`:**

```typescript
import { useIdleSystem } from '../hooks/useIdleSystem';

export function OceanScene() {
  // Add idle system hook
  useIdleSystem();

  // ... rest of component
}
```

### 6.4 Test Autonomous Behavior

1. Start app, click Play
2. Spawn 2-3 robots
3. Watch robots:
   - Should start swimming automatically
   - Pick random destinations
   - Swim to destination
   - Arrive and pause briefly
   - Pick new destination and continue
4. Click a robot to select it
   - Should stop moving
   - Click background to deselect
   - Should resume autonomous behavior

### 6.5 Create Debug Overlay (Optional)

**File: `src/debug/RobotDebugOverlay.tsx`**

```typescript
import React from 'react';
import { useOceanStore } from '../stores/oceanStore';

/**
 * Shows robot states and destinations for debugging
 */
export function RobotDebugOverlay() {
  const robots = useOceanStore((state) => state.robots);
  const showDebug = useOceanStore((state) => state.settings.showDebug);

  if (!showDebug) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      left: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: 10,
      fontFamily: 'monospace',
      fontSize: 12,
      zIndex: 1000,
      maxHeight: '80vh',
      overflow: 'auto',
    }}>
      <h3>Robot Debug ({robots.length})</h3>
      {robots.map((robot) => (
        <div key={robot.id} style={{ marginBottom: 10, borderTop: '1px solid #333', paddingTop: 5 }}>
          <div>ID: {robot.id.slice(0, 8)}</div>
          <div>State: {robot.state}</div>
          <div>Pos: ({robot.position.x.toFixed(0)}, {robot.position.y.toFixed(0)})</div>
          {robot.destination && (
            <div>Dest: ({robot.destination.x.toFixed(0)}, {robot.destination.y.toFixed(0)})</div>
          )}
          <div>Speed: {robot.speed.toFixed(2)} | Size: {robot.size.toFixed(2)}</div>
        </div>
      ))}
    </div>
  );
}
```

Add to OceanScene:
```typescript
import { RobotDebugOverlay } from '../debug/RobotDebugOverlay';

return (
  <>
    <svg ...>...</svg>
    <SpawnButton />
    <RobotDebugOverlay />
  </>
);
```

Toggle debug in console:
```javascript
useOceanStore.getState().updateSettings({ showDebug: true });
```

### 6.6 Acceptance Criteria

- [ ] pickRandomDestination() generates valid destinations
- [ ] Destinations avoid being too close to current position
- [ ] useIdleSystem hook manages state transitions
- [ ] Idle robots pick destinations automatically
- [ ] Swimming robots transition to Idle on arrival
- [ ] Position updates to destination on arrival
- [ ] Selected robots don't pick destinations
- [ ] Robots resume behavior when deselected
- [ ] Uses gsap.ticker (not setInterval/rAF)
- [ ] Debug overlay shows state (optional)

### 6.7 Commit, Push, PR

```bash
git checkout -b feature/m2-6-idle-system
git add src/systems/idleSystem.ts src/hooks/useIdleSystem.ts src/components/OceanScene.tsx src/debug/RobotDebugOverlay.tsx
git commit -m "feat(systems): implement idle state and autonomous behavior

Implements M2.6: Idle system

- pickRandomDestination() with bounds and minimum distance
- useIdleSystem() manages state transitions
- Idle → Swimming (pick destination)
- Swimming → Idle (on arrival)
- Position sync on arrival
- Selection pauses behavior
- gsap.ticker for frame updates
- Debug overlay for state monitoring

Closes #18"
git push origin feature/m2-6-idle-system
```

---

## Phase 5 Complete! ✅

### Final Verification Checklist

- [ ] All 6 M2 issues completed and closed
- [ ] All PRs merged to main
- [ ] Feature branches deleted
- [ ] Project board shows M2 milestone complete
- [ ] App runs without errors
- [ ] Robots visible and moving
- [ ] Audio plays from their melodies
- [ ] Selection system works
- [ ] Autonomous behavior works
- [ ] TypeScript compiles
- [ ] Lint passes

### What You've Built

**Functional:**
- ✅ 15 SVG component variants (chassis, heads, propellers, antennae)
- ✅ RobotBody component (assembles 5 parts)
- ✅ Robot component (positioning, selection)
- ✅ Spawning system (manual button)
- ✅ GSAP swim animation (smooth, curved paths)
- ✅ Idle behavior system (autonomous destination picking)

**Visible Features:**
- Robots spawn and swim autonomously
- Click to select/deselect robots
- Smooth GSAP-driven movement
- Rotating propellers
- Musical melodies playing (from M1)
- 3+ robots can coexist without issues

**Architecture Proven:**
- Timeline management works in production
- State → Animation pipeline works
- GSAP doesn't conflict with React
- Selection system integrates cleanly
- gsap.ticker for game loop logic

### Current State

**What works:**
- Spawn 1-12 robots
- Robots swim autonomously between random points
- Click robots to select/deselect
- Smooth animations with propeller spin
- Silent robots (audio comes in Phase 6)

**What doesn't exist yet:**
- No robot-robot interactions (M4)
- No factory actors (M4)
- No environmental actors (M4)
- No camera pan/zoom (M4)
- No UI panels (M5)

### Testing the Complete System

1. Start app, click Play button
2. Spawn 3-4 robots
3. Watch autonomous swimming
4. Click to select robots
5. Verify animations and idle behavior
6. No audio yet - that's Phase 6

### Time Tracking

| Issue | Estimated | Actual |
|-------|-----------|--------|
| M2.1: SVG Components | 3-4 hours | |
| M2.2: RobotBody | 2 hours | |
| M2.3: Robot Component | 2 hours | |
| M2.4: Spawning | 2 hours | |
| M2.5: Swim Animation | 3-4 hours | |
| M2.6: Idle System | 2-3 hours | |
| **Total** | **~16 hours** | |

---

## Common Issues & Solutions

### Issue: Robots don't appear

**Symptoms:** Spawn button works but no robots visible

**Solutions:**
- Check browser console for errors
- Verify OceanScene renders robot-layer group
- Check z-index / SVG layer ordering
- Inspect DOM - are `<g class="robot">` elements present?
- Verify viewBox coordinates (0,0 is top-left)

### Issue: Animations don't play

**Symptoms:** Robots appear but don't move

**Solutions:**
- Check timeline is created: `import { getAllTimelineIds } from './src/animation/timelineMap.js'; console.log(getAllTimelineIds())`
- Verify timeline.play() is called
- Check for GSAP errors in console
- Verify element selector is correct (`[data-robot-id=...]`)
- Check if state is stuck in Idle without destination

### Issue: Robots move instantly

**Symptoms:** No smooth animation, instant teleport

**Solutions:**
- Check duration calculation (distance/speed)
- Verify GSAP is imported correctly
- Check for conflicting CSS transforms
- Ensure timeline isn't killed immediately

### Issue: Selection doesn't work

**Symptoms:** Clicking robot does nothing

**Solutions:**
- Check onClick handler is attached
- Verify cursor: pointer CSS is applied
- Check event.stopPropagation() prevents background click
- Inspect selectedRobotId in store state
- Check if selection indicator renders

### Issue: Robots get stuck

**Symptoms:** Robot stops moving and doesn't pick new destination

**Solutions:**
- Check idle system ticker is running
- Verify state transitions in console
- Check if destination is null when it shouldn't be
- Debug with RobotDebugOverlay component
- Check timeline.progress() returns 1 on completion

### Issue: Timeline memory leak

**Symptoms:** Performance degrades over time

**Solutions:**
- Verify killTimeline() is called before creating new timeline
- Check timeline cleanup on robot removal
- Inspect timelineMap.size - should equal robot count or less
- Ensure no orphaned timelines remain after removing robots

---

## Portfolio Talking Points

**Visual system:**
- "Modular SVG system with 15+ component variants creates unique robots"
- "GSAP-driven animation with dynamic duration based on distance and speed"
- "Timeline management separate from React prevents re-render performance issues"

**Autonomous behavior:**
- "State machine pattern (Idle → Swimming → Idle) managed through Zustand"
- "gsap.ticker provides consistent frame updates without requestAnimationFrame"
- "Destination picking uses rejection sampling to avoid trivial movements"

**Integration:**
- "Visual system completely independent of audio system"
- "Robots spawn with empty melody arrays for Phase 6"
- "Selection system integrates with both state and animation layers"

**Technical depth:**
- "SVG transform-based positioning for GPU acceleration"
- "Timeline lifecycle tied to entity lifecycle for proper cleanup"
- "Propeller spin uses transform-origin for correct rotation center"
- "Path wobble uses GSAP modifiers for dynamic curve generation"

---

## Next Steps

**You're ready for Phase 6: M3 (Audio Integration) and M4 (Interactions & Environment)**

These phases will add:
- Robot-robot collision detection
- Interaction note flurries
- Factory actors (spawn robots automatically)
- Environmental actors (decorative)
- Camera pan/zoom system
- Depth layers with parallax

**Before continuing:**
1. Merge all M2 PRs
2. Update project board
3. Test the complete system (audio + visuals)
4. Take a break! The core systems are all working.

---

**Questions?** Review docs or open a discussion.

**Ready for interactions?** Next phases will connect robots together and add environmental richness.
