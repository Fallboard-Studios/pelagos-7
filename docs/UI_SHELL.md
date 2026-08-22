# UI Shell Guide

## Overview

Pelagos-7's UI is a "Sleeve & Glass" tablet shell. `Tablet.tsx` composes two decorative `SleeveContainer`s flanking a single `ScreenViewport`:

```typescript
<SleeveContainer hasPowerSwitch={true} />
<ScreenViewport isPoweredOn={isPoweredOn} />
<SleeveContainer />
```

- `SleeveContainer` (`src/components/panels/physical/`) is purely decorative housing — a logo mark, and the `PowerRockerSwitch` when `hasPowerSwitch` is set. No interactive UI besides the power switch itself lives here.
- `ScreenViewport` (`src/components/panels/physical/`) is the actual interactive surface. When `isPoweredOn`, it renders `TransportBar`, `WorldView`, and `Console` (all under `src/components/panels/screen/`). `TransportBar` is a sticky mute+metadata bar — a mute toggle plus a read-only readout of planet name, locale coordinates, local time, and BPM; it has no restart or pause/play controls. `RobotList` was removed in Roadmap Phase 2 (Layout) — Phase 8's Robot Selection tile replaces it.

**Guardrail** (see [CLAUDE.md](../CLAUDE.md)): all interactive UI — transport, navigation, controls — lives inside `ScreenViewport` only, never in `SleeveContainer`.

## Console Navigation

`HubNav` (`src/components/panels/screen/console/`) renders a grid of tiles from `src/data/hubNavConfig.ts`, each rendered via the existing `Button` primitive (`src/components/ui/controls/`) — no `HubNavButtonSchema`, no hardcoded labels. It replaced the old `ConsoleNavigation` `Tabs.Root` bar in Roadmap Phase 3 (Hub). Four tiles survive: `robotOptions`, `robotEditor`, `audioRig`, `settings` — the old `session` and `composition` tabs are gone entirely, not stubbed: Session's job is absorbed by Session Storage's background persistence engine (Phase 11, not yet built), so there's nothing left for a tile to do; Composition is deferred to a future version.

Selecting a tile replaces the hub-nav area with that tile's full screen (`ConsolePanel` switches on `uiStore.activeHubTile`); a back button returns to the tile grid. `activeHubTile` defaults to `null`, so the app opens on the grid rather than a pre-selected tile. "Drawer" is reserved for panels nested *inside* a tile's screen (e.g. the four panels inside Robot Options), not for the tiles themselves.

**Current implementation status:**
- Built: `robotOptions` → `RobotOptionsTab`; `robotEditor` → `RobotEditorTab` (with sub-tabs `RobotMetaTab`, `RobotAudioTab`, `RobotOscillatorsTab`) — both render inside the new full-screen tile shell, but their own internals are untouched by Phase 3.
- Stub only: `audioRig`, `settings` — each still renders the same placeholder `<div>` it did under the old tab model, now reached through the tile shell instead of a tab switch.

**Still planned (not yet built):**
- **`robotOptions` tab will be removed outright**, not migrated — its content (robot count min/max, auto-spawn toggle) has no purpose once the Battery/Docking/Job lifecycle (Phase 7) creates every robot once instead of dynamically spawning/despawning them.
- **`robotEditor` tab will be replaced by two screens:** Robot Selection (Phase 8) — a tile listing every robot (avatar, job title, audio status, battery status) — and Robot Options (Phase 9), reached by selecting a robot from that list, scoped to just that robot. `RobotMetaTab`, `RobotAudioTab`, and `RobotOscillatorsTab`'s hand-built Radix controls will be torn out and rebuilt as four schema-driven drawers (Robot Display, Ping Controls, Ping Contour, Signature Array) using the Phase 1 primitive library, each paired with a DualLabel.
- **`audioRig`/`settings`** get real content in Phases 4 and 5 (Audio Rig, Sector Settings) respectively.

## uiStore

UI-only, JSON-serializable state (`src/stores/uiStore.ts`): `activeView`, `theme`, `language`, `isPoweredOn`, `isFullscreen`, `activeLocaleLocalTime`, `selectedRobotId`, `activeHubTile`. No Tone nodes, GSAP timelines, or DOM refs — the store's own comment says as much.

## Radix Primitives in Use

Installed and in use: `react-alert-dialog`, `react-dialog`, `react-dropdown-menu`, `react-popover`, `react-select`, `react-separator`, `react-slider`, `react-switch`, `react-tabs`, `react-toggle`, `react-toggle-group`, `react-toolbar`, `react-tooltip`, `react-visually-hidden`. Radix owns ARIA roles, focus trapping, and keyboard contracts; project design tokens own visual styling — don't install `@radix-ui/themes`.

## Forbidden Patterns

- Rendering any interactive control (buttons, inputs, nav) inside `SleeveContainer`.
- Storing GSAP timelines, DOM refs, or computed UI props in `uiStore` — only plain, serializable UI state.
