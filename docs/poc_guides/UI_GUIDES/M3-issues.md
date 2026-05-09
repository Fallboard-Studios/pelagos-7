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
  - Action: copies current robot's `audioAttributes`, `melody`, and `rhythmicDensity`/`rhythmicMotifLength` to the selected target robot via `useLocaleStore.getState().updateRobot(localeId, targetId, ...)`
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
Build the `RobotAudioTab` content panel that renders inside `RobotEditorTab` when the Robot Audio sub-tab is active. It exposes per-robot audio behaviour controls: solo/mute/highlight, rhythmic density and motif length, octave range, and a melody regeneration action.

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
- [ ] **Motif Length Slider:**
  - Range: 1–16 (integer steps; measured in 16th-note subdivisions; max = `subdivisions`). Controls `robot.rhythmicMotifLength` (motif length in 16th units).
  - Reads `robot.rhythmicMotifLength`; on change: `useLocaleStore.getState().updateRobot(localeId, id, { rhythmicMotifLength: value })` then calls `regenerateMelody(robot)` to apply the change.
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
-- **`rhythmicDensity` and `rhythmicMotifLength`:** May have been introduced in a previous implementation of old Issue 11 (Synthesis Module A). If present on `Robot`, use them; if absent, add them here and update `Robot` interface, `spawnSystem`, and all test fixtures.
- **`audioMode`:** Solo = AudioEngine mutes all other robots; Mute = AudioEngine silences this robot; Highlight = visual-only trigger (no audio change). The AudioEngine integration for solo/mute can be deferred to a later issue if needed — store the flag now and document the deferral.
- **`regenerateMelody(robot)`:** (1) calls `generateMelodyForRobot({ eventCount: robot.rhythmicDensity })`; (2) calls `useLocaleStore.getState().updateRobot(localeId, id, { melody: newMelody })`; (3) calls `AudioEngine.registerRobotMelody(id, newMelody)`. Must run outside the Transport tick — `queueMicrotask` if needed.
- **Octave range fields:** `octaveMin` and `octaveMax` are new `Robot` fields — add to interface and `spawnSystem` (default 3 and 5). Melody generator must read these for octave assignment.

## Acceptance Criteria
- [ ] Renders inside the Robot Audio sub-tab of `RobotEditorTab`; empty state if no robot selected
- [ ] Solo/Mute/Highlight radio group reads/writes `robot.audioMode`
- [ ] Density slider (4–12) updates `robot.rhythmicDensity` and triggers melody regeneration
- [ ] Motif length control (1..subdivisions) updates `robot.rhythmicMotifLength` and triggers melody regeneration
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
## [M8.3-12.a] Add Robot Audio Fields & Spawn Defaults

## Feature Description
Add per-robot audio configuration fields required by `RobotAudioTab` and the melody system. New fields include `rhythmicDensity`, `rhythmicMotifLength`, `octaveMin`, `octaveMax`, and `audioMode`. Populate sensible defaults at spawn time so spawned robots are immediately usable by audio systems.

## Implementation Details
- [ ] Update `src/types/Robot.ts` to add fields with explicit types and short docs.
- [ ] Update `src/systems/spawnSystem.ts` and any factories to populate defaults (suggested defaults: `rhythmicDensity: 8`, `rhythmicMotifLength: 8`, `octaveMin: 3`, `octaveMax: 5`, `audioMode: 'none'`).
- [ ] Update test fixtures and any component mocks to include the new fields.
 - [ ] Add `noteVariance: number` (0..8) to `src/types/Robot.ts` and set default `0` in `src/systems/spawnSystem.ts`. When `0` the generator is unchanged; non-zero values constrain the unique notes used during melody generation.

## Technical Notes
- Keep values serialisable (Zustand-only state).
- Choose defaults conservatively to avoid extreme audible behaviour on first spawn.

## Acceptance Criteria
- [ ] `Robot` type exports the new fields.
- [ ] Spawned robots include the new fields with defaults.
- [ ] TypeScript compiles and existing tests updated where necessary.

## Source Reference
- `src/types/Robot.ts`, `src/systems/spawnSystem.ts`, test fixtures

---

## [M8.3-12.b] Add `AudioEngine.registerRobotMelody`

## Feature Description
Expose a stable API on `AudioEngine` to register or update a robot's melody so UI-driven regenerations take effect for playback scheduling.

## Implementation Details
- [ ] Add `registerRobotMelody(robotId: string, melody: Melody)` to `src/engine/AudioEngine.ts` with a clear docstring describing expected behaviour.
- [ ] Ensure the implementation updates the engine's internal melody/sequence registry so the next scheduled note uses the new melody.
- [ ] Add unit tests verifying registration replaces or appends melody state as expected.

## Technical Notes
- The method should be safe to call from the main thread; coordinate with transport scheduling but avoid directly mutating transport state inside a tick.

## Acceptance Criteria
- [ ] `AudioEngine.registerRobotMelody` exists and is covered by unit tests.
- [ ] Registering a melody results in playback using the new melody on subsequent scheduling.

## Source Reference
- `src/engine/AudioEngine.ts`, related test files

---

## [M8.3-12.c] Implement `RobotAudioTab` UI wiring

## Feature Description
Implement the `RobotAudioTab` UI and hook its controls to `localeStore` so users can edit density, motif length, octave range, and audio mode. Density or motif-length updates should trigger melody regeneration.

## Implementation Details
- [ ] Create `src/components/panels/screen/console/RobotAudioTab.tsx` and `RobotAudioTab.css`.
- [ ] Read `selectedRobotId` from `useUIStore` and the robot object from `useLocaleStore`.
- [ ] Wire sliders/radio controls to call `useLocaleStore.getState().updateRobot(localeId, id, { ... })`.
- [ ] On rhythmic density change call `regenerateMelody(robot)` via `queueMicrotask` to avoid running inside transport ticks.
- [ ] Ensure all controls meet 44×44px touch target and use design tokens.

## Technical Notes
- Use `queueMicrotask` (or `setTimeout(...,0)`) to schedule melody regeneration outside a Transport tick.

## Acceptance Criteria
- [ ] Controls update the store values live.
- [ ] Density change triggers the regeneration flow (calls into melody generator and `AudioEngine.registerRobotMelody`).

## Source Reference
- `src/components/panels/screen/console/RobotAudioTab.tsx`, `src/stores/localeStore.ts`, `src/engine/melodyGenerator.ts`, `src/engine/AudioEngine.ts`

---

## [M8.3-12.d] Regenerate melody & melodyGenerator updates

## Feature Description
Implement a safe melody regeneration flow that respects per-robot octave bounds and registers the new melody with `AudioEngine` so playback reflects UI changes immediately.

## Implementation Details
- [ ] Update `src/engine/melodyGenerator.ts` to accept `octaveMin`/`octaveMax` parameters and expose `generateMelodyForRobot({ eventCount, octaveMin, octaveMax, ...})`.
- [ ] Implement a helper `regenerateMelody(robot)` that: (1) calls the generator, (2) writes `melody` to `localeStore` via `updateRobot`, (3) calls `AudioEngine.registerRobotMelody(robotId, newMelody)`; run registration off the Transport tick.
- [ ] Add unit tests for generator behaviour and the helper.

### Rhythmic density & motif algorithm

- Definitions:
  - `rhythmicDensity: number` (integer, 4–12): number of onsets per loop/measure — higher values → denser steps and shorter average note durations. Default: `8`.
  - `rhythmicMotifLength: number` (integer, 1..subdivisions): length of the repeating motif measured in 16th-note subdivisions (e.g., 1..16 for a 4/4 measure with `subdivisions=16`). Lower values produce short motifs that repeat multiple times per measure; higher values produce longer motifs and fewer repeats. Default: `8` (half-measure in 4/4).

- High-level algorithm:
  - Use a fixed subdivision grid per measure (example: `subdivisions = 16` sixteenth units).
  - Let `M = clamp(rhythmicMotifLength, 1, subdivisions)` and compute `repeats = Math.floor(subdivisions / M)`.
  - If `repeats >= 2` (motif shorter than the measure):
    - Determine onsets-per-motif `K = Math.max(1, Math.round(rhythmicDensity / repeats))` and remainder `R = rhythmicDensity - (K * repeats)`. Distribute the `R` extra onsets by adding one extra onset to the first `R` repeats.
    - Generate a single motif of length `M` by choosing `K` unique grid positions inside the motif (seeded RNG recommended), then sort ascending.
    - Construct the measure by repeating the motif `repeats` times, offsetting each repetition by `repeatIndex * M` grid units.
    - Truncate any partial motif at the measure end — do not append incomplete repeats when `subdivisions` is not divisible by `M`.
  - Else (no meaningful repeats, `M == subdivisions` or `repeats < 2`):
    - Fall back to a non-repeating generation: choose `N = rhythmicDensity` unique grid positions across the full `subdivisions` grid.
  - After selecting onsets, optionally apply small micro-variations (syncopation shifts or merges) only if a separate variation parameter is enabled; motif repetition should remain the dominant structure when a motif is requested.
  - Compute durations as the difference to the next onset (last onset → measure end) and convert grid units to beats.
  - Map each event to a `noteIndex` (0..7) and an `octave` in `[octaveMin, octaveMax]`.
  - Return a serialisable Melody structure: events with `{ onsetBeats, durationBeats, noteIndex, octave, velocity }`.

- API / file targets:
  - `src/engine/melodyGenerator.ts`: add signature `generateMelodyForRobot(opts: { eventCount:number; rhythmicMotifLength:number; octaveMin:number; octaveMax:number; subdivisions?:number; measureBeats?:number; seed?:number }): Melody`.
  - `regenerateMelody(robot)`: generator → `useLocaleStore.getState().updateRobot(localeId, id, { melody: newMelody })` → `AudioEngine.registerRobotMelody(id, newMelody)`; schedule registration via `queueMicrotask` or `setTimeout(...,0)` to avoid Transport-tick side-effects.

- Tests (suggested):
  - Seeded tests: `eventCount=4` → roughly quarter-note onsets; `eventCount=8` → eighth-note onsets.
  - Short `rhythmicMotifLength` values (e.g., `1..4`) should produce repeating motifs across the measure; `rhythmicMotifLength == subdivisions` should produce non-repeating output.

- Scheduling notes:
  - Generator returns onset/duration in beats (or fraction of measure); `AudioEngine` must schedule relative to the Transport and robot loop boundary.
  - Keep melody data serialisable for storage in Zustand.

## Technical Notes
- Ensure melody generation obeys the constraint "note indices (0..7)" and maps to octaves using `octaveMin`/`octaveMax`.

## Acceptance Criteria
- [ ] `generateMelodyForRobot` supports octave range.
- [ ] `regenerateMelody` updates store and registers the melody with `AudioEngine`.

## Source Reference
- `src/engine/melodyGenerator.ts`, `src/stores/localeStore.ts`, `src/engine/AudioEngine.ts`

---

## [M8.3-12.e] Tests, fixtures & integration tests

## Feature Description
Add and update tests and fixtures to cover the new robot audio fields, melody generation, UI wiring and audio engine registration.

## Implementation Details
- [ ] Extend robot fixtures/factories to include new fields.
- [ ] Add unit tests for `generateMelodyForRobot` (octave range, eventCount mapping).
- [ ] Add an integration test that simulates a density change and asserts `AudioEngine.registerRobotMelody` is invoked and the store is updated.
- [ ] Run test suite and document any downstream fixes required.

## Technical Notes
- Keep tests deterministic: use seeded randomness for melody generation where applicable.

## Acceptance Criteria
- [ ] Tests added and passing locally/CI.
- [ ] Fixtures updated and referenced by tests.

## Source Reference
- `test/**`, related test files, fixtures

---

## [M8.3-12.f] Solo/Mute audio-mode enforcement (Medium)

## Feature Description
Define and implement the runtime behaviour for `robot.audioMode` (solo / mute / highlight) in the audio engine, or explicitly document a deferral strategy if enforcement will be implemented later.

## Implementation Details
- [ ] Implement simple enforcement in `src/engine/AudioEngine.ts`: `solo` mutes other robots, `mute` silences this robot, `highlight` reduces other robots' volume by 50% (applied at reservation/mix time to keep the selected robot prominent).
- [ ] Add unit tests for reservation/mix behaviour reflecting `audioMode` (including `highlight` volume attenuation).
- [ ] If enforcement is deferred, add documentation describing the expected behaviour and how UI will present the flag and note the deferral.

## Technical Notes
- Solo/mute/highlight policies should be applied at reservation or mix time and must be performant; consider maintaining a per-locale audioMode index for quick lookup.
- `highlight` is implemented as a -6dB (50%) attenuation applied to non-selected robots at mix or reservation time; ensure this is applied deterministically and is reversible when selection changes.

## Acceptance Criteria
- [ ] `AudioEngine` enforces `audioMode` for `solo`, `mute`, and `highlight` (or there is a clearly documented deferral).
- [ ] `highlight` reduces other robots' volume by ~50% when a robot is highlighted and restores levels when un-highlighted.
- [ ] Unit/integration tests cover reservation/mix behaviour for `audioMode`.

---

## [M8.3-12.g] Note Variance — Controlled note-set selection

## Feature Description
Add a `noteVariance` numeric field (0..8) to each `Robot`. When `0` (default) generation is unchanged. When >0, the robot will choose at most `noteVariance` unique note indices (0..7) when generating a melody; the generator must prefer selecting new unique notes until the unique set reaches `noteVariance`, after which all subsequent notes are chosen only from that set. If `noteVariance === 8`, no note should repeat until all eight have appeared once.

## Implementation Details
- [ ] Add `noteVariance: number` (0..8) to `src/types/Robot.ts` with documentation and ensure it is serialisable in state.
- [ ] Populate default `noteVariance: 0` in `src/systems/spawnSystem.ts` and update fixtures.
- [ ] Update `generateMelodyForRobot` in `src/engine/melodyGenerator.ts` to accept `noteVariance` and implement selection rules:
  - If `noteVariance === 0` → preserve existing selection behavior.
  - Else: while the current unique-note set size < `noteVariance`, prefer selecting notes not yet in the set (randomly); once reached, restrict all future note choices to the established set.
  - If `noteVariance === 8`, draw without replacement until all 8 notes have been used, then reshuffle if more events are required.
- [ ] Use a seeded RNG option for deterministic tests.
- [ ] Wire `regenerateMelody(robot)` to pass `robot.noteVariance` to the generator and continue to call `AudioEngine.registerRobotMelody` off the transport tick.
- [ ] Add a UI control in `RobotAudioTab` (M8.3-12.c) — slider or stepper range `0..8` — to let users edit `noteVariance` (implementation of the control may be a separate subtask).

## Technical Notes
- Clamp values to `[0,8]` when reading from store or UI.
- Store `noteVariance` in `localeStore` as part of `Robot` to keep it serialisable.
- Document the deterministic behavior for tests and note any deferred runtime audio enforcement.

## Acceptance Criteria
- [ ] `Robot` type exports `noteVariance`.
- [ ] Spawned robots include `noteVariance: 0` by default.
- [ ] `generateMelodyForRobot` respects `noteVariance` semantics (0=unchanged; 8=no repeats until all used; N=restrict after N unique notes chosen).
- [ ] Unit tests verify behavior deterministically (seeded RNG).
- [ ] `RobotAudioTab` includes a UI control to edit `noteVariance` (or a TODO referencing the UI task).

## Source Reference
- Files: `src/types/Robot.ts`, `src/systems/spawnSystem.ts`, `src/engine/melodyGenerator.ts`, `src/stores/localeStore.ts`, `src/components/panels/screen/console/RobotAudioTab.tsx`



## [M8.3-12.h] Link Robots — Parent → Child Inheritance

## Feature Description
Enable linking a robot (child) to another robot (parent) so the child inherits the parent's audio and compositional attributes live. The selected robot from the robot list is the child; the dropdown selects the parent. Links are locale-scoped and persisted via `linkedRobotId` on the child. Changes on the parent propagate to its children (transitively), subject to exclusions and cycle-avoidance rules.

## Implementation Details
- [ ] Add or reuse the `linkedRobotId: string | null` field on the `Robot` stored in `localeStore` (persisted state). The `Robot` type already contains `linkedRobotId`; ensure spawn/default fixtures include `null` where appropriate.
- [ ] UI: `RobotMetaTab` (or Link control) — parent selection dropdown restricted to robots in the same `localeId` (current locale). Provide an explicit `Link` action and an `Unlink` action, and display a visible linked indicator when a robot is linked.
- [ ] Confirmation: linking is reversible via `Unlink`, but linking should show a confirmation when creating the link if desired (UI detail).
- [ ] Inheritance semantics (live mirror): when a robot is linked, the child becomes a live mirror for the parent's inherited fields. The child should immediately reflect changes made to the parent for the inherited attributes.
  - Inherited fields: `audioAttributes` (use `layeredWave` / `waveform`, `adsr`, `phase`, `detune`, `visualAudioMap`), `masterVolume`, `rhythmicDensity`, `rhythmicMotifLength`, `octaveRange`, `noteVariance`, `audioMode`, and rhythmic structure (see melody rules below).
  - Explicit exclusions: never copy `id`/`robotId`, `name`, or `createdAt`. Do not copy event `noteIndex` values — only copy rhythmic structure (timing/durations). On melody inheritance, replace the child's event timings/lengths with the parent's (startStep/length); preserve the child's `noteIndex` values by mapping them positionally (cycle/truncate as needed) so the child keeps its pitch identity while adopting the parent's rhythm.
- [ ] Propagation / chaining: support transitive propagation (A→B→C). When a parent updates, apply updates to immediate children; children that are parents for others will in turn propagate updates. Implement update propagation with careful ordering to avoid redundant work and race conditions.
- [ ] Cycle prevention: prevent creating linking cycles in the UI and store APIs (reject link attempts that would introduce a cycle). Validate before setting `linkedRobotId`.
- [ ] Unlink behavior: when a child is unlinked, it should keep the last inherited values as its new standalone state (no automatic revert to a pre-link backup). Provide an explicit `Unlink` control in the UI.
- [ ] Parent deletion: when a parent is removed from the locale, children should be unlinked and keep the last inherited state.
- [ ] Implementation approach suggestion:
  - Record `linkedRobotId` on the child in `localeStore` via `updateRobot(localeId, childId, { linkedRobotId: parentId })` so it persists.
  - Implement a small propagation service (`linkPropagationSystem`) that subscribes to locale store changes and, when a robot with children changes any of the inherited fields, computes child updates and applies them via `updateRobot` (run synchronously off-Transport to avoid audio tick side-effects). Use a simple dependency graph traversal to propagate and detect cycles.
  - Melody rhythm handling: when updating child's melody timing, write a new melody array that uses the parent's startStep/length values but reuses child's `noteIndex` values aligned positionally (cycle if counts differ). After updating store, call `AudioEngine.unregisterRobotMelody(childId)` then `AudioEngine.registerRobotMelody(childId, newMelody)` and re-reserve voice (`releaseVoice` → `reserveVoice`) to apply audio attribute changes.
- [ ] Tests & validation: add unit tests for propagation, cycle prevention, parent deletion, and melody-rhythm mapping (ensure child's `noteIndex` preserved; rhythm replaced). Use seeded scenarios for determinism.

## Technical Notes
- Links are locale-scoped — cross-locale linking is forbidden and must be rejected by the UI/store.
- Persist `linkedRobotId` in `localeStore` so links survive reloads (session persistence noted; implement as store persistence to the app state). If session-layer undo/redo is added later, integrate with it — but do not rely on session features for initial implementation.
- Keep propagation idempotent: applying the same parent state twice should not cause different child state.
- For melody rhythm mapping, choose simple positional mapping: for i in 0..parentEvents-1, childEvent[i].startStep = parentEvent[i].startStep, childEvent[i].length = parentEvent[i].length; if child has fewer events than parent, cycle child noteIndices; if child has no melody, generate a minimal melody using parent's rhythm and the child's current `noteVariance`/octave settings.

## Acceptance Criteria
- [ ] `Robot` exposes `linkedRobotId` and links persist in `localeStore`.
- [ ] Linking UI present in `RobotMetaTab`, restricted to robots in current locale.
- [ ] Children live-mirror parent's inherited attributes (audioAttributes, masterVolume, rhythmic settings, rhythm structure), excluding `id`, `name`, `createdAt`, and `noteIndex` values.
- [ ] Transitive links propagate changes along chains; link cycles are prevented.
- [ ] Unlink leaves the child with the last inherited values as its new standalone state.
- [ ] Deleting a parent unlinks children and preserves last state.
- [ ] AudioEngine is updated (melody registration and voice reservation) when inherited attributes change.
- [ ] Unit tests cover propagation, cycle prevention, and melody-rhythm mapping.

## Source Reference
- Files: `src/stores/localeStore.ts`, `src/components/panels/screen/console/RobotMetaTab.tsx`, `src/engine/AudioEngine.ts`, `src/engine/melodyGenerator.ts`, `src/systems/spawnSystem.ts`, and a new `src/systems/linkPropagationSystem.ts` (suggested).

---

## [M8.3-12.c.1] RobotAudioTab: UI Layout & Controls

## Feature Description
Create the visible layout and controls for `RobotAudioTab`: radio group for audio mode, rhythmic density slider, motif-length slider, and dual-thumb octave range.

## Implementation Details
- [ ] Add `src/components/panels/screen/console/RobotAudioTab.tsx` and `RobotAudioTab.css` (layout only).
- [ ] Implement radio group (audio mode), density and motif sliders, and a dual-thumb octave range component; use Radix primitives for accessibility.
- [ ] Ensure all controls meet 44×44px touch targets and use design tokens.
- [ ] Controls write only to local component state or call `updateRobot` with normalized values; do not implement generator logic here.

## Acceptance Criteria
- [ ] Layout renders and is navigable by keyboard.
- [ ] Each control exists and exposes an onChange that updates the store value.

## Source Reference
- `src/components/panels/screen/console/RobotAudioTab.tsx`, `src/stores/localeStore.ts`, `src/stores/uiStore.ts`

---

## [M8.3-12.c.2] RobotAudioTab: Store Wiring & Regeneration Triggers

## Feature Description
Wire `RobotAudioTab` controls to `localeStore` and call the melody regeneration flow when rhythmic settings change.

## Implementation Details
- [ ] On control change call `useLocaleStore.getState().updateRobot(localeId, id, { <field>: value })`.
- [ ] For `rhythmicDensity` and `rhythmicMotifLength` changes, schedule `regenerateMelody(robot)` via `queueMicrotask` (avoid Transport-tick side-effects).
- [ ] Clamp and validate inputs at the store entry point.

## Acceptance Criteria
- [ ] Store receives validated updates from the UI.
- [ ] Density/motif changes invoke `regenerateMelody` off the transport tick.

## Source Reference
- `src/components/panels/screen/console/RobotAudioTab.tsx`, `src/stores/localeStore.ts`, `src/engine/melodyGenerator.ts`

---

## [M8.3-12.d.1] Melody Generator: API & Octave Support

## Feature Description
Add octave-range parameters to the melody generator API and expose `generateMelodyForRobot` signature used by regeneration flows.

## Implementation Details
- [ ] Update `src/engine/melodyGenerator.ts` to export `generateMelodyForRobot(opts)` with `octaveMin` and `octaveMax` args.
- [ ] Ensure output event shape remains serialisable: `{ onsetBeats, durationBeats, noteIndex, octave, velocity }`.
- [ ] Add unit tests asserting octave mapping and valid ranges.

## Acceptance Criteria
- [ ] Generator accepts octave bounds and returns events with `octave` within requested range.

## Source Reference
- `src/engine/melodyGenerator.ts`, related test files

---

## [M8.3-12.d.2] Melody Generator: Motif & Density Algorithm

## Feature Description
Implement the motif/repeat algorithm that produces repeating motifs when `rhythmicMotifLength` is shorter than the measure and distributes `rhythmicDensity` across repeats.

## Implementation Details
- [ ] Implement motif-based selection on a fixed subdivision grid (default 16 subdivisions).
- [ ] Support repeat-distribution logic described in the epic and deterministic seeded RNG for tests.
- [ ] Compute durations from onset differences and convert to beats.

## Acceptance Criteria
- [ ] Motif-based generation produces repeating motifs when `rhythmicMotifLength` < subdivisions.
- [ ] Deterministic behaviour in unit tests with seeded RNG.

## Source Reference
- `src/engine/melodyGenerator.ts`, related test files

---

## [M8.3-12.d.3] Melody Regeneration Helper & AudioEngine Integration

## Feature Description
Provide `regenerateMelody(robot)` helper that updates the store and registers the new melody with `AudioEngine` safely.

## Implementation Details
- [ ] Implement `regenerateMelody(robot)` to call the generator, update `localeStore`, then call `AudioEngine.registerRobotMelody(robotId, newMelody)` via `queueMicrotask`.
- [ ] Ensure helper avoids Transport-tick mutations and coordinates with voice reservation where necessary.
- [ ] Add integration tests that mock `AudioEngine.registerRobotMelody`.

## Acceptance Criteria
- [ ] Regeneration updates store and invokes `AudioEngine.registerRobotMelody` on the main thread (off-Transport tick).

## Source Reference
- `src/engine/melodyGenerator.ts`, `src/engine/AudioEngine.ts`, `src/stores/localeStore.ts`

---

## [M8.3-12.e.1] Tests: Generator Unit Tests & Fixtures

## Feature Description
Add deterministic unit tests for the melody generator covering octave mapping, density, motif repetition, and `noteVariance` hooks.

## Implementation Details
- [ ] Add fixtures and seeded RNG helpers for tests in related test files.
- [ ] Write tests for `eventCount` mapping and motif repetition behaviour.

## Acceptance Criteria
- [ ] Unit tests assert repeatable outputs given seeds and pass locally.

## Source Reference
- related test files, `test/**`

---

## [M8.3-12.e.2] Tests: Regeneration Integration (AudioEngine)

## Feature Description
Add an integration test that simulates a density change and verifies `AudioEngine.registerRobotMelody` is called and the store is updated.

## Implementation Details
- [ ] Mock `AudioEngine` in test environment and assert calls after `regenerateMelody`.
- [ ] Verify `localeStore` contains the new melody object.

## Acceptance Criteria
- [ ] Integration test confirms store update and `registerRobotMelody` invocation.

## Source Reference
- related test files, `vitest.config.ts`

---

## [M8.3-12.f.1] Audio Mode: Spec & UI Behavior

## Feature Description
Define UX and spec for `robot.audioMode` (none/solo/mute/highlight) to guide engine implementation and UI labels.

## Implementation Details
- [ ] Create a short spec document for `audioMode` semantics and UI labeling.
- [ ] Update relevant UI text in `RobotAudioTab` to match spec.

## Acceptance Criteria
- [ ] Spec exists and UI uses consistent labels for audio modes.

## Source Reference
- `docs/`, `src/components/panels/screen/console/RobotAudioTab.tsx`

---

## [M8.3-12.f.2] AudioEngine: Solo/Mute/Highlight Enforcement

## Feature Description
Implement enforcement of `robot.audioMode` within `AudioEngine` (or document deferral with clear UX notes).

## Implementation Details
- [ ] Implement simple policies at reservation or mix time: `solo` mutes others, `mute` silences robot, `highlight` attenuates others by ~6dB.
- [ ] Add unit tests for reservation/mix logic.

## Acceptance Criteria
- [ ] Engine applies audioMode policies or the repo documents an explicit deferral.

## Source Reference
- `src/engine/AudioEngine.ts`, related test files

---

## [M8.3-12.g.1] noteVariance: Types & Spawn Defaults

## Feature Description
Add `noteVariance` to `Robot` types and ensure spawn defaults include `noteVariance: 0`.

## Implementation Details
- [ ] Update `src/types/Robot.ts` and `src/systems/spawnSystem.ts` to include `noteVariance: number` and default `0`.
- [ ] Update fixtures and clamp values at store update entry points.

## Acceptance Criteria
- [ ] Type reflects `noteVariance` and new robots include `0` by default.

## Source Reference
- `src/types/Robot.ts`, `src/systems/spawnSystem.ts`, `src/stores/localeStore.ts`

---

## [M8.3-12.g.2] Generator: noteVariance Selection Mode

## Feature Description
Implement `noteVariance` semantics in the melody generator (prefer new notes until N unique chosen, then restrict selection to that set).

## Implementation Details
- [ ] Add `noteVariance` parameter support to `generateMelodyForRobot` and implement draw-without-replacement semantics for `8`.
- [ ] Ensure deterministic behaviour with seeded RNG and add unit tests.

## Acceptance Criteria
- [ ] Generator respects `noteVariance` semantics in tests.

## Source Reference
- `src/engine/melodyGenerator.ts`, related test files

---

## [M8.3-12.g.3] RobotAudioTab: NoteVariance Control

## Feature Description
Add a UI control (slider/stepper) to edit `noteVariance` and persist it to the store.

## Implementation Details
- [ ] Add a `0..8` control to `RobotAudioTab` and write updates via `updateRobot`.
- [ ] Clamp server-side and schedule regeneration when changed.

## Acceptance Criteria
- [ ] UI control updates `noteVariance` in store and triggers regeneration.

## Source Reference
- `src/components/panels/screen/console/RobotAudioTab.tsx`, `src/stores/localeStore.ts`

---

## [M8.3-12.h.1] Link Robots: Link UI & Persistence

## Feature Description
Add the parent-selection UI in `RobotMetaTab` and persist `linkedRobotId` on the child.

## Implementation Details
- [ ] Add dropdown in `RobotMetaTab` restricted to same-locale robots and `Link`/`Unlink` actions.
- [ ] Persist `linkedRobotId` via `updateRobot(localeId, childId, { linkedRobotId: parentId })`.

## Acceptance Criteria
- [ ] Linking UI is present and `linkedRobotId` persists in `localeStore`.

## Source Reference
- `src/components/panels/screen/console/RobotMetaTab.tsx`, `src/stores/localeStore.ts`

---

## [M8.3-12.h.2] Link Robots: Propagation Engine & Cycle Detection

## Feature Description
Implement `linkPropagationSystem` to subscribe to locale changes, propagate parent updates to children transitively, and prevent cycles.

## Implementation Details
- [ ] Implement a small service in `src/systems/linkPropagationSystem.ts` that computes child diffs and applies `updateRobot` calls.
- [ ] Validate link attempts to avoid cycles; reject in UI/store.

## Acceptance Criteria
- [ ] Propagation applies inherited fields to children and cycles are prevented.

## Source Reference
- `src/systems/linkPropagationSystem.ts`, `src/stores/localeStore.ts`

---

## [M8.3-12.h.3] Link Robots: Rhythm Mapping & AudioEngine Sync

## Feature Description
When inheriting melody rhythm from parent, map timings into child's melody while preserving child's `noteIndex` values and re-register child melody with `AudioEngine`.

## Implementation Details
- [ ] Implement positional mapping of `noteIndex` to parent's rhythm, cycling/truncating as needed.
- [ ] After store update call `AudioEngine.unregisterRobotMelody(childId)` (if present) then `AudioEngine.registerRobotMelody(childId, newMelody)` and re-reserve voice.

## Acceptance Criteria
- [ ] Child melodies adopt parent's rhythm; `noteIndex` preserved; audio engine updated.

## Source Reference
- `src/systems/linkPropagationSystem.ts`, `src/engine/AudioEngine.ts`

---

## [M8.3-12.h.4] Link Robots: Tests & Validation

## Feature Description
Add unit tests for propagation, cycle prevention, parent deletion, and rhythm mapping.

## Implementation Details
- [ ] Create deterministic unit scenarios for A→B→C propagation and cycle-attempt rejection.
- [ ] Test parent deletion unlinks children and preserves last inherited state.

## Acceptance Criteria
- [ ] Tests cover propagation, cycle prevention, and melody-rhythm mapping deterministically.

## Source Reference
- related test files, `src/systems/linkPropagationSystem.ts`

<!-- ============================================================ -->
<!-- ISSUE 13: Robot Oscillators Sub-Tab                          -->
<!-- ============================================================ -->


<!-- ============================================================ -->
<!-- ISSUE 13: Robot Oscillators Sub-Tab                          -->
<!-- ============================================================ -->

## [M8.3-13] Robot Oscillators Sub-Tab (split into sub-issues)

To reduce risk and make review/testing tractable, the Robot Oscillators epic is split into focused sub-issues (3-13a..3-13e). Implement and land these in order to avoid wide TypeScript and runtime churn.

### Sub-issues

## [M8.3-13.a] ~~Add `AudioAttributes` fields & spawn defaults~~ (completed — superseded by 13.0)

> **Status: completed.** `pulseWidth`, `phase`, and `detune` were added in this issue. The flat-layer refactor described in **13.0** below supersedes the shape introduced here; no further work needed against 13.a directly.

---

## [M8.3-13.b] ~~AudioEngine: voice re-reservation & melody registration~~ (completed — extended by 13.b.1)

> **Status: completed.** `registerRobotMelody`, `reReserveVoice`, and the `releaseVoice → reserveVoice` flow are implemented and tested. Issue **13.b.1** below adds the new `updateVoiceLayerParams` API required by the layer editor UI.

---

<!-- ============================================================ -->
<!-- ISSUE 13.0: Flatten AudioAttributes                         -->
<!-- ============================================================ -->

## [M8.3-13.0] Flatten `AudioAttributes` — replace scattered fields with `layers[]`

## Feature Description
`AudioAttributes` currently has two overlapping representations of the same oscillator data: flat top-level fields (`waveform`, `phase`, `detune`, `pulseWidth`) and a nested `visualAudioMap.layeredWave` used as the actual audio source by `AudioEngine`. This issue removes the duplication by introducing a canonical `layers: OscillatorLayer[]` array directly on `AudioAttributes`, capping layers at 4, and deleting the redundant flat fields and `layeredWave` nesting.

Depends on: **13.a**, **13.b** (both completed).
Must land before: **13.b.1**, **13.c.1–13.c.3**, **13.e.1**.

## Implementation Details
- [ ] In `src/types/layeredAudio.ts`:
  - Rename `LayerDescriptor` → `OscillatorLayer`; keep all existing fields (`type`, `gain`, `detune`, `phase`, `pulseWidth`, `adsr`); make `gain`, `detune`, and `phase` required (default values 1, 0, 0) instead of optional.
  - Remove `LayeredWave` interface entirely — it is replaced by `OscillatorLayer[]`.
  - Remove `layeredWave` from `VisualAudioMap`; keep `averagedADSR`, `averagedGain`, `shapeParams`, `layerVisuals`.
- [ ] In `src/types/Robot.ts`:
  - Add `layers: OscillatorLayer[]` to `AudioAttributes` — the canonical ordered list of oscillators for this robot; index 0 is the base oscillator.
  - Remove `waveform`, `phase`, `detune`, `pulseWidth`, `octaveRange` (deprecated), and `pitchRange` (deprecated) from `AudioAttributes`.
  - `AudioAttributes.adsr` and `AudioAttributes.filterFreq` stay — they are robot-level, not layer-level.
- [ ] In `src/systems/spawnSystem.ts`:
  - Change `MAX_LAYERS` constant from `5` to `4`.
  - Rewrite `generateAudioAttributes` to populate `audioAttributes.layers` directly (an array of `OscillatorLayer`) instead of building `layeredWave.layers` inside `visualAudioMap`.
  - Remove the intermediate `LayeredWave` construction. `visualAudioMap` still receives `averagedADSR`, `averagedGain`, `shapeParams`, and `layerVisuals` — only `layeredWave` is dropped.
- [ ] In `src/engine/AudioEngine.ts`:
  - Update `reserveVoice`, `reReserveVoice`, and `createCompositeVoice` to accept/read `OscillatorLayer[]` from `robot.audioAttributes.layers` instead of `LayeredWave`.
  - Remove all casts through `visualAudioMap?.layeredWave` in engine code.
- [ ] In `src/components/robot/robotVisualHelpers.ts` and `src/components/robot/RobotBody.tsx`:
  - Replace reads of `attrs.waveform` with `attrs.layers[0]?.type`.
  - Replace reads of `attrs.phase` / `attrs.detune` / `attrs.pulseWidth` with `attrs.layers[0]?.phase` / `detune` / `pulseWidth`.
- [ ] In `src/components/robot/robotVisualMapper.ts`: remove any reference to `visualAudioMap.layeredWave`.
- [ ] Add a one-time migration shim in `localeStore` hydration: when loading persisted state, if a robot's `audioAttributes.layers` is absent but `audioAttributes.visualAudioMap?.layeredWave` exists, copy `layeredWave.layers` into `audioAttributes.layers` so old saves are not silently broken.
- [ ] Run `tsc --noEmit` and fix all TypeScript errors before merging.

## Technical Notes
- `OscillatorLayer.gain` default value when adding a new layer: `1.0`. Detune: `0`. Phase: `0`.
- All visual derivation that previously read `layeredWave.base` should now read `layers[0].type`.
- The `VisualAudioMap.layerVisuals` array aligns by index with `layers[]`.
- Keep all fields in `OscillatorLayer` as plain numbers/strings — no Tone.js types in state.

## Acceptance Criteria
- [ ] `AudioAttributes` exports `layers: OscillatorLayer[]`; the flat oscillator fields (`waveform`, `phase`, `detune`, `pulseWidth`) and deprecated fields (`octaveRange`, `pitchRange`) are removed.
- [ ] `OscillatorLayer` is exported from `src/types/layeredAudio.ts`; `LayeredWave` is deleted.
- [ ] `MAX_LAYERS = 4` in `spawnSystem`.
- [ ] `AudioEngine` reads `audioAttributes.layers` without casting through `visualAudioMap`.
- [ ] Migration shim runs on hydration and preserves existing saved robots.
- [ ] `tsc --noEmit` passes with zero errors.
- [ ] App spawns robots and audio plays correctly after the refactor.

## Source Reference
- Files: `src/types/Robot.ts`, `src/types/layeredAudio.ts`, `src/systems/spawnSystem.ts`, `src/engine/AudioEngine.ts`, `src/components/robot/robotVisualHelpers.ts`, `src/components/robot/RobotBody.tsx`, `src/components/robot/robotVisualMapper.ts`, `src/stores/localeStore.ts`

---

<!-- ============================================================ -->
<!-- ISSUE 13.b.1: AudioEngine — updateVoiceLayerParams           -->
<!-- ============================================================ -->

## [M8.3-13.b.1] AudioEngine: add `updateVoiceLayerParams` for instant continuous-param updates

## Feature Description
Add a new `AudioEngine.updateVoiceLayerParams` method that applies updated oscillator layer parameters to the live `CompositeVoice` without tearing down and rebuilding the audio graph. This is the instant update path used by the layer editor UI for continuous-param changes (detune, phase, gain, pulseWidth). Waveform type changes and structural changes (add/delete layer) still use `reReserveVoice`.

Depends on: **13.0** (flat `layers[]` shape must exist).

## Implementation Details
- [ ] Add `AudioEngine.updateVoiceLayerParams(robotId: string, layers: OscillatorLayer[]): void` to `src/engine/AudioEngine.ts`.
  - Looks up the reserved `CompositeVoice` for `robotId` in `compositeVoices`.
  - Calls `composite.set({ layers })` with the full updated layer array.
  - Silently no-ops (with a `DEV_TUNING` warning) if no voice is reserved for the robot.
- [ ] Document the two-tier update rule in a JSDoc comment on the method:
  - **Continuous params** (`gain`, `detune`, `phase`, `pulseWidth`): use `updateVoiceLayerParams` — instant, no gap in audio.
  - **Structural changes** (`type` / waveform, add layer, delete layer): use `reReserveVoice` — brief silence while the node graph is rebuilt.
- [ ] Add unit tests verifying that `composite.set` is called with the supplied layers array and that the method no-ops gracefully when no voice is reserved.

## Technical Notes
- Pass the **full** `layers[]` array, not a delta — `composite.set` replaces the entire layer configuration.
- Do not call this inside a Transport tick; it is safe to call from UI event handlers (pointerup, commit on blur).

## Acceptance Criteria
- [ ] `AudioEngine.updateVoiceLayerParams` exists and is exported/accessible on the `AudioEngine` object.
- [ ] Unit tests confirm `composite.set` is invoked with the correct payload.
- [ ] No-op path tested (no voice reserved → no throw).

## Source Reference
- Files: `src/engine/AudioEngine.ts`, `src/engine/AudioEngine.test.ts`

---

<!-- ============================================================ -->
<!-- ISSUE 13.c.1: RobotOscillatorsTab — shell & empty state      -->
<!-- ============================================================ -->

## [M8.3-13.c.1] `RobotOscillatorsTab`: shell, empty state & store reads

## Feature Description
Create the `RobotOscillatorsTab` component file with its empty-state handling and store subscriptions. No controls yet — just the scaffold that the later sub-issues build on.

Depends on: **13.0** (flat `layers[]` shape), **Issue 10** (editor shell must mount this tab).

## Implementation Details
- [ ] Create `src/components/panels/screen/console/RobotOscillatorsTab.tsx` and `RobotOscillatorsTab.css`.
- [ ] Read `selectedRobotId` from `useUIStore((s) => s.selectedRobotId)`.
- [ ] Read `localeId` via `usePlanetStore((s) => s.planets[0]?.currentLocaleId ?? '')`; read the robot from `useLocaleStore` using `selectedRobotId` and `localeId`; derive `layers` as `robot.audioAttributes.layers ?? []`.
- [ ] If `selectedRobotId` is null or the robot is not found, render a descriptive empty state message.
- [ ] Render a placeholder `<ul>` layer list and a disabled `Add Layer` button with `TODO` comment — wired up in later issues.
- [ ] Reserve a mount-point for the envelope editor at the bottom of the tab. **Do not import or render `RobotEnvelopeEditor` here** — that component does not exist until Issue 14 lands. Leave a comment `{/* TODO Issue 14: <RobotEnvelopeEditor robotId={selectedRobotId} localeId={localeId} /> */}` so the wiring location is clear and TypeScript does not error.
- [ ] Ensure the component is imported and rendered in `RobotEditorTab` when the Robot Oscillators sub-tab is active.
- [ ] All touch targets >= 44×44px; use design tokens from Issue 1.

## Acceptance Criteria
- [ ] Tab renders without errors when a robot is selected and when none is selected.
- [ ] `layers` array is correctly derived from `robot.audioAttributes.layers`.
- [ ] `localeId` is read from `usePlanetStore`, not from a helper that does not exist.
- [ ] The envelope editor mount-point comment is present; no import of `RobotEnvelopeEditor` (avoids TypeScript error before Issue 14 merges).
- [ ] TypeScript compiles with no errors.

## Source Reference
- Files: `src/components/panels/screen/console/RobotOscillatorsTab.tsx`, `src/components/panels/screen/console/RobotEditorTab.tsx`

---

<!-- ============================================================ -->
<!-- ISSUE 13.c.2: RobotOscillatorsTab — layer list rows          -->
<!-- ============================================================ -->

## [M8.3-13.c.2] `RobotOscillatorsTab`: render layer list rows (read-only display)

## Feature Description
Render each oscillator layer in `robot.audioAttributes.layers` as a distinct row in the tab. Rows display the layer's current attribute values as read-only labels — interactive controls are wired in the next issue.

Depends on: **13.c.1**.

## Implementation Details
- [ ] For each `OscillatorLayer` in `layers`, render a collapsible/expandable row (native `<details>` or a simple toggle is fine).
- [ ] Row header: `Layer {index + 1} — {layer.type}` (e.g. `Layer 1 — sine`).
- [ ] Expanded content shows current values as labelled read-only text: `Type`, `Gain`, `Detune (cents)`, `Phase (°)`, and `Pulse Width` (only when `type === 'pulse' || type === 'square'`).
- [ ] **Per-layer ADSR (read-only display):** each expanded row also shows a collapsible A/D/S/R section labelled `Envelope Override`. Display current values from `layer.adsr` if present, or the text `Inherits master` when `layer.adsr` is absent/undefined. No interactive controls yet — stub as read-only text marked `TODO`.
- [ ] Layer count badge in the section header (e.g. `Oscillators (2)`).
- [ ] No interactions yet — all inputs/buttons are stubs marked `TODO` or omitted.
- [ ] Use design tokens for row styling; rows must be visually distinct.

## Technical Notes
- `OscillatorLayer.adsr?: ADSTRaw` is the optional per-layer override; when absent the engine falls back to `audioAttributes.adsr` (robot-level master). Always display the fallback label — never infer or synthesise values from the master.

## Acceptance Criteria
- [ ] Each layer renders a distinct labelled row.
- [ ] `pulseWidth` row only appears for pulse/square layers.
- [ ] Each expanded row shows an `Envelope Override` section; displays `layer.adsr` values when present or `Inherits master` when absent.
- [ ] Layer count badge is correct.

## Source Reference
- Files: `src/components/panels/screen/console/RobotOscillatorsTab.tsx`, `src/components/panels/screen/console/RobotOscillatorsTab.css`

---

<!-- ============================================================ -->
<!-- ISSUE 13.c.3: RobotOscillatorsTab — interactive layer controls -->
<!-- ============================================================ -->

## [M8.3-13.c.3] `RobotOscillatorsTab`: wire interactive controls per layer

## Feature Description
Replace the read-only layer row labels with interactive controls (waveform dropdown, steppers/sliders for gain/detune/phase/pulseWidth) and connect them to `localeStore` and `AudioEngine` using the two-tier update rule.

Depends on: **13.c.2**, **13.b.1** (`updateVoiceLayerParams` must exist).

## Implementation Details
- [ ] **Waveform dropdown** (`@radix-ui/react-select`): bound to `layer.type`; on change calls `updateRobot` with the full updated `audioAttributes` (read-modify-write: replace the layer at its index), then calls `AudioEngine.reReserveVoice(robotId)` — structural change, brief audio gap expected.
- [ ] **Gain stepper** (numeric input or slider, range 0–2, step 0.05): commits on `pointerup`/blur; calls `updateRobot` then `AudioEngine.updateVoiceLayerParams(robotId, updatedLayers)` — instant.
- [ ] **Detune stepper** (range −100–100 cents, integer steps): same commit pattern as gain.
- [ ] **Phase stepper** (range 0–360°, integer steps): same commit pattern.
- [ ] **Pulse Width stepper** (range 0–1, step 0.01, conditional): same commit pattern; only rendered when `type === 'pulse' || type === 'square'`.
- [ ] **Per-layer ADSR steppers** (collapsible section, labelled `Envelope Override`):
  - Four numeric steppers for A (0.001–4.0 s), D (0.001–4.0 s), S (0.0–1.0), R (0.001–8.0 s).
  - When `layer.adsr` is absent, render a `Use master` toggle (off by default = inherit). Enabling the toggle initialises `layer.adsr` by copying the current `audioAttributes.adsr` values as a starting point.
  - When `layer.adsr` is present, each stepper edits its value; a `Reset to master` button removes the override (`layer.adsr = undefined`) and falls back to the robot-level envelope.
  - Steppers commit on `blur`/Enter; call `updateRobot` with the full updated `audioAttributes` (same deep-merge pattern as other layer params), then call `AudioEngine.reReserveVoice(robotId)` — ADSR is a structural param, brief audio gap is acceptable.
- [ ] All controls commit on `pointerup` or `blur`; do not write to store on every `pointermove` or each key repeat.
- [ ] All touch targets >= 44×44px.
- [ ] `updateRobot` calls must pass the full `audioAttributes` object — `layers` is a nested array and `updateRobot`'s shallow merge will not deep-patch it. Pattern: `{ ...robot.audioAttributes, layers: updatedLayers }`.

## Technical Notes
- Two-tier rule (must be documented in a code comment near the handlers):
  - **Continuous params** (`gain`, `detune`, `phase`, `pulseWidth`): `updateRobot` + `AudioEngine.updateVoiceLayerParams` → instant
  - **Structural** (`type`, add layer, delete layer, ADSR override add/edit/reset): `updateRobot` + `AudioEngine.reReserveVoice` → brief silence
- Per-layer ADSR (`layer.adsr`) is an optional override; the engine falls back to `audioAttributes.adsr` when absent. Never write a default-value ADSR to `layer.adsr` automatically — only write when the user explicitly enables the override.

## Acceptance Criteria
- [ ] Each control updates the correct field in `localeStore` on commit.
- [ ] Gain/detune/phase/pulseWidth changes are audible within the current note (no gap).
- [ ] Waveform type changes trigger `reReserveVoice`; brief audio gap is acceptable.
- [ ] Per-layer ADSR override can be enabled, edited, and reset to master via the `Envelope Override` section.
- [ ] ADSR override add/edit/reset triggers `reReserveVoice`; no store write when `layer.adsr` remains absent.
- [ ] No store writes on every pointer/key event.

## Source Reference
- Files: `src/components/panels/screen/console/RobotOscillatorsTab.tsx`, `src/stores/localeStore.ts`, `src/engine/AudioEngine.ts`

---

<!-- ============================================================ -->
<!-- ISSUE 13.c.4: RobotOscillatorsTab — Add Layer & Delete Layer -->
<!-- ============================================================ -->

## [M8.3-13.c.4] `RobotOscillatorsTab`: Add Layer and Delete Layer actions

## Feature Description
Add the `Add Layer` button (below the layer list) and a `Delete Layer` button on each row, both wired to update `localeStore` and trigger voice re-reservation.

Depends on: **13.c.3**.

## Implementation Details
- [ ] **Add Layer button** (below the layer list):
  - Deep-clones the last `OscillatorLayer` in `layers`; if `layers` is empty, clones `{ type: 'sine', gain: 1, detune: 0, phase: 0 }`.
  - **Delete `adsr` from the clone** before appending — new layers must inherit the robot-level master envelope, not carry over a per-layer override from the source layer.
  - Appends the clone to `layers`, calls `updateRobot` with the full updated `audioAttributes`, then calls `AudioEngine.reReserveVoice(robotId)`.
  - Disabled and visually distinct when `layers.length >= 4` (enforces `MAX_LAYERS`).
  - Touch target >= 44×44px.
- [ ] **Delete Layer button** (per row, rendered inside each layer row):
  - Guarded by `@radix-ui/react-alert-dialog`: `"Delete this oscillator layer? This cannot be undone."` with Confirm / Cancel.
  - On confirm: removes the layer at its index from `layers`, calls `updateRobot` with the full updated `audioAttributes`, then calls `AudioEngine.reReserveVoice(robotId)`.
  - Disabled when `layers.length <= 1` (minimum one layer must remain); show a tooltip explaining why.
  - Touch target >= 44×44px.

## Technical Notes
- Both actions are structural changes — they must use `reReserveVoice`, not `updateVoiceLayerParams`.
- Do not mutate the `layers` array in place; always produce a new array for the store update.

## Acceptance Criteria
- [ ] Add Layer clones the last layer and appends it; button is disabled at 4 layers.
- [ ] Cloned layer has no `adsr` property (inherits master).
- [ ] Delete Layer removes the target layer after confirmation; button is disabled at 1 layer.
- [ ] Both actions trigger `reReserveVoice` and the store is updated correctly.
- [ ] AlertDialog fires for delete; cancel leaves the layer intact.

## Source Reference
- Files: `src/components/panels/screen/console/RobotOscillatorsTab.tsx`, `src/stores/localeStore.ts`, `src/engine/AudioEngine.ts`

---

<!-- ============================================================ -->
<!-- ISSUE 13.d: Oscillator presets                               -->
<!-- ============================================================ -->

## [M8.3-13.d] Oscillator presets — load & apply

## Feature Description
Add a preset selector to `RobotOscillatorsTab` that lets the user load a named oscillator preset (a predefined `OscillatorLayer[]` configuration) onto the current robot, with a destructive-action confirmation.

Depends on: **13.c.4** (layer list and actions must exist).

## Implementation Details
- [ ] Define a small serialisable presets registry at `src/constants/oscillatorPresets.ts`: an array of `{ name: string; layers: OscillatorLayer[] }` objects with 4–6 curated presets (e.g. `Warm Pad`, `Bright Lead`, `Bass Sub`, `Noisy Texture`).
- [ ] Add a preset `Select` dropdown (`@radix-ui/react-select`) at the top of the tab; lists preset names.
- [ ] Add a `Load Preset` button next to the dropdown; disabled when no preset is selected.
- [ ] On `Load Preset`: open an `@radix-ui/react-alert-dialog` — `"Load preset? This will replace all current oscillator layers."` with Confirm / Cancel.
- [ ] On confirm: replace `robot.audioAttributes.layers` with the preset's `layers` (deep copy), call `updateRobot` with the full updated `audioAttributes`, then call `AudioEngine.reReserveVoice(robotId)`.
- [ ] The layer list rerenders to show the new layers immediately.

## Technical Notes
- Presets are static compile-time constants — no runtime fetch needed. Keep them serialisable (no functions).
- `OscillatorLayer[]` from a preset must be a deep copy to avoid aliasing the preset array.
- **Preset layers must not include `adsr` overrides.** All preset `OscillatorLayer` objects should omit the `adsr` field so the robot-level master envelope applies unchanged after a preset load. If a curated preset genuinely needs an envelope shape, document the intent explicitly and let the user adjust it via the envelope editor (Issue 14).

## Acceptance Criteria
- [ ] Preset dropdown lists all named presets from the registry.
- [ ] `Load Preset` is disabled until a preset is chosen.
- [ ] AlertDialog fires; confirm loads the preset layers; cancel does nothing.
- [ ] After load: layer list reflects the preset's layers, audio changes via `reReserveVoice`.
- [ ] TypeScript compiles; no errors.

## Source Reference
- Files: `src/components/panels/screen/console/RobotOscillatorsTab.tsx`, `src/constants/oscillatorPresets.ts`, `src/stores/localeStore.ts`, `src/engine/AudioEngine.ts`

---

<!-- ============================================================ -->
<!-- ISSUE 13.e.1: Update fixtures for flat layers shape          -->
<!-- ============================================================ -->

## [M8.3-13.e.1] Update test fixtures for flat `OscillatorLayer[]` shape

## Feature Description
After the [M8.3-13.0] refactor, all test fixtures that construct `AudioAttributes` or `Robot` objects need updating to use `layers: OscillatorLayer[]` instead of the old `visualAudioMap.layeredWave` / flat-field shape.

Depends on: **13.0**.

## Implementation Details
- [ ] Audit all test files and fixture helpers for `AudioAttributes` construction or inline robot objects.
- [ ] Replace `{ waveform, phase, detune, pulseWidth, visualAudioMap: { layeredWave: ... } }` patterns with `{ layers: [...], adsr, filterFreq, visualAudioMap: { averagedADSR, ... } }`.
- [ ] Remove `LayeredWave` imports from test files.
- [ ] Add a unit test for the **hydration migration shim** (13.0): given a robot whose persisted state has `audioAttributes.visualAudioMap.layeredWave` but no `audioAttributes.layers`, assert the shim copies the layers and the resulting object is valid.
- [ ] Add unit tests for **`computeADSRSVGPath`** (Issue 14): given known A/D/S/R values, assert the returned `d` string starts at the correct origin, reaches the peak at the expected x-fraction, and ends at zero. Tests should not require a DOM or SVG renderer — the function is pure.
- [ ] Run the full test suite (`npm test`) and fix any failures caused by type or shape mismatches.

## Acceptance Criteria
- [ ] All tests compile and pass with no type errors after the fixture updates.
- [ ] No fixture file still references `LayeredWave` or the old flat oscillator fields.
- [ ] Migration shim test passes, covering the old-save → new-shape conversion.
- [ ] `computeADSRSVGPath` has at least two deterministic unit test cases.

## Source Reference
- Files: `src/engine/AudioEngine.test.ts`, any other test fixtures referencing `AudioAttributes`

---

<!-- ============================================================ -->
<!-- ISSUE 13.e.2: Unit tests for updateVoiceLayerParams          -->
<!-- ============================================================ -->

## [M8.3-13.e.2] Unit tests: `updateVoiceLayerParams` & two-tier update path

## Feature Description
Verify the two-tier audio update behaviour introduced in **13.b.1** and **13.c.3**: continuous-param changes call `composite.set` (instant), structural changes call `reReserveVoice` (re-reservation). Adds focused unit tests without requiring a running audio context.

Depends on: **13.b.1**, **13.e.1**.

## Implementation Details
- [ ] Mock `compositeVoices` map (or inject a fake voice) and verify `AudioEngine.updateVoiceLayerParams` calls `composite.set` with the expected `layers` payload.
- [ ] Verify `updateVoiceLayerParams` no-ops (does not throw) when no voice is reserved for the given `robotId`.
- [ ] Add a test that simulates a gain change on a layer: calls `updateVoiceLayerParams` and asserts `composite.set` was called; assert `releaseVoice` was NOT called.
- [ ] Add a test that simulates a waveform change: calls `reReserveVoice` and asserts both `releaseVoice` and `reserveVoice` are called.

## Acceptance Criteria
- [ ] Tests pass locally and in CI.
- [ ] Coverage added for `updateVoiceLayerParams` method.
- [ ] No real audio context needed (all Tone.js calls are mocked).

## Source Reference
- Files: `src/engine/AudioEngine.test.ts`

---

<!-- ============================================================ -->
<!-- ISSUE 13.e.3: Integration test — layer edit → audio update  -->
<!-- ============================================================ -->

## [M8.3-13.e.3] Integration test: layer control edit updates store and audio engine

## Feature Description
Add a focused integration test that simulates a user editing a layer's `detune` value through the `RobotOscillatorsTab` flow and asserts both the `localeStore` state and `AudioEngine` are updated correctly.

Depends on: **13.c.3**, **13.e.1**.

## Implementation Details
- [ ] Mock `AudioEngine.updateVoiceLayerParams` and `AudioEngine.reReserveVoice`.
- [ ] Simulate a `detune` stepper commit event on layer 0; assert `localeStore.updateRobot` was called with the updated `layers` payload and `AudioEngine.updateVoiceLayerParams` was called (not `reReserveVoice`).
- [ ] Simulate a `waveform` dropdown change on layer 0; assert `localeStore.updateRobot` was called and `AudioEngine.reReserveVoice` was called (not `updateVoiceLayerParams`).
- [ ] Keep tests deterministic; use a seeded robot fixture from **13.e.1**.

## Acceptance Criteria
- [ ] Both test scenarios pass.
- [ ] The two-tier rule is verified at the integration level.

## Source Reference
- Files: related test files, `src/components/panels/screen/console/RobotOscillatorsTab.tsx`

---

Note: the ADSR envelope editor remains Issue 14; `RobotOscillatorsTab` mounts `<RobotEnvelopeEditor robotId={selectedRobotId} localeId={localeId} />` as a placeholder and relies on Issue 14's contract for ADSR read/write on slider commit.

---

<!-- ============================================================ -->
<!-- ISSUE 14: Robot Envelope Editor (split into sub-issues)     -->
<!-- ============================================================ -->

## [M8.3-14] `RobotEnvelopeEditor` — Radix Sliders + Reactive SVG Preview (split into sub-issues)

To reduce review scope and allow incremental integration, the envelope editor epic is split into focused sub-issues (14.a–14.c). Implement and land these in order.

### Sub-issues

---

<!-- ============================================================ -->
<!-- ISSUE 14.a: Component shell + computeADSRSVGPath + static   -->
<!--             SVG preview (read-only, no sliders)             -->
<!-- ============================================================ -->

## [M8.3-14.a] `RobotEnvelopeEditor`: component shell, `computeADSRSVGPath` helper & static SVG preview

## Feature Description
Create the `RobotEnvelopeEditor` component file and CSS, implement the pure `computeADSRSVGPath` helper, and render a **read-only** static SVG preview of the current robot's `audioAttributes.adsr`. No interactive controls yet — this is the foundation the later sub-issues build on.

Depends on: **13.c.1** (oscillators tab shell must exist to receive the future import).

## Implementation Details
- [ ] Create `src/components/panels/screen/console/RobotEnvelopeEditor.tsx` and `RobotEnvelopeEditor.css`.
- [ ] Props: `{ robotId: string; localeId: string }` — reads `robot.audioAttributes.adsr` from `useLocaleStore`; does not accept ADSR as a prop (avoids stale closure issues).
- [ ] Read `localeId` and `selectedRobotId` via store hooks (same pattern as 13.c.1: `usePlanetStore` for `localeId`, `useLocaleStore` for the robot). Derive `adsr = robot.audioAttributes.adsr`.
- [ ] Implement and **export** `computeADSRSVGPath(adsr: ADSREnvelope, width: number, height: number): string`:
  - Pure function — no DOM access, no side effects; takes the ADSR values and canvas dimensions, returns a `d` attribute string.
  - Shape: `M 0,H → A-peak at (aFrac * width, 0) → D-to-sustain at ((aFrac + dFrac) * width, sustainY) → S-level plateau to ((aFrac + dFrac + sFrac) * width, sustainY) → R-to-zero at (width, height)`.
  - Use a fixed `SUSTAIN_DISPLAY_WIDTH` fraction (`0.25` of total SVG width) for the plateau segment so it is always visible.
  - Clamp all time fractions so the path never overflows the SVG viewport.
- [ ] Render a read-only `<svg>` using the current store `adsr` values passed through `computeADSRSVGPath`. Mark `aria-hidden="true"`.
- [ ] No sliders, no draft state, no store writes in this issue.
- [ ] Use design tokens for all colours, fonts, and spacing.
- [ ] TypeScript must compile with no errors.

## Technical Notes
- `computeADSRSVGPath` must be a pure exported function so it can be unit-tested without a DOM or SVG renderer (see 13.e.1).
- The time fractions for A, D, and R should be computed relative to the total displayed time budget (e.g. `totalTime = A + D + sustainDuration + R`); sustain duration uses `SUSTAIN_DISPLAY_WIDTH * width` as a fixed pixel allocation, not a time value.

## Acceptance Criteria
- [ ] `RobotEnvelopeEditor.tsx` and `RobotEnvelopeEditor.css` created.
- [ ] `computeADSRSVGPath` is exported and covered by at least two deterministic unit tests (see 13.e.1).
- [ ] Static SVG preview renders the current robot's `adsr` shape without errors.
- [ ] No sliders or draft state present in this issue.
- [ ] TypeScript compiles with no errors.

## Source Reference
- Files: `src/components/panels/screen/console/RobotEnvelopeEditor.tsx`, `src/types/Robot.ts` (`ADSREnvelope`), `src/stores/localeStore.ts`, `src/stores/uiStore.ts`

---

<!-- ============================================================ -->
<!-- ISSUE 14.b: Four Radix sliders + draft state + live SVG     -->
<!-- ============================================================ -->

## [M8.3-14.b] `RobotEnvelopeEditor`: four Radix sliders, draft state & live SVG update

## Feature Description
Add the four accessible `@radix-ui/react-slider` controls (Attack, Decay, Sustain, Release) with local draft state. The SVG preview updates live on `onValueChange`. No store writes yet — commit path is wired in 14.c.

Depends on: **14.a**.

## Implementation Details
- [ ] Add `useState` (or `useRef`) draft state initialised from `robot.audioAttributes.adsr` on mount.
- [ ] **Four Radix Slider controls** (`@radix-ui/react-slider` → `Slider.Root` + `Slider.Track` + `Slider.Range` + `Slider.Thumb`):
  - **Attack** (A): range 0.001–4.0 s, step 0.001, labelled `Attack`
  - **Decay** (D): range 0.001–4.0 s, step 0.001, labelled `Decay`
  - **Sustain** (S): range 0.0–1.0, step 0.01, labelled `Sustain`
  - **Release** (R): range 0.001–8.0 s, step 0.001, labelled `Release`
  - Each slider thumb meets minimum 44×44px touch target (enforce via CSS).
  - Display current draft value as a live numeric readout beneath each slider (e.g. `0.12 s`, `63 %`).
- [ ] On `onValueChange`: update draft state; recompute and update the SVG `<path>` `d` attribute via `computeADSRSVGPath` — **no store write on every move**.
- [ ] `onValueCommit` handlers exist as stubs (no-ops) — wired in 14.c.
- [ ] No architecture violations; no GSAP; no `<canvas>`.
- [ ] All controls keyboard-navigable (Radix Slider handles arrow keys natively).
- [ ] TypeScript compiles with no errors.

## Technical Notes
- **`onValueChange` vs `onValueCommit`:** update local draft (and SVG) on `onValueChange`; store writes happen only in `onValueCommit` (14.c). This avoids flooding the store with intermediate values.
- Use the `computeADSRSVGPath` helper from 14.a for all path recomputation — do not duplicate the path logic.

## Acceptance Criteria
- [ ] Four Radix Slider controls render with correct ranges and labels.
- [ ] SVG preview updates live as sliders move (no store write on move).
- [ ] Numeric readouts update live beneath each slider with correct units (`s` / `%`).
- [ ] All four slider thumbs are keyboard-navigable (arrow keys).
- [ ] All slider thumbs meet 44×44px touch target minimum.
- [ ] No store writes occur during slider movement.
- [ ] TypeScript compiles with no errors.

## Source Reference
- Files: `src/components/panels/screen/console/RobotEnvelopeEditor.tsx`, `src/components/panels/screen/console/RobotEnvelopeEditor.css`

---

<!-- ============================================================ -->
<!-- ISSUE 14.c: onValueCommit → store + reReserveVoice +        -->
<!--             visualAudioMap recompute + robotId reset         -->
<!-- ============================================================ -->

## [M8.3-14.c] `RobotEnvelopeEditor`: commit path — store write, `reReserveVoice`, `visualAudioMap` recompute & `robotId` reset

## Feature Description
Wire the `onValueCommit` handlers to write the final ADSR value to `localeStore` (including a `visualAudioMap` recomputation in the same payload), call `AudioEngine.reReserveVoice`, and reset draft state when `robotId` changes. This is the issue that makes the `TODO` comment in 13.c.1 become a real import.

Depends on: **14.b**, **13.b.1** (`reReserveVoice` must exist).

## Implementation Details
- [ ] **On `onValueCommit`** (slider mouse-up / keyboard end):
  - Build the updated `adsr` object from draft state.
  - Call the relevant helper (e.g. `deriveVisualAudioMap(robot.audioAttributes)`) with the new `adsr` to recompute `visualAudioMap.averagedADSR` and `visualAudioMap.averagedGain`.
  - Call `useLocaleStore.getState().updateRobot(localeId, robotId, { audioAttributes: { ...robot.audioAttributes, adsr: draftAdsr, visualAudioMap: recomputedVisualAudioMap } })` — single `updateRobot` call; document which helper owns the derivation.
  - Call `AudioEngine.reReserveVoice(robotId)` — envelope is a structural param; brief audio gap is acceptable.
- [ ] **On `robotId` change** (`useEffect` on `robotId`): reset draft state from the new robot's `adsr` in the store; do not carry over a previous robot's in-progress edits.
- [ ] **Integration with 13.c.1:** replace the `{/* TODO Issue 14: <RobotEnvelopeEditor ... /> */}` comment in `RobotOscillatorsTab` with a real import and render of `<RobotEnvelopeEditor robotId={selectedRobotId} localeId={localeId} />`.
- [ ] No GSAP; no `<canvas>`; no store writes on every pointer/key event.
- [ ] TypeScript compiles with no errors.

## Technical Notes
- **`visualAudioMap` recomputation on commit:** `visualAudioMap.averagedADSR` and `visualAudioMap.averagedGain` are derived from `layers[]` and `adsr`. Include the recomputed `visualAudioMap` in the same `updateRobot` payload so visual state stays in sync without a separate render cycle.
- **ADSR affects visual appearance:** `adsr` drives `generateColors()` and greeble helpers in `robotVisualHelpers.ts`. Writing back to `localeStore` on commit is sufficient — the robot visual updates on next render automatically.
- **Per-layer ADSR:** this component edits `audioAttributes.adsr` (robot-level master) only. Per-layer `OscillatorLayer.adsr` overrides are exposed inside each layer row in `RobotOscillatorsTab` (Issues 13.c.2/13.c.3).

## Acceptance Criteria
- [ ] On commit: `localeStore.updateRobot` is called with the new `adsr` and recomputed `visualAudioMap` in one call.
- [ ] On commit: `AudioEngine.reReserveVoice(robotId)` fires; audible envelope change on next note.
- [ ] ADSR change updates robot colour/greebles on next render.
- [ ] Component resets to store values when `robotId` prop changes.
- [ ] No store writes occur during slider movement (only on commit).
- [ ] `RobotOscillatorsTab` (13.c.1) imports and renders `RobotEnvelopeEditor` (TODO comment replaced).
- [ ] App compiles with no TypeScript errors.
- [ ] App remains functional after merge; no regression in audio playback or visual rendering.
- [ ] Integration test covers the commit path: assert `updateRobot` and `reReserveVoice` are called with correct payloads (similar scope to 13.e.3).

## Source Reference
- Files: `src/types/Robot.ts` (`ADSREnvelope`), `src/engine/AudioEngine.ts` (`reReserveVoice`), `src/stores/localeStore.ts` (`updateRobot`), `src/components/robot/robotVisualHelpers.ts`, `src/components/panels/screen/console/RobotEnvelopeEditor.tsx`, `src/components/panels/screen/console/RobotOscillatorsTab.tsx`
- Copilot instructions: "Visual Mapping: Robot visuals (shape/color) must map strictly to audio attributes (synth/ADSR/phase/detune) as defined in ROBOT_DESIGN.md."
- Copilot instructions: "GSAP timelines must only trigger semantic state changes, never call AudioEngine directly." (i.e. no GSAP here)
---

<!-- ============================================================ -->
<!-- ISSUE 14.d: averagedADSR → ShapeParams (split into          -->
<!--             sub-issues 14.d.1 and 14.d.2)                   -->
<!-- ============================================================ -->

## [M8.3-14.d] `deriveShapeParamsFromADSR` — map `averagedADSR` onto robot body silhouette (split into sub-issues)

To keep review scope manageable, this epic is split into two focused sub-issues. Implement **14.d.1** first — it establishes the type contract and pure helper that **14.d.2** depends on for the SVG work.

### Sub-issues

---

<!-- ============================================================ -->
<!-- ISSUE 14.d.1: ShapeParams types, pure helper &              -->
<!--               deriveVisualAudioMap integration + tests      -->
<!-- ============================================================ -->

## [M8.3-14.d.1] `ShapeParams` extension, `deriveShapeParamsFromADSR` helper & unit tests

## Feature Description
Extend `ShapeParams` with four ADSR-derived fields and implement the pure `deriveShapeParamsFromADSR` helper that computes them from `visualAudioMap.averagedADSR` — the gain-weighted average of all active oscillator layers' envelopes. Wire the call into `deriveVisualAudioMap` so the four new fields are populated on every ADSR commit and at spawn time. No component or SVG changes in this issue — pure TypeScript only.

`averagedADSR` is the same source already used by `generateColorPalette` for robot colours, keeping audio→visual mapping consistent across colour and shape.

Depends on: **14.c** (`deriveVisualAudioMap` must exist and be called on ADSR commit), **13.0** (`ShapeParams` lives in `visualAudioMap`; `averagedADSR` is computed there).
Must land before: **14.d.2**.

## Implementation Details
- [ ] **Extend `ShapeParams`** in `src/types/layeredAudio.ts` with four new `number` (0..1) fields:
  - `attackSharpness` — head geometry: `0` = fully rounded dome, `1` = sharp angular peak
  - `decayDrop` — shoulder proportion below the head: `0` = broad gradual shoulders, `1` = sharp taper
  - `bodyFullness` — torso horizontal extent: `0` = narrow/minimal body, `1` = wide/full body
  - `baseFlare` — base/leg geometry: `0` = narrow feet, `1` = wide bell-curve flare
- [ ] **Implement `deriveShapeParamsFromADSR(averagedADSR: ADSREnvelope): Pick<ShapeParams, 'attackSharpness' | 'decayDrop' | 'bodyFullness' | 'baseFlare'>`** in `src/components/robot/robotVisualMapper.ts` (or a co-located `src/components/robot/robotShapeHelpers.ts`):
  - Pure function — no DOM access, no Tone.js, no store reads.
  - Input is `visualAudioMap.averagedADSR` — the gain-weighted averaged ADSR across all layers; **not** `audioAttributes.adsr` (the master) and not any individual `OscillatorLayer.adsr`.
  - Normalise each ADSR parameter to 0..1 using the slider ranges from Issue 14.a:
    - `attackSharpness = 1 - clamp(averagedADSR.attack / 4.0, 0, 1)` — fast averaged attack (0.001 s) → `1`; slow (4.0 s) → `0`
    - `decayDrop = clamp(averagedADSR.decay / 4.0, 0, 1)` — long averaged decay → `1`; short → `0`
    - `bodyFullness = clamp(averagedADSR.sustain, 0, 1)` — sustain is already 0..1
    - `baseFlare = clamp(averagedADSR.release / 8.0, 0, 1)` — long averaged release → `1`; short → `0`
  - Export the function for unit testing.
- [ ] **Call from `deriveVisualAudioMap`:** after `averagedADSR` is computed, pass it into `deriveShapeParamsFromADSR` and merge the four new fields into the `shapeParams` object. Existing `scale`, `roundness`, and `detail` derivations are unchanged — the four new fields are additive.
- [ ] **Unit tests** for `deriveShapeParamsFromADSR` — no DOM or SVG renderer required:
  - Fast averaged attack (0.001 s) → `attackSharpness ≈ 1`
  - Slow averaged attack (4.0 s) → `attackSharpness ≈ 0`
  - Full averaged sustain (1.0) → `bodyFullness = 1`
  - Zero averaged sustain (0.0) → `bodyFullness = 0`
  - Long averaged release (8.0 s) → `baseFlare ≈ 1`
  - Short averaged release (0.001 s) → `baseFlare ≈ 0`

## Technical Notes
- **Input is `averagedADSR`, not `audioAttributes.adsr`:** `averagedADSR` is the gain-weighted average of all layers' envelopes (per-layer overrides included). A robot with per-layer ADSR overrides will have a different silhouette from one using only the master — accurately reflecting its composite sound.
- **Call order inside `deriveVisualAudioMap`:** `averagedADSR` must be computed before `deriveShapeParamsFromADSR` is called. The existing implementation already computes `averagedADSR` first — the new call is appended in the same function before the return.
- **Pure function requirement:** `deriveShapeParamsFromADSR` must be pure — same input always produces same output. No async, no side effects.
- **Existing fields are untouched:** `scale` (pitch-derived) and `detail` (filter-derived) remain as-is.
- **Spawn-time consistency:** `deriveVisualAudioMap` is called at spawn time and on ADSR commit. The four new shape params are present on all robots from first spawn — no migration shim needed.

## Acceptance Criteria
- [ ] `ShapeParams` exports `attackSharpness`, `decayDrop`, `bodyFullness`, `baseFlare` (all `number`, 0..1).
- [ ] `deriveShapeParamsFromADSR` accepts `averagedADSR: ADSREnvelope` (not the master ADSR); is a pure exported function; all six boundary-case unit tests pass.
- [ ] `deriveVisualAudioMap` passes `averagedADSR` into `deriveShapeParamsFromADSR` and merges the four new fields into `shapeParams`; existing `scale`, `roundness`, `detail` unchanged.
- [ ] TypeScript compiles with no errors.
- [ ] No regression in existing tests.

## Source Reference
- Files: `src/types/layeredAudio.ts` (`ShapeParams`), `src/components/robot/robotVisualMapper.ts` (`deriveVisualAudioMap`, `deriveShapeParamsFromADSR`)
- Copilot instructions: "Visual Mapping: Robot visuals (shape/color) must map strictly to audio attributes (synth/ADSR/phase/detune) as defined in ROBOT_DESIGN.md."

---

<!-- ============================================================ -->
<!-- ISSUE 14.d.2: RobotBody.tsx SVG geometry + ROBOT_DESIGN.md  -->
<!-- ============================================================ -->

## [M8.3-14.d.2] `RobotBody.tsx` SVG geometry application & `ROBOT_DESIGN.md` documentation

## Feature Description
Read the four new `shapeParams` fields introduced in **14.d.1** and apply them as secondary modifiers to `RobotBody.tsx` SVG path geometry via `lerp()` helpers. Update `ROBOT_DESIGN.md` with the normalisation table. No new types or store changes — this issue is purely visual.

Depends on: **14.d.1** (`ShapeParams` must export the four new fields and `deriveShapeParamsFromADSR` must be wired into `deriveVisualAudioMap`).

## Implementation Details
- [ ] **Update `RobotBody.tsx`** to read `attackSharpness`, `decayDrop`, `bodyFullness`, and `baseFlare` from `shapeParams` and apply them to SVG path geometry using inline `lerp(a, b, t)` helpers (no GSAP — static geometry):
  - `attackSharpness` → interpolate the robot head SVG path between a rounded arc (`t=0`) and a sharp chevron/peak (`t=1`).
  - `decayDrop` → control the shoulder curve radius below the head (gradual slope vs. tight taper).
  - `bodyFullness` → scale the torso `rx` (or equivalent horizontal extent of the body ellipse/rect).
  - `baseFlare` → interpolate the base/legs between a narrow rectangle (`t=0`) and a trapezoidal/bell flare (`t=1`).
  - Stay within the existing per-variant SVG path system; do not break the four shape variants (`RobotSleek`, `RobotAngular`, `RobotOrganic`, `RobotIndustrial`). Apply the four params as secondary modifiers on top of the base variant shape.
- [ ] **Update `ROBOT_DESIGN.md`** — add a table documenting the four new `shapeParams` fields, that the input is `averagedADSR` (not master ADSR), and the normalisation formula for each.

## Technical Notes
- **No GSAP:** SVG interpolation uses simple `lerp(a, b, t)` calls. Shape is static geometry recomputed on render from store values.
- **Secondary modifiers only:** the four params layer on top of the base variant shape; they do not replace or remove any existing per-variant geometry.
- **All four variants must remain intact:** verify `RobotSleek`, `RobotAngular`, `RobotOrganic`, and `RobotIndustrial` each render correctly at the boundary values (`t=0` and `t=1`) for all four params.

## Acceptance Criteria
- [ ] `RobotBody.tsx` applies all four params to SVG geometry; a robot with a fast averaged attack is visually distinct from one with a slow averaged attack.
- [ ] All four shape variants remain intact; new params are secondary modifiers.
- [ ] `ROBOT_DESIGN.md` documents the four new fields, their `averagedADSR` source, and normalisation formulas.
- [ ] TypeScript compiles with no errors.
- [ ] No regression in existing robot visuals, audio playback, or passing tests.

## Source Reference
- Files: `src/components/robot/RobotBody.tsx`, `docs/ROBOT_DESIGN.md`
- Copilot instructions: "Visual Mapping: Robot visuals (shape/color) must map strictly to audio attributes (synth/ADSR/phase/detune) as defined in ROBOT_DESIGN.md."