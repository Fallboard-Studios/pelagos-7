---
name: Feature
about: Milestone 3 — Robot Synthesis & Management
title: '[M8.3] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 10: Build Robot Selection/Gallery                      -->
<!-- ============================================================ -->

## [M8.3-10] Build Robot Selection/Gallery (List View for Choosing Active Robot)

## Feature Description
Build a scrollable list in the Robot view that displays all currently active robots. Selecting a robot from the list sets it as the active robot for editing in the Synthesis Modules (Issues 11–13). The list reflects live robot state and updates as robots spawn or are removed.

Depends on: **Issue 0d** (`robot.name` must exist), **Issue 0e** (`uiStore.activeView`), **Issue 4** (Robot view is an active viewport target), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/views/RobotView.tsx` — the top-level Robot view component (replaces the stub from Issue 4)
- [ ] Create `src/components/ui/RobotGallery.tsx` and `RobotGallery.css`
- [ ] Gallery reads `useOceanStore((s) => s.robots)` and `useOceanStore((s) => s.selectedRobotId)`
- [ ] Each list item displays:
  - `robot.name` (from Issue 0d)
  - A small static preview of the robot's visual — use `<RobotPreview />` if already suitable, or render a scaled-down `<RobotBody />` with `pointer-events: none`
  - An indicator for the robot's current `RobotState` (e.g., Idle/Moving/Interacting as a status dot)
- [ ] Clicking a list item calls `useOceanStore.getState().selectRobot(robot.id)`
- [ ] The selected robot's list item is visually highlighted (CSS class toggle, not inline style)
- [ ] If `selectedRobotId` is null (no robot selected), Synthesis Modules render in a disabled/placeholder state
- [ ] Gallery list is scrollable if the robot count exceeds the visible area
- [ ] `RobotView` renders `<RobotGallery />` alongside the synthesis module area (Issues 11–13)
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- Do NOT re-use the in-world `Robot.tsx` SVG component for the gallery preview at full fidelity — it uses GSAP to animate transforms and registers refs in `setRef()`. A `<RobotPreview />` or cloned-static render (no GSAP, no ref registration) is required to avoid conflicts with the animation system.
- The selected robot in the gallery is independent of the GSAP selection animation on the in-world robot (which triggers a visual "selected" state on the OceanScene layer). The gallery selection only needs to update `selectedRobotId` in the store.
- `RobotState` is an enum (`Idle`, `Moving`, `Selected`, `Interacting`, `Leaving`) — map each to a colour-coded dot or badge in the gallery item.
- The gallery list should use `robot.id` as the React `key`, not array index.

## Acceptance Criteria
- [ ] All active robots appear in the gallery list with their name and visual preview
- [ ] Clicking a robot sets `selectedRobotId` in the store
- [ ] Selected robot list item is visually distinct
- [ ] Gallery updates within one render cycle when a robot spawns or is removed
- [ ] No GSAP timeline collisions with the in-world robot animations
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in ocean scene or robot animations

## Source Reference
- File: `src/stores/oceanStore.ts`, `src/components/robot/RobotBody.tsx`, `src/components/robot/RobotPreview.tsx`
- Copilot instructions: "All animation: GSAP timelines only; store timelines in timelineMap, not in React/Zustand state."

---

<!-- ============================================================ -->
<!-- ISSUE 11: Build Synthesis Module A (General)                 -->
<!-- ============================================================ -->

## [M8.3-11] Build Synthesis Module A — General (Name, Volume, Rhythm)

## Feature Description
Build the first synthesis module panel for the selected robot, covering general attributes: the robot's name, its master volume, and a definition + UI for rhythmic density and variance. This module writes to the selected robot in `oceanStore` via `updateRobot()`.

Depends on: **Issue 0d** (`robot.name` must exist), **Issue 10** (a robot must be selectable), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/ui/SynthModuleA.tsx` and `SynthModuleA.css`
- [ ] Module reads the selected robot via `useOceanStore((s) => s.robots.find(r => r.id === s.selectedRobotId))`; renders a disabled/empty placeholder if no robot is selected
- [ ] **Name Textbox:**
  - Input type `text`, bound to `robot.name`
  - On blur (or Enter): calls `useOceanStore.getState().updateRobot(robot.id, { name: newName })`
  - Max length: 32 characters; trim whitespace on commit; do not allow empty string (revert to previous value if cleared)
- [ ] **Master Volume Slider:**
  - Reads `robot.masterVolume` (0–1 float)
  - Range input or custom slider: step 0.01, min 0, max 1
  - On change: calls `updateRobot(robot.id, { masterVolume: value })`
  - Displays current value as a percentage readout (e.g., `70%`)
  - Note: `masterVolume` affects per-note velocity at scheduling time — the change is heard on the next scheduled note, not immediately applied to currently-playing voices
- [ ] **Rhythmic Density Slider:**
  - Define: density = proportion of 16-step grid slots that contain a note event. Maps to the `eventCount` parameter in `generateMelodyForRobot()` (min 4 = sparse, max 12 = dense)
  - Store as a new `rhythmicDensity: number` field on `Robot` (integer 4–12); add to `Robot` interface and populate in `spawnSystem` (default: random 4–12)
  - On change: calls `updateRobot(robot.id, { rhythmicDensity: value })`; then calls `regenerateMelody(robot)` (see Technical Notes)
- [ ] **Rhythmic Variance Slider:**
  - Define: variance = probability that `applyRhythmicVariance()` is called each loop iteration. Maps to `applyRhythmicVariance(melody, probability)` already in `melodyGenerator.ts`
  - Store as a new `rhythmicVariance: number` field on `Robot` (0–1 float); add to `Robot` interface and populate in `spawnSystem` (default: 0.2)
  - On change: calls `updateRobot(robot.id, { rhythmicVariance: value })`; AudioEngine reads this value from the robot's cached attributes when applying variance at the loop boundary
- [ ] Module dimensions: fits within a `2×2` grid unit area; use design tokens for all styles
- [ ] Render `<SynthModuleA />` inside `RobotView`
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **Regenerating the melody on density change:** After updating `rhythmicDensity` in the store, call a helper `regenerateMelody(robot)` that: (1) generates a new melody via `generateMelodyForRobot({ eventCount: robot.rhythmicDensity })`, (2) calls `updateRobot(id, { melody: newMelody })`, (3) calls `AudioEngine.registerRobotMelody(id, newMelody)` to swap the live step registry. This must happen outside the Transport tick (use `queueMicrotask` to defer if needed — same pattern used for `applyRhythmicVariance` in AudioEngine).
- **`rhythmicVariance` and AudioEngine:** The Audio Engine currently calls `applyRhythmicVariance(melody, probability)` at the loop boundary. It reads from `robotAttributeCache` — ensure `rhythmicVariance` is included in the cache and updated when the robot is updated. Add an `updateRobotAttributeCache(id, updates)` path to AudioEngine, or re-read from the store on the next loop boundary tick.
- **`rhythmicDensity` and `rhythmicVariance` are new Robot fields introduced by this issue** (not Issue 0d — Issue 0d adds `name`, `phase`, and `detune` only) — update `Robot` interface in `src/types/Robot.ts`, all `spawnSystem` construction sites, and **all test fixtures**.

## Acceptance Criteria
- [ ] Name textbox shows current robot name and updates `robot.name` in the store on commit
- [ ] Empty or whitespace-only name is rejected; previous value is restored
- [ ] Volume slider updates `robot.masterVolume`; change is heard on next note
- [ ] Density slider range 4–12 regenerates the robot's melody with the new event count
- [ ] Variance slider range 0–1 is stored and read by AudioEngine at the loop boundary
- [ ] All new `Robot` fields are present in spawned robots (checked via `window.oceanStore` in dev)
- [ ] All existing tests pass after type/fixture updates
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/types/Robot.ts`, `src/systems/spawnSystem.ts`, `src/engine/melodyGenerator.ts`, `src/engine/AudioEngine.ts`
- Copilot instructions: "Melody Logic: Melodies must store note indices (0..7), never literal pitch strings."

---

<!-- ============================================================ -->
<!-- ISSUE 12: Build Synthesis Module B (Oscillators)             -->
<!-- ============================================================ -->

## [M8.3-12] Build Synthesis Module B — Oscillators (Waveform, Phase, Gain, Detune, Pulsewidth)

## Feature Description
Build the oscillator synthesis module for the selected robot. It exposes waveform type selection and touch-optimized Vertical Power Bars for phase, gain, detune, and conditional pulsewidth — the core oscillator parameters that shape the robot's timbral identity. No rotary knobs or grippable controls; everything is a linear fill bar designed for the glass touchscreen. Changes take effect at the next voice reservation cycle (robot remount/respawn) except for masterVolume which is per-note-velocity.

Depends on: **Issue 0d** (`phase` and `detune` in `AudioAttributes` must exist), **Issue 10** (robot selection), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/ui/SynthModuleB.tsx` and `SynthModuleB.css`
- [ ] Module reads the selected robot; renders disabled placeholder if none selected
- [ ] **Waveform Dropdown:**
  - `<select>` with options: `sine`, `square`, `triangle`, `sawtooth`
  - Reads `robot.audioAttributes.waveform`
  - On change: calls `updateRobot(id, { audioAttributes: { ...robot.audioAttributes, waveform: value } })`
  - Triggers voice re-reservation (see Technical Notes)
  - When waveform changes to/from `square`, the Pulsewidth control appears/disappears accordingly
- [ ] **Phase Vertical Power Bar:**
  - Touch-optimized vertical fill bar (linear scale); minimum 44×44px drag handle
  - Range: 0–360 degrees
  - Reads `robot.audioAttributes.phase` (added in Issue 0d)
  - On change: `updateRobot(id, { audioAttributes: { ...robot.audioAttributes, phase: value } })`
  - Triggers voice re-reservation
  - Display: numeric readout in degrees below the bar (e.g., `180°`)
- [ ] **Gain Vertical Power Bar:**
  - This is `robot.masterVolume` — shared with Synthesis Module A's volume control
  - Either omit from this module (document the overlap) or render as a read-only reference display linking to Module A
- [ ] **Detune Vertical Power Bar:**
  - Touch-optimized vertical fill bar (linear scale); minimum 44×44px drag handle
  - Range: −100 to +100 cents
  - Reads `robot.audioAttributes.detune` (added in Issue 0d)
  - On change: `updateRobot(id, { audioAttributes: { ...robot.audioAttributes, detune: value } })`
  - Triggers voice re-reservation
  - Display: signed numeric readout below the bar (e.g., `−24 ct`)
- [ ] **Pulsewidth Vertical Power Bar (conditional):**
  - Rendered only when `robot.audioAttributes.waveform === 'square'`
  - Touch-optimized vertical fill bar; minimum 44×44px drag handle
  - Reads a new `pulseWidth: number` field on `AudioAttributes` (0.0–1.0, default 0.5)
  - Add `pulseWidth` to `AudioAttributes` interface and `spawnSystem`
  - On change: `updateRobot(...)` + voice re-reservation
  - Display: percentage readout below the bar (e.g., `50%`)
- [ ] No rotary knobs or grippable controls — all oscillator parameters are Vertical Power Bars (linear fill sliders)
- [ ] Module dimensions: fits within the available RobotView panel width; use design tokens for all styles
- [ ] Render `<SynthModuleB />` inside `RobotView`
- [ ] No rotary knobs or grippable controls introduced anywhere in this module
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **Voice re-reservation on oscillator changes:** `AudioEngine.reserveVoice()` applies waveform, phase, and detune once at reservation time. When any of these change, the voice must be re-reserved to apply the new values. The flow is: (1) `AudioEngine.releaseVoice(robotId)`, (2) `AudioEngine.reserveVoice(robotId, robot.audioAttributes.synthType, robot.audioAttributes.waveform, robot.audioAttributes.adsr)` — but `reserveVoice()` will also need to read `phase`, `detune`, and `pulseWidth` from the updated attributes. Ensure `reserveVoice()` accepts or reads these from the stored `AudioAttributes` after Issue 0d.
- **Pulsewidth in Tone.js:** `synth.set({ oscillator: { width: pulseWidth } })` — this only has audible effect on `PulseOscillator` type (when waveform is `pulse` or `square`). The conditional rendering ensures users only see this control when it is relevant.
- **Phase:** Applied via `synth.set({ oscillator: { phase: value } })` at reservation time.
- **Detune:** Applied via `synth.set({ detune: value })` at reservation time. This is a coarse offset in cents.
- **Visual appearance:** `waveform` affects the visual shape only indirectly (it is part of `audioAttributes` which drives `generateColors()` and `shapeParamsFromAudio()`). Changing waveform may update the robot's appearance on next render — this is expected and correct per architecture.
- Add `pulseWidth` to `AudioAttributes` in `src/types/Robot.ts`, all construction sites in `spawnSystem`, and all test fixtures. Note: `pulseWidth` is a new field introduced by this issue (not Issue 0d).

## Acceptance Criteria
- [ ] Waveform dropdown shows current waveform and updates `robot.audioAttributes.waveform`
- [ ] Changing waveform triggers voice re-reservation; audible timbre change is heard on next note
- [ ] Phase and detune Vertical Power Bars update their respective `AudioAttributes` fields and trigger re-reservation
- [ ] Pulsewidth Vertical Power Bar is only visible when waveform is `square`
- [ ] Pulsewidth updates `audioAttributes.pulseWidth` and triggers re-reservation
- [ ] All new `AudioAttributes` fields are present in spawned robots
- [ ] All existing tests pass after type/fixture updates
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback or visual rendering

## Source Reference
- File: `src/types/Robot.ts`, `src/systems/spawnSystem.ts`, `src/engine/AudioEngine.ts` (`reserveVoice`)
- Copilot instructions: "Visual Mapping: Robot visuals (shape/color) must map strictly to audio attributes (synth/ADSR) as defined in MELODY_SYSTEM.md."

---

<!-- ============================================================ -->
<!-- ISSUE 13: Build ADSR Envelope Cluster                        -->
<!-- ============================================================ -->

## [M8.3-13] Build ADSR Envelope Cluster (HTML Canvas Graph with Draggable Nodes)

## Feature Description
Build the ADSR envelope control module for the selected robot. An HTML Canvas graph with four draggable nodes — Attack, Decay, Sustain, Release — gives the user direct, tactile control over the envelope shape on the glass touchscreen. A bezier curve rendered on the canvas visualises the envelope in real time as nodes are dragged. Numeric readouts beneath the canvas display each parameter value with correct units. ADSR changes trigger voice re-reservation in AudioEngine so the new envelope is applied to the next played note.

Depends on: **Issue 10** (robot selection), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/ui/ADSRModule.tsx` and `ADSRModule.css`
- [ ] Module reads the selected robot's `robot.audioAttributes.adsr`; renders disabled placeholder if none selected
- [ ] **HTML Canvas ADSR graph:**
  - A `<canvas>` element rendering a bezier curve ADSR shape; redraws in real time as nodes are dragged
  - Four draggable nodes positioned at the Attack peak, Decay endpoint, Sustain level, and Release endpoint
  - Nodes respond to both `pointerdown/pointermove/pointerup` and touch events; minimum 44×44px hit target per node
  - **Attack node:** constrains horizontal drag (time axis); range 0.001–4.0s
  - **Decay node:** constrains horizontal drag (time) and vertical drag (curves to sustain level); range 0.001–4.0s
  - **Sustain node:** constrains vertical drag (level axis); range 0–1.0 (displayed as %)
  - **Release node:** constrains horizontal drag; range 0.001–8.0s
  - Numeric readout for each parameter displayed beneath the canvas with correct units (ms/s for time, % for sustain)
- [ ] On any ADSR value change (node drag settle): call `updateRobot(id, { audioAttributes: { ...robot.audioAttributes, adsr: newAdsr } })` then trigger voice re-reservation (release + reserve, same pattern as Issue 12)
- [ ] **Canvas graph:**
  - Dimensions: occupies its own visually prominent area within the module
  - Bezier curve connects all four nodes and redraws on every drag event
  - Canvas is not animated between drag events — only redraws when node positions change
  - No GSAP needed for the canvas — direct Canvas 2D API redraws only
- [ ] Module total dimensions: fits within a `2×3` grid unit area; use design tokens for all styles
- [ ] Render `<ADSRModule />` inside `RobotView`
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **ADSR affects visual appearance:** `adsr` drives `generateColors()` and `calculateGreebleCount/Size/Persistence/PlacementBias()` in `robotVisualHelpers.ts`. Changing ADSR will visually update the robot on the next render — this is expected and correct per architecture.
- **Voice re-reservation on ADSR change:** Call `AudioEngine.releaseVoice(id)` then `AudioEngine.reserveVoice(id, ...)` as in Issue 12. Note: `reserveVoice()` already accepts `adsr` as a parameter and applies it at reservation time.
- **Canvas node hit detection:** Each node's hit target should be expanded to at least 44×44px around its rendered point. Use a simple radius check in the `pointerdown` handler rather than referencing exact canvas pixel coordinates.
- **Canvas bezier path calculation:** Given ADSR values, compute SVG/Canvas path points proportionally: (0,0) → (A/T, 1.0) → ((A+D)/T, sustain) → ((A+D+sustainLen)/T, sustain) → (1.0, 0). Use a fixed `sustainLen` display constant (e.g., `sustainLen = D`) for a balanced visual. This logic should live in a pure helper function for easy unit testing.
- **Attack display threshold:** The Tone.js minimum attack for `PolySynth` is approximately 0.001s (1ms) — values below this may produce clicks. The Attack node range minimum of 0.001s respects this.
- **No GSAP on the canvas** — use Canvas 2D API `clearRect` + path draws directly.

## Acceptance Criteria
- [ ] All four ADSR parameters can be adjusted via the canvas graph node drags
- [ ] Value readouts display correct units (ms/s for time, % for sustain) and update live on drag
- [ ] All four draggable nodes have a minimum 44×44px touch hit target
- [ ] ADSR change triggers voice re-reservation; audible envelope change on next note
- [ ] Canvas bezier curve redraws in real time as nodes are dragged
- [ ] ADSR change updates robot colour/greebles on next render (visual reactivity confirmed)
- [ ] Module disabled/placeholder when no robot is selected
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback or visual rendering

## Source Reference
- File: `src/types/Robot.ts` (`ADSREnvelope`), `src/engine/AudioEngine.ts` (`reserveVoice`), `src/components/robot/robotVisualHelpers.ts`
- Copilot instructions: "Visual Mapping: Robot visuals (shape/color) must map strictly to audio attributes (synth/ADSR) as defined in MELODY_SYSTEM.md."
