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
Build the oscillator synthesis module for the selected robot. It exposes waveform type selection, phase, gain (masterVolume), detune, and conditional pulsewidth — the core oscillator parameters that shape the robot's timbral identity. Changes take effect at the next voice reservation cycle (robot remount/respawn) except for masterVolume which is per-note-velocity.

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
- [ ] **Phase Knob/Slider (1×1):**
  - Range: 0–360 degrees
  - Reads `robot.audioAttributes.phase` (added in Issue 0d)
  - On change: `updateRobot(id, { audioAttributes: { ...robot.audioAttributes, phase: value } })`
  - Triggers voice re-reservation
  - Display: numeric readout in degrees (e.g., `180°`)
- [ ] **Gain Slider:**
  - This is `robot.masterVolume` — shared with Synthesis Module A's volume slider
  - Either omit from this module (document the overlap) or render as a read-only reference display linking to Module A
- [ ] **Detune Knob/Slider (1×1):**
  - Range: −100 to +100 cents
  - Reads `robot.audioAttributes.detune` (added in Issue 0d)
  - On change: `updateRobot(id, { audioAttributes: { ...robot.audioAttributes, detune: value } })`
  - Triggers voice re-reservation
  - Display: signed numeric readout (e.g., `−24 ct`)
- [ ] **Pulsewidth Stepper (2×1, conditional):**
  - Rendered only when `robot.audioAttributes.waveform === 'square'`
  - Reads a new `pulseWidth: number` field on `AudioAttributes` (0.0–1.0, default 0.5)
  - Add `pulseWidth` to `AudioAttributes` interface and `spawnSystem`
  - On change: `updateRobot(...)` + voice re-reservation
  - Display: percentage readout (e.g., `50%`)
- [ ] Module dimensions: fits within a `2×2` grid unit area; use design tokens for all styles
- [ ] Render `<SynthModuleB />` inside `RobotView`
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
- [ ] Phase and detune controls update their respective `AudioAttributes` fields and trigger re-reservation
- [ ] Pulsewidth control is only visible when waveform is `square`
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

## [M8.3-13] Build ADSR Envelope Cluster (4× Steppers with Visual Sparkline)

## Feature Description
Build the ADSR envelope control module for the selected robot. Four steppers control attack, decay, sustain, and release. A live sparkline visualises the current envelope shape, giving immediate visual feedback. ADSR changes trigger voice re-reservation in AudioEngine so the new envelope is applied to the next played note.

Depends on: **Issue 10** (robot selection), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/ui/ADSRModule.tsx` and `ADSRModule.css`
- [ ] Module reads the selected robot's `robot.audioAttributes.adsr`; renders disabled placeholder if none selected
- [ ] **Four steppers** (each with fine and coarse increment/decrement buttons):
  - **Attack:** range 0.001–4.0s, fine step 0.001s, coarse step 0.1s; display in ms for values <1s (e.g., `50 ms`), seconds otherwise (e.g., `1.2 s`)
  - **Decay:** range 0.001–4.0s, same step sizes and display logic as Attack
  - **Sustain:** range 0–1.0 (dimensionless level), fine step 0.01, coarse step 0.1; display as percentage (e.g., `75%`)
  - **Release:** range 0.001–8.0s, fine step 0.001s, coarse step 0.1s; same display as Attack/Decay
- [ ] On any ADSR value change: call `updateRobot(id, { audioAttributes: { ...robot.audioAttributes, adsr: newAdsr } })` then trigger voice re-reservation (release + reserve, same pattern as Issue 12)
- [ ] **Sparkline:**
  - Inline SVG rendering the classic ADSR trapezoid: Attack ramp up → Decay ramp down to Sustain level → flat Sustain line → Release ramp down
  - Rerenders reactively when any ADSR value changes
  - Dimensions: `2×1` grid units wide, occupies own row in the module
  - No GSAP needed — this is a pure SVG path recomputed on render, not animated
- [ ] Module total dimensions: fits within a `2×3` grid unit area; use design tokens for all styles
- [ ] Render `<ADSRModule />` inside `RobotView`
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **ADSR affects visual appearance:** `adsr` drives `generateColors()` (via `hueOffset`, `toLuminance`, `toSaturation`) and `calculateGreebleCount/Size/Persistence/PlacementBias()` in `robotVisualHelpers.ts`. Changing ADSR will visually update the robot on the next render — this is expected and correct per architecture. No extra action needed to trigger the visual update; it is purely reactive.
- **Voice re-reservation on ADSR change:** Call `AudioEngine.releaseVoice(id)` then `AudioEngine.reserveVoice(id, ...)` as in Issue 12. Note: `reserveVoice()` already accepts `adsr` as a parameter and applies it at reservation time.
- **Sparkline path calculation:** Given normalised time budget `T = A + D + R + sustainLength`, compute SVG path points proportionally: (0,0) → (A/T, 1.0) → ((A+D)/T, sustain) → ((A+D+sustainLen)/T, sustain) → (1.0, 0). Use a fixed `sustainLen` display constant (e.g., `sustainLen = D` for a balanced visual). Keep the sparkline calculation in a pure function for easy unit testing.
- **Attack display threshold:** The Tone.js minimum attack for `PolySynth` is approximately 0.001s (1ms) — values below this may produce clicks. The stepper minimum of 0.001s respects this.

## Acceptance Criteria
- [ ] All four ADSR parameters have steppers with correct ranges and step sizes
- [ ] Value display uses correct units (ms/s for time, % for sustain)
- [ ] ADSR change triggers voice re-reservation; audible envelope change on next note
- [ ] Sparkline redraws immediately to reflect updated ADSR values
- [ ] ADSR change updates robot colour/greebles on next render (visual reactivity confirmed)
- [ ] Module disabled/placeholder when no robot is selected
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback or visual rendering

## Source Reference
- File: `src/types/Robot.ts` (`ADSREnvelope`), `src/engine/AudioEngine.ts` (`reserveVoice`), `src/components/robot/robotVisualHelpers.ts`
- Copilot instructions: "Visual Mapping: Robot visuals (shape/color) must map strictly to audio attributes (synth/ADSR) as defined in MELODY_SYSTEM.md."
