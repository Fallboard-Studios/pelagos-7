---
name: Feature
about: Milestone 1 — Core Architecture & Navigation (Sleeve/Glass Shell)
title: '[M8.1] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 1: Define Asymmetric Shell Wrapper                     -->
<!-- ============================================================ -->

## [M8.1-1] Define Asymmetric Shell Wrapper (SleeveContainer + GlassViewport)

## Feature Description
Create the two foundational layout components that establish the "Sleeve & Glass" architecture: a fixed left housing (`SleeveContainer`) and a fluid-width touchscreen viewport (`GlassViewport`). All UI, controls, navigation, and audio transport live inside `GlassViewport`. The sleeve is purely decorative housing with no interactive elements.

This issue also establishes the core CSS custom properties (design tokens) consumed by all downstream milestone components — colours, typography, z-index, and the `--sleeve-width` variable that drives the responsive sleeve/glass split.

Depends on: No other issues (foundation).

## Implementation Details
- [ ] Create `SleeveContainer` in `src/components/layout/SleeveContainer.tsx` and `SleeveContainer.css`
  - `position: fixed; left: 0; top: 0; height: 100vh`
  - Width controlled by `--sleeve-width` CSS custom property; never grows past its housing role
  - Contains no interactive elements — only the logo slot from Issue 1a and the `PowerRockerSwitch` panel (Issue 2a; intentional exception for a hardware device control)
- [ ] Create `GlassViewport` in `src/components/layout/GlassViewport.tsx` and `GlassViewport.css`
  - Flex sibling of `SleeveContainer`; `margin-left: var(--sleeve-width)` to create the offset
  - `height: 100vh; overflow: hidden` at the shell level (individual views scroll internally)
  - All transport, navigation, FX, and content lives here
- [ ] Define CSS custom properties in `:root` inside `src/index.css` or a new `src/styles/tokens.css`:
  - **Sleeve:** `--sleeve-width: 30px` (mobile default); `@media (min-width: 768px) { --sleeve-width: 80px }` (tablet); `@media (min-width: 1200px) { --sleeve-width: 120px }` (desktop)
  - **Colour tokens:** `--color-bg`, `--color-surface`, `--color-border`, `--color-accent`, `--color-text-primary`, `--color-text-muted` — reference `assets/color-theme.json` values
  - **Typography:** `--font-mono`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`
  - **Border:** `--border-width`, `--border-color`, `--border-radius`
  - **Z-index scale:** `--z-overlay`, `--z-header`, `--z-popover`
- [ ] Strip Vite-default styles from `src/App.css` (`.logo`, `.card`, `.read-the-docs`, `@keyframes logo-spin`) — replace with layout root styles
- [ ] Update `src/index.css`: `body { margin: 0; padding: 0; overflow: hidden; display: flex; }` so `SleeveContainer` and `GlassViewport` sit side-by-side as flex children of `body`
- [ ] Update `src/App.tsx` to render `<SleeveContainer>` and `<GlassViewport>` as the root layout
- [ ] Confirm `body` is `margin: 0; padding: 0; overflow: hidden`
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `--sleeve-width` is the single source of truth for the sleeve/glass split — all other layout offsets must derive from it. Never hardcode the sleeve width in any other component.
- All component CSS in later milestones must reference colour and typography token variables — never hardcoded hex values or pixel sizes.
- The `body` flex layout (`display: flex; flex-direction: row`) is what keeps the sleeve pinned left and the glass filling the rest. `GlassViewport` should use `flex: 1` (or `width: calc(100vw - var(--sleeve-width))`).
- Keep the reduced-motion media query foundation (`@media (prefers-reduced-motion: reduce)`) in `index.css` for accessibility — GSAP respects this when using `gsap.matchMedia`.
- The `GlassViewport` `overflow: hidden` prevents content from visually spilling into the sleeve. Individual view components that need scrolling use `overflow-y: auto` on their own containers.
- Color tokens should be informed by the existing `assets/color-theme.json` and `src/constants/colorTheme.json` to avoid duplicating values.

## Acceptance Criteria
- [ ] `SleeveContainer` renders at the left with width matching `--sleeve-width`
- [ ] `GlassViewport` fills the remaining viewport width at all breakpoints
- [ ] `--sleeve-width` resolves to ~30px on mobile, ~80px on tablet, ~120px on desktop
- [ ] All colour, typography, border, and z-index tokens are defined and accessible via CSS custom properties
- [ ] `body` has no margin, no scroll, and fills the viewport
- [ ] No Vite default styles remain in `App.css` or `index.css`
- [ ] App renders correctly with no visual regressions
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing features

## Source Reference
- File: `src/App.tsx`, `src/App.css`, `src/index.css`, `assets/color-theme.json`, `src/constants/colorTheme.json`
- Copilot instructions: N/A (layout foundation)

---

<!-- ============================================================ -->
<!-- ISSUE 1a: Build Sleeve Physical Aesthetics                   -->
<!-- ============================================================ -->

## [M8.1-1a] Build Sleeve Physical Aesthetics (Logo, Occlusion Shadow, Guide Rails)

## Feature Description
Apply the physical-world visual treatments to `SleeveContainer` and the left edge of `GlassViewport` that sell the "battle-scarred industrial tablet" illusion. This includes a stamped logo in the sleeve, an occlusion shadow that makes the glass look physically recessed inside the housing, and top/bottom guide rails that represent the mechanical tracks.

Depends on: **Issue 1** (`SleeveContainer` and `GlassViewport` must exist).

## Implementation Details
- [ ] **Stamped logo:**
  - Add a logo/wordmark element inside `SleeveContainer` — SVG or short text, oriented vertically (rotated 90° if text)
  - Styled to look embossed/stamped: slight inset shadow or reduced opacity treatment
  - `pointer-events: none` — decorative only, never interactive
- [ ] **Occlusion shadow:**
  - Add a narrow `div` or `::before` pseudo-element pinned to the left edge of `GlassViewport` (inside `GlassViewport`, not `SleeveContainer`)
  - Style with `background: linear-gradient(to right, rgba(0,0,0,0.4), transparent)` — approximately 16–24px wide
  - `position: absolute; top: 0; left: 0; height: 100%; width: 20px; pointer-events: none; z-index: 1`
  - This creates the illusion that the glass screen sits physically inside (and slightly behind) the sleeve wall
- [ ] **Guide rails:**
  - Add top and bottom SVG horizontal lines spanning the full width of `GlassViewport`
  - Positioned at the very top and very bottom edges (`top: 0` and `bottom: 0`)
  - Style: subtle (`stroke: var(--color-border)`, `stroke-width: 1px`, `opacity: 0.4`)
  - `pointer-events: none`
  - Represent the mechanical tracks that hold the screen as it extends out of the sleeve
- [ ] Neither the logo, the shadow, nor the guide rails intercept any pointer events
- [ ] No interactive content of any kind in `SleeveContainer` *(the `PowerRockerSwitch` added in Issue 2a is an intentional hardware-control exception)*
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- The occlusion shadow must be inside `GlassViewport`'s z-stack (above the content area), not inside `SleeveContainer`, so it overlays the glass content near the sleeve edge.
- If using `position: absolute` on the occlusion shadow inside `GlassViewport`, ensure `GlassViewport` has `position: relative`.
- The guide rails can be two `<svg>` elements with a single `<line>` each, or CSS `border` treatments on the top and bottom of `GlassViewport`. The SVG approach is more consistent with the project's SVG-heavy codebase.
- The logo orientation: the sleeve is narrow (~30–120px). A vertically-oriented wordmark (rotated) or a small square icon mark works best.
- Neither the occlusion shadow nor the guide rails should animate — they are static CSS/SVG elements.
- Do not use GSAP for any element in this issue.

## Acceptance Criteria
- [ ] A stamped logo/mark is visible in the sleeve at all breakpoints
- [ ] A subtle dark gradient is visible at the left edge of the glass content area, fading to transparent rightward (~16–24px)
- [ ] Horizontal guide lines are visible at the top and bottom edges of `GlassViewport`
- [ ] None of these elements intercept pointer events (click-through confirmed)
- [ ] Occlusion shadow, logo, and guide rails are all `pointer-events: none`
- [ ] No interactive elements exist inside `SleeveContainer` *(the `PowerRockerSwitch` panel added in Issue 2a is an intentional exception — hardware control, not application UI)*
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing behaviour

## Source Reference
- File: `src/components/layout/SleeveContainer.tsx`, `src/components/layout/GlassViewport.tsx` (Issue 1)
- Copilot instructions: "All animation: GSAP timelines only" — N/A (static CSS/SVG effects, not animated)

---

<!-- ============================================================ -->
<!-- ISSUE 2: Build Glass-Mounted Transport Bar (Scaffold)        -->
<!-- ============================================================ -->

## [M8.1-2] Build Glass-Mounted Transport Bar (Scaffold)

## Feature Description
Create the `TransportBar` component shell — the persistent horizontal bar pinned to the top of `GlassViewport`. This scaffold issue covers the bar layout, four disabled/placeholder button slots, the measure and BPM displays, the powered-down initial state gating, and `App.tsx` cleanup. Button logic (click handlers, animations, audio calls) is handled in sub-issues 2a–2d.

On app load the tablet is in a **powered-down** state: all transport controls and nav buttons render as disabled except the Power button slot. The main display area is dark. Time of day still advances.

Depends on: **Issue 1** (design tokens), **Issue 0b** (measure display reads `oceanStore.currentMeasure`), **Issue 0e** (`uiStore.isPoweredOn` must exist), **Issue 0g** (`planetSize`/time-of-day system must exist in `oceanStore`).

## Implementation Details
- [ ] Create `src/components/ui/TransportBar.tsx` and `TransportBar.css`
- [ ] Bar is pinned to the top of `GlassViewport` (`position: sticky; top: 0; width: 100%`) at `--z-header` z-index; rendered inside `GlassViewport`, not the sleeve
- [ ] Transport bar height uses `var(--transport-height, 48px)` — minimum 48px
- [ ] Use only design tokens from Issue 1 for all styles (no hardcoded values)
- [ ] All controls are touch targets (minimum 44×44px per WCAG 2.5.5)
- [ ] Render three button slots (Restart, Pause, Mute) as stubbed `<button>` elements with `disabled` attribute; no click handlers yet (added in 2b–2d); the Power control is a sleeve hardware switch handled in Issue 2a
- [ ] Restart, Pause, and Mute slots are `disabled` when `useUIStore((s) => s.isPoweredOn) === false`
- [ ] Measure display: reads `useOceanStore((s) => s.currentMeasure)`; renders as `M: 048`; shows `M: ---` when `isPoweredOn === false`
- [ ] BPM display: reads `useAudioStore((s) => s.bpm)`; renders as `120 BPM`; dimmed when `isPoweredOn === false`
- [ ] Remove the conditional `{!isAudioReady && <PlayButton />}` rendering from `App.tsx`
- [ ] Remove the hardcoded `% 96` in `subscribeToMeasure` callback in `App.tsx` (prerequisite: Issue 0g decouples measure wrap from day length)
- [ ] Render `<TransportBar />` inside `GlassViewport` at the top of the layout

## Technical Notes
- `isPoweredOn` is the single gating flag for Restart/Pause/Mute — apply `disabled` attribute or a CSS `.disabled` class to all non-power button slots.
- Measure display must be driven by a Zustand subscription, not polling — it updates whenever `setCurrentMeasure` is called by the BeatClock subscriber.
- `TransportBar` is rendered on the glass pane — never in `SleeveContainer`.
- **Radix:** Use `@radix-ui/react-toolbar` → `Toolbar.Root` + `Toolbar.Button` for the button group. This gives roving tabindex keyboard navigation for free. All four button slots should be `Toolbar.Button` stubs at this stage (Pause and Mute will be upgraded to `Toolbar.ToggleGroup` items in Issues 2c/2d). Add `[data-disabled]` selector to `TransportBar.css` alongside `:disabled` to handle the Radix `data-disabled` attribute on disabled buttons.
- Prerequisite: **Issue 0k** (Radix must be installed before this issue is started).

## Acceptance Criteria
- [ ] `TransportBar` renders at the top of `GlassViewport` with correct height token
- [ ] Three button slots are visible (Restart, Pause, Mute); all are disabled on load; no power button in the transport bar
- [ ] Measure display shows `M: ---` on load; BPM display is dimmed on load
- [ ] Full-screen `PlayButton` overlay is removed from `App.tsx`
- [ ] No transport controls exist in `SleeveContainer`
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/App.tsx`, `src/components/PlayButton.tsx`, `src/stores/oceanStore.ts`, `src/stores/audioStore.ts`, `src/stores/uiStore.ts` (Issue 0e)
- Copilot instructions: "All interactive UI (transport, navigation, controls) lives inside GlassViewport only — never in the decorative SleeveContainer." *(Note: the power rocker in `SleeveContainer` is an intentional exception — see Issue 2a.)*

---

<!-- ============================================================ -->
<!-- ISSUE 2a: Sleeve — Power Rocker Switch                       -->
<!-- ============================================================ -->

## [M8.1-2a] Sleeve — Power Rocker Switch

## Feature Description
Add a physical rocker switch panel to `SleeveContainer` that controls the tablet power state. The panel juts out from the right side of the sleeve and houses a rocker switch and an indicator light. The underlying power-cycle logic (audio teardown and restore across all systems) is unchanged — only the trigger point moves from the TransportBar into the sleeve.

This is an intentional exception to the "no interactive elements in SleeveContainer" rule: the power rocker is a hardware device control (analogous to a physical power switch on a device casing), not application UI.

Depends on: **Issue 1** (`SleeveContainer` must exist), **Issue 0e** (`uiStore.isPoweredOn`), **Issue 0c-delta** (`AudioEngine.killAll()` must exist).

## Implementation Details
- [ ] Create `src/components/sleeve/PowerRockerSwitch.tsx` and `PowerRockerSwitch.css`
- [ ] Render `<PowerRockerSwitch />` inside `SleeveContainer`, near the top
- [ ] **Sleeve panel:** add a CSS rectangular panel (`--rocker-panel-width` custom property controls jut amount) that protrudes from the right edge of `SleeveContainer` with rounded corners, sized to contain the rocker and indicator light
- [ ] **Rocker appearance:** flat switch with subtle CSS depth (box-shadow / perspective); this is not a toggle input — the element always returns to neutral after interaction
- [ ] **Rocker animation:** on click/touch, a self-managed GSAP timeline (key `'power-rocker'`, stored via `setTimeline`) rocks the switch element then springs it back to neutral; the animation fires regardless of whether the user confirms or cancels power-off; timeline is killed on unmount via `killTimeline('power-rocker')` in a `useEffect` cleanup
- [ ] **Power On** (when `isPoweredOn === false`): calls `AudioEngine.start()`, calls `resetHarmony()`, calls `reRegisterAllRobotsAudio()`, then calls `useUIStore.getState().setPowerOn()`; GSAP timeline animates the tablet waking up (display brightening) — stored in `timelineMap` under key `'tablet-power-on'`
- [ ] **Power Off** (when `isPoweredOn === true`): opens a confirmation modal before acting
- [ ] **Confirmation modal:** "Power off? All audio will stop." with Confirm and Cancel; modal state is local `useState` in `PowerRockerSwitch` (not in `uiStore`); uses `@radix-ui/react-dialog` → `Dialog.Root` + `Dialog.Portal` + `Dialog.Overlay` + `Dialog.Content` + `Dialog.Title` + `Dialog.Description` + `Dialog.Close`; focus trapping and Escape-to-dismiss are provided by Radix automatically; modal overlay covers the GlassViewport area (use `position: fixed; inset: 0; left: var(--sleeve-width)` or full-screen fixed is acceptable)
 - [ ] **On confirm:** calls `stopSpawnScheduler()`, `stopAllFactoryProduction()`, `stopCollisionDetection()`, `AudioEngine.killAll()`, `removeNonPersistentRobots()`, `useOceanStore.getState().setActors([])`, `useUIStore.getState().setPowerOff()`; GSAP timeline animates the tablet powering down — stored in `timelineMap` under key `'tablet-power-off'`; active in-memory actors are cleared while persistent world data remains in stores
- [ ] **On cancel:** modal dismisses, no state changes
- [ ] **Indicator light:** a small element in the same panel as the rocker, driven by CSS animations keyed to `data-power-state` and `data-transitioning` HTML attributes set on the light element:
  - `data-power-state="off"`: dim red glow (CSS `box-shadow` red), keyframe pulse once every ~3 s
  - `data-power-state="on"`: bright green glow, keyframe pulse once every ~6 s
  - `data-transitioning="true"` (set on toggle for 2 s): yellow glow, keyframe pulse 3× per second; a plain `setTimeout` clears the attribute after 2 s
- [ ] Remove the `⏻` power button and all power-cycle logic from `TransportBar.tsx`; move `power-confirm__*` CSS from `TransportBar.css` to `PowerRockerSwitch.css`

## Technical Notes
- The rocker GSAP timeline fires on every click as physical feedback — it does not wait for or react to the modal outcome.
- `data-transitioning` is managed by a plain `setTimeout` (2 s duration), not by Zustand or GSAP — it is a transient visual indicator, not a semantic state change.
- GSAP wake/shutdown timelines (`tablet-power-on`, `tablet-power-off`) must be stored in `timelineMap`, never in React state or Zustand.
- The rocker panel CSS jut is additive to the existing `SleeveContainer` width — do not change `--sleeve-width`; use a negative margin or absolute positioning on the panel to extend it rightward.

## Acceptance Criteria
- [ ] Rectangular rocker panel juts out of the right side of the sleeve with rounded corners
- [ ] Rocker rocks on click/touch and springs back to neutral — it never stays "clicked"
- [ ] Clicking while off starts audio, re-registers robot audio, triggers wake-up animation, enables transport buttons
- [ ] Clicking while on rocks the switch and opens a confirmation modal
- [ ] Cancel dismisses the modal with no state change; rocker has already returned to neutral
- [ ] Confirm kills audio, tears down all systems, removes transient robots, clears factory actors, dims display, disables transport buttons
- [ ] Indicator light emits dim red pulse (~3 s interval) when powered off
- [ ] Indicator light emits bright green pulse (~6 s interval) when powered on
- [ ] Indicator light emits yellow pulse (3× per second) for 2 s after any power toggle, then returns to steady state
- [ ] `⏻` button no longer exists in `TransportBar`
- [ ] Rocker GSAP timeline is killed on component unmount
- [ ] After power-off, ocean/robot data is still in the store (not cleared)
- [ ] App compiles with no TypeScript errors
- [ ] No regression in audio behaviour

## Source Reference
- File: `src/components/sleeve/PowerRockerSwitch.tsx` *(new)*, `src/components/layout/SleeveContainer.tsx`, `src/components/ui/TransportBar.tsx`
- Systems: `src/engine/AudioEngine.ts`, `src/engine/harmonySystem.ts`, `src/systems/spawnSystem.ts`, `src/systems/factorySystem.ts`, `src/systems/collisionSystem.ts`, `src/stores/uiStore.ts`, `src/stores/oceanStore.ts`
- Copilot instructions: "All audio: AudioEngine only (singleton)."; "All animation: GSAP timelines only; store timelines in timelineMap."; "GSAP timelines must only trigger semantic state changes, never call AudioEngine directly."

---

<!-- ============================================================ -->
<!-- ISSUE 2b: TransportBar — Restart Button                      -->
<!-- ============================================================ -->

## [M8.1-2b] TransportBar — Restart Button

## Feature Description
Implement the Restart button in `TransportBar`. Restart performs a hard reset of audio and measure position without changing power state, display state, or spawn state.

Depends on: **Issue 2** (TransportBar scaffold must exist), **Issue 0c-delta** (`AudioEngine.killAll()` must exist).

## Implementation Details
- [ ] Add click handler to the Restart button slot in `TransportBar`
- [ ] Disabled when `isPoweredOn === false` (inherited from scaffold gating)
- [ ] On click: calls `AudioEngine.killAll()`, calls `useOceanStore.getState().setCurrentMeasure(0)`, then calls `AudioEngine.start()` to resume playback immediately from measure 0 (all robots restart their note arrays simultaneously)
- [ ] No confirmation modal
- [ ] No changes to power state, ocean display, or tablet visuals
- [ ] No GSAP animation needed

## Technical Notes
- After `killAll()`, the transport is at position 0. `setCurrentMeasure(0)` resets the store counter. `AudioEngine.start()` reinitialises the transport from 0 — all robot melodies re-register from their stored note arrays.

## Acceptance Criteria
- [ ] Restart is disabled when `isPoweredOn === false`
- [ ] Clicking Restart kills all audio, resets measure to 0, and immediately resumes playback
- [ ] Power state, ocean display, and robot/ocean store data are unchanged after Restart
- [ ] App compiles with no TypeScript errors
- [ ] No regression in audio behaviour

## Source Reference
- File: `src/components/ui/TransportBar.tsx`, `src/engine/AudioEngine.ts`, `src/stores/oceanStore.ts`
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 2c: TransportBar — Pause Button                        -->
<!-- ============================================================ -->

## [M8.1-2c] TransportBar — Pause Button

## Feature Description
Implement the Pause button in `TransportBar`. Pause is a soft toggle — it suspends audio and measure advancement without resetting position.

Depends on: **Issue 2** (TransportBar scaffold must exist), **Issue 0c-delta** (`AudioEngine.pause()` and `AudioEngine.resume()` must exist).

## Implementation Details
- [ ] Add click handler to the Pause button slot in `TransportBar`
- [ ] Disabled when `isPoweredOn === false` (inherited from scaffold gating)
- [ ] Add local `isPaused` boolean via `useState` in `TransportBar`
- [ ] When playing (not paused): calls `AudioEngine.pause()`, stops BeatClock advancement, sets `isPaused = true`; button shows paused visual state (e.g., CSS class `.transport-btn--active`)
- [ ] When paused: calls `AudioEngine.resume()`, resumes BeatClock, sets `isPaused = false`; button returns to normal visual state
- [ ] `isPaused` is local React state — it is transient UI and does not belong in `uiStore`
- [ ] **Radix:** Replace the `Toolbar.Button` stub for Pause with a `Toolbar.ToggleGroup` (type `"single"`) + `Toolbar.ToggleItem`. This provides correct `aria-pressed` semantics automatically. Drive the pressed state from `isPaused`.

## Technical Notes
- `AudioEngine.pause()` calls `Tone.Transport.pause()` — transport position is preserved.
- `AudioEngine.resume()` calls `Tone.Transport.start()` — resumes from where it was paused.
- When paused, the BeatClock subscriber stops receiving events because `Tone.Transport` is paused.
- Power-off (via `killAll()`) fully resets the system — after power-off the pause state is implicitly cleared.

## Acceptance Criteria
- [ ] Pause is disabled when `isPoweredOn === false`
- [ ] Clicking Pause pauses audio and measure advancement; button shows paused state
- [ ] Clicking Pause again resumes audio and measure advancement; button returns to normal
- [ ] `isPaused` is local React state (not in Zustand)
- [ ] App compiles with no TypeScript errors
- [ ] No regression in audio behaviour

## Source Reference
- File: `src/components/ui/TransportBar.tsx`, `src/engine/AudioEngine.ts`
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 2d: TransportBar — Mute Button                         -->
<!-- ============================================================ -->

## [M8.1-2d] TransportBar — Mute Button

## Feature Description
Implement the Mute button in `TransportBar`. Mute silences audio by setting master volume to 0 without stopping playback or advancing measures, and restores the previous volume level on unmute.

Depends on: **Issue 2** (TransportBar scaffold must exist), **Issue 0b-delta** (`audioStore.isMuted` and `preMuteVolume` must exist), **Issue 0c-delta** (`AudioEngine.setMasterVolume()` and `getMasterVolume()` must exist).

## Implementation Details
- [ ] Add click handler to the Mute button slot in `TransportBar`
- [ ] Disabled when `isPoweredOn === false` (inherited from scaffold gating)
- [ ] Read `isMuted` state via `useAudioStore((s) => s.isMuted)` to drive visual muted state
- [ ] **On mute** (`isMuted === false`): calls `AudioEngine.getMasterVolume()`, saves result via `useAudioStore.getState().setPreMuteVolume(volume)`, calls `AudioEngine.setMasterVolume(0)`, calls `useAudioStore.getState().setMuted(true)`
- [ ] **On unmute** (`isMuted === true`): calls `AudioEngine.setMasterVolume(useAudioStore.getState().preMuteVolume)`, calls `useAudioStore.getState().setMuted(false)`
- [ ] Button visually reflects muted state (e.g., CSS class `.transport-btn--muted`)
- [ ] **Radix:** Replace the `Toolbar.Button` stub for Mute with a `Toolbar.ToggleGroup` (type `"single"`) + `Toolbar.ToggleItem`. Drive the pressed state from `useAudioStore((s) => s.isMuted)` for correct `aria-pressed` semantics.

## Technical Notes
- Audio does not stop during mute — `Tone.Transport` keeps running and measures keep advancing. Only the master gain node value is changed.
- `preMuteVolume` is stored in Zustand (not local state) so it survives component remounts. It resets to `1.0` on hard reload (not persisted to `localStorage`).
- `setMuted` and `setPreMuteVolume` only update store state — the actual `AudioEngine` call is made here in the click handler. Do not call `AudioEngine` from inside store actions.

## Acceptance Criteria
- [ ] Mute is disabled when `isPoweredOn === false`
- [ ] Clicking Mute silences audio; button shows muted state; measures continue advancing
- [ ] Clicking Mute again restores volume to the pre-mute level; button returns to normal
- [ ] Pre-mute volume is correctly snapshotted before muting and restored on unmute
- [ ] App compiles with no TypeScript errors
- [ ] No regression in audio behaviour

## Source Reference
- File: `src/components/ui/TransportBar.tsx`, `src/engine/AudioEngine.ts`, `src/stores/audioStore.ts` (Issue 0b-delta)
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 3: Build Root Layout Grid (Four-Panel Shell)           -->
<!-- ============================================================ -->

## [M8.1-3] Build Root Layout Grid (Four-Panel Shell)

## Feature Description
Establish the four-panel CSS Grid that structures all glass-side content below the `SleeveContainer`. `GlassViewport` is divided into four persistent, named areas: `TransportBar`, `WorldView`, `RobotList`, and `Console`. All four panels render unconditionally — no `display:none` toggling at the root level. This is the foundational layout that all Milestone 2+ content is mounted inside.

Depends on: **Issue 1** (`GlassViewport` must exist, design tokens), **Issue 0l-delta** (`activeConsoleTab` in `uiStore` must exist).

## Implementation Details
- [ ] Update `GlassViewport.tsx` (or create an inner `GlassGrid.tsx` child wrapper) to establish the four-area CSS Grid:
  ```
  grid-template-columns: 2fr 1fr;
  grid-template-rows: auto auto 1fr;
  grid-template-areas:
    "transport   robotlist"
    "worldview   robotlist"
    "console     console";
  ```
- [ ] **TransportBar** (`grid-area: transport`): already exists from Issue 2; bind it to this named area. Flush top-left; same width as `WorldView` column (~2/3 of `GlassViewport`).
- [ ] **WorldView** (`grid-area: worldview`): new `src/components/layout/WorldView.tsx`. Enforces `aspect-ratio: 16/9` on itself. Renders `<OceanScene />` as its sole child (no interactive UI). Always visible regardless of `activeConsoleTab`.
- [ ] **RobotList** (`grid-area: robotlist`): stub `src/components/layout/RobotList.tsx` — renders a placeholder panel. Spans rows 1–2 (flush top-right). Width is the remaining ~1/3 of the glass (flexible `1fr`). Fully implemented in Issue 3a.
- [ ] **Console** (`grid-area: console`): stub `src/components/layout/ConsolePanel.tsx` — renders a placeholder panel. Spans both columns (full glass width below `WorldView` + `RobotList`). Fills all remaining vertical space (`1fr`). Fully implemented in Issue 4.
- [ ] Define CSS custom property `--transport-height` on the `TransportBar` element (read at runtime or as a design token default: `48px`) for use by child layout calculations.
- [ ] **Mobile layout (<768px):** all four areas stack full-width in a single column. Order via `grid-template-areas` override:
  ```
  "transport"
  "worldview"
  "console"
  "robotlist"
  ```
  `TransportBar` becomes `position: sticky; top: 0` in the stacked layout.
- [ ] Remove the `<OceanScene />` direct mount from `App.tsx`; it now lives inside `WorldView`.
- [ ] All panels render unconditionally — do not conditionally mount/unmount based on `activeConsoleTab`.
- [ ] Use only design tokens from Issue 1 for all styles (no hardcoded colours or sizes).
- [ ] No architecture violations (audio/animation/state separation).
- [ ] Code follows standards (imports ordered, explicit types).
- [ ] Tested locally (no console errors).

## Technical Notes
- `aspect-ratio: 16/9` on `WorldView` makes its height derived from its column width. Because `WorldView` is in column 1 (`2fr` of the glass), its height will be `(GlassViewport_width * 2/3) * 9/16`. The `Console` row (`1fr`) fills whatever vertical space remains below it — no fixed console height needed.
- The `RobotList` row-span means it shares its right column with both `TransportBar` and `WorldView` vertically. On desktop this gives it a taller area suitable for a scrolling list.
- `GlassViewport` must have `display: grid` and `height: 100vh` (or `100%`) so the `1fr` Console row actually fills the remaining space. Ensure `overflow: hidden` is set at the grid level; individual panels scroll internally with `overflow-y: auto`.
- **`OceanScene` side effects:** `OceanScene` is now always mounted inside `WorldView` (not conditionally). Spawn scheduler, collision, and factory systems continue running uninterrupted. No lifecycle changes needed.
- **Design token**: add `--glass-col-world: 2fr` and `--glass-col-sidebar: 1fr` to `index.css` tokens so the column ratio is named and overrideable.

## Acceptance Criteria
- [ ] Grid renders with TransportBar and WorldView in column 1; RobotList spanning rows 1–2 in column 2; Console spanning full width in row 3
- [ ] `WorldView` enforces `aspect-ratio: 16/9` — its height is derived from its column width
- [ ] `RobotList` stub renders in right column flush top
- [ ] `Console` stub renders full-width below the world view row
- [ ] All four panels render unconditionally on every load
- [ ] On mobile (<768px) all four areas stack vertically in the correct order; `TransportBar` is sticky
- [ ] `OceanScene` renders inside `WorldView` and spawn/collision systems continue working
- [ ] `App.tsx` no longer mounts `<OceanScene />` directly
- [ ] App compiles with no TypeScript errors
- [ ] No regression in audio playback or robot/factory rendering

## Source Reference
- File: `src/components/layout/GlassViewport.tsx`, `src/App.tsx`, `src/components/OceanScene.tsx`
- Copilot instructions: "All interactive UI (transport, navigation, controls) lives inside GlassViewport only — never in the decorative SleeveContainer."

---

<!-- ============================================================ -->
<!-- ISSUE 3a: Build Robot List Panel                             -->
<!-- ============================================================ -->

## [M8.1-3a] Build Robot List Panel (Persistent Right-Column Picker)

## Feature Description
Implement the `RobotList` panel stub created in Issue 3. It is the persistent right-column robot picker — a scrollable list of all active robots; selecting one opens the Robot Editor Console Tab. No editing controls here; this panel is a gallery/selector only.

Depends on: **Issue 3** (grid area `robotlist` must exist), **Issue 0d** (`robot.name` must exist), **Issue 0e-delta** (`robotStore.selectedRobotId` + `setSelectedRobotId()`).

## Implementation Details
- [ ] Replace the `RobotList` stub with the full `src/components/layout/RobotList.tsx` and `RobotList.css`
- [ ] Reads `useOceanStore((s) => s.robots)` for the robot list and `useOceanStore((s) => s.selectedRobotId)` for the selection highlight
- [ ] Renders a vertically scrollable list (`overflow-y: auto`); each row (`RobotListItem`) shows:
  - `robot.name` (from Issue 0d)
  - A small static robot preview — use `<RobotPreview />` if available, or a scaled-down `<RobotBody />` with `pointer-events: none` and no GSAP refs registered (see Technical Notes)
  - A status dot representing the robot's current `RobotState` (colour-coded: Idle/Moving/Selected/Interacting/Leaving)
- [ ] Clicking a row: calls `useOceanStore.getState().setSelectedRobotId(robot.id)` **and** `useUIStore.getState().setActiveConsoleTab('robotEditor')`
- [ ] The selected robot's row is visually highlighted via a CSS class (`.robot-list-item--selected`), not inline style
- [ ] List updates within one render cycle when robots spawn or are removed (reactive to `robots` array in store)
- [ ] If `robots` is empty: render a `"No robots"` placeholder message
- [ ] Use only design tokens from Issue 1 for all styles; all list item touch targets minimum 44×44px
- [ ] No architecture violations (no GSAP in this component, no Tone nodes)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **GSAP safety for robot preview:** The in-world `Robot.tsx` SVG registers refs in `setRef()` and animates via GSAP timelines in `timelineMap`. Do NOT re-use it at full fidelity here — use `<RobotPreview />` (a stripped-down static render with `pointer-events: none` and no `setRef`/`setTimeline` calls) to avoid animation system conflicts.
- **`RobotState` colour map** (suggestion): `Idle` → muted blue/grey; `Moving` → amber; `Selected` → accent green; `Interacting` → bright blue; `Leaving` → dim red. Use CSS custom properties per state class, not inline colours.
- Use `robot.id` as the React `key` prop on each list item, never array index.
- The `Console` tab switch (`setActiveConsoleTab('robotEditor')`) is the only navigation side-effect from this panel. The `selectedRobotId` set here is what `Robot Editor` reads to know which robot to show.
- On mobile, `RobotList` renders at the bottom of the stacked layout (below `Console`). Consider a horizontal compact strip layout at mobile widths (see Issue 28).

## Acceptance Criteria
- [ ] All active robots appear in the list with their name and visual preview
- [ ] Clicking a robot sets `selectedRobotId` in the store and switches Console to the Robot Editor tab
- [ ] Selected robot row is visually distinct (CSS class, not inline style)
- [ ] List updates within one render cycle on robot spawn or removal
- [ ] `"No robots"` placeholder visible when robot list is empty
- [ ] No GSAP timeline collisions with in-world robot animations
- [ ] All list item touch targets meet 44×44px minimum
- [ ] App compiles with no TypeScript errors
- [ ] No regression in ocean scene or robot animations

## Source Reference
- File: `src/stores/oceanStore.ts`, `src/components/robot/RobotBody.tsx`, `src/components/robot/RobotPreview.tsx`, `src/stores/uiStore.ts`
- Copilot instructions: "All animation: GSAP timelines only; store timelines in timelineMap, not in React/Zustand state."

---

<!-- ============================================================ -->
<!-- ISSUE 4: Build Console Panel + Console Navigation            -->
<!-- ============================================================ -->

## [M8.1-4] Build Console Panel + Console Navigation

## Feature Description
Implement the `Console` panel stub created in Issue 3. The Console is the primary interactive surface of the app — it contains a horizontal tab navigation (`ConsoleNavigation`) and a content area that mounts the active tab's component. Tab selection is driven by `uiStore.activeConsoleTab`. This issue wires the navigation and creates stub content views for each of the six tabs; full tab content is built in Milestones 2–6.

Depends on: **Issue 3** (grid area `console` must exist), **Issue 0l-delta** (`uiStore.activeConsoleTab` + `setActiveConsoleTab()` must exist), **Issue 1** (design tokens).

## Implementation Details
- [ ] Replace the `ConsolePanel` stub with the full `src/components/layout/ConsolePanel.tsx` and `ConsolePanel.css`
- [ ] `ConsolePanel` renders:
  1. `ConsoleNavigation` — a tab bar listing the six tabs
  2. A content area that mounts the component corresponding to `activeConsoleTab`
- [ ] Six tabs (in display order): **Session** | **Composition** | **Robot Options** | **Robot Editor** | **Audio Rig** | **Settings**
- [ ] Each tab maps to an `activeConsoleTab` value: `'session' | 'composition' | 'robotOptions' | 'robotEditor' | 'audioRig' | 'settings'`
- [ ] `ConsoleNavigation` reads `useUIStore((s) => s.activeConsoleTab)`; clicking a tab calls `useUIStore.getState().setActiveConsoleTab(tab)`; active tab is highlighted via CSS class
- [ ] Content area renders a stub `<div>` labelled with the tab name for all six tabs at this stage — milestone issues replace each stub
- [ ] **Radix:** Use `@radix-ui/react-tabs` → `Tabs.Root` + `Tabs.List` + `Tabs.Trigger` + `Tabs.Content` for the tab system. Set `orientation="horizontal"`. `Tabs.Root` `value` prop is driven by `activeConsoleTab`; `onValueChange` calls `setActiveConsoleTab`. All six `Tabs.Content` panels are declared — stubs initially.
- [ ] If Radix `Tabs.Content` DOM structure conflicts with the Console's required layout (e.g. the tab list must be visually separate from content), use `Tabs.Trigger` only for the nav rail and drive content visibility from `activeConsoleTab` directly — document the decision in the PR.
- [ ] `ConsoleNavigation` is entirely inside `GlassViewport` — never in `SleeveContainer`
- [ ] Content area fills remaining Console height (`flex: 1; overflow-y: auto`)
- [ ] Use only design tokens from Issue 1 for all styles; tab triggers minimum 44×44px touch target
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `ConsolePanel` is always mounted (Issue 3 renders it unconditionally). Tab content switching is handled by `activeConsoleTab` — either via Radix `Tabs.Content` visibility or via conditional rendering in the content area.
- If using conditional rendering for content (not Radix `Tabs.Content`), prefer `activeConsoleTab === 'session' ? <SessionTab /> : null` over CSS `visibility: hidden` — only the active tab needs to be mounted.
- **Sub-navigation pattern:** The Robot Editor tab (Issue 10) and Audio Rig tab (Issue 17) contain their own nested sub-tab navigation inside the Console content area. These inner Radix `Tabs.Root` instances are independent of the outer `ConsoleNavigation`; they do not need to be declared here.
- Tab labels should be short and uppercase for the industrial aesthetic (e.g. `SESSION`, `COMP`, `ROBOTS`, `EDITOR`, `RIG`, `SETTINGS`). Full names are fine for initial implementation.

## Acceptance Criteria
- [ ] Six tab triggers render in `ConsoleNavigation`; clicking each updates `activeConsoleTab`
- [ ] Active tab is visually highlighted (CSS class, not inline style)
- [ ] Content area renders the stub for the active tab immediately on tab change
- [ ] All tab triggers are keyboard accessible (Tab + Enter/Space, arrow key navigation within tab list)
- [ ] All tab triggers meet 44×44px minimum touch target
- [ ] Console fills the full `console` grid area from Issue 3
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in ocean scene or audio

## Source Reference
- File: `src/stores/uiStore.ts` (Issue 0l-delta), `src/components/layout/GlassViewport.tsx`, `src/components/layout/ConsolePanel.tsx`
- Copilot instructions: "All interactive UI (transport, navigation, controls) lives inside GlassViewport only — never in the decorative SleeveContainer."

---

<!-- ============================================================ -->
<!-- ISSUE 5: Create Glass Screen-Wear Overlay                    -->
<!-- ============================================================ -->

## [M8.1-5] Create Glass Screen-Wear Overlay (SVG/PNG Overlay for Scratches/Smudges)

## Feature Description
Add a decorative overlay that simulates physical screen wear on the glass touchscreen surface — scratches, smudges, and vignette. The sleeve surface has its own aesthetic treatment (Issue 1a); this overlay applies to `GlassViewport` only. The overlay sits above all glass content but below interactive elements (popovers, modals) and must not intercept pointer events.

Depends on: **Issue 1** (z-index token `--z-overlay` must exist, `GlassViewport` must have `position: relative`).

## Implementation Details
- [ ] Create `src/components/ui/ScreenWearOverlay.tsx` and `ScreenWearOverlay.css`
- [ ] Overlay is scoped to `GlassViewport`: `position: absolute; inset: 0; z-index: var(--z-overlay); pointer-events: none` (requires `GlassViewport` to have `position: relative`)
- [ ] Implement at least one of: inline SVG noise/scratch pattern, CSS `backdrop-filter` with subtle texture, or a pre-generated PNG asset (placed in `src/assets/`) with `mix-blend-mode: overlay` or `screen`
- [ ] Include a radial vignette (dark edges) using a CSS gradient layer
- [ ] Opacity must be low enough to not obscure UI content (suggest 0.04–0.12 for texture, 0.3–0.5 for vignette edges)
- [ ] Overlay must be disabled when `uiStore.theme === 'light'` OR render with reduced opacity in light mode
- [ ] Overlay must be disabled or significantly reduced when `prefers-reduced-motion` is active (texture is static, but the intent is accessibility-awareness)
- [ ] Render `<ScreenWearOverlay />` inside `GlassViewport` (not `SleeveContainer`), positioned above the grid panels (`z-index: var(--z-overlay)`) but below any modals/popovers — persists across tab changes in the Console
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `pointer-events: none` is non-negotiable — the overlay must never block clicks, drags, or touch events on underlying components.
- SVG-based approach (inline `<feTurbulence>` filter) is lightweight and avoids an extra network asset fetch. PNG approach requires the asset to be committed to the repo.
- If using a PNG asset, use `will-change: opacity` to keep it on its own compositor layer and avoid layout thrashing.
- The vignette and texture can be two stacked elements within the same component, each with their own `mix-blend-mode` and `opacity`.
- Do not use GSAP for this overlay — it is a static CSS effect. No timeline is needed.

## Acceptance Criteria
- [ ] Overlay is visible as a subtle texture/vignette on top of the glass content area (not the sleeve)
- [ ] Overlay does not block any mouse, touch, or keyboard interaction with underlying UI
- [ ] Overlay persists when switching between views
- [ ] Overlay does not extend into or affect `SleeveContainer`
- [ ] Overlay opacity is reduced or hidden in light theme
- [ ] No visible performance degradation (check frame rate in browser DevTools)
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in existing features

## Source Reference
- File: `src/App.tsx`, `src/stores/uiStore.ts` (for theme check)
- Copilot instructions: "All animation: GSAP timelines only" — N/A here (static CSS effect, not animation)
