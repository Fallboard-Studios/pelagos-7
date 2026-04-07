---
name: Feature
about: Milestone 1 — Core Architecture & Navigation
title: '[M8.1] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 1: Define Global CSS Grid System                       -->
<!-- ============================================================ -->

## [M8.1-1] Define Global CSS Grid System (1×1 Base Unit Variables)

## Feature Description
Establish the CSS custom property foundation for the entire industrial UI. Define a `1×1 base unit` variable and a consistent set of design tokens (spacing, color, typography, border) that all Milestone 1–6 components will consume. Replace the current Vite-default `App.css` and `index.css` content with the project's own design system.

## Implementation Details
- [ ] Define `--unit` CSS custom property (e.g., `--unit: 64px`) as the 1×1 base unit in `:root`
- [ ] Define spacing tokens derived from `--unit`: `--unit-half`, `--unit-quarter`, `--unit-2x`, etc.
- [ ] Define color tokens for the industrial palette (background, surface, border, accent, text-primary, text-muted) — reference `assets/color-theme.json` for existing palette values
- [ ] Define typography tokens: `--font-mono`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`
- [ ] Define border tokens: `--border-width`, `--border-color`, `--border-radius`
- [ ] Define z-index scale tokens: `--z-overlay`, `--z-header`, `--z-popover`
- [ ] Strip Vite-default styles from `src/App.css` (`.logo`, `.card`, `.read-the-docs`, `@keyframes logo-spin`) — replace with layout root styles
- [ ] Update `src/index.css` to use token-based `color`, `background-color`, and `font-family`
- [ ] Confirm `body` is `margin: 0; padding: 0; overflow: hidden` (full-viewport layout, no scroll)
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- The `--unit` value should be responsive: consider a `clamp()` on smaller breakpoints so the grid scales gracefully on 360px mobile (required in Issue 23).
- All component CSS in later milestones must reference token variables — never hardcoded hex values or pixel sizes.
- Color tokens should be informed by the existing `assets/color-theme.json` and `src/constants/colorTheme.json` to avoid duplicating values.
- Keep the reduced-motion media query foundation (`@media (prefers-reduced-motion: reduce)`) in `index.css` for accessibility groundwork — GSAP respects this when using `gsap.matchMedia`.

## Acceptance Criteria
- [ ] `--unit`, `--unit-half`, `--unit-quarter`, `--unit-2x` are defined in `:root` and resolve to concrete `px` values
- [ ] Color, typography, border, and z-index token sets are defined and documented with inline comments
- [ ] `body` has no margin, no scroll, and fills the viewport
- [ ] No Vite default styles remain in `App.css` or `index.css`
- [ ] App renders correctly with no visual regressions
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing features

## Source Reference
- File: `src/App.css`, `src/index.css`, `assets/color-theme.json`, `src/constants/colorTheme.json`
- Copilot instructions: N/A (pure CSS/design system work)

---

<!-- ============================================================ -->
<!-- ISSUE 2: Build Pinned Global Header                          -->
<!-- ============================================================ -->

## [M8.1-2] Build Pinned Global Header (Transport Root + Measure Display)

## Feature Description
Build a persistent, pinned header component that contains the audio Transport controls (Play/Stop) and a live measure display. This replaces the current full-screen `PlayButton` overlay with a contextual header element. The header is always visible regardless of the active view.

Depends on: **Issue 1** (design tokens must exist), **Issue 0b** (measure display reads `oceanStore.currentMeasure`), **Issue 0g** (`dayLengthMeasures` must exist in `oceanStore.settings`).

## Implementation Details
- [ ] Create `src/components/ui/GlobalHeader.tsx` and `GlobalHeader.css`
- [ ] Header is pinned to the top of the viewport (`position: fixed; top: 0; width: 100%`) at `--z-header` z-index
- [ ] Transport section: integrate `PlayButton` logic inline (or import and adapt) — Play starts AudioEngine, Stop calls `AudioEngine.stop()`; button reflects `isAudioReady` state
- [ ] Measure display: reads `useOceanStore((s) => s.currentMeasure)` and renders current measure number (e.g., `M: 048`)
- [ ] Header height is exactly `1×--unit` (one grid unit tall)
- [ ] Use only design tokens from Issue 1 for all styles (no hardcoded values)
- [ ] `App.tsx`: remove the conditional `{!isAudioReady && <PlayButton />}` rendering; move transport state management into `GlobalHeader` or lift via prop/callback
- [ ] `App.tsx`: update the hardcoded `% 96` in `subscribeToMeasure` callback to use `useOceanStore.getState().settings.dayLengthMeasures` (prerequisite: Issue 0g)
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `AudioEngine.stop()` does not currently exist in the public API — check `AudioEngine.ts` and add it if missing; it should call `Tone.Transport.stop()` and reset `initialized` state.
- The measure display should be driven by a Zustand subscription, not a local `setInterval` — it will update whenever `setCurrentMeasure` is called by the BeatClock subscriber in `App.tsx`.
- Transport state (`isAudioReady`) can stay as local React state in `GlobalHeader` (it is transient UI state, not domain state — no need to move it to `uiStore`).
- On mobile (bottom bar mode from Issue 3), the transport controls may move to the bottom bar: design `GlobalHeader` so transport and measure display are in separate, re-composable sub-elements.

## Acceptance Criteria
- [ ] Header renders at the top of the viewport at all breakpoints
- [ ] Clicking Play starts audio and switches button to Stop (or equivalent)
- [ ] Measure display updates live as the transport runs (increments with BeatClock ticks)
- [ ] Header occupies exactly `1×--unit` height
- [ ] Full-screen `PlayButton` overlay is removed from `App.tsx`
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio start/stop behaviour

## Source Reference
- File: `src/App.tsx`, `src/components/PlayButton.tsx`, `src/engine/AudioEngine.ts`, `src/stores/oceanStore.ts`
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 3: Build Persistent Mode Switcher                      -->
<!-- ============================================================ -->

## [M8.1-3] Build Persistent Mode Switcher (Sidebar for Tablet / Bottom Bar for Mobile)

## Feature Description
Build the primary navigation component that allows the user to switch between the five application views. On tablet and desktop it renders as a vertical sidebar; on mobile (≤480px) it renders as a fixed bottom navigation bar. It is always visible and reflects the currently active view.

Depends on: **Issue 0e** (`uiStore.activeView` must exist), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/ui/ModeSwitcher.tsx` and `ModeSwitcher.css`
- [ ] Five navigation targets mapping to `uiStore`'s `activeView` values:
  - `ocean` — "Ocean" (home/environment view)
  - `robot` — "Robots" (synthesis & management)
  - `composition` — "Composition" (note matrix)
  - `fx` — "FX Rack" (global audio effects)
  - `settings` — "Settings" (utilities & polish)
- [ ] Each nav item: icon (or label abbreviation) + text label, highlights when `activeView` matches
- [ ] Clicking a nav item calls `useUIStore.getState().setActiveView(view)`
- [ ] **Tablet/Desktop (>480px):** vertical sidebar, `1×--unit` wide, full viewport height, fixed left
- [ ] **Mobile (≤480px):** horizontal bottom bar, `1×--unit` tall, full viewport width, fixed bottom
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] Sidebar/bottom bar does not overlap the content area — page layout accounts for its width/height via body padding or grid offset
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)
- [ ] Keyboard navigable (tab through items, Enter/Space to activate)

## Technical Notes
- Icons can be simple SVG inline or a small local icon set — do not introduce an icon library dependency without discussion.
- The `activeView` highlight should use a CSS class toggle (e.g., `.nav-item--active`), not inline styles, so it is themeable.
- Reduced-motion: navigation transitions (if any) must respect `prefers-reduced-motion`.
- Accessibility: each nav item must have a descriptive `aria-label` and the active item `aria-current="page"`.

## Acceptance Criteria
- [ ] All five navigation items render and are clickable
- [ ] Clicking each item updates `useUIStore.getState().activeView` to the correct value
- [ ] Active item is visually highlighted
- [ ] On viewport width >480px, switcher renders as a vertical sidebar on the left
- [ ] On viewport width ≤480px, switcher renders as a horizontal bottom bar
- [ ] Content area is not obscured by the switcher at either breakpoint
- [ ] All items are keyboard accessible (Tab + Enter/Space)
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in existing features

## Source Reference
- File: `src/stores/uiStore.ts` (Issue 0e), `src/App.tsx`
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 4: Implement View-Switching Logic                      -->
<!-- ============================================================ -->

## [M8.1-4] Implement View-Switching Logic (State Management to Toggle "Active Viewport")

## Feature Description
Wire the `uiStore.activeView` state to conditionally render the correct viewport component in the main content area. Each view is a distinct React component (or placeholder); only the active view is mounted/visible at any time. The `OceanScene` (currently always rendered) becomes the `ocean` view.

Depends on: **Issue 0e** (`uiStore`), **Issue 3** (Mode Switcher emits `setActiveView` calls).

## Implementation Details
- [ ] Create a `src/components/ui/ActiveViewport.tsx` component that reads `useUIStore((s) => s.activeView)` and renders the matching view component
- [ ] View components (stubs acceptable for non-ocean views at this stage):
  - `'ocean'` → `<OceanScene />` (existing component)
  - `'robot'` → `<RobotView />` (stub: placeholder panel — Milestone 3)
  - `'composition'` → `<CompositionView />` (stub — Milestone 4)
  - `'fx'` → `<FXRackView />` (stub — Milestone 5)
  - `'settings'` → `<SettingsView />` (stub — Milestone 6)
- [ ] Create stub components for non-ocean views in `src/components/views/` (simple `<div>` with view name displayed)
- [ ] Update `App.tsx` to render `<ActiveViewport />` instead of `<OceanScene />` directly
- [ ] `OceanScene` side effects (spawn scheduler, collision detection, factory placement) must continue to run correctly when the view is mounted; confirm they are not disrupted by being conditionally rendered
- [ ] Use only design tokens from Issue 1 for any viewport wrapper styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- Prefer conditional rendering (`activeView === 'ocean' ? <OceanScene /> : null`) over CSS-based `display: none` for non-active views — avoids running hidden components' side effects unnecessarily.
- `OceanScene` uses `useEffect` for spawn scheduler and collision detection with cleanup on unmount — verify these cleanups fire correctly when switching away from the ocean view and re-initialize cleanly on return.
- Stub views do not need their own stores or logic — they are placeholder targets for future milestones.
- Avoid animating view transitions in this issue — that is polish work for Issue 23.

## Acceptance Criteria
- [ ] Changing `activeView` in `uiStore` causes the correct view component to render
- [ ] `OceanScene` renders when `activeView === 'ocean'` and unmounts cleanly when switching away
- [ ] Switching back to `'ocean'` re-mounts `OceanScene` and restarts spawn/collision systems correctly
- [ ] All five `activeView` values render without runtime errors (stubs acceptable)
- [ ] `App.tsx` no longer renders `<OceanScene />` directly
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback when switching views

## Source Reference
- File: `src/App.tsx`, `src/components/OceanScene.tsx`, `src/stores/uiStore.ts`
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 5: Create Global Screen-Wear Overlay                   -->
<!-- ============================================================ -->

## [M8.1-5] Create Global Screen-Wear Overlay (SVG/PNG Overlay for Scratches/Smudges)

## Feature Description
Add a full-viewport decorative overlay that simulates physical screen wear — scratches, smudges, and vignette — reinforcing the "rugged industrial shell" aesthetic. The overlay sits above all content but below interactive elements (popovers, modals). It is purely visual and must not intercept pointer events.

Depends on: **Issue 1** (z-index token `--z-overlay` must exist).

## Implementation Details
- [ ] Create `src/components/ui/ScreenWearOverlay.tsx` and `ScreenWearOverlay.css`
- [ ] Overlay is `position: fixed; inset: 0; z-index: var(--z-overlay); pointer-events: none`
- [ ] Implement at least one of: inline SVG noise/scratch pattern, CSS `backdrop-filter` with subtle texture, or a pre-generated PNG asset (placed in `src/assets/`) with `mix-blend-mode: overlay` or `screen`
- [ ] Include a radial vignette (dark edges) using a CSS gradient layer
- [ ] Opacity must be low enough to not obscure UI content (suggest 0.04–0.12 for texture, 0.3–0.5 for vignette edges)
- [ ] Overlay must be disabled when `uiStore.theme === 'light'` OR render with reduced opacity in light mode
- [ ] Overlay must be disabled or significantly reduced when `prefers-reduced-motion` is active (texture is static, but the intent is accessibility-awareness)
- [ ] Render `<ScreenWearOverlay />` in `App.tsx` outside of `<ActiveViewport />` so it persists across view switches
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
- [ ] Overlay is visible as a subtle texture/vignette on top of the ocean scene
- [ ] Overlay does not block any mouse, touch, or keyboard interaction with underlying UI
- [ ] Overlay persists when switching between views
- [ ] Overlay opacity is reduced or hidden in light theme
- [ ] No visible performance degradation (check frame rate in browser DevTools)
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in existing features

## Source Reference
- File: `src/App.tsx`, `src/stores/uiStore.ts` (for theme check)
- Copilot instructions: "All animation: GSAP timelines only" — N/A here (static CSS effect, not animation)
