---
name: Feature
about: Milestone 6 — System Utilities & Polish. Depends on: settingsStore (Issue 0h), notificationStore (Issue 0i), sessionStore (Issue 0j).
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
<!-- ISSUE 22: 360px Collapsed Sleeve Pass                        -->
<!-- ============================================================ -->

## [M8.6-22] 360px Collapsed Sleeve Pass

## Feature Description
A dedicated responsive audit and fix pass ensuring every view and component introduced in Milestones 1–6 is fully functional and usable at a minimum viewport width of 360px on the collapsed sleeve layout. At 360px, `--sleeve-width` narrows to its ~30px minimum and navigation drops to the bottom tab bar, making `GlassViewport` a narrow vertical-scroll "tape" of content pulled from a compact handheld unit. This is a sweep issue — not new features, but layout corrections, overflow fixes, and stacking rewrites for every component that does not already handle the collapsed state.

Depends on: **All previous milestones** (all components must exist before this audit).

## Implementation Details
- [ ] **Shell — Sleeve/Glass (Milestone 1):**
  - Confirm `--sleeve-width` resolves to ~30px at 360px viewport width
  - Confirm `SleeveContainer` remains visible (logo mark only; ~30px width) without clipping
  - Confirm `GlassViewport` fills `calc(100vw - var(--sleeve-width))` ≈ 330px of usable glass width
  - Navigation (Issue 3): confirm bottom tab bar activates; all five icons fit within ~330px without overflow or truncation
  - Transport bar (Issue 2): confirm Play/Stop, BPM, and Measure counter do not overflow at ~330px
  - Guide rails (Issue 1a): confirm top/bottom rails and occlusion shadow render correctly at ~330px glass width
  - Screen-wear overlay (Issue 5): confirm it covers only `GlassViewport` (not the sleeve) at 360px

- [ ] **Ocean View (Milestone 2):**
  - `OceanView` / `OceanScene` (Issue 6): confirm full-width scaling on mobile; SVG scales correctly via `viewBox` + CSS; no horizontal overflow
  - `OceanManagementCard` (Issue 7): buttons stack vertically if they exceed 330px; confirm modal is fully usable at 360px
  - `WorldOptionsModule` (Issue 8): steppers and readouts stack or shrink without overflow
  - `VUIndicator` (Issue 9): confirm sizing works at reduced glass width

- [ ] **Robot View (Milestone 3):**
  - `RobotGallery` (Issue 10): list items stack correctly; preview is not clipped; scrollable
  - `SynthModuleA` (Issue 11): Name textbox, Volume, Density, Variance controls stack vertically
  - `SynthModuleB` (Issue 12): Waveform dropdown, Vertical Power Bars for Phase/Detune/Pulsewidth — no horizontal overflow
  - `ADSRModule` (Issue 13): HTML Canvas graph and numeric readouts fit within ~330px; canvas does not clip

- [ ] **Composition View (Milestone 4):**
  - `HarmonyPaletteEditor` (Issue 15): 8-cell grid must be fully visible; if it cannot fit at 330px at full cell size, implement horizontal scroll within the component (not the whole page)
  - `PianoKeyPopover` (Issue 16): popover must fit within 360px viewport; use bottom-sheet style (`position: fixed; bottom: 0; width: 100%`) on mobile if cell-relative positioning would push it off-screen
  - `CompositionView` shell (Issue 14): headings, tokens, and layout confirm correct at 330px

- [ ] **FX Rack View (Milestone 5):**
  - `FXRackView` (Issue 17): global bypass toggle spans full glass width; `FXEffectBlock` header does not overflow
  - Issues 18–20: all Value Strips span full glass width; LPF and HPF sections stack vertically on mobile

- [ ] **Settings View (Milestone 6):**
  - `SettingsView` (Issue 21): all controls stack and are touch-friendly (minimum 44×44px tap target)

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
- [ ] `NavigationBar` bottom bar shows all five items without overflow at 360px
- [ ] `HarmonyPaletteEditor` 8-cell grid is scrollable or fits cleanly at 330px
- [ ] `PianoKeyPopover` is fully within `GlassViewport` on mobile (bottom-sheet or centred)
- [ ] All modals render fully within the 360px viewport
- [ ] Screen-wear overlay covers only the glass, not the sleeve, at 360px
- [ ] No text truncates without an ellipsis or wraps in a way that obscures meaning
- [ ] Tested at 360×640 (portrait) and 375×667 (iPhone SE) in DevTools
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in desktop/tablet layout

## Source Reference
- File: All view and component files created in Milestones 1–6
- Copilot instructions: N/A (layout/responsive polish pass)
