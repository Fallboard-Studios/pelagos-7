
**Content structure:**

```markdown
# Contribution Guide

## File Structure Standard

All files must follow this order:

### React Components

```typescript
// ========================================
// IMPORTS (grouped)
// ========================================
import React, { useRef, useMemo } from 'react';
import { gsap } from 'gsap';

import type { Robot } from '../../types/Robot';
import type { Vec2 } from '../../types/Vec2';

import { RobotBody } from './RobotBody';
import { useRobotAnimation } from '../../hooks/useRobotAnimation';
import { robotRefs } from '../../utils/refs';
import { ANIMATION_DURATION } from '../../constants';

// ========================================
// TYPES & INTERFACES
// ========================================
interface RobotRendererProps {
  robot: Robot;
  onInteract?: () => void;
}

// ========================================
// CONSTANTS (component-specific)
// ========================================
const DEFAULT_SCALE = 1.0;

// ========================================
// COMPONENT
// ========================================
export function RobotRenderer({ robot, onInteract }: RobotRendererProps) {
  // implementation
}

// ========================================
// HELPERS (if not reusable elsewhere)
// ========================================
function calculatePosition(robot: Robot) {
  // ...
}
```

### Non-component Files

```typescript
// ========================================
// IMPORTS
// ========================================
import { gsap } from 'gsap';
import type { Robot } from '../types/Robot';

// ========================================
// TYPES
// ========================================
interface TimelineConfig {
  duration: number;
  ease: string;
}

// ========================================
// CONSTANTS
// ========================================
const DEFAULT_DURATION = 5;

// ========================================
// EXPORTS
// ========================================
export function createSwimTimeline(robot: Robot): gsap.core.Timeline {
  // ...
}

// ========================================
// INTERNAL HELPERS
// ========================================
function calculatePath(robot: Robot) {
  // ...
}
```

## Import Ordering Rules

Imports must be grouped in this exact order with blank lines between groups:

1. **React & external libraries**
   ```typescript
   import React, { useRef } from 'react';
   import { gsap } from 'gsap';
   ```

2. **Type imports** (always with `type` keyword)
   ```typescript
   import type { Robot } from '../types/Robot';
   import type { Vec2 } from '../types/Vec2';
   ```

3. **Components**
   ```typescript
   import { RobotBody } from './RobotBody';
   ```

4. **Hooks**
   ```typescript
   import { useRobotAnimation } from '../hooks/useRobotAnimation';
   ```

5. **Utils & refs**
   ```typescript
   import { robotRefs } from '../utils/refs';
   ```

6. **Constants**
   ```typescript
   import { MAX_ROBOTS } from '../constants';
   ```

7. **Stores** (only when unavoidable - prefer props)
   ```typescript
   import { useOceanStore } from '../stores/oceanStore';
   ```

## Type Declaration Guidelines

### Props Interfaces

**When to use:**
- Components >50 lines OR
- Props reused in multiple places

**Naming:** `[ComponentName]Props`

**Location:** Always declare BEFORE the component

```typescript
// ✅ Good
interface RobotRendererProps {
  robot: Robot;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function RobotRenderer({ robot, isSelected, onSelect }: RobotRendererProps) {
  // ...
}

// ❌ Bad - inline for complex component
export function RobotRenderer({ robot, isSelected }: {
  robot: Robot;
  isSelected: boolean;
}) {
  // ...
}
```

### Return Types

**Required for:**
- All exported functions
- Functions >10 lines
- Functions returning complex types

**Optional for:**
- Trivial getters (<3 lines)
- React components (JSX.Element inferred)

```typescript
// ✅ Required
export function getAvailableNotes(): string[] {
  return notes;
}

// ✅ Acceptable - trivial
export const getCurrentBeat = () => beatClock.beat;
```

### Type Imports

Always use `type` keyword for type-only imports:

```typescript
// ✅ Correct
import type { Robot } from '../types/Robot';

// ❌ Wrong
import { Robot } from '../types/Robot';
```

## Commit Conventions

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes bug nor adds feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Build process, tooling, dependencies

### Examples

```bash
feat(audio): add harmony system with 24-hour palette rotation

- Implement TIME_PITCHES mapping for hourly harmony changes
- Add getAvailableNotes() for runtime palette access
- Schedule harmony updates via BeatClock

Closes #42

---

fix(animation): prevent timeline leak on robot removal

Robots weren't killing timelines on unmount, causing memory leak
and stale animation references.

- Add killTimeline() call in cleanup
- Store timeline refs in timelineMap, not state

Fixes #67

---

refactor(components): standardize import ordering

- Group imports: React → types → components → hooks → constants
- Add type keyword to all type-only imports
- Extract magic numbers to constants

Part of #23
```

## Branch Naming

### Pattern

`<type>/<short-description>`

### Types

- `feature/` - New feature
- `fix/` - Bug fix
- `refactor/` - Code restructuring
- `docs/` - Documentation
- `chore/` - Maintenance

### Examples

```bash
feature/harmony-system
fix/timeline-memory-leak
refactor/import-ordering
docs/audio-system-guide
chore/update-dependencies
```

## PR Workflow

### Before Creating PR

1. **Self-review**
   - [ ] Code follows file structure standards
   - [ ] Imports properly ordered
   - [ ] Type declarations complete
   - [ ] No architectural violations
   - [ ] Comments/docs updated

2. **Testing**
   - [ ] `npm run dev` works
   - [ ] `npm run build` succeeds
   - [ ] `npm run lint` passes
   - [ ] Manual testing complete

3. **Audit**
   - [ ] No forbidden patterns (see AUDIO_SYSTEM.md, ANIMATION_SYSTEM.md)
   - [ ] No audio outside AudioEngine
   - [ ] No timelines in state
   - [ ] No setTimeout/setInterval for timing

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation

## Testing
- [ ] Tested locally
- [ ] No console errors
- [ ] Audio/animation working

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added where needed
- [ ] Documentation updated
- [ ] No architectural violations

## Related Issues
Closes #XX
```

### Review Process

1. **Create PR** against `main` branch
2. **Request review** from maintainer
3. **Address feedback** with new commits (don't force-push during review)
4. **Squash and merge** once approved

## Common Patterns

### ✅ DO

```typescript
// Props interface for complex components
interface RobotProps {
  robot: Robot;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

// Explicit return types
export function calculateDistance(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Type imports with `type` keyword
import type { Robot } from '../types/Robot';
```

### ❌ DON'T

```typescript
// Inline complex types
export function Robot({ robot, isSelected }: {
  robot: Robot;
  isSelected: boolean;
}) { }

// Implicit return types (for complex functions)
export function calculateDistance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Missing type keyword
import { Robot } from '../types/Robot';
```

## Architecture Rules

### Audio

- **ONLY** AudioEngine touches Tone.js
- No `import * as Tone` outside `src/engine/`
- All timing uses BeatClock/Transport
- No setTimeout/setInterval for audio

### Animation

- **ONLY** GSAP for animation
- Timelines stored in timelineMap, **NEVER** in state
- useGSAP hook for React components
- No requestAnimationFrame loops

### State

- **ONLY** Zustand for state
- Only serializable data in stores
- No synths/timelines/refs in state
- Pass via props when possible

### Timing

- **ONLY** BeatClock/Transport for timing
- No setTimeout/setInterval
- All domain events use beat/measure timing
- Real-time only for immediate UI feedback

## Testing

### Overview

Pelagos-7 uses **Vitest** for unit testing. Tests focus on utilities and core logic, not React components or audio/animation integration.

### When to Write Tests

**Required:**
- New utility functions (math, helpers)
- Core engine logic (BeatClock, harmony system)
- State management actions (store mutations)
- Complex algorithms (melody generation, collision detection)

**Skip:**
- React components (visual testing sufficient)
- GSAP timeline integration (mocking complexity not worth it)
- Tone.js audio scheduling (integration tested manually)
- Simple getters/setters

### Running Tests

```bash
# Run all tests
npm test

# Run tests with UI (interactive)
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test beatClock.test.ts
```

### Test File Conventions

**Location:** Tests live alongside source files

```
src/
  engine/
    beatClock.ts
    beatClock.test.ts       ← Test file
    harmonySystem.ts
    harmonySystem.test.ts   ← Test file
```

**Naming:** `[filename].test.ts`

### What to Test

#### ✅ DO Test

```typescript
// Utility functions
export function calculateDistance(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Core engine logic
export function convertBeatsToSeconds(beats: number, bpm: number): number {
  return (beats / bpm) * 60;
}

// State mutations
export function addRobot(robot: Robot): void {
  // ...
}
```

#### ❌ DON'T Test

```typescript
// React components (visual testing sufficient)
export function RobotRenderer({ robot }: RobotRendererProps) {
  return <g>{/* ... */}</g>;
}

// GSAP timelines (mocking too complex)
export function createMovementTimeline(robot: Robot) {
  return gsap.timeline().to(/* ... */);
}

// Tone.js integration (manual testing better)
AudioEngine.scheduleNote({ robotId, note, duration });
```

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { functionToTest } from './module';

describe('ModuleName', () => {
  describe('functionToTest', () => {
    it('describes expected behavior', () => {
      const result = functionToTest(input);
      expect(result).toBe(expected);
    });

    it('handles edge case', () => {
      const result = functionToTest(edgeCaseInput);
      expect(result).toBe(expectedEdgeCase);
    });
  });
});
```

### Example Test

**File:** `src/utils/math.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { distance, clamp } from './math';

describe('math utilities', () => {
  describe('distance', () => {
    it('calculates distance between two points', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 3, y: 4 };
      expect(distance(a, b)).toBe(5);
    });

    it('returns 0 for same point', () => {
      const a = { x: 5, y: 5 };
      expect(distance(a, a)).toBe(0);
    });
  });

  describe('clamp', () => {
    it('clamps value to max', () => {
      expect(clamp(10, 0, 5)).toBe(5);
    });

    it('clamps value to min', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('returns value if in range', () => {
      expect(clamp(7, 0, 10)).toBe(7);
    });
  });
});
```

### Store Testing Pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useOceanStore } from './oceanStore';

describe('oceanStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useOceanStore.setState({ robots: [], actors: [] });
  });

  it('adds robot to store', () => {
    const robot = createMockRobot();
    useOceanStore.getState().addRobot(robot);
    
    const state = useOceanStore.getState();
    expect(state.robots).toHaveLength(1);
    expect(state.robots[0].id).toBe(robot.id);
  });

  it('maintains serializable state', () => {
    const robot = createMockRobot();
    useOceanStore.getState().addRobot(robot);
    
    const state = useOceanStore.getState();
    expect(() => JSON.stringify(state)).not.toThrow();
  });
});
```

### Mocking Guidelines

**Avoid complex mocks.** If a function is hard to test, it's probably doing too much.

**Simple mocks are okay:**

```typescript
import { vi } from 'vitest';

// Mock a timer
vi.useFakeTimers();

// Mock Math.random for deterministic tests
const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);
```

**Skip mocking Tone.js/GSAP:**
- Too complex, not worth the effort
- Integration test manually instead
- Focus tests on pure logic

### Coverage Goals

**Target:** ~70-80% coverage for utilities and stores

**Don't obsess over 100%:**
- Components don't need coverage
- Integration code tested manually
- Focus on critical business logic

### Before Committing

```bash
# Run tests
npm test

# Should see output like:
# ✓ src/engine/beatClock.test.ts (3 tests)
# ✓ src/stores/oceanStore.test.ts (4 tests)
# Test Files  2 passed (2)
#      Tests  7 passed (7)
```

## Questions?

- Check system docs: AUDIO_SYSTEM.md, ANIMATION_SYSTEM.md
- Review forbidden patterns in each system doc
- Ask in PR if unsure about architectural fit
```