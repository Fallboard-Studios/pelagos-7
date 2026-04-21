---
name: Feature
about: Milestone 3 — Robot Management Console Tabs
title: '[M8.3] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 9: Build Robot Options Console Tab                     -->
<!-- ============================================================ -->

## [M8.3-9] Build Robot Options Console Tab

## Feature Description
Build the `RobotOptionsTab` component that renders when `activeConsoleTab === 'robotOptions'`. It exposes world-level robot management controls: robot count limits, auto-spawn toggle, spawn frequency, and a quick New Robot action that spawns a robot and immediately opens the Robot Editor tab for it.

Depends on: **Issue 0d** (robot type + `robot.name`), **Issue 0k** (Radix installed), **Issues 3–4** (Console panel + RobotList panel), **Issue 3a** (RobotList panel observes localeStore), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/panels/screen/console/RobotOptionsTab.tsx` and `RobotOptionsTab.css`
- [ ] Renders when `activeConsoleTab === 'robotOptions'` (controlled by `ConsolePanel`, Issue 4)
- [ ] **Min/Max Robots Range Input:**
  - Dual-thumb range input controlling `locale.settings.minRobots` and `locale.settings.maxRobots`
  - Read via `useLocaleStore((s) => s.locales[localeId]?.settings)` where `localeId` comes from `usePlanetStore`
  - On change: calls `useLocaleStore.getState().setLocaleData(localeId, { settings: { ...settings, minRobots, maxRobots } })`
  - Display: current values (e.g., `Min: 2  Max: 8`)
- [ ] **Auto Spawn Robots Toggle:**
  - Reads `locale.settings.autoSpawn` boolean (new field — add to `LocaleSettings` if absent; default `true`)
  - On toggle: calls `setLocaleData(localeId, { settings: { ...settings, autoSpawn: value } })`
  - **Radix:** `@radix-ui/react-switch` → `Switch.Root` + `Switch.Thumb`
- [ ] **Spawn Frequency Slider:**
  - Reads `locale.settings.spawnFrequency` (new field — add to `LocaleSettings` if absent; default `4` measures)
  - On change: calls `setLocaleData(localeId, { settings: { ...settings, spawnFrequency: value } })`
  - **Radix:** `@radix-ui/react-slider` → `Slider.Root` + `Slider.Track` + `Slider.Range` + `Slider.Thumb`
  - Display: current value with unit label
- [ ] **New Robot Button:**
  - Spawns a new robot via `spawnRobot(localeId)` from `spawnSystem`
  - After spawning: calls `useUIStore.getState().selectRobot(newRobot.id)` then `useUIStore.getState().setActiveConsoleTab('robotEditor')` so the user lands directly in the Robot Editor for the new robot
  - The RobotList panel (Issue 3a) updates automatically as it observes localeStore
- [ ] All controls meet minimum 44×44px touch target size (WCAG 2.5.5)
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `autoSpawn` and `spawnFrequency` are new fields on `LocaleSettings` — add them to the `LocaleSettings` type in `src/types/locale.ts` and populate with defaults in `localeStore`'s `DEFAULT_LOCALE`. Document the decision.
- The New Robot button must navigate to the Robot Editor tab atomically: spawn first, then navigate, so `selectedRobotId` is guaranteed to point to a valid robot when the editor mounts.
- The RobotList panel (Issue 3a) is always mounted and will reflect the new robot without any extra action — it observes `localeStore` reactively.
- `localeId` for the active locale: read via `usePlanetStore((s) => s.planets[0]?.currentLocaleId ?? '')`.

## Acceptance Criteria
- [ ] `RobotOptionsTab` renders when `activeConsoleTab === 'robotOptions'`
- [ ] Min/Max Robots range input reads and writes `locale.settings.minRobots` / `maxRobots` via `setLocaleData`
- [ ] Auto Spawn toggle reads and writes `locale.settings.autoSpawn`
- [ ] Spawn Frequency slider reads and writes `locale.settings.spawnFrequency`
- [ ] New Robot button calls `spawnRobot(localeId)`, then `selectRobot(id)` and `setActiveConsoleTab('robotEditor')` via `uiStore`
- [ ] RobotList panel updates when a new robot is spawned via this tab
- [ ] All controls meet 44×44px minimum touch target size
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/stores/localeStore.ts` (robot + settings mutations), `src/stores/uiStore.ts` (`selectRobot`, `setActiveConsoleTab`), `src/systems/spawnSystem.ts`, `src/components/panels/screen/console/RobotOptionsTab.tsx`
- Copilot instructions: "All interactive UI (transport, navigation, controls) lives inside GlassViewport only."

---

<!-- ============================================================ -->
<!-- ISSUE 10: Build Robot Editor Console Tab Shell               -->
<!-- ============================================================ -->

## [M8.3-10] Build Robot Editor Console Tab Shell + Robot Editor Navigation

## Feature Description
Build the `RobotEditorTab` shell that renders when `activeConsoleTab === 'robotEditor'`. It reads `selectedRobotId` from robotStore to display the most recently selected/created robot. Inside, a set of Robot Editor sub-tabs (Robot Meta | Robot Audio | Robot Oscillators) provides the three editing panels built in Issues 11–13.

Depends on: **Issue 0d** (`robot.name` must exist), **Issue 0k** (Radix installed), **Issues 3–4** (Console panel must exist), **Issue 9** (New Robot trigger navigates here), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/panels/screen/console/RobotEditorTab.tsx` and `RobotEditorTab.css`
- [ ] Renders when `activeConsoleTab === 'robotEditor'` (controlled by `ConsolePanel`, Issue 4)
- [ ] Reads `selectedRobotId` from `useUIStore((s) => s.selectedRobotId)`; if null, renders a descriptive empty state: `"Select a robot from the list, or use Robot Options to spawn one."`
- [ ] **Robot Editor Navigation:** Radix sub-tabs inside the console content area
  - Sub-tabs: `Robot Meta` | `Robot Audio` | `Robot Oscillators`
  - **Radix:** `@radix-ui/react-tabs` → `Tabs.Root` + `Tabs.List` + `Tabs.Trigger` + `Tabs.Content` (nested inside the outer Console `Tabs.Root` from Issue 4)
  - Sub-tab active state is local component state (not Zustand) — it does not need global persistence
- [ ] **Robot Editor Console:** the panel below the sub-tabs rendering the active sub-tab content
  - `Robot Meta` content: `<RobotMetaTab />` (Issue 11)
  - `Robot Audio` content: `<RobotAudioTab />` (Issue 12)
  - `Robot Oscillators` content: `<RobotOscillatorsTab />` (Issue 13)
- [ ] Default open sub-tab on mount: `Robot Meta`
- [ ] All sub-tab triggers meet minimum 44×44px touch target size
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- Nested Radix `Tabs.Root` works correctly as long as each `Tabs.Root` has a distinct `value` namespace — the outer Console tabs (Issue 4) and the inner Robot Editor tabs are two independent `Tabs.Root` instances with no shared state.
- The empty state (no `selectedRobotId`) must not crash — render a placeholder message; do not attempt to read `robot.name` or any robot property when `selectedRobotId` is null.
- Sub-tab state does NOT belong in `uiStore` — keeping it local to `RobotEditorTab` simplifies state management and avoids persisting ephemeral navigation state.

## Acceptance Criteria
- [ ] `RobotEditorTab` renders when `activeConsoleTab === 'robotEditor'`
- [ ] Renders a meaningful empty state when `selectedRobotId` is null
- [ ] Three sub-tab triggers (Robot Meta, Robot Audio, Robot Oscillators) render and are clickable
- [ ] Clicking a sub-tab trigger shows its corresponding content panel
- [ ] Default sub-tab on mount is `Robot Meta`
- [ ] Sub-tab state is local (not in Zustand); navigating away and back resets to default — this is acceptable
- [ ] No TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in RobotList panel or OceanScene

## Source Reference
- File: `src/stores/uiStore.ts` (`selectedRobotId`, `selectRobot`), `src/stores/localeStore.ts` (robot data), `src/components/panels/screen/console/RobotEditorTab.tsx`
- Copilot instructions: `"All interactive UI (transport, navigation, controls) lives inside GlassViewport only."`

---

<!-- ============================================================ -->
<!-- ISSUE 11: Robot Meta Sub-Tab                                 -->
<!-- ============================================================ -->

## [M8.3-11] Robot Meta Sub-Tab

## Feature Description
Build the `RobotMetaTab` content panel that renders inside `RobotEditorTab` when the Robot Meta sub-tab is active. It exposes robot identity, persistence, preset management, and linking controls.

Renders inside: **Robot Editor Console** (`RobotEditorTab`, Issue 10) when Robot Meta sub-tab is active.
Depends on: **Issue 0d** (`robot.name` must exist), **Issue 0k** (Radix installed), **Issue 10** (editor shell must exist), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/panels/screen/console/RobotMetaTab.tsx` and `RobotMetaTab.css`
- [ ] Reads `selectedRobotId` from `useUIStore((s) => s.selectedRobotId)` and the robot object from `useLocaleStore`; renders a disabled/empty state if null
- [ ] **Name Textbox:**
  - Input type `text`, bound to `robot.name`
  - On blur (or Enter): calls `useLocaleStore.getState().updateRobot(localeId, robot.id, { name: newName })`
  - Max length: 32 characters; trim whitespace on commit; reject empty string (revert to previous value)
- [ ] **Age Display:** read-only text derived from the robot's `createdAt` timestamp; format as elapsed time (e.g., `3 mins old`) — no store write
- [ ] **Persist Toggle:**
  - Reads a `robot.persist: boolean` flag; on toggle calls `useLocaleStore.getState().updateRobot(localeId, id, { persist: value })`
  - When `persist === true`, the robot survives power-off (`removeNonPersistentRobots()` skips it)
  - **Radix:** `@radix-ui/react-switch` → `Switch.Root` + `Switch.Thumb`
- [ ] **Preset Selection:**
  - **Radix:** `@radix-ui/react-select` → `Select.Root` + `Select.Trigger` + `Select.Content` + `Select.Item` — dropdown of available robot presets
  - Followed by a **Load Robot Preset** button with AlertDialog confirmation (destructive — overwrites current robot settings)
  - **Radix:** `@radix-ui/react-alert-dialog` for the confirmation
- [ ] **Copy Robot:**
  - Dropdown (`@radix-ui/react-select`) listing all other robots as copy targets
  - Action: copies current robot's `audioAttributes`, `melody`, and `rhythmicDensity`/`rhythmicVariance` to the selected target robot via `useLocaleStore.getState().updateRobot(localeId, targetId, ...)`
- [ ] **Link To Robot:**
  - Dropdown (`@radix-ui/react-select`) listing other robots
  - Action: links the current robot to the selected target (exact link semantics TBD — document the decision at implementation time)
- [ ] All controls meet minimum 44×44px touch target size (WCAG 2.5.5)
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `robot.persist` is a new boolean field — add it to the `Robot` interface, populate in `spawnSystem` (default: `false`), and update all test fixtures.
- `robot.createdAt` may not yet exist — if absent, add it to `Robot` as a `number` (unix ms timestamp), populated in `spawnSystem` with `Date.now()`.
- Link To Robot semantics: placeholder for future use (harmony sync, follow-me mode) — for now, storing a `linkedRobotId: string | null` on the robot is sufficient.

## Acceptance Criteria
- [ ] Renders inside the Robot Meta sub-tab of `RobotEditorTab`; empty state if no robot selected
- [ ] Name textbox reads/writes `robot.name`; empty string is rejected
- [ ] Age display updates correctly relative to `robot.createdAt`
- [ ] Persist toggle reads/writes `robot.persist`
- [ ] Load Preset confirmation uses AlertDialog; confirm applies preset, cancel dismisses
- [ ] Copy Robot updates the target robot's audio attributes
- [ ] All controls meet 44×44px minimum touch target size
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/types/Robot.ts`, `src/systems/spawnSystem.ts`, `src/stores/localeStore.ts` (`updateRobot`), `src/stores/uiStore.ts` (`selectedRobotId`), `src/components/panels/screen/console/RobotMetaTab.tsx`
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 12: Robot Audio Sub-Tab                                -->
<!-- ============================================================ -->

## [M8.3-12] Robot Audio Sub-Tab

## Feature Description
Build the `RobotAudioTab` content panel that renders inside `RobotEditorTab` when the Robot Audio sub-tab is active. It exposes per-robot audio behaviour controls: solo/mute/highlight, rhythmic density and variance, octave range, and a melody regeneration action.

Renders inside: **Robot Editor Console** (`RobotEditorTab`, Issue 10) when Robot Audio sub-tab is active.
Depends on: **Issue 0d** (robot audio fields), **Issue 0k** (Radix installed), **Issue 10** (editor shell must exist), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/panels/screen/console/RobotAudioTab.tsx` and `RobotAudioTab.css`
- [ ] Reads `selectedRobotId` from `useUIStore` and the robot from `useLocaleStore`; renders empty state if null
- [ ] **Solo / Mute / Highlight — Radio Group:**
  - Three mutually exclusive states: None selected, Solo, Mute, Highlight (None is the default)
  - Reads `robot.audioMode: 'none' | 'solo' | 'mute' | 'highlight'` (new field — define if absent)
  - On change: calls `useLocaleStore.getState().updateRobot(localeId, id, { audioMode: value })`; AudioEngine applies per-robot solo/mute on next scheduled note
  - **Radix:** `@radix-ui/react-radio-group` → `RadioGroup.Root` + `RadioGroup.Item` + `RadioGroup.Indicator`
- [ ] **Rhythmic Density Slider:**
  - Range: 4–12 (integer steps); mapped to `eventCount` in `generateMelodyForRobot()`
  - Reads `robot.rhythmicDensity`; on change: `useLocaleStore.getState().updateRobot(localeId, id, { rhythmicDensity: value })` then calls `regenerateMelody(robot)`
  - **Radix:** `@radix-ui/react-slider`
- [ ] **Note Variance Slider:**
  - Range: 0–1 (float); probability that `applyRhythmicVariance()` fires each loop
  - Reads `robot.rhythmicVariance`; on change: `useLocaleStore.getState().updateRobot(localeId, id, { rhythmicVariance: value })`
  - **Radix:** `@radix-ui/react-slider`
- [ ] **Octave Range — Dual-Thumb Range Input:**
  - Two thumbs for min and max octave (range 1–7)
  - Reads `robot.octaveMin` and `robot.octaveMax` (new fields — define if absent; defaults 3 and 5)
  - On change: `useLocaleStore.getState().updateRobot(localeId, id, { octaveMin, octaveMax })`
  - **Radix:** `@radix-ui/react-slider` with `min`, `max`, and `value` as an array `[octaveMin, octaveMax]`
- [ ] **New Melody Button With Confirmation:**
  - Regenerates the melody for the selected robot
  - **Radix:** `@radix-ui/react-alert-dialog` guard ("Regenerate melody? The current melody will be replaced.")
  - On confirm: calls `regenerateMelody(robot)` which generates a new melody and registers it with `AudioEngine`
- [ ] All controls meet minimum 44×44px touch target size
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **`rhythmicDensity` and `rhythmicVariance`:** May have been introduced in a previous implementation of old Issue 11 (Synthesis Module A). If present on `Robot`, use them; if absent, add them here and update `Robot` interface, `spawnSystem`, and all test fixtures.
- **`audioMode`:** Solo = AudioEngine mutes all other robots; Mute = AudioEngine silences this robot; Highlight = visual-only trigger (no audio change). The AudioEngine integration for solo/mute can be deferred to a later issue if needed — store the flag now and document the deferral.
- **`regenerateMelody(robot)`:** (1) calls `generateMelodyForRobot({ eventCount: robot.rhythmicDensity })`; (2) calls `useLocaleStore.getState().updateRobot(localeId, id, { melody: newMelody })`; (3) calls `AudioEngine.registerRobotMelody(id, newMelody)`. Must run outside the Transport tick — `queueMicrotask` if needed.
- **Octave range fields:** `octaveMin` and `octaveMax` are new `Robot` fields — add to interface and `spawnSystem` (default 3 and 5). Melody generator must read these for octave assignment.

## Acceptance Criteria
- [ ] Renders inside the Robot Audio sub-tab of `RobotEditorTab`; empty state if no robot selected
- [ ] Solo/Mute/Highlight radio group reads/writes `robot.audioMode`
- [ ] Density slider (4–12) updates `robot.rhythmicDensity` and triggers melody regeneration
- [ ] Variance slider (0–1) updates `robot.rhythmicVariance`
- [ ] Octave Range dual-thumb slider updates `robot.octaveMin` and `robot.octaveMax`
- [ ] New Melody confirmation regenerates the melody and registers it with AudioEngine
- [ ] All controls meet 44×44px minimum touch target size
- [ ] All new `Robot` fields are present in spawned robots
- [ ] All existing tests pass after type/fixture updates
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/types/Robot.ts`, `src/systems/spawnSystem.ts`, `src/engine/melodyGenerator.ts`, `src/engine/AudioEngine.ts`, `src/stores/localeStore.ts` (`updateRobot`), `src/stores/uiStore.ts` (`selectedRobotId`), `src/components/panels/screen/console/RobotAudioTab.tsx`
- Copilot instructions: "Melody Logic: Melodies must store note indices (0..7), never literal pitch strings."

---

<!-- ============================================================ -->
<!-- ISSUE 13: Robot Oscillators Sub-Tab                          -->
<!-- ============================================================ -->

## [M8.3-13] Robot Oscillators Sub-Tab

## Feature Description
Build the `RobotOscillatorsTab` content panel that renders inside `RobotEditorTab` when the Robot Oscillators sub-tab is active. It combines waveform/oscillator parameter controls with the ADSR canvas graph — everything needed to shape the robot's timbral identity in one panel. No rotary knobs; all continuous controls are touch-friendly linear sliders, steppers, or Power Bars.

Renders inside: **Robot Editor Console** (`RobotEditorTab`, Issue 10) when Robot Oscillators sub-tab is active.
Depends on: **Issue 0d** (`phase`, `detune` in `AudioAttributes`), **Issue 0k** (Radix installed), **Issue 10** (editor shell), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/panels/screen/console/RobotOscillatorsTab.tsx` and `RobotOscillatorsTab.css`
- [ ] Reads `selectedRobotId` from `useUIStore` and the robot from `useLocaleStore`; renders empty state if null
- [ ] **Robot Oscillator Type Dropdown:**
  - Reads `robot.audioAttributes.waveform`; on change: calls `updateRobot(id, { audioAttributes: { ...robot.audioAttributes, waveform: value } })` then triggers voice re-reservation
  - **Radix:** `@radix-ui/react-select` → `Select.Root` + `Select.Trigger` + `Select.Content` + `Select.Item`
  - When waveform changes to/from `square`, the Pulsewidth control appears/disappears
- [ ] **Robot Oscillator Detune — Dual Speed Stepper:**
  - Reads `robot.audioAttributes.detune` (added in Issue 0d); range −100 to +100 cents; step ±1/±10
  - On change: `useLocaleStore.getState().updateRobot(localeId, id, { audioAttributes: { ...robot.audioAttributes, detune: value } })` + voice re-reservation
- [ ] **Robot Oscillator Gain — Dual Speed Stepper:**
  - This is `robot.masterVolume` (0–1 float); step ±0.01/±0.1
  - On change: `useLocaleStore.getState().updateRobot(localeId, id, { masterVolume: value })`
- [ ] **Robot Oscillator Phase — Slider:**
  - Range: 0–360°; reads `robot.audioAttributes.phase` (Issue 0d)
  - On change: `useLocaleStore.getState().updateRobot(localeId, id, { audioAttributes: { ...robot.audioAttributes, phase: value } })` + voice re-reservation
  - **Radix:** `@radix-ui/react-slider`
- [ ] **Robot Oscillator Pulsewidth — Dual Speed Stepper (conditional):**
  - Only visible when `robot.audioAttributes.waveform === 'square'`
  - Reads `audioAttributes.pulseWidth` (0.0–1.0); step ±0.01/±0.1
  - Add `pulseWidth: number` to `AudioAttributes` if absent; default 0.5
  - On change: `useLocaleStore.getState().updateRobot(localeId, id, { audioAttributes: { ...robot.audioAttributes, pulseWidth: value } })` + voice re-reservation
- [ ] **Robot Oscillator ADSR Canvas:** renders `<ADSRCanvas robotId={selectedRobotId} />` — implemented in Issue 14
- [ ] **Select Robot Oscillator Preset — Dropdown + Load Button With Confirmation:**
  - **Radix:** `@radix-ui/react-select` + `@radix-ui/react-alert-dialog` for confirmation
- [ ] **Delete This Oscillator — Button With Confirmation:**
  - **Radix:** `@radix-ui/react-alert-dialog`
- [ ] **New Oscillator — Button:** adds an oscillator layer to the selected robot
- [ ] All controls meet minimum 44×44px touch target size (WCAG 2.5.5)
- [ ] No rotary knobs — all continuous controls are touch-friendly linear sliders or steppers
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **Voice re-reservation on oscillator changes:** `AudioEngine.reserveVoice()` applies waveform, phase, and detune at reservation time. When any of these change: (1) `AudioEngine.releaseVoice(robotId)`, (2) `AudioEngine.reserveVoice(robotId, ...)` reading latest `AudioAttributes`. Ensure `reserveVoice()` reads `phase`, `detune`, and `pulseWidth` from `AudioAttributes` after Issue 0d.
- **Pulsewidth in Tone.js:** `synth.set({ oscillator: { width: pulseWidth } })` — only audible effect on `PulseOscillator` type (waveform `pulse` or `square`). Conditional rendering ensures users only see it when relevant.
- **`pulseWidth`:** New `AudioAttributes` field — add to `Robot` interface in `src/types/Robot.ts`, all `spawnSystem` construction sites, and all test fixtures.
- **ADSR canvas:** see Issue 14 (`ADSRCanvas` component) for implementation details, bezier path calculation, hit targets, and voice re-reservation on drag-settle.

## Acceptance Criteria
- [ ] Renders inside the Robot Oscillators sub-tab of `RobotEditorTab`; empty state if no robot selected
- [ ] Waveform dropdown reads and writes `robot.audioAttributes.waveform`; triggers voice re-reservation
- [ ] Pulsewidth control is only visible when waveform is `square`
- [ ] Detune, Gain, Phase, Pulsewidth controls update their respective fields and trigger re-reservation
- [ ] `<ADSRCanvas />` renders inside the oscillators panel (Issue 14)
- [ ] Preset Load confirmation uses AlertDialog
- [ ] Delete Oscillator confirmation uses AlertDialog
- [ ] New Oscillator button adds an oscillator layer
- [ ] All new `AudioAttributes` fields are present in spawned robots
- [ ] All existing tests pass after type/fixture updates
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback or visual rendering

## Source Reference
- File: `src/types/Robot.ts` (`ADSREnvelope`, `AudioAttributes`), `src/systems/spawnSystem.ts`, `src/engine/AudioEngine.ts` (`reserveVoice`), `src/stores/localeStore.ts` (`updateRobot`), `src/stores/uiStore.ts` (`selectedRobotId`), `src/components/robot/robotVisualHelpers.ts`, `src/components/panels/screen/console/RobotOscillatorsTab.tsx`
- Copilot instructions: "Visual Mapping: Robot visuals (shape/color) must map strictly to audio attributes (synth/ADSR/phase/detune) as defined in ROBOT_DESIGN.md."

---

<!-- ============================================================ -->
<!-- ISSUE 14: ADSR Canvas Component                             -->
<!-- ============================================================ -->

## [M8.3-14] Build ADSR Canvas Component

## Feature Description
Build a standalone `ADSRCanvas` component — an interactive HTML `<canvas>` that renders a bezier ADSR envelope shape with four draggable nodes. Used inside `RobotOscillatorsTab` (Issue 13) to let the user shape the robot's envelope. On drag-settle it writes the updated ADSR back to `localeStore` and triggers voice re-reservation in `AudioEngine`.

Rendered by: **`RobotOscillatorsTab`** (Issue 13).
Depends on: **Issue 0d** (`ADSREnvelope` type in `AudioAttributes`), **Issue 10** (editor shell), **Issue 13** (oscillators tab must exist to mount it).

## Implementation Details
- [ ] Create `src/components/panels/screen/console/ADSRCanvas.tsx` and `ADSRCanvas.css`
- [ ] Props: `{ robotId: string; localeId: string }` — reads ADSR from `useLocaleStore`; does not accept ADSR as a prop (avoids stale closure issues)
- [ ] **Canvas rendering:**
  - HTML `<canvas>` element; direct Canvas 2D API only — no GSAP, no SVG
  - Renders a bezier curve ADSR shape using the path: `(0,0) → (A/T, 1.0) → ((A+D)/T, sustain) → ((A+D+sustainLen)/T, sustain) → (1.0, 0)`
  - Use a fixed `SUSTAIN_DISPLAY_LEN` constant (e.g., `0.25` of total width) for a balanced visual
  - Extract path calculation into a pure helper `computeADSRPath(adsr, width, height): Path2D` for testability
  - Redraws via `clearRect` + path on every pointer move during drag
- [ ] **Four draggable nodes:**
  - Attack peak — horizontal drag only (time axis); range 0.001–4.0s
  - Decay endpoint — horizontal drag (time) + vertical drag (curves to sustain level); range 0.001–4.0s
  - Sustain level — vertical drag only (level axis); range 0.0–1.0 (displayed as %)
  - Release endpoint — horizontal drag only; range 0.001–8.0s
  - Each node rendered as a filled circle; hit area ≥ 44×44px (use radius check in `pointerdown`)
- [ ] **Pointer event handling:** `pointerdown / pointermove / pointerup` + touch events; `setPointerCapture` on drag start for reliable tracking outside the canvas bounds
- [ ] **Numeric readouts:** four labels beneath the canvas showing current A/D/S/R values with correct units (ms or s for time; % for sustain); update live on drag
- [ ] **On drag-settle (`pointerup`):** call `useLocaleStore.getState().updateRobot(localeId, robotId, { audioAttributes: { ...robot.audioAttributes, adsr: newAdsr } })` then trigger voice re-reservation: `AudioEngine.releaseVoice(robotId)` → `AudioEngine.reserveVoice(robotId, ...)`
- [ ] **On `robotId` change:** re-read ADSR from store and reset internal drag state
- [ ] No GSAP anywhere in this component
- [ ] Meets minimum 44×44px touch target size per node
- [ ] Use only design tokens from Issue 1 for colours/fonts of the readout labels
- [ ] No architecture violations
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **Why a separate component:** the canvas pointer logic and path math are complex enough to warrant isolation — easier to test `computeADSRPath` in unit tests when it has no React dependencies.
- **`setPointerCapture`:** call `canvas.setPointerCapture(e.pointerId)` on `pointerdown` so `pointermove` fires even when the pointer leaves the canvas area mid-drag.
- **ADSR affects visual appearance:** `adsr` drives `generateColors()` and the greeble calculation helpers in `robotVisualHelpers.ts`. Writing back to `localeStore` on settle is sufficient — the robot visual will update on next render automatically.
- **Canvas sizing:** use a `ResizeObserver` (or fixed intrinsic size) to keep the canvas pixel dimensions in sync with its CSS size. Avoid blurry rendering from mismatched `canvas.width`/`canvas.height` vs CSS.
- **Do not write to store on every `pointermove`** — only on `pointerup` (drag-settle). Local component state holds the in-progress ADSR during drag.

## Acceptance Criteria
- [ ] `ADSRCanvas` renders a bezier curve envelope shape for the selected robot's ADSR
- [ ] All four nodes are draggable within their constrained axes and ranges
- [ ] Drag hit targets are at least 44×44px per node
- [ ] Numeric readouts update live during drag with correct units
- [ ] On drag-settle: `localeStore.updateRobot` is called with the new ADSR
- [ ] On drag-settle: voice re-reservation fires; audible envelope change on next note
- [ ] ADSR change updates robot colour/greebles on next render
- [ ] Canvas re-reads ADSR when `robotId` prop changes
- [ ] No GSAP used anywhere in the component
- [ ] `computeADSRPath` is a pure function exported for unit testing
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback or visual rendering

## Source Reference
- File: `src/types/Robot.ts` (`ADSREnvelope`), `src/engine/AudioEngine.ts` (`reserveVoice`, `releaseVoice`), `src/stores/localeStore.ts` (`updateRobot`), `src/components/robot/robotVisualHelpers.ts`, `src/components/panels/screen/console/ADSRCanvas.tsx`
- Copilot instructions: "Visual Mapping: Robot visuals (shape/color) must map strictly to audio attributes (synth/ADSR/phase/detune) as defined in ROBOT_DESIGN.md."
- Copilot instructions: "GSAP timelines must only trigger semantic state changes, never call AudioEngine directly." (i.e. no GSAP here — Canvas 2D API only)
