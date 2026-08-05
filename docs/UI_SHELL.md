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

## uiStore

UI-only, JSON-serializable state (`src/stores/uiStore.ts`): `activeView`, `theme`, `language`, `isPoweredOn`, `isFullscreen`, `activeLocaleLocalTime`, `selectedRobotId`, `activeConsoleTab`. No Tone nodes, GSAP timelines, or DOM refs — the store's own comment says as much.

## Radix Primitives in Use

Installed and in use: `react-alert-dialog`, `react-dialog`, `react-dropdown-menu`, `react-popover`, `react-select`, `react-separator`, `react-slider`, `react-switch`, `react-tabs`, `react-toggle`, `react-toggle-group`, `react-toolbar`, `react-tooltip`, `react-visually-hidden`. Radix owns ARIA roles, focus trapping, and keyboard contracts; project design tokens own visual styling — don't install `@radix-ui/themes`.

## Forbidden Patterns

- Rendering any interactive control (buttons, inputs, nav) inside `SleeveContainer`.
- Storing GSAP timelines, DOM refs, or computed UI props in `uiStore` — only plain, serializable UI state.
