# Phase 2: GitHub Project Setup - Detailed Steps

**Timeline:** Week 1, Day 4 (3-4 hours)  
**Goal:** Create project board, milestones, and initial 30-40 tickets for all planned work.

---

## Prerequisites

- [ ] Phase 0 complete (repository exists)
- [ ] Phase 1 complete (documentation written)
- [ ] Clear understanding of project scope (see NEW_APP_STEPS_OVERVIEW.md)
- [ ] GitHub organization admin access

---

## Why This Phase Matters

**Project management demonstrates professional practices.** Having all tickets written upfront:
- Prevents scope creep (clear boundary of v1.0)
- Shows planning ability to portfolio reviewers
- Enables consistent velocity tracking
- Provides clear stopping points
- Makes the development arc visible

**Portfolio value:** Reviewers can see your entire thought process from planning to execution.

---

## Step 1: Create GitHub Project (30 minutes)

### 1.1 Create Project

1. Navigate to https://github.com/orgs/fallboard-studios
2. Click "Projects" tab
3. Click "New project"
4. Choose "Board" template
5. **Project name:** Pelagos-7 Development
6. **Description:** 4-6 week development roadmap for robot symphony generator
7. Click "Create project"

### 1.2 Configure Project Views

**Board View (default):**
- Rename columns:
  - "Todo" → "Backlog"
  - "In Progress" → "In Progress"
  - "Done" → "Done"
- Add column: "Review" (between In Progress and Done)
- Drag to order: Backlog → In Progress → Review → Done

**Add Roadmap View:**
1. Click "+ New view"
2. Choose "Roadmap" layout
3. Name: "Timeline"
4. Group by: Milestone
5. Configure date range: Today → 6 weeks out

**Add Table View (optional):**
1. Click "+ New view"
2. Choose "Table" layout
3. Name: "All Issues"
4. Show columns: Title, Status, Milestone, Labels, Assignee

### 1.3 Configure Project Settings

**Settings → Manage access:**
- Organization members: Write access (if you add contributors later)

**Settings → Custom fields:**
Add custom field:
- **Field name:** "Estimated Hours"
- **Type:** Number
- **Description:** Rough time estimate for planning

---

## Step 2: Create Milestones (20 minutes)

### 2.1 Navigate to Milestones

1. Go to repository: https://github.com/fallboard-studios/pelagos-7
2. Click "Issues" tab
3. Click "Milestones" link (near search bar)
4. Click "New milestone"

### 2.2 Create Each Milestone

**Milestone 1: M0 - Foundation**
- **Title:** M0: Foundation
- **Due date:** [Today + 3 days]
- **Description:**
  ```
  Repository setup, configs, basic UI shell, Play button.
  
  Deliverables:
  - Empty OceanScene canvas
  - PlayButton triggers AudioEngine.start()
  - Core singletons (AudioEngine, BeatClock, oceanStore)
  - ESLint/TypeScript passing
  ```

**Milestone 2: M1 - Core Architecture**
- **Title:** M1: Core Architecture
- **Due date:** [Today + 1 week]
- **Description:**
  ```
  Audio/Animation/State systems fully implemented.
  
  Deliverables:
  - AudioEngine with Transport scheduling
  - BeatClock with 16-step loop
  - Harmony system (8-note palettes)
  - Timeline management (timelineMap)
  - Complete Zustand store
  ```

**Milestone 3: M2 - Robot Basics**
- **Title:** M2: Robot Basics
- **Due date:** [Today + 2 weeks]
- **Description:**
  ```
  Robots appear, swim autonomously, can be selected.
  
  Deliverables:
  - Robot SVG components
  - Spawning system
  - GSAP swim animation
  - Idle state and destination picking
  - Selection system
  ```

**Milestone 4: M3 - Audio Integration**
- **Title:** M3: Audio Integration
- **Due date:** [Today + 3 weeks]
- **Description:**
  ```
  Robots generate melodies synchronized to Transport.
  
  Deliverables:
  - Melody generator (16-step loops)
  - Melody playback via Transport
  - Harmony palette integration
  - Polyphony limiting
  ```

**Milestone 5: M4 - Interactions & Environment**
- **Title:** M4: Interactions & Environment
- **Due date:** [Today + 4 weeks]
- **Description:**
  ```
  Collision system, factory actors, environment actors.
  
  Deliverables:
  - Collision detection
  - Robot-robot interactions
  - Factory actor spawning
  - Environmental actors
  - Camera pan/zoom
  ```

**Milestone 6: M5 - Polish & Launch**
- **Title:** M5: Polish & Launch
- **Due date:** [Today + 6 weeks]
- **Description:**
  ```
  UI panels, mobile optimization, deployment.
  
  Deliverables:
  - Robot editor panel
  - Settings panel
  - Mobile responsive
  - Performance optimized
  - GitHub Pages deployed
  - Portfolio materials
  ```

---

## Step 3: Create Issue Labels (15 minutes)

### 3.1 Navigate to Labels

1. Go to repository
2. Click "Issues" tab
3. Click "Labels" link
4. Delete default labels you won't use (keep "bug", "documentation")

### 3.2 Create Custom Labels

**Type Labels (what kind of work):**
- `feature` - Green (#0E8A16) - "New feature or capability"
- `bug` - Red (#D73A4A) - "Something isn't working"
- `refactor` - Blue (#0075CA) - "Code improvement without behavior change"
- `documentation` - Light blue (#0075CA) - "Documentation changes"
- `chore` - Gray (#6C757D) - "Maintenance, configs, dependencies"

**Priority Labels:**
- `priority: high` - Red (#D93F0B) - "Must complete for milestone"
- `priority: medium` - Orange (#FBCA04) - "Important but not blocking"
- `priority: low` - Yellow (#FEF2C0) - "Nice to have"

**System Labels (which pillar):**
- `system: audio` - Purple (#7057FF) - "AudioEngine, Tone.js, melody"
- `system: animation` - Pink (#E99695) - "GSAP, timelines, motion"
- `system: state` - Teal (#008672) - "Zustand, store, data"
- `system: ui` - Light green (#C5DEF5) - "React components, UI"

**Size Labels (effort):**
- `size: XS` - Very light gray (#F3F4F6) - "< 1 hour"
- `size: S` - Light gray (#E5E7EB) - "1-2 hours"
- `size: M` - Medium gray (#D1D5DB) - "2-4 hours"
- `size: L` - Dark gray (#9CA3AF) - "4-8 hours"
- `size: XL` - Very dark gray (#6B7280) - "> 8 hours"

**Status Labels (optional):**
- `status: blocked` - Red (#B60205) - "Waiting on something"
- `status: needs-review` - Yellow (#FEF2C0) - "Ready for review"

---

## Step 4: Write M0 Issues (30 minutes)

### Issue Template to Follow

For each issue, use this structure:
```markdown
**Milestone:** M0  
**Labels:** feature, system:[relevant], size:[estimate], priority:[level]

## Feature Description
[What needs to be built]

## Implementation Details
[Key technical points, files to create]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests pass (lint, build)

## Reference
[Link to Oceanic file if porting, or doc section]
```

---

### M0.1: Create AudioEngine Singleton

```markdown
**Title:** [M0] Create AudioEngine singleton pattern

**Labels:** feature, system: audio, size: M, priority: high

## Feature Description
Create the AudioEngine singleton that will handle all Tone.js interactions. This is the foundation of the audio system.

## Implementation Details
- Create `src/engine/AudioEngine.ts`
- Implement singleton pattern (single export instance)
- Add `start()` method (calls `Tone.start()` and `Transport.start()`)
- Add `stop()` method (stops Transport)
- Add basic synth pool (1 PolySynth for now)
- Add `scheduleNote()` stub (logs to console, doesn't play yet)

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

## Acceptance Criteria
- [ ] AudioEngine.ts exports singleton instance
- [ ] `start()` calls Tone.start() and Transport.start()
- [ ] `stop()` stops Transport
- [ ] No synths created yet (just structure)
- [ ] `npm run lint` passes
- [ ] `npm run build:types` passes

## Reference
- Oceanic: `src/engine/AudioEngine.ts` (port structure only)
- Docs: `docs/AUDIO_SYSTEM.md`


---

### M0.2: Create BeatClock with Transport Integration

```markdown
**Title:** [M0] Create BeatClock with Transport integration

**Labels:** feature, system: audio, size: M, priority: high

## Feature Description
Create BeatClock module that wraps Tone.Transport and provides beat/measure tracking.

## Implementation Details
- Create `src/engine/beatClock.ts`
- Export `getCurrentBeat()` function
- Export `getCurrentMeasure()` function
- Export `scheduleAtBeat()` stub (not implemented yet)
- Export `scheduleRepeat()` stub
- Set up Transport.scheduleRepeat('16n') to track current step

**Key functions:**
```typescript
export function getCurrentBeat(): number { /* ... */ }
export function getCurrentMeasure(): number { /* ... */ }
export function scheduleAtBeat(beat: number, callback: () => void): string { /* stub */ }
```

## Acceptance Criteria
- [ ] BeatClock exports timing functions
- [ ] getCurrentBeat() returns current beat (integer or float)
- [ ] getCurrentMeasure() returns current measure
- [ ] Stubs for scheduling (logs only)
- [ ] No errors when Transport not started
- [ ] TypeScript compiles

## Reference
- Oceanic: `src/engine/beatClock.ts`
- Docs: `docs/AUDIO_SYSTEM.md#beatclock`
```

---

### M0.3: Create Zustand oceanStore

```markdown
**Title:** [M0] Create Zustand oceanStore with robots array

**Labels:** feature, system: state, size: S, priority: high

## Feature Description
Create the main Zustand store that will hold all robots and world state.

## Implementation Details
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
    volume: 0.7,
    maxRobots: 12
  }
}
```

## Acceptance Criteria
- [ ] Store created with Zustand
- [ ] `robots` array exists (empty)
- [ ] Basic actions defined (add/remove/update)
- [ ] No complex logic yet (just structure)
- [ ] Store can be imported and used
- [ ] TypeScript types defined

## Reference
- Oceanic: `src/stores/oceanStore.ts`
- Docs: `docs/ARCHITECTURE.md#state-zustand`
```

---

### M0.4: Create Empty OceanScene Component

```markdown
**Title:** [M0] Create empty OceanScene component with SVG canvas

**Labels:** feature, system: ui, size: S, priority: high

## Feature Description
Create the main scene component that will render robots and environment. For now, just empty SVG canvas.

## Implementation Details
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

## Acceptance Criteria
- [ ] Component renders SVG canvas
- [ ] Dark background applied
- [ ] Layer groups created
- [ ] Responsive (fills viewport)
- [ ] No console errors
- [ ] Renders in App.tsx

## Reference
- Oceanic: `src/components/OceanScene.tsx`
```

---

### M0.5: Create PlayButton Component

```markdown
**Title:** [M0] Create PlayButton that initializes AudioEngine

**Labels:** feature, system: ui, size: S, priority: high

## Feature Description
Create a Play button that calls AudioEngine.start() on click. Required for browser autoplay policy.

## Implementation Details
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

## Acceptance Criteria
- [ ] Button renders on mount
- [ ] Click calls AudioEngine.start()
- [ ] Button hides after successful start
- [ ] Error handling shows message
- [ ] Accessible (keyboard, screen reader)
- [ ] No audio plays before click

## Reference
- Oceanic: `src/components/PlayButton.tsx`
- Web Audio autoplay policy docs
```

---

### M0.6: Wire Up App.tsx with Basic Flow

```markdown
**Title:** [M0] Wire up App.tsx with PlayButton → OceanScene flow

**Labels:** feature, system: ui, size: XS, priority: high

## Feature Description
Connect PlayButton and OceanScene in App.tsx so user flow works: click Play → audio initializes → scene appears.

## Implementation Details
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

## Acceptance Criteria
- [ ] PlayButton shows initially
- [ ] Clicking Play calls AudioEngine.start()
- [ ] Scene appears after audio ready
- [ ] Smooth transition
- [ ] No console errors
- [ ] Dev server runs

## Reference
- Oceanic: `src/App.tsx`
```

---

## Step 5: Write M1 Issues (45 minutes)

### M1.1: Implement Harmony System

```markdown
**Title:** [M1] Implement harmony system with 8-note palettes

**Labels:** feature, system: audio, size: L, priority: high

## Feature Description
Create the harmony system that provides 8-note palettes that change every 4 measures.

## Implementation Details
- Create `src/engine/harmonySystem.ts`
- Port `TIME_PITCHES` object (24 hours → 24 palettes)
- Implement `getAvailableNotes()` returns current 8 notes
- Implement `scheduleHarmonyCycle()` updates palette every 4 measures
- Use BeatClock to track when to change harmony
- Store current palette in module state (not Zustand)

**Key exports:**
```typescript
export function getAvailableNotes(): string[]
export function scheduleHarmonyCycle(): void
export const TIME_PITCHES: Record<number, [string, string, ...]>
```

## Acceptance Criteria
- [ ] TIME_PITCHES defined (24 entries, 8 notes each)
- [ ] getAvailableNotes() returns current palette
- [ ] Harmony changes every 4 measures
- [ ] Changes synchronized to Transport
- [ ] No setTimeout/setInterval used
- [ ] Console log shows palette changes (debug)

## Reference
- Oceanic: `src/engine/harmonySystem.ts` (port directly)
- Docs: `docs/AUDIO_SYSTEM.md#harmony-system`
```

---

### M1.2: Implement Melody Generator

```markdown
**Title:** [M1] Implement melody generator with weighted note selection

**Labels:** feature, system: audio, size: M, priority: high

## Feature Description
Create melody generation algorithm that produces 16-step, 2-measure loops with weighted note selection.

## Implementation Details
- Create `src/engine/melodyGenerator.ts`
- Implement `generateMelodyForRobot()` function
- Implement `pickWeightedIndex()` helper (note index 0-7)
- Generate 4-12 events per melody
- Events have: startStep (1-16), length ('8n'|'4n'|'2n'), noteIndex (0-7)

**Algorithm:**
- Random number of events (4-12)
- Weighted note selection (lower indices more likely)
- Random start steps (1-16)
- Prefer shorter durations (8n > 4n > 2n)

## Acceptance Criteria
- [ ] generateMelodyForRobot() returns MelodyEvent[]
- [ ] Events have valid startStep (1-16)
- [ ] noteIndex weighted toward lower values
- [ ] Length distribution favors '8n'
- [ ] Each melody is unique (seeded randomness)
- [ ] No literal pitch strings (indices only)

## Reference
- Oceanic: `src/engine/melodyGenerator.ts` (port algorithm exactly)
- Docs: `docs/AUDIO_SYSTEM.md#melody-generation`
```

---

### M1.3: Implement AudioEngine Note Scheduling

```markdown
**Title:** [M1] Implement AudioEngine note scheduling with melody playback

**Labels:** feature, system: audio, size: L, priority: high

## Feature Description
Complete AudioEngine with actual note playback, melody scheduling, and polyphony management.

## Implementation Details
- Extend AudioEngine with melody scheduling
- Implement `scheduleNote()` (actually triggers synth)
- Implement `registerRobotMelody()` (stores melody in registry)
- Create step registry Map<stepNumber, events[]>
- Schedule Transport.scheduleRepeat('8n') callback
- Enforce polyphony limit (8-12 voices)

**Registry pattern:**
```typescript
const stepRegistry = new Map<number, Array<{ robotId: string, event: MelodyEvent }>>();
```

## Acceptance Criteria
- [ ] scheduleNote() triggers actual sound
- [ ] Melody registry tracks all robot melodies
- [ ] 8n callback plays scheduled events
- [ ] Note indices mapped to harmony palette
- [ ] Polyphony limit enforced (voice stealing or skip)
- [ ] No timing drift (synchronized to Transport)

## Reference
- Oceanic: `src/engine/AudioEngine.ts` (melody scheduling sections)
- Docs: `docs/AUDIO_SYSTEM.md#scheduling-patterns`
```

---

### M1.4: Implement Timeline Management System

```markdown
**Title:** [M1] Implement timeline management (timelineMap utilities)

**Labels:** feature, system: animation, size: S, priority: high

## Feature Description
Create utilities for managing GSAP timelines outside of React state.

## Implementation Details
- Create `src/animation/timelineMap.ts`
- Export `timelineMap` as Map<string, gsap.core.Timeline>
- Export `setTimeline(id, timeline)` function
- Export `getTimeline(id)` function
- Export `killTimeline(id)` function (kills and removes)
- Export `killAllTimelines()` function

**Pattern:**
```typescript
export const timelineMap = new Map<string, gsap.core.Timeline>();

export function killTimeline(id: string): void {
  const tl = timelineMap.get(id);
  if (tl) {
    tl.kill();
    timelineMap.delete(id);
  }
}
```

## Acceptance Criteria
- [ ] timelineMap created
- [ ] All utility functions exported
- [ ] killTimeline properly kills and removes
- [ ] No memory leaks (old timelines cleaned)
- [ ] TypeScript types correct
- [ ] Can be used from components

## Reference
- Oceanic: `src/animation/timelineMap.ts`
- Docs: `docs/ANIMATION_SYSTEM.md#timeline-management`
```

---

### M1.5: Add Robot Type Definition

```markdown
**Title:** [M1] Add Robot type and related type definitions

**Labels:** feature, system: state, size: S, priority: high

## Feature Description
Define TypeScript types for Robot, RobotState, AudioAttributes, and related types.

## Implementation Details
- Create `src/types/Robot.ts`
- Define `Robot` interface (id, position, state, destination, melody, audioAttributes, svgParts)
- Define `RobotState` enum (idle, swimming, interacting, selected, leaving)
- Define `AudioAttributes` (synthType, adsr, pitchRange, filterFreq, reverb)
- Define `MelodyEvent` (id, startStep, length, noteIndex)
- Define `RobotSVGParts` (chassis, head, propeller, topAntenna, bottomAntenna)

**Key structure:**
```typescript
interface Robot {
  id: string;
  state: RobotState;
  position: Vec2;
  destination: Vec2 | null;
  melody: MelodyEvent[];
  audioAttributes: AudioAttributes;
  svgParts: RobotSVGParts;
}
```

## Acceptance Criteria
- [ ] Robot type defined with all fields
- [ ] RobotState enum created
- [ ] AudioAttributes type defined
- [ ] MelodyEvent type defined
- [ ] All types exported
- [ ] Used in oceanStore

## Reference
- Oceanic: `src/types/Fish.ts` → adapt to Robot
- Docs: `docs/ROBOT_DESIGN.md`
```

---

### M1.6: Complete Zustand Store Actions

```markdown
**Title:** [M1] Complete Zustand store with all robot actions

**Labels:** feature, system: state, size: M, priority: high

## Feature Description
Implement all robot management actions in oceanStore with proper logic.

## Implementation Details
- Extend `src/stores/oceanStore.ts`
- Implement `addRobot()` with actual logic (add to array)
- Implement `removeRobot()` (filter out, cleanup timeline)
- Implement `updateRobot()` (immutable update pattern)
- Implement `getRobotById()` selector
- Add `settings` sub-store (bpm, volume, maxRobots)

**Action signatures:**
```typescript
addRobot: (robot: Robot) => void
removeRobot: (id: string) => void
updateRobot: (id: string, updates: Partial<Robot>) => void
getRobotById: (id: string) => Robot | undefined
```

## Acceptance Criteria
- [ ] All actions implemented
- [ ] Immutable state updates
- [ ] Timeline cleanup on removeRobot
- [ ] Proper TypeScript types
- [ ] Store usable from components
- [ ] No side effects (pure actions)

## Reference
- Oceanic: `src/stores/oceanStore.ts`
- Zustand docs (immutable updates)
```

---

## Step 6: Write M2 Issues (30 minutes)

Continue pattern for M2 (Robot Basics):
- M2.1: Create Robot SVG components (chassis, head, propeller, antennae)
- M2.2: Create RobotBody component that assembles parts
- M2.3: Create Robot component with position and selection
- M2.4: Implement robot spawning system
- M2.5: Implement GSAP swim animation (point-to-point)
- M2.6: Implement idle state and destination picking

---

## Step 7: Write M3, M4, M5 Issues (60 minutes)

**M3 Issues (Audio Integration):**
- M3.1: Integrate melody generator with robot spawner
- M3.2: Implement melody playback scheduling
- M3.3: Add polyphony management and voice stealing
- M3.4: Add volume controls and audio settings
- M3.5: Test harmony changes and melody synchronization

**M4 Issues (Interactions & Environment):**
- M4.1: Implement collision detection system
- M4.2: Implement robot-robot interaction (note flurry)
- M4.3: Add interaction cooldown system
- M4.4: Create Factory actor type and renderer
- M4.5: Implement factory spawning logic
- M4.6: Add environmental actors (ruins, machinery)
- M4.7: Implement camera pan/zoom system
- M4.8: Add depth layers with parallax

**M5 Issues (Polish & Launch):**
- M5.1: Create robot editor panel (show attributes)
- M5.2: Create settings panel (BPM, volume, visuals)
- M5.3: Add time display (measures/hours)
- M5.4: Implement mobile touch controls
- M5.5: Performance optimization pass (60 FPS)
- M5.6: Add responsive layout (mobile breakpoints)
- M5.7: Configure GitHub Pages deployment
- M5.8: Write PORTFOLIO.md case study

---

## Step 8: Add Issues to Project (30 minutes)

### 8.1 Create Issues in Repository

For each issue:
1. Click "New issue"
2. Copy template content
3. Assign to milestone
4. Add labels
5. Create issue
6. Repeat ~35 times

**Tip:** Use GitHub CLI to speed this up:
```bash
gh issue create --title "[M0] Create AudioEngine singleton" \
  --body "$(cat issue-m0-1.md)" \
  --milestone "M0: Foundation" \
  --label "feature,system: audio,size: M,priority: high"
```

### 8.2 Add Issues to Project Board

1. Go to project: https://github.com/orgs/fallboard-studios/projects/1
2. Click "Add items"
3. Search for issues by milestone
4. Add all M0 issues → "Backlog" column
5. Add all M1 issues → "Backlog"
6. Repeat for all milestones

### 8.3 Organize Board

**Backlog column:**
- M0 issues at top (highest priority)
- M1 issues below
- M2-M5 issues below (lower priority)

**Leave empty:**
- In Progress (you'll move here when working)
- Review (move here when PR created)
- Done (automatically moved on PR merge)

---

## Step 9: Update Project Documentation (20 minutes)

### 9.1 Create Roadmap Document

**File: `docs/ROADMAP.md`**
```markdown
# Pelagos-7 Development Roadmap

## Vision
[Portfolio piece demonstrating architecture and music tech]

## Timeline
4-6 weeks to v1.0 (January 2026 - February 2026)

## Milestones

### M0: Foundation (Week 1) ✅
Status: Complete
- [ ] AudioEngine singleton
- [ ] BeatClock
- [ ] oceanStore
- [ ] OceanScene + PlayButton

### M1: Core Architecture (Week 1-2)
Status: Not started
- [ ] Harmony system
- [ ] Melody generator
- [ ] Timeline management
- [ ] Complete store actions

[Continue for all milestones]

## GitHub Project
Track progress: [Project Board](https://github.com/orgs/fallboard-studios/projects/1)

## Version Definition
v1.0 includes:
- 6-12 robots swimming autonomously
- Musical generation from interactions
- Factory spawning
- Camera navigation
- Mobile-responsive
- Deployed to GitHub Pages
```

### 9.2 Update Main README

Add link to project board:
```markdown
## 🚀 Development Status

**Current Phase:** M0 - Foundation Setup

Track progress: [GitHub Project Board](link)

See [ROADMAP.md](docs/ROADMAP.md) for detailed timeline.
```

### 9.3 Commit Project Setup

```bash
git checkout -b project/initial-setup

git add docs/ROADMAP.md
git commit -m "docs: add development roadmap"

git add README.md
git commit -m "docs: add project board links to README"

git push origin project/initial-setup
```

Create PR: "Add roadmap documentation and project links"

---

## Step 10: Verify Setup (15 minutes)

### 10.1 Check Project Board

Visit project board and verify:
- [ ] All milestones created (6 total)
- [ ] All issues created (~35-40 total)
- [ ] Issues assigned to correct milestones
- [ ] Labels applied correctly
- [ ] Issues in Backlog column
- [ ] Roadmap view shows timeline
- [ ] Table view shows all issues

### 10.2 Check Repository

Verify:
- [ ] Milestones visible in Issues tab
- [ ] Each milestone has description and due date
- [ ] Issues are searchable and filterable
- [ ] Labels are clear and consistent

### 10.3 Test Workflow

**Simulate starting work:**
1. Pick first issue (M0.1: AudioEngine)
2. Move to "In Progress" column
3. Create feature branch
4. Make small change
5. Create draft PR
6. Verify PR links to issue
7. Close PR (don't merge - just testing)
8. Move issue back to Backlog

---

## Phase 2 Complete! ✅

**What You've Accomplished:**
- ✅ GitHub Project created with board/roadmap views
- ✅ 6 milestones with descriptions and due dates
- ✅ Custom labels for organization
- ✅ 35-40 detailed issues written
- ✅ All issues assigned to milestones
- ✅ Project board organized
- ✅ Roadmap documentation written
- ✅ README updated with project links
- ✅ Workflow tested

**What You Can Show:**
- Complete project management setup
- Professional issue tracking
- Clear development plan
- Transparent progress visibility
- All work planned upfront

**Portfolio Value:**
- Demonstrates project planning skills
- Shows systematic approach
- Proves ability to scope work
- Ready for team collaboration
- Clear stopping points for phases

**Next Phase:** [Phase 3: Foundation (M0)](phase-3-foundation.md)

Start building! Pick first issue (M0.1), create feature branch, implement AudioEngine singleton.

---

## Time Tracking

| Task | Estimated | Actual |
|------|-----------|--------|
| Create project | 30 min | |
| Create milestones | 20 min | |
| Create labels | 15 min | |
| Write M0 issues | 30 min | |
| Write M1 issues | 45 min | |
| Write M2-M5 issues | 60 min | |
| Add to project board | 30 min | |
| Documentation | 20 min | |
| Verification | 15 min | |
| **Total** | **~4 hours** | |

---

## Tips & Shortcuts

**GitHub CLI for bulk creation:**
```bash
# Install gh CLI: https://cli.github.com/

# Create issue from file
gh issue create --title "$TITLE" --body-file issue.md \
  --milestone "M0: Foundation" --label "feature,system: audio"

# List issues
gh issue list --milestone "M0: Foundation"

# Add to project
gh project item-add <project-id> --owner fallboard-studios --url <issue-url>
```

**Issue numbering convention:**
- M0.1, M0.2, M0.3... (milestone dot task number)
- Makes it easy to reference and sort

**Estimation guide:**
- XS (< 1 hour): Config changes, small additions
- S (1-2 hours): Single component, simple feature
- M (2-4 hours): System integration, moderate complexity
- L (4-8 hours): Major feature, multiple files
- XL (> 8 hours): Large refactor, architecture change (avoid these)

---

## Troubleshooting

**Issue: Can't create project**
- Ensure organization membership
- Check organization settings (projects enabled)

**Issue: Issues not showing in project**
- Manually add via "Add items" button
- Check project filters/settings

**Issue: Milestones not showing due dates**
- Edit milestone and add due date
- Refresh project roadmap view

**Issue: Too many issues (overwhelming)**
- Start with M0 and M1 only
- Add M2-M5 issues later as needed

---

**Questions?** Open a discussion in the repository.

**Ready to build?** Move to Phase 3: Foundation (M0)
