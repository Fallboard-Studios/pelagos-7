---
name: Feature
about: Milestone 4 — Composition & Note Matrix. Note: all interactive elements in this milestone must meet the 44×44px minimum touch target size (WCAG 2.5.5).
title: '[M8.4] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 14: Composition View Shell & Design Token Setup        -->
<!-- ============================================================ -->

## [M8.4-14] Composition View Shell & Design Token Setup

## Feature Description
Create the `CompositionView` shell component and establish all design tokens and shared CSS custom properties needed by the note matrix and piano popover in Issues 15 and 16. This is the setup issue — no functional note-editing UI yet, just the container and tokens in place so the subsequent issues have a stable foundation to build on.

**Design scope:** `CompositionView` is the top-level view for the harmony palette editor. In this version it renders a single child: `<HarmonyPaletteEditor />` (Issue 15). It replaces the stub created in Issue 4.

Depends on: **Issue 1** (global design tokens).

## Implementation Details
- [ ] Create `src/components/views/CompositionView.tsx` and `CompositionView.css`
  - Renders a titled panel (`"Harmony Palette"` heading) with a placeholder slot for `<HarmonyPaletteEditor />` (renders nothing until Issue 15 is merged)
  - Accepts no props; reads no store state
  - Apply layout CSS using tokens from Issue 1 (padding, background, border-radius)
- [ ] Add the following CSS custom properties to `CompositionView.css` (scoped to `.composition-view`) for use by child components:
  - `--palette-cell-size`: width/height of each note cell (e.g. `2.5rem`)
  - `--palette-cell-gap`: gap between cells (e.g. `0.25rem`)
  - `--piano-key-white-width`, `--piano-key-black-width`: key dimensions for the popover
  - `--piano-key-white-height`, `--piano-key-black-height`: key heights
  - Values should be consistent with the existing color theme (`assets/color-theme.json`)
- [ ] Wire `<CompositionView />` into the appropriate navigation slot established by earlier UI issues (or document exactly where it should be mounted if that slot does not exist yet)
- [ ] No functional note logic in this issue — the component body is a shell only
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] App compiles with no TypeScript errors after this issue

## Acceptance Criteria
- [ ] All interactive elements in `CompositionView` and its children meet the 44×44px minimum touch target size
- [ ] `CompositionView.tsx` exists and mounts without errors
- [ ] `"Harmony Palette"` heading renders inside the view
- [ ] All five CSS custom properties are defined and accessible to child components
- [ ] No note-editing functionality present (that is Issues 15 and 16)
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing UI

## Source Reference
- `src/components/views/` — sibling view components for placement reference
- `assets/color-theme.json` — color tokens
- Copilot instructions: issue 1 design tokens must be the source of all style values

---

<!-- ============================================================ -->
<!-- ISSUE 15: HarmonyPaletteEditor Component (Note Matrix)       -->
<!-- ============================================================ -->

## [M8.4-15] HarmonyPaletteEditor Component (Note Matrix)

## Feature Description
Build `HarmonyPaletteEditor` — the 8-cell note matrix that displays and allows editing of the current `TIME_PITCHES` palette. Each cell shows one note name from the active palette. Clicking a cell will open `PianoKeyPopover` (Issue 16) to select a replacement. This issue covers the matrix component itself and its interaction with `harmonySystem.ts`; the popover UI is Issue 16.

**Design scope:** This is the only note-editing surface in the current version. Robots' individual melodies are auto-generated at spawn and are not exposed. The palette is the shared, user-accessible "tuning" layer.

Depends on: **Issue 14** (CompositionView shell and CSS tokens), **Issue 16** (PianoKeyPopover — wire the click handler but the popover implementation is separate).

## Implementation Details
- [ ] Create `src/components/ui/HarmonyPaletteEditor.tsx` and `HarmonyPaletteEditor.css`
- [ ] On mount: read the current palette via `getAvailableNotes()` from `harmonySystem.ts` and store as local `string[]` state
- [ ] Render 8 clickable cells in a horizontal row using `--palette-cell-size` and `--palette-cell-gap` from Issue 14; each cell labelled with its current note name (e.g. `C`, `G`, `Bb`)
- [ ] Display the current in-game hour label (e.g. `Hour 7`) sourced from `getCurrentHour()` from `beatClock.ts`, with a `"Resets each hour"` tooltip/subtitle
- [ ] Clicking a cell opens `<PianoKeyPopover>` anchored to that cell, passing:
  - `index: number` — the palette slot being edited (0–7)
  - `currentNote: string` — the cell's current note name
  - `onConfirm: (noteName: string) => void`
  - `onClose: () => void`
- [ ] Only one popover open at a time; track `openCellIndex: number | null` in local state; clicking a different cell closes the current popover and opens a new one
- [ ] **Radix:** Each cell click opens a `@radix-ui/react-popover` → `Popover.Root` + `Popover.Trigger` + `Popover.Portal` + `Popover.Content` + `Popover.Close`. This provides focus management, Escape-to-close, click-outside dismissal, and correct `aria-expanded` semantics. The cell element acts as the `Popover.Trigger`.
- [ ] `onConfirm` handler: build an updated `EighthNotes` tuple — `const updated = [...getAvailableNotes()] as EighthNotes; updated[index] = noteName; setAvailableNotes(updated)` — then re-read `getAvailableNotes()` to refresh local state
- [ ] `onClose` handler: set `openCellIndex` to `null`
- [ ] Mount `<HarmonyPaletteEditor />` inside `CompositionView` (replacing the placeholder from Issue 14)
- [ ] Use `--palette-cell-size`, `--palette-cell-gap` tokens from Issue 14 for layout
- [ ] Use only design tokens from Issue 1 for all other styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **`EighthNotes` type:** `setAvailableNotes` expects exactly 8 strings (`[string, string, string, string, string, string, string, string]`). Always spread the full current palette before replacing a single index to preserve the other 7 entries.
- **No Zustand involvement:** `HarmonyPaletteEditor` does not touch `useOceanStore`. The harmony system is a standalone module. Local React state is the correct pattern here.
- **Harmony cycle interaction:** When `scheduleHarmonyCycle` fires (every 4 measures), it overwrites `availableNotes` with `TIME_PITCHES[currentHour]`, discarding any user edit silently. This is acceptable in v1. The `"Resets each hour"` label communicates this to the user.

## Acceptance Criteria
- [ ] All 8 palette cells meet the 44×44px minimum touch target size
- [ ] 8 labelled note-name cells render correctly from the current harmony palette
- [ ] Current in-game hour label and `"Resets each hour"` note display correctly
- [ ] Clicking a cell opens `PianoKeyPopover` with the correct `index` and `currentNote` props
- [ ] `onConfirm` updates the palette via `setAvailableNotes` and refreshes the cell labels
- [ ] The edited cell's label updates immediately after confirmation
- [ ] Only one popover is open at a time
- [ ] `onClose` dismisses the popover without changes
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback

## Source Reference
- `src/engine/harmonySystem.ts` — `getAvailableNotes`, `setAvailableNotes`, `EighthNotes`
- `src/engine/beatClock.ts` — `getCurrentHour`
- Copilot instructions: "Melody Logic: Melodies must store note indices (0..7), never literal pitch strings."

---

<!-- ============================================================ -->
<!-- ISSUE 16: PianoKeyPopover Component                          -->
<!-- ============================================================ -->

## [M8.4-16] PianoKeyPopover Component

## Feature Description
Build `PianoKeyPopover` — a floating piano keyboard UI that appears anchored to a note cell in `HarmonyPaletteEditor`. The user selects a replacement note name from the 12 chromatic pitch classes, with a ♯/♭ toggle to switch black key label spellings. Confirming a selection calls back to `HarmonyPaletteEditor` with the chosen note name string.

**Radix note:** The popover anchoring, focus trapping, Escape-to-close, and portal are all handled by `@radix-ui/react-popover` (wired in Issue 15). This issue implements the piano keyboard content rendered inside `Popover.Content`. For the ♯/♭ toggle, use `@radix-ui/react-toggle` → `Toggle.Root` for correct `aria-pressed` semantics. For the Confirm/Cancel close button, use `Popover.Close`.

Depends on: **Issue 0k** (Radix installed), **Issue 14** (CSS tokens), **Issue 15** (HarmonyPaletteEditor wires this component in).

## Implementation Details
- [ ] Create `src/components/ui/PianoKeyPopover.tsx` and `PianoKeyPopover.css`
- [ ] **Radix:** The floating panel is implemented with `@radix-ui/react-popover` (provided by `HarmonyPaletteEditor` as the outer `Popover.Root` + `Popover.Content`). `PianoKeyPopover` renders as the content inside `Popover.Content`; it does not manage its own open/close state or positioning.
- [ ] Props interface:
  ```typescript
  interface PianoKeyPopoverProps {
    index: number;           // palette slot being edited (0–7)
    currentNote: string;     // pre-highlights the matching key on open
    onConfirm: (noteName: string) => void;
    onClose: () => void;
  }
  ```
- [ ] Position: floating relative to the triggering cell (`position: absolute` anchored to the cell, or portaled `position: fixed`); use `var(--z-popover)` from Issue 1 for z-index
- [ ] Render a piano keyboard with 12 pitch-class slots:
  - White keys (naturals): `C  D  E  F  G  A  B`
  - Black keys (accidentals): positioned between the appropriate white keys, styled as shorter overlapping keys
  - Use `--piano-key-white-width/height` and `--piano-key-black-width/height` tokens from Issue 14
- [ ] Include a **♯/♭ toggle** button in the popover header:
  - Sharps mode (default): black keys labelled `C#  D#  F#  G#  A#`
  - Flats mode: black keys labelled `Db  Eb  Gb  Ab  Bb`
  - Toggle is local state (does not persist between popover opens)
- [ ] On open: pre-highlight the key matching `currentNote`, resolving enharmonic equivalents using the map `{ 'C#':'Db', 'D#':'Eb', 'F#':'Gb', 'G#':'Ab', 'A#':'Bb' }` (and its inverse); the highlight is independent of the current toggle mode
- [ ] On key click: call `onConfirm(noteName)` where `noteName` is the label currently shown on the key (sharp or flat spelling per the toggle); popover closes
- [ ] Cancel paths: `onClose()` is called on Escape keypress, click-outside, or an explicit close/cancel button; no palette change occurs
- [ ] No octave selector — palette stores note names only; robots resolve octave internally
- [ ] No duration selector
- [ ] Keyboard accessible: focus trapped within popover while open; Escape closes; left/right arrow keys move focus between keys
- [ ] Use only design tokens from Issue 1 and CSS tokens from Issue 14 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **Enharmonic equivalence map:**
  ```typescript
  const ENHARMONIC: Record<string, string> = {
    'C#': 'Db', 'Db': 'C#',
    'D#': 'Eb', 'Eb': 'D#',
    'F#': 'Gb', 'Gb': 'F#',
    'G#': 'Ab', 'Ab': 'G#',
    'A#': 'Bb', 'Bb': 'A#',
  };
  ```
  To find the key slot to highlight: if `currentNote` is in `ENHARMONIC`, the slot covers both spellings; highlight it regardless of toggle mode.
- **`onConfirm` note name:** Pass the label string exactly as rendered on the pressed key — `C#` in sharps mode, `Db` in flats mode. Both spellings are valid Tone.js note name strings. `TIME_PITCHES` already uses a mix of both, so there is no need to normalise.
- **Positioning:** If using `position: absolute` inside the palette row, ensure the parent cell has `position: relative`. If portaling, use a `ref` to the cell element and `getBoundingClientRect()` to compute the fixed position.

## Acceptance Criteria
- [ ] All piano keys (white and black) meet the 44×44px minimum touch target size (achieved via hit-area expansion, not visual key size)
- [ ] Popover renders anchored to the clicked cell
- [ ] All 12 pitch classes display as piano-style white and black keys
- [ ] ♯/♭ toggle switches black key labels between sharps and flats
- [ ] The key matching `currentNote` is pre-highlighted on open (enharmonic equivalence respected)
- [ ] Clicking a key calls `onConfirm` with the correct note name string and closes the popover
- [ ] No octave selector or duration selector present
- [ ] Escape and click-outside call `onClose` without changes
- [ ] Focus is trapped inside the popover while open
- [ ] Arrow keys navigate between keys
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback or existing UI

## Source Reference
- `src/engine/harmonySystem.ts` — `EighthNotes`, note name conventions
- Issue 14 CSS tokens — `--piano-key-*` dimensions
- Copilot instructions: "Melody Logic: Melodies must store note indices (0..7), never literal pitch strings."

---

<!-- ============================================================ -->
<!-- ISSUE 16a: Implement Measure CRUD                             -->
<!-- ============================================================ -->

## [M8.4-16a] Implement Measure CRUD (New/Delete Measure Buttons with Confirmation)

## Feature Description
Add New Measure and Delete Measure buttons to `CompositionView`. Deletion is a destructive operation and requires a confirmation dialog before executing. This issue covers the buttons, the confirmation guard, and the backing logic in the harmony/melody system.

Depends on: **Issue 0k** (Radix installed), **Issue 14** (`CompositionView` shell), **Issue 15** (`HarmonyPaletteEditor` renders inside it).

## Implementation Details
- [ ] Add **New Measure** and **Delete Measure** buttons to `CompositionView`
- [ ] All controls are touch targets (minimum 44×44px per WCAG 2.5.5)
- [ ] **New Measure:** creates a new measure entry; no confirmation required (non-destructive)
- [ ] **Delete Measure:** destructive — must confirm before executing
- [ ] **Radix:** Destructive delete confirmation uses `@radix-ui/react-alert-dialog` → `AlertDialog.Root` + `AlertDialog.Trigger` + `AlertDialog.Portal` + `AlertDialog.Overlay` + `AlertDialog.Content` + `AlertDialog.Title` + `AlertDialog.Description` + `AlertDialog.Action` + `AlertDialog.Cancel`. Provides focus trapping, Escape-to-dismiss, and correct `role="alertdialog"` ARIA semantics automatically.
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Acceptance Criteria
- [ ] New Measure button adds a measure without confirmation
- [ ] Delete Measure button opens an `AlertDialog` confirmation
- [ ] Confirming the dialog deletes the measure; Cancel dismisses without changes
- [ ] Focus is trapped in the dialog while open; Escape dismisses
- [ ] All buttons meet 44×44px minimum touch target
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/components/views/CompositionView.tsx`
- Copilot instructions: "All interactive UI (transport, navigation, controls) lives inside GlassViewport only."