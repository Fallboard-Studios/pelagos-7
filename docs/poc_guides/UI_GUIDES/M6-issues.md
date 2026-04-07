---
name: Feature
about: Milestone 6 — System Utilities & Polish
title: '[M8.6] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 21: Build Settings Overlay                             -->
<!-- ============================================================ -->

## [M8.6-21] Build Settings Overlay (Theme Switcher, Graphic Settings & Miscellaneous Controls)

## Feature Description
Build the Settings view — accessible via `uiStore.activeView === 'settings'` — containing theme selection, graphical/visual settings, and miscellaneous app options. This is the home for all non-audio, non-composition user preferences.

Depends on: **Issue 0e** (`uiStore` for theme, language, isFullscreen), **Issue 4** (settings view slot), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/views/SettingsView.tsx` and `SettingsView.css` — replaces the stub from Issue 4
- [ ] **Theme Switcher:**
  - Two-option toggle: `dark` / `light`
  - Reads `useUIStore((s) => s.theme)`
  - On toggle: calls `useUIStore.getState().setTheme(theme)`
  - CSS theme switching: apply a `data-theme="dark|light"` attribute to `document.documentElement` in a `useEffect` that watches `theme`. All colour tokens in `index.css` should be defined for both themes using `[data-theme="dark"]` and `[data-theme="light"]` selectors
  - Default: `'dark'` (matches current `#242424` background and `rgba(255,255,255,0.87)` text in `index.css`)
- [ ] **Fullscreen Toggle:**
  - Reads `useUIStore((s) => s.isFullscreen)`
  - On toggle: call `document.documentElement.requestFullscreen()` or `document.exitFullscreen()` depending on current state; update `isFullscreen` in store via `setFullscreen()`
  - Listen to `document.fullscreenchange` event to sync store if user exits fullscreen via Escape key; clean up listener on unmount
- [ ] **Reduced Motion Setting:**
  - Checkbox / toggle labelled "Reduce Motion"
  - Reads from `window.matchMedia('(prefers-reduced-motion: reduce)').matches` as default; allows manual override stored in `uiStore`
  - Add `reducedMotion: boolean` to `uiStore` state and `setReducedMotion()` action
  - GSAP animations across the app should check this flag (via `gsap.matchMedia`) and skip or simplify animations when true
  - Note: The `ScreenWearOverlay` from Issue 5 should already respect this; verify
- [ ] **Max Robots Setting:**
  - Stepper for `settings.maxRobots` (range 2–12, steps of 1)
  - Reads `useOceanStore((s) => s.settings.maxRobots)`
  - Add `setMaxRobots(n: number)` action to `oceanStore` if it does not already exist
  - On change: calls `setMaxRobots(n)` — the spawn scheduler already reads `settings.maxRobots` to gate new spawns, so this takes effect on the next spawn cycle
- [ ] Render `<SettingsView />` when `activeView === 'settings'`
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **CSS theming via `data-theme`:** Define two sets of colour and surface tokens in `index.css`:
  ```css
  :root, [data-theme="dark"] { --bg: #242424; --text: rgba(255,255,255,0.87); ... }
  [data-theme="light"] { --bg: #ffffff; --text: #213547; ... }
  ```
  The `useEffect` that sets `document.documentElement.dataset.theme = theme` must run on mount (to apply the default) and on every theme change.
- **`isFullscreen` drift:** The browser can exit fullscreen without a store action (user presses Escape). Always sync the store from `fullscreenchange` events rather than trusting the store alone as the source of truth for actual fullscreen state.
- **`reducedMotion` and `uiStore`:** Adding `reducedMotion` requires updating the `uiStore` interface. The manual override stores the user's preference even if their OS setting changes. Use `gsap.matchMedia()` at the animation call-site in GSAP-based components to query this, OR set a CSS class `reduced-motion` on `<body>` and use `@media (prefers-reduced-motion)` in CSS for static transitions.
- **`setMaxRobots`:** The `spawnSystem` reads `useOceanStore.getState().settings.maxRobots` before each spawn. Lowering `maxRobots` below the current robot count does not remove existing robots — it only prevents new spawns until the count drops naturally. No immediate culling required.
- **Persist settings to `localStorage`:** Consider persisting `uiStore` (theme, reducedMotion, language) and `settings.maxRobots` across sessions. If implementing, use a small `loadSettings()` / `saveSettings()` utility rather than Zustand middleware, to stay consistent with the persistence pattern introduced in Issue 7.

## Acceptance Criteria
- [ ] Theme toggle switches between dark and light; colour tokens update instantly via `data-theme`
- [ ] Fullscreen toggle enters/exits fullscreen; store syncs correctly when user presses Escape to exit
- [ ] Reduced motion toggle updates `uiStore.reducedMotion`; GSAP animations respect it
- [ ] Language selector shows current language and updates `uiStore.language` on change
- [ ] Max Robots stepper updates `settings.maxRobots`; spawn scheduler respects new value on next cycle
- [ ] Settings persist across page reload (if localStorage persistence is implemented)
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in any existing feature

## Source Reference
- File: `src/stores/uiStore.ts` (Issue 0e), `src/stores/oceanStore.ts`, `src/systems/spawnSystem.ts`, `src/index.css`, `src/components/ui/ScreenWearOverlay.tsx` (Issue 5)
- Copilot instructions: "All animation: GSAP timelines only; store timelines in timelineMap, not in React/Zustand state."

---

<!-- ============================================================ -->
<!-- ISSUE 22: 360px Mobile Optimization Pass                     -->
<!-- ============================================================ -->

## [M8.6-22] 360px Mobile Optimization Pass (Stacking Logic for All Previous Milestones)

## Feature Description
A dedicated responsive audit and fix pass ensuring every view and component introduced in Milestones 1–6 is fully functional and usable at a minimum viewport width of 360px. This is a sweep issue — not new features, but layout corrections, overflow fixes, and stacking rewrites for every component that does not already handle the 360px breakpoint.

Depends on: **All previous milestones** (all components must exist before this audit).

## Implementation Details
- [ ] **Global layout (Milestone 1):**
  - Confirm `--unit` value scales correctly at 360px (`clamp()` or reduced px value at breakpoint)
  - `GlobalHeader` (Issue 2): verify measure display and transport controls do not overflow or truncate at 360px
  - `ModeSwitcher` (Issue 3): verify bottom bar mode activates at ≤480px; confirm all five icons/labels fit within 360px width without overlap
  - `ScreenWearOverlay` (Issue 5): confirm `position: fixed; inset: 0` renders correctly on 360px mobile (no horizontal scroll introduced)

- [ ] **Ocean View (Milestone 2):**
  - `OceanView` / `OceanScene` (Issue 6): confirm full-width scaling on mobile; SVG scales correctly via `viewBox` + CSS; no horizontal overflow
  - `OceanManagementCard` (Issue 7): buttons stack vertically if they exceed 360px width; confirm modal is fully usable at 360px
  - `WorldOptionsModule` (Issue 8): dual-speed steppers and readouts stack or shrink without overflow
  - `VUIndicator` (Issue 9): confirm `1×1` grid-unit sizing works at reduced `--unit`

- [ ] **Robot View (Milestone 3):**
  - `RobotGallery` (Issue 10): list items stack correctly; preview is not clipped; scrollable
  - `SynthModuleA` (Issue 11): Name textbox, Volume, Density, Variance controls stack vertically at 360px
  - `SynthModuleB` (Issue 12): Waveform dropdown, Phase, Detune, conditional Pulsewidth — no horizontal overflow
  - `ADSRModule` (Issue 13): four steppers + sparkline stack into a single-column layout; sparkline does not clip

- [ ] **Composition View (Milestone 4):**
  - `NoteArrayDisplay` (Issue 14): 16-cell grid must be fully visible; if it cannot fit in 360px at full cell size, implement horizontal scroll within the component (not the whole page)
  - `PianoKeyPopover` (Issue 15): popover must fit within 360px viewport; anchor to viewport center on mobile if cell-relative positioning would push it off-screen
  - `MeasureCRUD` (Issue 16): Add/Duplicate/Delete buttons stack vertically; confirmation state is legible

- [ ] **FX Rack View (Milestone 5):**
  - `FXRackView` (Issue 17): global bypass toggle spans full width; `FXEffectBlock` header does not overflow
  - `ReverbModule`, `DelayModule` (Issue 18): sliders span full width; labels do not truncate
  - `CompressorModule`, `EQ3Module` (Issue 19): same as above
  - `FilterModule`, `ChorusModule` (Issue 20): same; LPF and HPF sections stack vertically on mobile

- [ ] **Settings View (Milestone 6):**
  - `SettingsView` (Issue 21): all controls stack and are touch-friendly (minimum 44×44px tap target per WCAG 2.5.5)

- [ ] **Cross-cutting:**
  - Confirm no component introduces horizontal scroll on the body at 360px
  - Confirm all modals and popovers (Issues 7, 15, 16) are fully within the viewport at 360px
  - Confirm text does not overflow containers (use `overflow-wrap: break-word` or `text-overflow: ellipsis` as appropriate)
  - Confirm touch targets (buttons, toggles, steppers) meet 44×44px minimum

- [ ] Use only design tokens from Issue 1 for any new breakpoint overrides
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested in browser DevTools at 360×640px (portrait mobile)

## Technical Notes
- **Test device profile:** Use Chrome/Edge DevTools device emulation at 360×640 (portrait). Also test at 375×667 (iPhone SE) as a secondary target.
- **Horizontal scroll detection:** In DevTools, set `body { overflow-x: hidden }` temporarily and visually confirm no content is clipped that should be visible. Then remove it and confirm the production layout does not introduce scroll.
- **`NoteArrayDisplay` horizontal scroll:** A 16-cell grid at ~22px per cell = ~352px minimum — just barely fits at 360px. If it does not, wrapping to two rows of 8 is an alternative to horizontal scroll.
- **`PianoKeyPopover` on mobile:** 8 keys + octave + duration selectors in a popover — likely too wide for 360px if positioned relative to a grid cell. Safest mobile approach: bottom-sheet style (`position: fixed; bottom: 0; left: 0; width: 100%`) triggered on mobile. Use `matchMedia('(max-width: 480px)')` to conditionally switch anchor strategy.
- **Tap targets:** CSS `min-height: 44px; min-width: 44px` on all interactive elements (buttons, toggles, stepper buttons). This may require padding adjustments on compact elements like `FXEffectBlock` bypass toggles.
- **`--unit` scaling:** If `--unit: clamp(48px, 8vw, 64px)` is used (suggested in Issue 1), the entire grid auto-scales. Verify all components that use fixed multiples of `--unit` scale proportionally.

## Acceptance Criteria
- [ ] All views render without horizontal body scroll at 360px viewport width
- [ ] All interactive elements have a minimum 44×44px tap target
- [ ] `ModeSwitcher` bottom bar shows all five items without overflow at 360px
- [ ] `NoteArrayDisplay` 16-cell grid is scrollable or wraps cleanly on mobile
- [ ] `PianoKeyPopover` is fully within the viewport on mobile (anchored to bottom or centred)
- [ ] All modals render fully within the 360px viewport
- [ ] No text truncates without an ellipsis or wraps in a way that obscures meaning
- [ ] Tested at 360×640 (portrait) and 375×667 (iPhone SE) in DevTools
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in desktop/tablet layout

## Source Reference
- File: All view and component files created in Milestones 1–6
- Copilot instructions: N/A (layout/responsive polish pass)
