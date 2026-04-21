---
name: Feature
about: Milestone 6 — Responsive Polish.
title: '[M8.6] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 26: 360px Collapsed Sleeve Pass                        -->
<!-- ============================================================ -->

## [M8.6-26] 360px Collapsed Sleeve Pass

## Feature Description
A dedicated responsive audit and fix pass ensuring every component introduced in Milestones 1–6 is fully functional and usable at a minimum viewport width of 360px on the collapsed sleeve layout. At 360px, `--sleeve-width` narrows to its ~30px minimum and `ConsoleNavigation` collapses to a bottom tab bar, making `GlassViewport` a narrow vertical-scroll "tape" of content. This is a sweep issue — not new features, but layout corrections, overflow fixes, and stacking rewrites for every component that does not already handle the collapsed state.

Depends on: **All previous milestones** (all components must exist before this audit).

## Implementation Details
- [ ] **Shell — Sleeve/Glass (Milestone 1):**
  - Confirm `--sleeve-width` resolves to ~30px at 360px viewport width
  - Confirm `SleeveContainer` remains visible (logo mark only; ~30px width) without clipping
  - Confirm `GlassViewport` fills `calc(100vw - var(--sleeve-width))` ≈ 330px of usable glass width
  - Navigation (Issue 4, `ConsoleNavigation`): confirm bottom tab bar activates; all six Console tab icons fit within ~330px without overflow or truncation
  - Transport bar (Issue 2): confirm Play/Stop, BPM, and Measure counter do not overflow at ~330px
  - Guide rails (Issue 1a): confirm top/bottom rails and occlusion shadow render correctly at ~330px glass width
  - Screen-wear overlay (Issue 5): confirm it covers only `GlassViewport` (not the sleeve) at 360px

- [ ] **Session & World — WorldView (Milestone 2):**
  - `WorldView` / `OceanScene` (Issue 6): confirm full-width scaling on mobile; SVG scales correctly via `viewBox` + CSS; no horizontal overflow
  - Session Console Tab (Issue 7): controls stack vertically if they exceed 330px; no overflow
  - World Options (Issue 8): steppers and readouts stack or shrink without overflow

- [ ] **Robot Management Console Tabs (Milestone 3):**
  - `RobotList` (Issue 9): list items stack correctly; no horizontal overflow; scrollable
  - Robot Editor Tab (Issue 10): tab shell and nested sub-tab navigation fit at ~330px
  - Robot Meta sub-tab (Issue 11): Name textbox, Volume, Density, Variance controls stack vertically
  - Robot Audio sub-tab (Issue 12): Waveform dropdown, Vertical Power Bars for Phase/Detune/Pulsewidth — no horizontal overflow
  - Robot Oscillators sub-tab (Issue 13): HTML Canvas graph and numeric readouts fit within ~330px; canvas does not clip

- [ ] **Composition Console Tab (Milestone 4):**
  - `ChordItem` grid (Issue 15): 8-cell grid must be fully visible; implement horizontal scroll within the component if it cannot fit at full cell size
  - `PianoKeyPopover` (Issue 16): popover must fit within 360px viewport; use bottom-sheet style (`position: fixed; bottom: 0; width: 100%`) on mobile if cell-relative positioning would push it off-screen
  - Composition Console Tab shell (Issue 14): headings, tokens, and layout confirm correct at 330px

- [ ] **Audio Rig Console Tab (Milestone 5):**
  - Audio Rig Tab shell (Issue 17): global bypass toggle spans full glass width; `FXEffectBlock` header does not overflow
  - Audio Rig sub-tabs (Issues 20–25): all Value Strips span full glass width; HPF and LPF sections in FiltersTab stack vertically on mobile

- [ ] **Settings Console Tab (Milestone 6):**
  - `SettingsTab` (Issue 26): all controls stack and are touch-friendly (minimum 44×44px tap target)

- [ ] **Cross-cutting:**
  - Confirm no component introduces horizontal scroll on `body` at 360px
  - Confirm all modals and popovers (Issues 7, 16) are fully within `GlassViewport` at 360px
  - Confirm text does not overflow containers (use `overflow-wrap: break-word` or `text-overflow: ellipsis`)
  - Confirm all touch targets (buttons, toggles, Power Bars, Value Strips) meet 44×44px minimum

- [ ] Use only design tokens from Issue 1 for any new breakpoint overrides
- [ ] No architecture violations
- [ ] Code follows standards
- [ ] Tested in browser DevTools at 360×640px (portrait mobile)

## Technical Notes
- **Test device profile:** Use Chrome/Edge DevTools device emulation at 360×640 (portrait). Also test at 375×667 (iPhone SE) as a secondary target.
- **Usable glass width at 360px:** `360px - 30px (sleeve) = 330px`. All components must fit within 330px or implement internal scroll.
- **`GlassViewport` tape mode:** On mobile, the GlassViewport becomes a single scrollable column. Views should stack their panels vertically rather than using horizontal grids. Use `flex-direction: column` and `overflow-y: auto` scoped to the active view container.
- **`PianoKeyPopover` on mobile:** Bottom-sheet anchoring is the preferred approach at 360px. Use `matchMedia('(max-width: 480px)')` to switch anchor strategy conditionally.
- **Tap targets:** CSS `min-height: 44px; min-width: 44px` on all interactive elements. This may require padding adjustments on compact elements like `FXEffectBlock` bypass toggles and Value Strip drag handles.
- **Horizontal scroll detection:** In DevTools, temporarily set `body { overflow-x: hidden }` and confirm no visible content is clipped. Then remove and confirm no horizontal scroll appears in production layout.

## Acceptance Criteria
- [ ] `--sleeve-width` is ~30px at 360px viewport; `SleeveContainer` is visible but narrow
- [ ] `GlassViewport` fills ~330px of usable width at 360px
- [ ] All views render without horizontal body scroll at 360px viewport width
- [ ] All interactive elements have a minimum 44×44px tap target
- [ ] `ConsoleNavigation` bottom bar shows all six Console tab items without overflow at 360px
  - [ ] `ChordItem` 8-cell grid is scrollable or fits cleanly at 330px
- [ ] `PianoKeyPopover` is fully within `GlassViewport` on mobile (bottom-sheet or centred)
- [ ] All modals render fully within the 360px viewport
- [ ] Screen-wear overlay covers only the glass, not the sleeve, at 360px
- [ ] No text truncates without an ellipsis or wraps in a way that obscures meaning
- [ ] Tested at 360×640 (portrait) and 375×667 (iPhone SE) in DevTools
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in desktop/tablet layout

## Source Reference
- File: All Console tab and component files created in Milestones 1–6
- Copilot instructions: N/A (layout/responsive polish pass)

## [M8.6-27] Build Session Settings Console Tab

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