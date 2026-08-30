# UI Shell Guide

## Overview

Pelagos-7's UI is a "Sleeve & Glass" tablet shell. `Tablet.tsx` composes two decorative `SleeveContainer`s flanking a single `ScreenViewport`:

```typescript
<SleeveContainer hasPowerSwitch={true} />
<ScreenViewport isPoweredOn={isPoweredOn} />
<SleeveContainer />
```

- `SleeveContainer` (`src/components/panels/physical/`) is purely decorative housing — a logo mark, and the `PowerRockerSwitch` when `hasPowerSwitch` is set. No interactive UI besides the power switch itself lives here.
- `ScreenViewport` (`src/components/panels/physical/`) is the actual interactive surface. When `isPoweredOn`, it renders `TransportBar`, `WorldView`, and `Console` (all under `src/components/panels/screen/`). `TransportBar` is a sticky mute+metadata bar — a mute toggle plus a read-only readout of the Attenuation Style name, locale coordinates, local time, and BPM; it has no restart or pause/play controls. `RobotList` was removed in Roadmap Phase 2 (Layout) — Phase 8's Robot Selection tile replaces it.

**Guardrail** (see [CLAUDE.md](../CLAUDE.md)): all interactive UI — transport, navigation, controls — lives inside `ScreenViewport` only, never in `SleeveContainer`.

## Console Navigation

`HubNav` (`src/components/panels/screen/console/`) renders a grid of tiles from `src/data/hubNavConfig.ts`, each rendered via the existing `Button` primitive (`src/components/ui/controls/`) — no `HubNavButtonSchema`, no hardcoded labels. It replaced the old `ConsoleNavigation` `Tabs.Root` bar in Roadmap Phase 3 (Hub). Three tiles survive: `robots`, `audioRig`, `settings` — the old `session` and `composition` tabs are gone entirely, not stubbed: Session's job is absorbed by Session Storage's background persistence engine (Phase 12, not yet built), so there's nothing left for a tile to do; Composition is deferred to a future version.

Selecting a tile replaces the hub-nav area with that tile's full screen (`ConsolePanel` switches on `uiStore.activeHubTile`); a back button returns to the tile grid. `activeHubTile` defaults to `null`, so the app opens on the grid rather than a pre-selected tile. "Drawer" is reserved for panels nested *inside* a tile's screen (e.g. the four drawers inside Robot Options — see below), not for the tiles themselves.

**`robots` nests one level deeper than the other tiles.** It has no standalone editor tile anymore — selecting it shows `RobotsTab`, a read-only list of every robot in the active locale (via `RobotSelectionCard`; see below) followed by `CompanyManager` (Roadmap Phase 10 — see [COMPANIES.md](COMPANIES.md)), and `uiStore.selectedRobotId` (already existing state, not a new field) doubles as the list/detail switch: `null` shows the list, set shows `RobotOptionsTab` for that robot. Back is tile-aware: from a selected robot's screen it clears `selectedRobotId` and returns to the list (same tile); from the list, or any other tile, it clears `activeHubTile` and returns to the grid.

**Current implementation status:**
- Built: `robots` → `RobotsTab` (list) → `RobotOptionsTab` once a robot is selected — all render inside the full-screen tile shell. `audioRig` → `AudioRigDrawer` (Phase 4, shipped) — every control is live, wired straight to `AudioEngine`/`audioStore`, not a placeholder. `settings` → `SectorSettingsDrawer` (Phase 5, shipped) — Attenuation Style and Plot Tuning panels sharing one Retransmit action wired to `src/systems/worldTransition.ts`, not a placeholder; retransmitting an Attenuation Style or locale is a live, real state transition, not a presentational scaffold.
- **Robot Systems Engine shipped (Phase 7):** the old `robotOptions` tab's min/max robot count slider and auto-spawn toggle — already dropped outright (not migrated) when `RobotsTab` replaced it back in Phase 3 — are now genuinely retired at the systems level too: the dynamic spawn scheduler, the `maxRobots`/`minRobots`/`autoSpawn` locale settings, and `persists` are all gone. `RobotsTab`'s own "+ New Robot" action is gone with them — the roster is fixed at exactly 12 robots, created once when a locale loads (see [docs/ROBOT_LIFECYCLE.md](ROBOT_LIFECYCLE.md)), not dynamically spawned/despawned or manually added. `RobotsTab` is now purely a read-only list.
- **Robot Selection shipped (Phase 8):** `RobotsTab` now renders one `RobotSelectionCard` (`src/components/selection/`) per robot — avatar SVG (day/night-invariant via `RobotBody`'s `ignoreDaylight` prop, but still battery-dimmed), job title, battery percentage, docking state, and an `AudioStatusBadge` colored dot (off=purple/mute=red/solo=green/highlight=amber, sourced from `colorTheme.json` via `statusLightColors.ts`). Clicking a robot in the world view also opens this tile, but only from the main hub grid (`activeHubTile === null`) — `Console.css`'s `console--grid` class lets that click reach `WorldView` at all (`.console` is otherwise a full-bleed box that swallows every click above it); once any tile is open, world-view robots are inert again, since the user is already where they meant to go.
- **Robot Options shipped (Phase 9):** selecting a card now routes to `RobotOptionsTab` (`src/components/panels/screen/console/`, renamed from `RobotEditorTab.tsx`), which tears out the old hand-built `RobotMetaTab`/`RobotAudioTab`/`RobotOscillatorsTab` Radix controls entirely (all three deleted) and replaces them with `RobotDisplaySection` (`src/components/robot/` — always-visible header content, not a drawer: read-only Name/Job/Battery/Docking `DualLabel` rows, plus `AudioSettingSection` for editable Audio Setting and Volume) followed by three `AccordionContainer` drawers, all in `src/components/robot/`: `PingControlsDrawer` (Density/Motif Length/Octave Range/Note Variance/Reset Melody), `PingContourDrawer` (the robot's one shared ADSR envelope — Attack/Decay/Sustain/Release), and `SignatureArrayDrawer` (3 fixed oscillator layers — Baseline/Coaxial/Harmonic — each with Type/Gain/Detune/Phase/Interval and its own LFO frames, Coaxial/Harmonic individually mutable via an Active toggle that preserves their configuration). Every control is schema-driven from `src/data/robotOptionsConfig.ts`, live-wired to `AudioEngine`/`useLocaleStore`, not a presentational scaffold.
- **Companies shipped (Phase 10):** `RobotsTab` renders `CompanyManager` (`src/components/company/`) beneath the card list — a button row to select a company (or "None"), Create/Rename/Delete CRUD, and a bulk-edit panel reusing `AudioSettingSection`/`PingControlsDrawer`/`PingContourDrawer`/`SignatureArrayDrawer` (each refactored to a `value`/`onChange`/`disabled` contract so both single-robot and company-broadcast editing share the same presentational components) bound to whichever company is selected instead of a single robot. See [COMPANIES.md](COMPANIES.md) for the full design.

## uiStore

UI-only, JSON-serializable state (`src/stores/uiStore.ts`): `activeView`, `theme`, `language`, `isPoweredOn`, `isFullscreen`, `activeLocaleLocalTime`, `selectedRobotId`, `selectedCompanyId` (Phase 10 — independent of `selectedRobotId`), `activeHubTile`. No Tone nodes, GSAP timelines, or DOM refs — the store's own comment says as much.

## Radix Primitives in Use

Installed and in use: `react-alert-dialog`, `react-dialog`, `react-dropdown-menu`, `react-popover`, `react-select`, `react-separator`, `react-slider`, `react-switch`, `react-tabs`, `react-toggle`, `react-toggle-group`, `react-toolbar`, `react-tooltip`, `react-visually-hidden`. Radix owns ARIA roles, focus trapping, and keyboard contracts; project design tokens own visual styling — don't install `@radix-ui/themes`.

## Forbidden Patterns

- Rendering any interactive control (buttons, inputs, nav) inside `SleeveContainer`.
- Storing GSAP timelines, DOM refs, or computed UI props in `uiStore` — only plain, serializable UI state.
