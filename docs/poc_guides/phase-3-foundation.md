# Phase 3: Foundation (M0) - Detailed Steps

**Timeline:** Week 2, Days 1-3 (2-3 days, ~16 hours)  
**Goal:** Create the basic app shell with core singletons, empty UI components, and Play button flow. No audio or animation yet, just structure.

---

## Prerequisites

- [ ] Phase 0 complete (repository exists with scaffold)
- [ ] Phase 1 complete (documentation written)
- [ ] Phase 2 complete (project board and issues created)
- [ ] All M0 issues created and in project backlog
- [ ] Dev environment working (`npm run dev` starts Vite)

---

## Why This Phase Matters

**This is where code starts.** Phase 3 establishes the foundational patterns that all future development will follow. Get the singleton patterns, separation of concerns, and basic app flow right now, and everything else becomes easier.

**Portfolio value:** Shows ability to set up clean architecture from scratch. Demonstrates understanding of singleton patterns, React hooks, and professional file organization.

---

## Phase Overview

You'll implement 6 issues from Milestone M0:

1. **M0.1:** AudioEngine singleton (empty, just structure)
2. **M0.2:** BeatClock with Transport integration (stubs)
3. **M0.3:** Zustand oceanStore (empty arrays, actions defined)
4. **M0.4:** OceanScene component (empty SVG canvas)
5. **M0.5:** PlayButton component (calls AudioEngine.start)
6. **M0.6:** Wire up App.tsx (PlayButton → OceanScene flow)

**End state:** App loads, shows Play button, clicking it initializes audio and shows empty ocean canvas. No robots, no sound yet, but the architecture is proven.

---

## Development Workflow Pattern

For each issue, follow this pattern:

1. **Move issue to "In Progress"** on project board
2. **Create feature branch:** `git checkout -b feature/m0-1-audio-engine`
3. **Implement the feature** following issue acceptance criteria
4. **Test locally:** Run dev server, check console, verify behavior
5. **Run checks:** `npm run lint`, `npm run build:types`
6. **Commit with convention:** `feat(engine): add AudioEngine singleton (#1)`
7. **Push and create PR:** Link to issue in description
8. **Self-review:** Check diff, run through acceptance criteria
9. **Merge PR** (or request review if team exists)
10. **Move issue to "Done"**
11. **Delete feature branch**

---

## Issue M0.1: Create AudioEngine Singleton (3-4 hours)

### 1.1 Create File and Basic Structure

**File: `src/engine/AudioEngine.ts`**

```typescript
import { Tone } from 'tone';

/**
 * AudioEngine
 * 
 * Singleton that manages all Tone.js interactions.
 * No other file should import or use Tone.js directly.
 */
class AudioEngineImpl {
  private initialized = false;
  private polySynth: Tone.PolySynth | null = null;

  /**
   * Initialize audio context and start Transport.
   * Must be called from user gesture (button click).
   */
  async start(): Promise<void> {
    if (this.initialized) {
      console.warn('AudioEngine already initialized');
      return;
    }

    try {
      // Required for browser autoplay policy
      await Tone.start();
      console.log('Tone.js audio context started');

      // Set initial BPM
      Tone.Transport.bpm.value = 60;

      // Create initial synth
      this.polySynth = new Tone.PolySynth(Tone.Synth).toDestination();

      // Start Transport
      Tone.Transport.start();

      this.initialized = true;
      console.log('AudioEngine initialized successfully');
    } catch (error) {
      console.error('AudioEngine failed to start:', error);
      throw error;
    }
  }

  /**
   * Stop Transport and clean up.
   */
  stop(): void {
    if (!this.initialized) return;

    Tone.Transport.stop();
    this.polySynth?.dispose();
    this.polySynth = null;
    this.initialized = false;

    console.log('AudioEngine stopped');
  }

  /**
   * Schedule a note (stub - logs only for now).
   */
  scheduleNote(params: { robotId: string; note: string; duration?: string }): void {
    console.log('[AudioEngine] scheduleNote (stub):', params);
    // Real implementation in M1
  }

  /**
   * Check if audio is ready.
   */
  isReady(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const AudioEngine = new AudioEngineImpl();
```

### 1.2 Test Manually

1. Start dev server: `npm run dev`
2. Open browser console
3. In console, run: `AudioEngine.start()`
4. Verify you see: "Tone.js audio context started" and "AudioEngine initialized successfully"
5. Run: `AudioEngine.scheduleNote({ robotId: 'test', note: 'C4' })`
6. Verify you see stub log

### 1.3 Acceptance Criteria Checklist

- [ ] File created at `src/engine/AudioEngine.ts`
- [ ] Singleton pattern (one instance exported)
- [ ] `start()` method calls `Tone.start()` and `Transport.start()`
- [ ] `stop()` method stops Transport
- [ ] `scheduleNote()` stub logs to console
- [ ] `isReady()` returns initialization state
- [ ] No TypeScript errors
- [ ] Imports work from other files

### 1.4 Commit and Push

```bash
git add src/engine/AudioEngine.ts
git commit -m "feat(engine): add AudioEngine singleton pattern

Implements M0.1: Create AudioEngine singleton

- Singleton pattern with single export
- start() initializes Tone.js and Transport
- stop() cleans up audio resources
- scheduleNote() stub for future implementation
- Proper error handling and logging

Closes #1"

git push origin feature/m0-1-audio-engine
```

### 1.5 Create PR

**Title:** `[M0.1] Add AudioEngine singleton pattern`

**Description:**
```markdown
## Summary
Implements the AudioEngine singleton that will manage all Tone.js interactions.

## Changes
- Created `src/engine/AudioEngine.ts`
- Singleton pattern with exported instance
- `start()` method initializes audio context
- `scheduleNote()` stub for future work

## Testing
- [x] Manually tested in browser console
- [x] TypeScript compiles
- [x] No lint errors

## Acceptance Criteria
- [x] AudioEngine.ts exports singleton instance
- [x] start() calls Tone.start() and Transport.start()
- [x] stop() stops Transport
- [x] scheduleNote() stub logs to console
- [x] npm run lint passes
- [x] npm run build:types passes

Closes #1
```

### 1.6 Merge and Clean Up

After PR approval/self-review:
```bash
git checkout main
git pull origin main
git branch -d feature/m0-1-audio-engine
```

Move issue to "Done" on project board.

---

## Issue M0.2: Create BeatClock (2-3 hours)

### 2.1 Create File and Structure

**File: `src/engine/beatClock.ts`**

```typescript
import { Tone } from 'tone';

/**
 * BeatClock
 * 
 * Provides beat and measure tracking based on Tone.Transport.
 * All timing in the app should use this instead of Date.now().
 */

let currentBeat = 0;
let currentMeasure = 0;
const beatsPerMeasure = 4;

/**
 * Initialize beat tracking.
 * Called automatically when Transport starts.
 */
export function initBeatClock(): void {
  // Schedule a callback every 16th note to track beats
  Tone.Transport.scheduleRepeat((time) => {
    // Update beat counter
    currentBeat = Math.floor(Tone.Transport.seconds * (Tone.Transport.bpm.value / 60));
    currentMeasure = Math.floor(currentBeat / beatsPerMeasure);
  }, '16n');

  console.log('BeatClock initialized');
}

/**
 * Get current beat number (integer).
 */
export function getCurrentBeat(): number {
  return currentBeat;
}

/**
 * Get current measure number (integer).
 */
export function getCurrentMeasure(): number {
  return currentMeasure;
}

/**
 * Schedule a callback at a specific beat (stub).
 */
export function scheduleAtBeat(beat: number, callback: () => void): string {
  console.log('[BeatClock] scheduleAtBeat (stub):', beat);
  // Real implementation in M1
  return 'stub-id';
}

/**
 * Schedule a repeating callback (stub).
 */
export function scheduleRepeat(interval: string, callback: () => void): string {
  console.log('[BeatClock] scheduleRepeat (stub):', interval);
  // Real implementation in M1
  return 'stub-id';
}

/**
 * Reset beat tracking (for testing).
 */
export function resetBeatClock(): void {
  currentBeat = 0;
  currentMeasure = 0;
}
```

### 2.2 Update AudioEngine to Initialize BeatClock

**File: `src/engine/AudioEngine.ts`**

Add import:
```typescript
import { initBeatClock } from './beatClock';
```

In `start()` method, after `Tone.Transport.start()`:
```typescript
// Initialize beat tracking
initBeatClock();
```

### 2.3 Test Manually

1. Start dev server
2. Open console
3. Run: `AudioEngine.start()`
4. Wait 5 seconds
5. Run: `import { getCurrentBeat, getCurrentMeasure } from './src/engine/beatClock.js'; console.log(getCurrentBeat(), getCurrentMeasure())`
6. Verify beat/measure numbers are incrementing

### 2.4 Acceptance Criteria

- [ ] BeatClock module created
- [ ] `getCurrentBeat()` returns current beat
- [ ] `getCurrentMeasure()` returns current measure
- [ ] Beat tracking updates automatically
- [ ] Stubs for scheduling functions
- [ ] Integrated with AudioEngine

### 2.5 Commit, Push, PR

```bash
git checkout -b feature/m0-2-beat-clock
git add src/engine/beatClock.ts src/engine/AudioEngine.ts
git commit -m "feat(engine): add BeatClock with Transport integration

Implements M0.2: BeatClock timing system

- Module-level beat and measure tracking
- Updates automatically via Transport.scheduleRepeat
- getCurrentBeat/Measure accessors
- Stubs for future scheduling functions
- Integrated into AudioEngine.start()

Closes #2"
git push origin feature/m0-2-beat-clock
```

Create PR following same pattern as M0.1.

---

## Issue M0.3: Create Zustand oceanStore (2 hours)

### 3.1 Install Zustand

```bash
npm install zustand
```

### 3.2 Create Type Definitions

**File: `src/types/Robot.ts`**

```typescript
/**
 * Robot state enum
 */
export enum RobotState {
  Idle = 'idle',
  Swimming = 'swimming',
  Interacting = 'interacting',
  Selected = 'selected',
  Leaving = 'leaving',
}

/**
 * 2D position vector
 */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Robot entity
 * (Minimal for M0 - will expand in M1)
 */
export interface Robot {
  id: string;
  state: RobotState;
  position: Vec2;
  destination: Vec2 | null;
}
```

### 3.3 Create Store

**File: `src/stores/oceanStore.ts`**

```typescript
import { create } from 'zustand';
import type { Robot } from '../types/Robot';

/**
 * Ocean store state shape
 */
interface OceanStore {
  robots: Robot[];
  settings: {
    bpm: number;
    volume: number;
    maxRobots: number;
  };
  
  // Actions
  addRobot: (robot: Robot) => void;
  removeRobot: (id: string) => void;
  updateRobot: (id: string, updates: Partial<Robot>) => void;
  getRobotById: (id: string) => Robot | undefined;
}

/**
 * Main ocean state store
 */
export const useOceanStore = create<OceanStore>((set, get) => ({
  // Initial state
  robots: [],
  settings: {
    bpm: 60,
    volume: 0.7,
    maxRobots: 12,
  },

  // Actions
  addRobot: (robot) => {
    set((state) => ({
      robots: [...state.robots, robot],
    }));
    console.log('[oceanStore] Robot added:', robot.id);
  },

  removeRobot: (id) => {
    set((state) => ({
      robots: state.robots.filter((r) => r.id !== id),
    }));
    console.log('[oceanStore] Robot removed:', id);
  },

  updateRobot: (id, updates) => {
    set((state) => ({
      robots: state.robots.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  },

  getRobotById: (id) => {
    return get().robots.find((r) => r.id === id);
  },
}));
```

### 3.4 Test in Dev Console

After creating store, test in browser console:

```javascript
import { useOceanStore } from './src/stores/oceanStore.js';

// Add a test robot
useOceanStore.getState().addRobot({
  id: 'test-1',
  state: 'idle',
  position: { x: 100, y: 100 },
  destination: null,
});

// Check robots array
console.log(useOceanStore.getState().robots);

// Remove robot
useOceanStore.getState().removeRobot('test-1');
```

### 3.5 Acceptance Criteria

- [ ] Zustand installed
- [ ] Robot type defined
- [ ] oceanStore created with Zustand
- [ ] robots array initialized empty
- [ ] Actions defined (add/remove/update/get)
- [ ] Store works when imported
- [ ] Immutable updates

### 3.6 Commit, Push, PR

```bash
git checkout -b feature/m0-3-ocean-store
git add package.json package-lock.json src/types/Robot.ts src/stores/oceanStore.ts
git commit -m "feat(state): add Zustand oceanStore with Robot type

Implements M0.3: Create Zustand store

- Install Zustand dependency
- Define Robot type and RobotState enum
- Create oceanStore with robots array
- Add/remove/update/get actions
- Settings sub-store (bpm, volume, maxRobots)
- Immutable state updates

Closes #3"
git push origin feature/m0-3-ocean-store
```

---

## Issue M0.4: Create Empty OceanScene Component (1-2 hours)

### 4.1 Create Component

**File: `src/components/OceanScene.tsx`**

```typescript
import React from 'react';
import './OceanScene.css';

/**
 * OceanScene
 * 
 * Main canvas that will render robots and environment.
 * For M0, just an empty dark SVG with layer groups.
 */
export function OceanScene() {
  return (
    <svg
      viewBox="0 0 1920 1080"
      className="ocean-scene"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Background */}
      <rect
        width="1920"
        height="1080"
        fill="#0a1128"
        className="ocean-background"
      />

      {/* Layer groups (empty for now) */}
      <g id="background-layer" />
      <g id="robot-layer" />
      <g id="foreground-layer" />
      <g id="ui-layer" />
    </svg>
  );
}
```

### 4.2 Create Styles

**File: `src/components/OceanScene.css`**

```css
.ocean-scene {
  width: 100vw;
  height: 100vh;
  display: block;
  position: fixed;
  top: 0;
  left: 0;
}

.ocean-background {
  /* Dark blue-black underwater gradient */
  fill: #0a1128;
}
```

### 4.3 Test Component

Update `src/App.tsx` temporarily to show OceanScene:

```typescript
import { OceanScene } from './components/OceanScene';

function App() {
  return <OceanScene />;
}

export default App;
```

Run dev server and verify:
- Dark blue canvas fills viewport
- No console errors
- Responsive (resizes with window)

### 4.4 Acceptance Criteria

- [ ] Component created
- [ ] SVG with viewBox
- [ ] Dark background applied
- [ ] Layer groups created
- [ ] Responsive (fills viewport)
- [ ] Renders without errors

### 4.5 Commit, Push, PR

```bash
git checkout -b feature/m0-4-ocean-scene
git add src/components/OceanScene.tsx src/components/OceanScene.css src/App.tsx
git commit -m "feat(ui): add empty OceanScene component

Implements M0.4: Create OceanScene canvas

- SVG canvas with 1920x1080 viewBox
- Dark background (#0a1128)
- Layer groups for organization
- Responsive styling (fills viewport)
- Empty layer groups ready for content

Closes #4"
git push origin feature/m0-4-ocean-scene
```

---

## Issue M0.5: Create PlayButton Component (2 hours)

### 5.1 Create Component

**File: `src/components/PlayButton.tsx`**

```typescript
import React, { useState } from 'react';
import { AudioEngine } from '../engine/AudioEngine';
import './PlayButton.css';

interface PlayButtonProps {
  onStart: () => void;
}

/**
 * PlayButton
 * 
 * Initializes AudioEngine on user gesture.
 * Required for browser autoplay policy.
 */
export function PlayButton({ onStart }: PlayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      await AudioEngine.start();
      console.log('Audio initialized successfully');
      onStart();
    } catch (err) {
      console.error('Failed to initialize audio:', err);
      setError('Audio failed to initialize. Click to retry.');
      setLoading(false);
    }
  };

  return (
    <div className="play-button-overlay">
      <div className="play-button-container">
        <button
          className="play-button"
          onClick={handleClick}
          disabled={loading}
          aria-label="Start experience"
        >
          {loading ? 'Starting...' : 'Start Experience'}
        </button>
        
        {error && (
          <div className="play-button-error" role="alert">
            {error}
          </div>
        )}

        <p className="play-button-hint">
          Click to begin. Audio and animation will start.
        </p>
      </div>
    </div>
  );
}
```

### 5.2 Create Styles

**File: `src/components/PlayButton.css`**

```css
.play-button-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.play-button-container {
  text-align: center;
}

.play-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 20px 60px;
  font-size: 24px;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
}

.play-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
}

.play-button:active:not(:disabled) {
  transform: translateY(0);
}

.play-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.play-button-hint {
  color: rgba(255, 255, 255, 0.6);
  margin-top: 20px;
  font-size: 14px;
}

.play-button-error {
  color: #ff6b6b;
  margin-top: 15px;
  padding: 10px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 6px;
  font-size: 14px;
}
```

### 5.3 Test Component

Update `src/App.tsx`:

```typescript
import { PlayButton } from './components/PlayButton';

function App() {
  const handleStart = () => {
    console.log('Audio started! (Would show OceanScene now)');
  };

  return <PlayButton onStart={handleStart} />;
}

export default App;
```

Test:
- Button appears centered
- Click triggers AudioEngine.start()
- Loading state shows "Starting..."
- Success calls onStart callback
- Error handling works (test by modifying AudioEngine to throw)

### 5.4 Acceptance Criteria

- [ ] Component renders overlay
- [ ] Click calls AudioEngine.start()
- [ ] Loading state during initialization
- [ ] Error handling with message
- [ ] onStart callback on success
- [ ] Accessible (keyboard, ARIA labels)
- [ ] Styled and responsive

### 5.5 Commit, Push, PR

```bash
git checkout -b feature/m0-5-play-button
git add src/components/PlayButton.tsx src/components/PlayButton.css src/App.tsx
git commit -m "feat(ui): add PlayButton component with audio initialization

Implements M0.5: Create PlayButton

- Full-screen overlay with centered button
- Calls AudioEngine.start() on click
- Loading state and error handling
- onStart callback prop
- Accessible (keyboard navigation, ARIA)
- Styled with gradient and animations

Closes #5"
git push origin feature/m0-5-play-button
```

---

## Issue M0.6: Wire Up App.tsx Flow (1 hour)

### 6.1 Update App.tsx

**File: `src/App.tsx`**

```typescript
import React, { useState } from 'react';
import { PlayButton } from './components/PlayButton';
import { OceanScene } from './components/OceanScene';

/**
 * Main App Component
 * 
 * Flow: PlayButton → AudioEngine.start() → OceanScene
 */
function App() {
  const [audioReady, setAudioReady] = useState(false);

  const handleAudioStart = () => {
    console.log('Audio initialized, showing scene');
    setAudioReady(true);
  };

  return (
    <div className="app">
      {audioReady ? (
        <OceanScene />
      ) : (
        <PlayButton onStart={handleAudioStart} />
      )}
    </div>
  );
}

export default App;
```

### 6.2 Test Full Flow

1. Start dev server
2. Verify PlayButton appears
3. Click button
4. Verify console logs:
   - "Tone.js audio context started"
   - "BeatClock initialized"
   - "AudioEngine initialized successfully"
   - "Audio initialized, showing scene"
5. Verify OceanScene appears (dark canvas)
6. No console errors

### 6.3 Test Error Handling

Temporarily break AudioEngine to test error flow:

```typescript
// In AudioEngine.start(), before Tone.start():
throw new Error('Test error');
```

Verify:
- Error message appears
- Button still clickable for retry
- Console shows error

Remove test error after verification.

### 6.4 Acceptance Criteria

- [ ] PlayButton shows initially
- [ ] Click starts AudioEngine
- [ ] OceanScene appears after successful start
- [ ] Smooth transition
- [ ] Error handling works
- [ ] No console errors in happy path

### 6.5 Commit, Push, PR

```bash
git checkout -b feature/m0-6-wire-app-flow
git add src/App.tsx
git commit -m "feat(app): wire PlayButton → OceanScene flow

Implements M0.6: Complete app flow

- State management for audioReady
- Conditional rendering (PlayButton vs OceanScene)
- Callback wiring from PlayButton
- Smooth transition between states
- Complete user flow: click → audio init → canvas

Closes #6"
git push origin feature/m0-6-wire-app-flow
```

---

## Phase 3 Complete! ✅

### Final Verification Checklist

- [ ] All 6 M0 issues completed and closed
- [ ] All PRs merged to main
- [ ] Feature branches deleted
- [ ] Project board shows M0 milestone complete
- [ ] App runs without errors (`npm run dev`)
- [ ] Click Play button → dark canvas appears
- [ ] Console shows proper initialization logs
- [ ] TypeScript compiles (`npm run build:types`)
- [ ] Lint passes (`npm run lint`)
- [ ] Git history is clean (meaningful commit messages)

### What You've Built

**Functional:**
- ✅ AudioEngine singleton (initialized on user gesture)
- ✅ BeatClock timing system (tracks beats/measures)
- ✅ Zustand store (state management ready)
- ✅ OceanScene canvas (dark SVG with layers)
- ✅ PlayButton flow (user interaction → audio init)
- ✅ Complete app flow (button → audio → canvas)

**Architecture Proven:**
- ✅ Singleton patterns work
- ✅ Separation of concerns (Audio/State/UI)
- ✅ React hooks integration
- ✅ TypeScript types throughout
- ✅ Clean file organization

**Portfolio Value:**
- ✅ Professional git history (6 PRs with good commit messages)
- ✅ Issue tracking and project management
- ✅ Clean code patterns
- ✅ Working app (even if minimal)

### Current State of App

**What works:**
- App loads with Play button overlay
- Clicking button initializes Tone.js audio context
- Transport starts and BeatClock begins tracking
- Canvas appears after successful initialization
- Error handling if audio fails

**What doesn't exist yet:**
- No robots (M2)
- No audio playback (M1 + M3)
- No interactions (M4)
- No visual actors (M4)
- No UI panels (M5)

### Time Tracking

| Issue | Estimated | Actual |
|-------|-----------|--------|
| M0.1: AudioEngine | 3-4 hours | |
| M0.2: BeatClock | 2-3 hours | |
| M0.3: oceanStore | 2 hours | |
| M0.4: OceanScene | 1-2 hours | |
| M0.5: PlayButton | 2 hours | |
| M0.6: Wire App | 1 hour | |
| **Total** | **~16 hours** | |

---

## Common Issues & Solutions

### Issue: Tone.js fails to start

**Symptoms:** Console error "The AudioContext was not allowed to start"

**Solution:** 
- Ensure click happens on actual button element
- Check button isn't disabled
- Verify no other audio playing in browser

### Issue: BeatClock not incrementing

**Symptoms:** `getCurrentBeat()` returns 0 always

**Solution:**
- Verify Transport.start() was called
- Check BeatClock initialization happened after Transport.start()
- Add console.log in scheduleRepeat callback to verify it's running

### Issue: Store updates not triggering re-renders

**Symptoms:** Adding robot doesn't show in UI

**Solution:**
- Verify you're using Zustand selector correctly: `const robots = useOceanStore(state => state.robots)`
- Not: `const { robots } = useOceanStore()` (wrong pattern)

### Issue: SVG not filling viewport

**Symptoms:** Canvas is tiny or wrong aspect ratio

**Solution:**
- Check CSS: `width: 100vw; height: 100vh; position: fixed;`
- Verify `preserveAspectRatio="xMidYMid slice"`

### Issue: TypeScript errors on imports

**Symptoms:** "Cannot find module" errors

**Solution:**
- Verify file paths are correct (relative paths)
- Check tsconfig.json paths configuration
- Restart TypeScript server in VS Code

---

## Next Steps

**You're ready for Phase 4: Core Architecture (M1)**

Phase 4 will implement:
- Real AudioEngine scheduling (notes actually play)
- Complete BeatClock with Transport callbacks
- Harmony system (8-note palettes)
- Melody generator
- Timeline management utilities
- Complete Robot type definition

**Before starting Phase 4:**
1. Commit and push all Phase 3 work
2. Update project board (all M0 issues → Done)
3. Review M1 issues on project board
4. Read through `docs/phase-4-core-architecture.md` (to be created)
5. Take a break! You just built the foundation.

---

## Portfolio Talking Points

When showing this work to potential employers:

**Technical decisions:**
- "I used a singleton pattern for AudioEngine to ensure only one instance manages Tone.js"
- "BeatClock provides musical timing so everything stays synchronized to the beat"
- "Zustand for state management - simpler than Redux for this use case"
- "PlayButton handles browser autoplay policy - audio requires user gesture"

**Architecture highlights:**
- "Separation of concerns: AudioEngine for sound, BeatClock for timing, Zustand for state"
- "All audio scheduling will go through one place - no Tone.js imports in components"
- "GSAP timelines will be managed separately from React state to avoid render issues"

**Process:**
- "Feature branch workflow with meaningful commit messages"
- "Each PR linked to a GitHub issue with acceptance criteria"
- "Project board tracks progress and shows planning ahead"

---

**Questions?** Review docs or open a discussion in the repository.

**Ready to continue?** Move to Phase 4: Core Architecture (M1)
