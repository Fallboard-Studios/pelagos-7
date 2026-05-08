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

## [M8.3-13.a] Add `AudioAttributes` fields & spawn defaults

## Feature Description
Add missing per-oscillator audio attribute fields and populate safe spawn defaults so new robots are audio-ready.

## Implementation Details
- [ ] Add `pulseWidth: number` to `AudioAttributes` in `src/types/Robot.ts` (default `0.5`).
- [ ] Verify `phase` and `detune` exist and document their units (degrees / cents) and ranges in `src/types/Robot.ts`.
- [ ] Update `src/systems/spawnSystem.ts` and any factory/test fixtures to populate the new fields for spawned robots.
- [ ] Run TypeScript build check and adjust any places that construct `AudioAttributes` manually.

## Technical Notes
- `pulseWidth` is meaningful only for pulse/square oscillator types; default `0.5` represents 50% duty.
- Keep all fields serialisable (plain numbers) for Zustand storage.

## Acceptance Criteria
- [ ] `src/types/Robot.ts` exports the added fields with explicit types and short docs.
- [ ] `spawnSystem` populates defaults and the app compiles with no TypeScript errors.

## Source Reference
- Files: `src/types/Robot.ts`, `src/systems/spawnSystem.ts`, test fixtures

## [M8.3-13.b] AudioEngine: voice re-reservation & melody registration

## Feature Description
Ensure the audio engine exposes stable APIs for registering melodies and that voice reservation applies updated oscillator attributes immediately.

## Implementation Details
- [ ] Confirm `AudioEngine.reserveVoice()` reads `phase`, `detune`, and `pulseWidth` from the robot's `AudioAttributes` at reservation time.
- [ ] Add `AudioEngine.registerRobotMelody(robotId: string, melody: Melody)` if absent; document expected behaviour and thread-safety.
- [ ] Implement a deterministic re-reservation flow used by UI/store updates: call `AudioEngine.releaseVoice(robotId)` then `AudioEngine.reserveVoice(robotId)` after `localeStore` updates.
- [ ] Add unit tests that mock underlying synths to verify `reserveVoice` applies updated oscillator settings.

## Technical Notes
- Do not mutate the Transport or scheduling state directly from UI handlers or inside Transport ticks. Use the project's audio scheduling helpers (`AudioEngine`, `BeatClock`, or `Transport` wrappers) and apply the configured `MIN_LEAD` lookahead when scheduling or updating melody/voice state. If you need to update engine scheduling from UI code, call `AudioEngine.registerRobotMelody(...)` or `AudioEngine.releaseVoice`/`reserveVoice` which will coordinate with the BeatClock safely — avoid ad-hoc `setTimeout`/`queueMicrotask` hacks.

## Acceptance Criteria
- [ ] `AudioEngine` exposes `registerRobotMelody` and unit tests verify reservation reads new `AudioAttributes`.

## Source Reference
- Files: `src/engine/AudioEngine.ts`, related test files

## [M8.3-13.c] `RobotOscillatorsTab`: UI layout & store wiring

## Feature Description
Build the `RobotOscillatorsTab` UI that exposes oscillator controls (waveform, detune, phase, pulseWidth when applicable) and wires them to `localeStore` with appropriate confirmations and voice re-reservation.

## Implementation Details
- [ ] Create `src/components/panels/screen/console/RobotOscillatorsTab.tsx` and `RobotOscillatorsTab.css`.
- [ ] Read `selectedRobotId` from `useUIStore` and the robot from `useLocaleStore`; render an empty state when `null`.
- [ ] Implement waveform dropdown (`@radix-ui/react-select`) bound to `robot.audioAttributes.waveform` and call `updateRobot` on change, then trigger voice re-reservation.
- [ ] Implement detune and phase controls (dual-speed steppers / slider) and `masterVolume` stepper; call `useLocaleStore.getState().updateRobot(...)` on change and re-reserve voice where required.
- [ ] Conditionally render `pulseWidth` stepper when `waveform === 'square'`.
- [ ] Render `<ADSRCanvas robotId={selectedRobotId} />` (Issue 14) inside the panel — do not implement ADSR logic here.

## Technical Notes
- Keep touch targets >= 44×44px and use design tokens from Issue 1.
- Do not write to store on high-frequency UI gestures; control stepper/slider commits should be throttled or commit on pointerup where appropriate.

## Acceptance Criteria
- [ ] Controls update `localeStore` fields and trigger voice re-reservation for waveform/phase/detune/pulseWidth changes.
- [ ] `RobotOscillatorsTab` renders an `<ADSRCanvas />` placeholder and meets accessibility/touch target requirements.

## Source Reference
- Files: `src/components/panels/screen/console/RobotOscillatorsTab.tsx`, `src/stores/localeStore.ts`, `src/stores/uiStore.ts`, `src/engine/AudioEngine.ts`

## [M8.3-13.d] Presets & oscillator management

## Feature Description
Add preset selection/load, oscillator addition, and delete flows with confirmation dialogs to manage oscillator layers and presets safely.

## Implementation Details
- [ ] Add preset `Select` UI and a `Load Preset` button; guard load with `@radix-ui/react-alert-dialog` confirmation.
- [ ] Add `Delete Oscillator` button guarded by an AlertDialog; deletion should update the robot object via `updateRobot`.
- [ ] Implement `New Oscillator` button that appends a new oscillator layer (with sensible defaults) to the selected robot and ensures `RobotList` updates.
- [ ] Ensure UI actions call voice re-reservation as needed after store updates.

## Technical Notes
- Design presets as serialisable objects stored in project fixtures or a presets registry; avoid in-memory-only state for presets that must persist.

## Acceptance Criteria
- [ ] Preset load and delete flows present and guarded by confirmations.
- [ ] New Oscillator adds a layer and RobotList reflects the change.

## Source Reference
- Files: `src/components/panels/screen/console/RobotOscillatorsTab.tsx`, presets fixtures

## [M8.3-13.e] Tests & fixtures

## Feature Description
Add unit tests and update fixtures to cover the new audio attribute fields, engine registration, and UI wiring.

## Implementation Details
- [ ] Update test fixtures/factories to include new `AudioAttributes` fields (including `pulseWidth`).
- [ ] Add unit tests for `AudioEngine.registerRobotMelody` and for `reserveVoice` reading updated attributes.
- [ ] Add unit-level tests that simulate store updates and assert `localeStore.updateRobot` calls and that `AudioEngine` methods are invoked via mocks — avoid adding full end-to-end integration tests in this issue.

## Technical Notes
- Use seeded mocks or dependency injection for deterministic tests; mock `AudioEngine` internals to avoid real audio in CI.

## Acceptance Criteria
- [ ] Unit tests added and passing locally/CI; fixtures updated; no TypeScript errors.

Note: the ADSR canvas remains Issue 14; `RobotOscillatorsTab` should render `<ADSRCanvas robotId={selectedRobotId} />` and rely on its contract for ADSR read/update on drag-settle.

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
