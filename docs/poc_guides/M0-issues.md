# M0: Foundation Issues

**Milestone:** M0 - Foundation  
**Timeline:** Week 1 (Days 1-2)  
**Goal:** Set up the three pillars (Audio/Animation/State) with minimal scaffolding

---

## M0.1: Create AudioEngine Singleton

**Title:** [M0.1] Create AudioEngine singleton pattern

**Labels:** feature, system: audio, size: M, priority: high

### Feature Description
Create the AudioEngine singleton that will handle all Tone.js interactions. This is the foundation of the audio system.

### Implementation Details
- Create `src/engine/AudioEngine.ts`
- Implement singleton pattern (single export instance)
- Add `start()` method (calls `Tone.start()` and `Transport.start()`)
- Add `stop()` method (stops Transport)
- Add `scheduleNote()` stub (logs to console, doesn't play yet)
- **No synth pool yet** - that's added in M3

**Key pattern:**
```typescript
class AudioEngineImpl {
  private initialized = false;
  async start() { /* ... */ }
  stop() { /* ... */ }
  scheduleNote(params: NoteParams) { /* stub */ }
}
export const AudioEngine = new AudioEngineImpl();
```

### Acceptance Criteria
- [ ] AudioEngine.ts exports singleton instance
- [ ] `start()` calls Tone.start() and Transport.start()
- [ ] `stop()` stops Transport
- [ ] No synths created yet (just structure)
- [ ] `npm run lint` passes
- [ ] `npm run build:types` passes

### Reference
- Oceanic: `src/engine/AudioEngine.ts` (port structure only)
- Docs: `docs/AUDIO_SYSTEM.md`

---

## M0.2: Create BeatClock with Transport Integration

**Title:** [M0.2] Create BeatClock with Transport integration

**Labels:** feature, system: audio, size: M, priority: high

### Feature Description
Create BeatClock module that wraps Tone.Transport and provides beat/measure tracking.

### Implementation Details
- Create `src/engine/beatClock.ts`
- **Wraps Tone.Transport** (primary approach, not gsap.ticker fallback)
- Export `getCurrentBeat()` function (reads from Transport)
- Export `getCurrentMeasure()` function (derives from Transport.position)
- Export `scheduleAtBeat()` stub (not implemented yet, logs only)
- Export `scheduleRepeat()` stub (logs only)
- Set up Transport.scheduleRepeat('16n') to track current step internally

**Key functions:**
```typescript
export function getCurrentBeat(): number { /* ... */ }
export function getCurrentMeasure(): number { /* ... */ }
export function scheduleAtBeat(beat: number, callback: () => void): string { /* stub */ }
```

### Acceptance Criteria
- [ ] BeatClock exports timing functions
- [ ] getCurrentBeat() returns current beat (integer or float)
- [ ] getCurrentMeasure() returns current measure
- [ ] Stubs for scheduling (logs only)
- [ ] No errors when Transport not started
- [ ] TypeScript compiles

### Reference
- Oceanic: `src/engine/beatClock.ts`
- Docs: `docs/BEAT_CLOCK.md`

---

## M0.3: Create Zustand oceanStore

**Title:** [M0.3] Create Zustand oceanStore with robots array

**Labels:** feature, system: state, size: S, priority: high

### Feature Description
Create the main Zustand store that will hold all robots and world state.

### Implementation Details
- Create `src/stores/oceanStore.ts`
- Define `OceanStore` interface
- Create store with Zustand `create()`
- Add `robots: Robot[]` (empty initially)
- Add `addRobot()` action (stub, logs only)
- Add `removeRobot()` action
- Add `updateRobot()` action

**Initial state:**
```typescript
{
  robots: [],
  settings: {
    bpm: 60,
    maxRobots: 12
  }
}
```

### Acceptance Criteria
- [ ] Store created with Zustand
- [ ] `robots` array exists (empty)
- [ ] Basic actions defined (add/remove/update)
- [ ] No complex logic yet (just structure)
- [ ] Store can be imported and used
- [ ] TypeScript types defined

### Reference
- Oceanic: `src/stores/oceanStore.ts`
- Docs: `docs/ARCHITECTURE.md#state-zustand`

---

## M0.4: Create Empty OceanScene Component

**Title:** [M0.4] Create empty OceanScene component with SVG canvas

**Labels:** feature, system: ui, size: S, priority: high

### Feature Description
Create the main scene component that will render robots and environment. For now, just empty SVG canvas.

### Implementation Details
- Create `src/components/OceanScene.tsx`
- Return SVG with viewBox (1920x1080 or configurable)
- Apply background color (dark blue/black)
- Add empty `<g>` groups for layers (background, robots, foreground, ui)
- No actual content yet

**Structure:**
```tsx
<svg viewBox="0 0 1920 1080" className="ocean-scene">
  <rect fill="#0a1128" width="1920" height="1080" />
  <g id="background-layer" />
  <g id="robot-layer" />
  <g id="foreground-layer" />
  <g id="ui-layer" />
</svg>
```

### Acceptance Criteria
- [ ] Component renders SVG canvas
- [ ] Dark background applied
- [ ] Layer groups created
- [ ] Responsive (fills viewport)
- [ ] No console errors
- [ ] Renders in App.tsx

### Reference
- Oceanic: `src/components/OceanScene.tsx`

---

## M0.5: Create PlayButton Component

**Title:** [M0.5] Create PlayButton that initializes AudioEngine

**Labels:** feature, system: ui, size: S, priority: high

### Feature Description
Create a Play button that calls AudioEngine.start() on click. Required for browser autoplay policy.

### Implementation Details
- Create `src/components/PlayButton.tsx`
- Show large button overlaying scene (centered)
- On click: call `await AudioEngine.start()`
- On success: hide button, show scene
- On error: show error message
- Style: simple, accessible, clear affordance

**States:**
- Initial: "Start Experience" button visible
- Loading: "Starting..." (during Tone.start())
- Ready: button hidden, scene active
- Error: "Audio failed to initialize. Click to retry."

### Acceptance Criteria
- [ ] Button renders on mount
- [ ] Click calls AudioEngine.start()
- [ ] Button hides after successful start
- [ ] Error handling shows message
- [ ] Accessible (keyboard, screen reader)
- [ ] No audio plays before click

### Reference
- Oceanic: `src/components/PlayButton.tsx`
- Web Audio autoplay policy docs

---

## M0.6: Wire Up App.tsx with Basic Flow

**Title:** [M0.6] Wire up App.tsx with PlayButton → OceanScene flow

**Labels:** feature, system: ui, size: XS, priority: high

### Feature Description
Connect PlayButton and OceanScene in App.tsx so user flow works: click Play → audio initializes → scene appears.

### Implementation Details
- Update `src/App.tsx`
- Track `audioReady` state (boolean)
- Show PlayButton when audioReady=false
- Show OceanScene when audioReady=true
- Handle AudioEngine.start() promise

**Example:**
```tsx
const [audioReady, setAudioReady] = useState(false);

return audioReady ? (
  <OceanScene />
) : (
  <PlayButton onStart={() => setAudioReady(true)} />
);
```

### Acceptance Criteria
- [ ] PlayButton shows initially
- [ ] Clicking Play calls AudioEngine.start()
- [ ] Scene appears after audio ready
- [ ] Smooth transition
- [ ] No console errors
- [ ] Dev server runs

### Reference
- Oceanic: `src/App.tsx`
