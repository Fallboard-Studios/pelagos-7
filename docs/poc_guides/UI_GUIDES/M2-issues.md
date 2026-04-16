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
- **Target hierarchy (Issue 9):** In the final architecture `WorldView` renders `<PlanetView>` → `<LocaleView>` → `<OceanView>` → `<OceanScene>`. This issue sets `OceanScene` to `width: 100%; height: 100%` so it fills whatever parent wraps it — that rule stays correct at every level of the chain.

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
<!-- ISSUE 9: Planet & Locale Components                         -->
<!-- ============================================================ -->

## [M8.2-9] Build `PlanetView`, `LocaleView`, and `OceanView` components

## Feature Description
Implement the three-layer world view hierarchy that replaces the current direct `WorldView → OceanScene` connection:

```
WorldView
  └── PlanetView          (owns planet time tick; one per active planet)
        └── LocaleView    (computes locale local time from planet hour + longitude offset)
              └── OceanView  (wraps OceanScene; receives localTime prop)
                    └── OceanScene
```

Planet `size` (small/medium/large) determines a full day's real-world duration via `PLANET_DURATION_MS`. Locales derive their local time from the planet's current hour plus a longitude offset: `localTime = (planet.currentHour + locale.coordinates.x / 15) % 24`. The active locale's local time is written to `uiStore.activeLocaleLocalTime` each second so the `TransportBar` can display it.

Depends on: **Issue 0l** (`usePlanetStore`, `useLocaleStore`, `PLANET_DURATION_MS`, `computeLocalTime`, and `uiStore.activeLocaleLocalTime` must all exist).

## Implementation Details
- [ ] Create `src/components/world/PlanetView.tsx` and `PlanetView.css` — props: `planetId: string`
  - Reads `usePlanetStore((s) => s.planets.find(p => p.id === planetId))`
  - Runs a `setInterval` (1000 ms) inside a `useEffect` that computes `currentHour = ((Date.now() - planet.dayStartTimestamp) / PLANET_DURATION_MS[planet.size]) * 24 % 24`, calls `usePlanetStore.getState().setCurrentHour(planetId, currentHour)`, and also calls `useUIStore.getState().setActiveLocaleLocalTime(computeLocalTime(currentHour, activeLocale.coordinates.x))` for the active locale
  - Interval is started on mount and cleared in `useEffect` cleanup
  - This interval is **not** musical timing — `setInterval` is explicitly permitted here (world/visual timing)
  - Renders `<LocaleView localeId={planet.currentLocaleId} planetId={planetId} />`
- [ ] Create `src/components/world/LocaleView.tsx` and `LocaleView.css` — props: `localeId: string`, `planetId: string`
  - Reads `useLocaleStore((s) => s.locales[localeId])`
  - Reads `usePlanetStore((s) => s.planets.find(p => p.id === planetId)?.currentHour ?? 0)`
  - Computes `localTime = computeLocalTime(currentHour, locale.coordinates.x)` (from `src/constants/time.ts`)
  - Renders `<OceanView localTime={localTime} />`
- [ ] Create `src/components/world/OceanView.tsx` and `OceanView.css` — props: `localTime: number`
  - Thin wrapper that passes `localTime` (and any other locale-scoped props) down to `<OceanScene>`
  - Exists so the locale-to-scene boundary is a clear named seam for future scenes
- [ ] Mount `<PlanetView planetId="pelagos" />` inside `WorldView` (replacing any direct `<OceanScene />` reference in `WorldView`)
- [ ] All components use `width: 100%; height: 100%` so they inherit `WorldView` bounds without explicit pixel values

## Technical Notes
- Day length is **entirely driven by `planet.size`** via `PLANET_DURATION_MS`. The size is set on the planet in `planetStore`; there is no separate selector in any console tab.
- `computeLocalTime(planetHour, longitudeX)` is the shared utility in `src/constants/time.ts`; `LocaleView` and the TransportBar both use it.
- `uiStore.activeLocaleLocalTime` is a float (e.g. `14.5` = 14:30). `TransportBar` formats it as `HH:MM`.
- Spawn, collision, and idle systems still read from `oceanStore`/`localeStore` for per-locale robots and actors — they are unaffected by the view hierarchy change.

## Acceptance Criteria
- [ ] `WorldView` renders `<PlanetView>` → `<LocaleView>` → `<OceanView>` → `<OceanScene>`
- [ ] `PlanetView` drives the real-time day-cycle tick using `PLANET_DURATION_MS[planet.size]`; tick runs independent of transport power state
- [ ] `LocaleView` computes `localTime` via `computeLocalTime` and passes it to `OceanView`
- [ ] `uiStore.activeLocaleLocalTime` is updated every second while `PlanetView` is mounted
- [ ] `TransportBar` shows the locale's local time in `HH:MM` format (wired via `useUIStore`)
- [ ] All components fill parent bounds via `width: 100%; height: 100%` with no `100vw`/`100vh`
- [ ] App compiles with no TypeScript errors and `OceanScene` renders inside `WorldView`

## Source Reference
- `src/stores/planetStore.ts`, `src/stores/localeStore.ts`, `src/stores/uiStore.ts` (Issue 0l)
- `src/constants/time.ts` — `PLANET_DURATION_MS`, `computeLocalTime`
- `src/components/layout/WorldView.tsx` (Issue 3)
