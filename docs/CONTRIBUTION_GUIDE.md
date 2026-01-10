# Pelagos-7 Contribution Guide

**Status:** 🚧 This document will be expanded in Phase 1 (AI Documentation)

---

## Code Standards

### Import Order

1. React & external libraries
2. Type imports (with `type` keyword)
3. Components
4. Hooks
5. Utils & refs
6. Constants
7. Stores (avoid when possible)

**Example:**
```typescript
import React, { useRef } from 'react';
import { gsap } from 'gsap';

import type { Robot } from '../types/Robot';

import { RobotBody } from './RobotBody';
import { useRobotAnimation } from '../hooks/useRobotAnimation';
import { robotRefs } from '../utils/refs';
import { MAX_ROBOTS } from '../constants';
```

---

## Architecture Rules

### Audio
- ✅ Call `AudioEngine.scheduleNote()`
- ❌ Never use `new Tone.Synth()` outside AudioEngine
- ❌ Never use `setTimeout` for audio timing

### Animation
- ✅ Create GSAP timelines, store in `timelineMap`
- ❌ Never store timelines in React state or Zustand
- ❌ Never use `requestAnimationFrame` loops

### State
- ✅ Update Zustand stores for all state changes
- ❌ Never put business logic in components
- ❌ Never store non-serializable data

---

## File Structure Template

```typescript
// 1. Imports (grouped)
import React from 'react';
import type { Robot } from '../types/Robot';

// 2. Types/Interfaces (before component)
interface RobotRendererProps {
  robot: Robot;
}

// 3. Constants (if any)
const ANIMATION_DURATION = 3;

// 4. Component/Function
export function RobotRenderer({ robot }: RobotRendererProps) {
  // implementation
}

// 5. Helpers (after exports)
function calculatePosition(robot: Robot) {
  // ...
}
```

---

## TypeScript Guidelines

- Use explicit return types for exported functions
- Always use `type` keyword for type-only imports
- Use `interface` for component props if >50 lines
- Prefix intentionally unused vars with `_`

---

## Testing Checklist

Before creating PR:
- [ ] `npm run lint` passes
- [ ] `npm run build:types` passes
- [ ] `npm run dev` runs without console errors
- [ ] Feature tested in browser
- [ ] No architecture violations

---

## Git Workflow

1. Create feature branch: `git checkout -b feature/M1-description`
2. Make small, logical commits
3. Write descriptive commit messages
4. Push and create PR referencing issue
5. Fill out PR template completely
6. Merge after review

---

**Detailed contribution guidelines will be added in Phase 1.**

See phase documentation for full coding standards.