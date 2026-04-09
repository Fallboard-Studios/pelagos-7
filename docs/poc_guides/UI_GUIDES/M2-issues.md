---
name: Feature
about: Milestone 2 — Ocean View (The Default Context)
title: '[M8.2] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 6: Build Ocean View Viewport                           -->
<!-- ============================================================ -->

## [M8.2-6] Build Ocean View Viewport

## Feature Description
Integrate the existing `OceanScene` SVG canvas as the primary viewport of the Ocean view, rendered inside `GlassViewport`'s active content area. The scene fills all available glass space, accounting for the transport bar height and navigation bar offset. On desktop the scene expands as the glass reveals more of the tablet along the X-axis. This is the visual "home" of the app when `activeView === 'ocean'`.

Depends on: **Issue 1** (design tokens, `GlassViewport`), **Issue 4** (ocean view is the rendered target of `ActiveViewport`).

## Implementation Details
- [ ] Create `src/components/views/OceanView.tsx` wrapping `<OceanScene />` in a layout-aware container
- [ ] Container fills available glass area: `width: 100%; height: 100%` within the content area (below the transport bar, beside or below the navigation bar depending on breakpoint)
- [ ] Container accounts for the navigation bar offset: on desktop, the content area is inset from the left nav bar (via `padding-left: var(--nav-width)` set by the outer layout); on mobile, inset from the bottom nav bar
- [ ] `OceanScene` `width` and `height` props should match the container's rendered size — pass computed dimensions or let CSS handle scaling via `viewBox` + `preserveAspectRatio`
- [ ] `ActiveViewport` (Issue 4) renders `<OceanView />` instead of `<OceanScene />` directly for `activeView === 'ocean'`
- [ ] Side-effect lifecycle (spawn scheduler, collision detection, factory placement) remains in `OceanScene` — no changes needed there
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `OceanScene` uses a fixed `viewBox="0 0 1920 1080"` — CSS `width: 100%; height: auto` with `preserveAspectRatio="xMidYMid meet"` will scale it correctly inside any container without changing internal coordinate space.
- Remove the `100vw × 100vh` full-screen sizing assumption from `OceanScene.css` (`width: 100%; height: 100%` relative to its parent container is the new target).
- The transport bar from Issue 2 defines `--transport-height` — the content area below it starts at that offset. The navigation bar from Issue 3 defines `--nav-width` (desktop) and `--nav-height` (mobile). `OceanView` should use these tokens to avoid overlap.
- On desktop, as `--sleeve-width` increases with viewport width, `GlassViewport` grows and `OceanScene` grows with it — no explicit resize handler needed; CSS flex/fill handles it.

## Acceptance Criteria
- [ ] `OceanScene` renders inside `OceanView` within the `ocean` active view
- [ ] On desktop the ocean scene fills the available glass content area without overflowing into the sleeve or navigation areas
- [ ] On mobile the ocean scene fills the full `GlassViewport` width
- [ ] Neither the transport bar nor the navigation bar obscures the scene content
- [ ] Spawn, collision, and factory systems continue to function correctly
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in robot/factory rendering or animation

## Source Reference
- File: `src/components/OceanScene.tsx`, `src/components/views/` (new directory)
- Copilot instructions: "All animation: GSAP timelines only; store timelines in timelineMap, not in React/Zustand state."

---

<!-- ============================================================ -->
<!-- ISSUE 7: Build Ocean Management Card                         -->
<!-- ============================================================ -->

## [M8.2-7] Build Ocean Management Card (File/Session CRUD Buttons with Confirmation Modals)

## Feature Description
Build a UI card in the Ocean view that allows the user to manage their session: create a new world, save the current state, and reset/clear the world. Each destructive action requires a confirmation modal before executing. This is the primary session management surface.

Depends on: **Issue 1** (design tokens), **Issue 6** (lives inside `OceanView`).

## Implementation Details
- [ ] Create `src/components/ui/OceanManagementCard.tsx` and `OceanManagementCard.css`
- [ ] Card contains three actions:
  - **New World** — resets all robots and actors to initial state; requires confirmation modal
  - **Save** — serialises current `oceanStore` state (robots, actors, settings, currentMeasure) to `localStorage` as JSON; no confirmation needed (non-destructive)
  - **Load** — deserialises from `localStorage` and restores state; requires confirmation modal if a world is currently active (robots exist)
- [ ] Confirmation modal: simple overlay with "Are you sure?" message, Confirm and Cancel buttons; `pointer-events` block underlying UI while open
- [ ] Modal state is local React state in the card component (not in `uiStore` — it is transient)
- [ ] Create `src/utils/sessionStorage.ts` (or `persistence.ts`) with `saveWorld()` and `loadWorld()` helper functions that handle JSON serialisation/deserialisation of `OceanStore` domain state
- [ ] Card dimensions: fits within a `2×1` grid unit area; use design tokens for all styles
- [ ] Render `<OceanManagementCard />` inside `OceanView`
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- Only serialise domain state: `robots`, `actors`, `settings`, `currentMeasure`. Do NOT serialise `selectedRobotId`, `totalInteractions`, or derived fields (`currentHour`, `lightnessMultiplier`) — those are runtime/computed values.
- On Load: call `AudioEngine.releaseVoice(id)` and `AudioEngine.unregisterRobotMelody(id)` for all currently active robots before replacing them, then call `AudioEngine.reserveVoice()` and `AudioEngine.registerRobotMelody()` for each loaded robot. Melody playback must restart cleanly.
- On New World: `removeRobot()` for all current robots (triggers audio/animation cleanup via existing store action), then `setActors([])`.
- `localStorage` keys: use a namespaced key e.g. `pelagos7.world.v1` to allow future versioning.
- Do not store `globalAudio` (Issue 0b) to `localStorage` in this issue — FX settings persistence is out of scope here.
- Security: data loaded from `localStorage` is user-generated and should be validated before applying (check for required fields, clamp numeric values) to avoid type errors or invalid state.

## Acceptance Criteria
- [ ] "New World" clears all robots and actors after confirmation
- [ ] "Save" writes valid JSON to `localStorage` and a success indicator is shown (e.g., button briefly changes label)
- [ ] "Load" restores a previously saved world; robots play their melodies after load
- [ ] Confirmation modal blocks underlying interaction and can be dismissed with Cancel
- [ ] Loading from corrupted/missing `localStorage` does not crash the app
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback after load

## Source Reference
- File: `src/stores/oceanStore.ts`, `src/engine/AudioEngine.ts`, `src/systems/spawnSystem.ts`
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 8: Build World Options Module                          -->
<!-- ============================================================ -->

## [M8.2-8] Build World Options Module (BPM Stepper & Planet Size Selector)

## Feature Description
Build a UI module in the Ocean view exposing the two global world parameters: BPM (tempo) and Planet Size (day duration). BPM uses a dual-speed stepper matching the industrial "precision control" aesthetic. Planet Size replaces the old Length of Day stepper — instead of a numeric measure count, the user picks from three named options (Small, Medium, Large) that map to real-world minutes per in-world day.

Depends on: **Issue 0b** (`setBPM` action must exist in `audioStore`), **Issue 0g** (`setPlanetSize` action and `planetSize` setting must exist in `oceanStore`), **Issue 1** (design tokens), **Issue 6** (lives inside `OceanView`).

## Implementation Details
- [ ] Create `src/components/ui/WorldOptionsModule.tsx` and `WorldOptionsModule.css`
- [ ] **BPM Stepper:**
  - Reads `useAudioStore((s) => s.bpm)`
  - Decrement/Increment buttons: small step = `±1 BPM`, large step = `±5 BPM`
  - Valid range: 40–240 BPM (clamp on set)
  - On change: calls `useAudioStore.getState().setBPM(newBpm)`
  - Displays current value as a digital readout (e.g., `120 BPM`)
- [ ] **Planet Size Selector:**
  - Reads `useOceanStore((s) => s.settings.planetSize)`
  - Three selectable options in a cycle or segmented button group: `Small`, `Medium`, `Large`
  - Each option displays its real-world duration label: `Small (3 min)`, `Medium (6 min)`, `Large (9 min)`
  - On change: calls `useOceanStore.getState().setPlanetSize(size)`
  - Active option is visually highlighted (CSS class, not inline style)
  - All three options are keyboard accessible (focusable, respond to Enter/Space)
  - **Radix:** Use `@radix-ui/react-select` → `Select.Root` + `Select.Trigger` + `Select.Content` + `Select.Item` for the Planet Size selector. Provides keyboard navigation, typeahead, and correct `aria-expanded` semantics automatically.
- [ ] Module dimensions: fits within a `2×1` grid unit area; use design tokens for all styles
- [ ] Render `<WorldOptionsModule />` inside `OceanView`
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `setBPM` updates both `settings.bpm` in the store and `Tone.Transport.bpm.value` — the tempo change is live and immediately audible; no restart required.
- `setPlanetSize` updates `settings.planetSize` in `oceanStore`. The time-of-day tick (Issue 0g) reads `planetSize` on each interval firing, so the day-cycle speed adjusts automatically from the next second tick — no restart required.
- The Planet Size selector is not a stepper — it is a discrete three-option control. A segmented button group (three buttons, one active at a time) or a custom cycle control is appropriate. Do not use an HTML `<select>` dropdown unless screen size forces it.
- Consider holding a BPM stepper button for continuous increment (use `mousedown` + interval, clear on `mouseup`/`mouseleave`) for ergonomic rapid adjustment — optional polish.
- The BPM stepper is still a reusable primitive — consider extracting a `<DualSpeedStepper>` base component if compatible with existing or planned components.

## Acceptance Criteria
- [ ] BPM stepper increments and decrements in steps of 1 and 5
- [ ] BPM change is immediately reflected in `Tone.Transport.bpm.value` (audible tempo change)
- [ ] BPM is clamped to [40, 240]; out-of-range values are not applied
- [ ] Planet Size selector shows three options; active option is visually highlighted
- [ ] Selecting a different Planet Size calls `setPlanetSize` and the day-cycle speed adjusts
- [ ] Both controls display the current value as a clearly readable readout
- [ ] Both controls are keyboard accessible
- [ ] `dayLengthMeasures` / `setDayLength` references are absent (replaced by `planetSize` / `setPlanetSize`)
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in existing BPM behaviour or day/night cycle visuals

## Source Reference
- File: `src/stores/audioStore.ts` (`setBPM` — Issue 0b), `src/stores/oceanStore.ts` (`setPlanetSize` — Issue 0g), `src/engine/AudioEngine.ts`
- Copilot instructions: "All timing: Tone.Transport / BeatClock (measure-based). No setTimeout/setInterval for musical timing." (Note: the time-of-day interval introduced in Issue 0g is not musical timing.)

---

<!-- ============================================================ -->
<!-- ISSUE 9: Integrate Volume VU Indicator                       -->
<!-- ============================================================ -->

## [M8.2-9] Integrate Volume VU Indicator (1×1 Display Component)

## Feature Description
Build a 1×1 grid-unit VU (volume unit) indicator that gives the user real-time visual feedback on the master output level. Because the current AudioEngine has no analyser or level-metering node, this issue includes adding a `Tone.Meter` to the master chain and exposing a `getLevel()` method on `AudioEngine`.

Depends on: **Issue 0c** (global FX chain — the Meter should be inserted after all FX, immediately before `Destination`), **Issue 1** (design tokens), **Issue 6** (lives inside `OceanView`).

## Implementation Details
- [ ] **AudioEngine changes:**
  - Add `_masterMeter: Tone.Meter | null` module-level variable
  - Instantiate `new Tone.Meter({ normalRange: true })` in `AudioEngine.start()`, connected after `_globalReverb` (last in chain) before `Destination`
  - Expose `AudioEngine.getLevel(): number` — returns `_masterMeter.getValue()` clamped to [0, 1]; returns `0` if meter not initialized
  - Guard instantiation for headless/test environments (same pattern as other Tone node guards)
- [ ] **VU component:**
  - Create `src/components/ui/VUIndicator.tsx` and `VUIndicator.css`
  - Dimensions: exactly `1×1` grid unit (`var(--unit) × var(--unit)`)
  - Use GSAP ticker (same pattern as `AudioStatus.tsx`) to read `AudioEngine.getLevel()` at ~30fps and update a displayed level bar or segmented meter
  - Store the GSAP ticker callback reference for cleanup on unmount — do NOT store level value in React state or Zustand (it is a high-frequency read; use a ref or direct DOM mutation)
  - Visual style: vertical bar or segmented LED column; green in normal range (0–0.7), amber (0.7–0.9), red (0.9–1.0)
  - Label: `"OUT"` or `"LEVEL"` at base of unit
- [ ] Render `<VUIndicator />` inside `OceanView` (or `GlobalHeader` if layout permits)
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- Do NOT store the level value in React state (`useState`) or Zustand — doing so would cause React re-renders at animation framerate, which is wasteful. Use a `ref` to the DOM element and mutate its style/height directly (the same approach `AudioStatus.tsx` uses via GSAP ticker).
- `Tone.Meter` with `normalRange: true` returns values in [0, 1]. Without `normalRange`, it returns dBFS values (negative numbers). Use `normalRange: true` for simpler mapping to visual height.
- `Tone.Meter.getValue()` returns a `number | number[]` — for a mono meter, it returns a single number; destructure or cast safely.
- The GSAP ticker callback must be removed on component unmount: store the callback reference and call `gsap.ticker.remove(callback)` in the cleanup function.
- If `getLevel()` returns 0 when audio is not running (pre-Play), the meter should render at minimum height — this is the correct idle state.
- `AudioStatus.tsx` (dev-only) already uses GSAP ticker for `getPolyphonyStats()` — model the VU component on that pattern.

## Acceptance Criteria
- [ ] `AudioEngine.getLevel()` returns a number in [0, 1]
- [ ] VU bar visually responds to audio output level in real time after audio starts
- [ ] VU bar is at minimum (zero) when audio is not running
- [ ] Level bar color changes from green → amber → red as level increases
- [ ] Component is exactly `1×1` grid unit in size
- [ ] No React state updates on the GSAP ticker path (confirmed via React DevTools Profiler)
- [ ] GSAP ticker callback is cleaned up on unmount
- [ ] All vitest tests continue to pass (Meter node guarded for headless environments)
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/engine/AudioEngine.ts`, `src/components/debug/AudioStatus.tsx` (GSAP ticker pattern reference)
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."
