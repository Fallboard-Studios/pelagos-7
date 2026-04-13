---
name: Feature
about: Milestone 2 — Session & World Management Console Tab
title: '[M8.2] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 6: Size Ocean Scene Inside WorldView                   -->
<!-- ============================================================ -->

## [M8.2-6] Size Ocean Scene Inside WorldView

## Feature Description
Remove the full-screen assumption from `OceanScene` so it fills the WorldView panel inside the 4-panel GlassViewport shell, not the entire viewport. WorldView enforces `aspect-ratio: 16/9` and `OceanScene` fills it via CSS layout — no explicit pixel values passed. This is a pure sizing/layout change; no new controls or interactive elements are added.

Depends on: **Issue 3** (WorldView panel must exist in the 4-panel grid).

## Implementation Details
- [ ] Remove `width: 100vw; height: 100vh` from `OceanScene.css`
- [ ] Replace with `width: 100%; height: 100%` so the scene inherits its bounds from the parent `WorldView` container
- [ ] `WorldView` enforces `aspect-ratio: 16/9` and `height: 100%` — OceanScene fills this exactly
- [ ] On desktop, WorldView expands as more of GlassViewport is revealed along the X-axis; OceanScene scales with it
- [ ] Confirm spawn and collision systems are still working (they use the scene's SVG `viewBox`, not pixel dimensions)
- [ ] Confirm no horizontal overflow from OceanScene into other grid areas
- [ ] No interactive controls added in this issue (pure sizing change)
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- OceanScene uses an SVG with a `viewBox` — the SVG is resolution-independent and scales cleanly to any parent bounds. The key change is removing the viewport-based sizing so it no longer forces full screen.
- WorldView should be `position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden` — any absolute-positioned children (overlays, etc.) should be clipped to the scene bounds.
- Confirm `@media (min-width: ...)` breakpoints in `OceanScene.css` do not re-introduce `100vw`/`100vh` values.
- Spawn and collision coordinate systems are SVG `viewBox`-based, not CSS pixel-based — they are unaffected by this change.

## Acceptance Criteria
- [ ] OceanScene fills WorldView bounds; no `100vw`/`100vh` values remain in `OceanScene.css`
- [ ] Scene maintains correct aspect ratio at all breakpoints
- [ ] Spawn, collision, and idle systems continue to function without regression
- [ ] No horizontal overflow from the scene into other grid areas
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/components/OceanScene.css`, `src/components/OceanScene.tsx`, `src/components/layout/WorldView.tsx` (Issue 3)
- Copilot instructions: N/A (layout change)

---

<!-- ============================================================ -->
<!-- ISSUE 7: Build Session Settings Console Tab                  -->
<!-- ============================================================ -->

## [M8.2-7] Build Session Settings Console Tab

## Feature Description
Build the `SessionSettingsTab` component that renders when `activeConsoleTab === 'session'`. It provides session file management (new world, save/load to localStorage, export/import as text) and world preset selection. All destructive actions are guarded with Radix confirmation dialogs.

Depends on: **Issue 0j** (sessionStore), **Issue 0k** (Radix installed), **Issue 4** (Console panel + ConsoleNavigation slot), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/console/SessionSettingsTab.tsx` and `SessionSettingsTab.css`
- [ ] Renders when `activeConsoleTab === 'session'` (controlled by `ConsolePanel`, Issue 4)
- [ ] **New World:** Button with AlertDialog confirmation — destructive; creates a fresh world state, clears all robots and session data
  - **Radix:** `@radix-ui/react-alert-dialog` → `AlertDialog.Root` + `AlertDialog.Trigger` + `AlertDialog.Portal` + `AlertDialog.Overlay` + `AlertDialog.Content` + `AlertDialog.Title` + `AlertDialog.Description` + `AlertDialog.Action` + `AlertDialog.Cancel`
- [ ] **Save World To Local Storage:** Button with AlertDialog confirmation (overwrites existing save if present)
  - Serialises: `robots`, `actors`, `settings`, `currentMeasure` only — no runtime values (Transport state, GSAP timelines, DOM refs)
  - Create `src/utils/sessionStorage.ts` with `saveWorld()` / `loadWorld()` helper functions
- [ ] **Load World From Local Storage:** Button with AlertDialog confirmation — destructive (replaces current state)
  - Calls `loadWorld()` then writes to the appropriate Zustand stores
- [ ] **Export World To Text:** Plain button with no confirmation (non-destructive) — serialises world state to JSON string and copies to clipboard or triggers a download
- [ ] **Import World From Text:** Button that opens a Dialog with a textarea for pasting JSON
  - **Radix:** `@radix-ui/react-dialog` → `Dialog.Root` + `Dialog.Trigger` + `Dialog.Portal` + `Dialog.Overlay` + `Dialog.Content` + `Dialog.Title` + `Dialog.Description` + `Dialog.Close`
- [ ] **Select World Preset:** `@radix-ui/react-select` → `Select.Root` + `Select.Trigger` + `Select.Content` + `Select.Item` — dropdown of available world presets
- [ ] **Load World Preset:** Button with AlertDialog confirmation — loads the selected preset (destructive)
- [ ] All buttons meet minimum 44×44px touch target size (WCAG 2.5.5)
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `src/utils/sessionStorage.ts` must serialise only JSON-serialisable state: `robots`, `actors`, `settings`, `currentMeasure`. Never serialise Tone.js nodes, GSAP timelines, or DOM refs — all of these violate the Zustand rule.
- `loadWorld()` should call `setRobots(data.robots)`, `setActors(data.actors)`, `setSettings(data.settings)`, and `setCurrentMeasure(data.currentMeasure)` — then call `reRegisterAllRobotsAudio()` to re-initialise AudioEngine with the loaded state.
- The confirmed "destructive" AlertDialog pattern (New World, Load World): `AlertDialog.Action` = confirm + execute; `AlertDialog.Cancel` = dismiss, no change. Focus is trapped inside the dialog while open; Escape = cancel.
- Import From Text: validate JSON structure before applying (check for required fields) — reject with an error message in the Dialog if invalid.
- Prerequisite: **Issue 0k** (Radix must be installed before this issue is started).

## Acceptance Criteria
- [ ] `SessionSettingsTab` renders when `activeConsoleTab === 'session'`
- [ ] All 6 action controls are present (New World, Save, Load, Export, Import, Preset Load)
- [ ] Destructive actions (New World, Load From Storage, Load Preset) are gated by AlertDialog
- [ ] Import from Text opens a Dialog with a textarea; invalid JSON shows an error; valid JSON applies the world
- [ ] Save/Load correctly serialise and restore `robots`, `actors`, `settings`, `currentMeasure` via `src/utils/sessionStorage.ts`
- [ ] All controls meet 44×44px minimum touch target size
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/stores/sessionStore.ts`, `src/stores/oceanStore.ts`, `src/utils/sessionStorage.ts` (new)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 8: Build World Options Section                         -->
<!-- ============================================================ -->

## [M8.2-8] Build World Options Section (BPM Stepper & Planet Size Selector)

## Feature Description
Build the World Options sub-section inside `SessionSettingsTab` (clearly labelled). It exposes two world-level settings: BPM via a Dual Speed Stepper and Planet Size via a Radix Select dropdown.

Depends on: **Issue 0b** (`audioStore.setBPM`), **Issue 0g-delta** (`oceanStore.setPlanetSize`), **Issue 7** (renders inside `SessionSettingsTab`), **Issue 1** (design tokens).

## Implementation Details
- [ ] Add a `WorldOptionsSection` sub-component (or inline section) inside `SessionSettingsTab`
- [ ] **BPM Dual Speed Stepper:**
  - Two decrement buttons (−1, −5) and two increment buttons (+5, +1) flanking a numeric BPM readout
  - Reads `useAudioStore((s) => s.bpm)` for current value; range 40–240 BPM
  - On change: calls `useAudioStore.getState().setBPM(newBpm)` which updates the store AND `Tone.Transport.bpm.value` simultaneously
  - All step buttons meet minimum 44×44px touch target
- [ ] **Planet Size Selector:**
  - **Radix:** `@radix-ui/react-select` → `Select.Root` + `Select.Trigger` + `Select.Content` + `Select.Item`
  - Options: `Small — 3 min/day`, `Medium — 6 min/day`, `Large — 9 min/day`
  - Reads `useOceanStore((s) => s.settings.planetSize)` for current selection
  - On change: calls `useOceanStore.getState().setPlanetSize(size)` (Issue 0g-delta)
  - Select trigger meets minimum 44×44px touch target
- [ ] All controls meet minimum 44×44px touch target size
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `setBPM(bpm)` must update both `audioStore.bpm` and `Tone.Transport.bpm.value` atomically — verify this is wired in Issue 0b's implementation.
- Planet Size changes the `planetDurationMs` used by the time-of-day system to advance `currentHour`. The change takes effect immediately after `setPlanetSize()` is called.
- The BPM readout should update reactively when Transport BPM changes externally (e.g., via the Audio Meta sub-tab in Issue 19). Both controls write to the same store field, so they stay in sync automatically.

## Acceptance Criteria
- [ ] BPM Dual Speed Stepper displays and updates BPM in range 40–240; step buttons are ±1 and ±5
- [ ] BPM change calls `setBPM()` and the change is reflected in `Tone.Transport.bpm.value`
- [ ] Planet Size dropdown shows three options with duration labels; changing selection calls `setPlanetSize()`
- [ ] WorldOptionsSection renders as a labelled sub-section within `SessionSettingsTab`
- [ ] All controls meet 44×44px minimum touch target size
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/stores/audioStore.ts` (`setBPM`), `src/stores/oceanStore.ts` (`setPlanetSize`), `src/components/console/SessionSettingsTab.tsx` (Issue 7)
- Copilot instructions: "All timing: Tone.Transport / BeatClock (measure-based). No setTimeout/setInterval/requestAnimationFrame for musical timing."

---

<!-- NOTE: The Volume VU Indicator (was Issue 9) has moved to Milestone 5 —
     it is now part of Issue 19: Audio Meta Sub-Tab inside the Audio Rig Console Tab. -->
