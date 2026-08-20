# UI Shell Guide

## Overview

Pelagos-7's UI is a "Sleeve & Glass" tablet shell. `Tablet.tsx` composes two decorative `SleeveContainer`s flanking a single `ScreenViewport`:

```typescript
<SleeveContainer hasPowerSwitch={true} />
<ScreenViewport isPoweredOn={isPoweredOn} />
<SleeveContainer />
```

- `SleeveContainer` (`src/components/panels/physical/`) is purely decorative housing — a logo mark, and the `PowerRockerSwitch` when `hasPowerSwitch` is set. No interactive UI besides the power switch itself lives here.
- `ScreenViewport` (`src/components/panels/physical/`) is the actual interactive surface. When `isPoweredOn`, it renders `TransportBar`, `WorldView`, `RobotList`, and `Console` (all under `src/components/panels/screen/`).

**Guardrail** (see [CLAUDE.md](../CLAUDE.md)): all interactive UI — transport, navigation, controls — lives inside `ScreenViewport` only, never in `SleeveContainer`.

## Console Navigation

`ConsoleNavigation` (`src/components/panels/screen/console/`) uses `@radix-ui/react-tabs` to drive `uiStore.activeConsoleTab`, one of six tabs: `session`, `composition`, `robotOptions`, `robotEditor`, `audioRig`, `settings`. `ConsolePanel` switches rendered content on that value.

**Current implementation status:**
- Built: `robotOptions` → `RobotOptionsTab`; `robotEditor` → `RobotEditorTab` (with sub-tabs `RobotMetaTab`, `RobotAudioTab`, `RobotOscillatorsTab`)
- Stub only: `session`, `composition`, `audioRig`, `settings` — each currently renders a placeholder `<div>`

**This entire section describes the current, still-live implementation.** See "Planned Replacement" immediately below for the architecture that supersedes it — not yet built.

## Planned Replacement: Hub Tiles (not yet implemented)

Per [docs/roadmap/roadmap.md](roadmap/roadmap.md), the tab-based Console Navigation above is being replaced entirely, not extended. Tracking here so contributors don't build new features against the tab model. **None of this exists yet** — treat the Console Navigation section above as ground truth until these phases land.

- **Tabs become tiles.** The hub becomes a grid of tiles (Phase 3), not a `Tabs.Root` bar. Selecting a tile replaces the hub-nav area with that tile's full screen; a back button returns to the tile grid. "Drawer" is reserved for panels nested *inside* a tile's screen (e.g. the four panels inside Robot Options), not for the tiles themselves.
- **Surviving tiles:** Audio Rig (Phase 4), Sector Settings (Phase 5), Robot Selection (Phase 8). `session` and `composition` are dropped, not rebuilt — Session becomes fully automated with no tile; Composition is deferred to a future version.
- **`robotOptions` tab is removed outright**, not migrated — its content (robot count min/max, auto-spawn toggle) has no purpose once the Battery/Docking/Job lifecycle (Phase 7) creates every robot once instead of dynamically spawning/despawning them.
- **`robotEditor` tab is replaced by two screens:** Robot Selection (Phase 8) — a tile listing every robot (avatar, job title, audio status, battery status) — and Robot Options (Phase 9), reached by selecting a robot from that list, scoped to just that robot. `RobotMetaTab`, `RobotAudioTab`, and `RobotOscillatorsTab`'s hand-built Radix controls are torn out and rebuilt as four schema-driven drawers (Robot Display, Ping Controls, Ping Contour, Signature Array) using the Phase 1 primitive library, each paired with a DualLabel.
- **`uiStore.activeConsoleTab` will be replaced** by navigation state reflecting hub-tile/screen selection (exact shape TBD at implementation time — still must stay plain, serializable UI state per the Forbidden Patterns below).

## uiStore

UI-only, JSON-serializable state (`src/stores/uiStore.ts`): `activeView`, `theme`, `language`, `isPoweredOn`, `isFullscreen`, `activeLocaleLocalTime`, `selectedRobotId`, `activeConsoleTab`. No Tone nodes, GSAP timelines, or DOM refs — the store's own comment says as much.

## Radix Primitives in Use

Installed and in use: `react-alert-dialog`, `react-dialog`, `react-dropdown-menu`, `react-popover`, `react-select`, `react-separator`, `react-slider`, `react-switch`, `react-tabs`, `react-toggle`, `react-toggle-group`, `react-toolbar`, `react-tooltip`, `react-visually-hidden`. Radix owns ARIA roles, focus trapping, and keyboard contracts; project design tokens own visual styling — don't install `@radix-ui/themes`.

## Forbidden Patterns

- Rendering any interactive control (buttons, inputs, nav) inside `SleeveContainer`.
- Storing GSAP timelines, DOM refs, or computed UI props in `uiStore` — only plain, serializable UI state.
