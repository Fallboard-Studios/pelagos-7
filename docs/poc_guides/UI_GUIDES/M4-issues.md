---
name: Feature
about: Milestone 4 — Composition Console Tab. Note: all interactive elements in this milestone must meet the 44×44px minimum touch target size (WCAG 2.5.5).
title: '[M8.4] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 14: Build Composition Console Tab Shell                -->
<!-- ============================================================ -->

## [M8.4-14] Build Composition Console Tab Shell

## Feature Description
Build the `CompositionConsoleTab` shell that renders when `activeConsoleTab === 'composition'`. It displays a scrollable list of `ChordItem` components (one per chord in the sequence from audioStore chord state). This issue covers the shell and CSS token setup only — `ChordItem` renders a placeholder until Issue 15.

Depends on: **Issues 3–4** (Console panel must exist), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/console/CompositionConsoleTab.tsx` and `CompositionConsoleTab.css`
- [ ] Renders when `activeConsoleTab === 'composition'` (controlled by `ConsolePanel`, Issue 4)
- [ ] Renders a scrollable container with a list of `<ChordItem />` components (one per chord in the sequence from audioStore chord state)
- [ ] `ChordItem` renders a placeholder until Issue 15 — the shell demonstrates the list structure with placeholder items
- [ ] Add the following CSS custom properties to `CompositionConsoleTab.css` for use by child components:
  - `--palette-cell-size`: width/height of each note cell (e.g. `2.5rem`)
  - `--palette-cell-gap`: gap between cells (e.g. `0.25rem`)
  - `--piano-key-white-width`, `--piano-key-black-width`: key dimensions for the popover
  - `--piano-key-white-height`, `--piano-key-black-height`: key heights
  - Values should be consistent with the existing color theme (`assets/color-theme.json`)
- [ ] No functional chord-editing logic in this issue — the component body is a shell only
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] All interactive elements meet the 44×44px minimum touch target size (WCAG 2.5.5)
- [ ] App compiles with no TypeScript errors after this issue

## Acceptance Criteria
- [ ] `CompositionConsoleTab` renders when `activeConsoleTab === 'composition'`
- [ ] Placeholder `ChordItem` list renders in a scrollable container
- [ ] All five CSS custom properties are defined and accessible to child components
- [ ] No functional chord-editing logic present (that is Issues 15 and 16)
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing UI

## Source Reference
- `src/components/console/CompositionConsoleTab.tsx` (new)
- `assets/color-theme.json` — color tokens
- Copilot instructions: "All interactive UI (transport, navigation, controls) lives inside GlassViewport only."

---

<!-- ============================================================ -->
<!-- ISSUE 15: Build Chord Item Component                         -->
<!-- ============================================================ -->

## [M8.4-15] Build Chord Item Component

## Feature Description
Build the `ChordItem` repeating list component used inside `CompositionConsoleTab`. Each `ChordItem` represents one chord in the sequence and exposes three actions: a Notes button that opens `PianoKeyPopover` (Issue 16), a Delete Chord button with confirmation, and an Add Chord Here button with confirmation.

Depends on: **Issue 14** (`CompositionConsoleTab` shell and CSS tokens), **Issue 0k** (Radix installed), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/console/ChordItem.tsx` and `ChordItem.css`
- [ ] Props: `chord` (chord data from audioStore), `index: number`, `onDelete: () => void`, `onAddAfter: () => void`, `onNotesChange: (notes: string[]) => void`
- [ ] **Notes Button:**
  - Clicking opens `<PianoKeyPopover>` (Issue 16) anchored to this `ChordItem`
  - Passes the chord's current notes and an `onConfirm` callback that calls `onNotesChange`
  - **Radix:** `@radix-ui/react-popover` → `Popover.Root` + `Popover.Trigger` + `Popover.Portal` + `Popover.Content` + `Popover.Close`
  - Only one popover open at a time across all `ChordItem`s (manage via index tracking in `CompositionConsoleTab`)
- [ ] **Delete Chord Button With Confirmation:**
  - **Radix:** `@radix-ui/react-alert-dialog` → `AlertDialog.Root` + `AlertDialog.Trigger` + `AlertDialog.Portal` + `AlertDialog.Overlay` + `AlertDialog.Content` + `AlertDialog.Title` + `AlertDialog.Description` + `AlertDialog.Action` + `AlertDialog.Cancel`
  - On confirm: calls `onDelete()` which removes this chord from the sequence via audioStore
- [ ] **Add Chord Here Button With Confirmation:**
  - **Radix:** `@radix-ui/react-alert-dialog` for a non-destructive confirmation ("Add a new chord after this one?")
  - On confirm: calls `onAddAfter()` which inserts a new chord after this position in the sequence via audioStore
- [ ] All buttons meet minimum 44×44px touch target size (WCAG 2.5.5)
- [ ] Use only design tokens from Issue 1 and CSS tokens from Issue 14 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- Each `ChordItem` is a pure UI component — it receives chord data as props and delegates mutations upward via callbacks. It does not write to audioStore directly.
- `CompositionConsoleTab` owns the audioStore subscription and passes data + action handlers down to each `ChordItem`.
- The Notes popover should be controlled by an `openChordIndex: number | null` state in `CompositionConsoleTab` to ensure only one popover is open at a time across all items.

## Acceptance Criteria
- [ ] All interactive elements meet the 44×44px minimum touch target size
- [ ] Notes button opens `PianoKeyPopover` anchored to the chord item; only one popover open at once
- [ ] Delete confirmation uses AlertDialog; confirm removes the chord; cancel dismisses without change
- [ ] Add Chord Here confirmation uses AlertDialog; confirm inserts a chord after this position
- [ ] `ChordItem` renders correctly within the scrollable list of `CompositionConsoleTab`
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback

---

<!-- ============================================================ -->
<!-- ISSUE 14a: Add BPM Control to Composition Console           -->
<!-- ============================================================ -->

## [M8.4-14a] Add BPM Control to Composition Console

## Feature Description
Move the global BPM control into the Composition Console so composers can set tempo alongside sequence editing. This control replaces the BPM stepper previously planned in World Options.

## Implementation Details
- [ ] Add a `BPMControl` sub-component to `CompositionConsoleTab` that includes a numeric readout and Dual Speed Stepper (−5, −1, +1, +5)
- [ ] Read/write via `useAudioStore.getState().bpm` and `setBPM()` (ensure `setBPM()` updates `Tone.Transport.bpm.value` safely)
- [ ] Ensure step buttons meet 44×44px target and integrate with Composition layout tokens

## Acceptance Criteria
- [ ] BPM Control renders in `CompositionConsoleTab`
- [ ] Dual speed stepper updates `audioStore.bpm` and `Tone.Transport.bpm.value`
- [ ] Control meets touch target accessibility and compiles with no TypeScript errors


## Source Reference
- File: `src/components/console/ChordItem.tsx` (new), `src/components/console/CompositionConsoleTab.tsx` (Issue 14)
- Copilot instructions: "All interactive UI (transport, navigation, controls) lives inside GlassViewport only."

---

<!-- ============================================================ -->
<!-- ISSUE 16: PianoKeyPopover Component                          -->
<!-- ============================================================ -->

## [M8.4-16] PianoKeyPopover Component

## Feature Description
Build `PianoKeyPopover` — a floating piano keyboard UI that appears anchored to the Notes button on a `ChordItem`. The user selects a replacement note name from the 12 chromatic pitch classes, with a ♯/♭ toggle to switch black key label spellings. Confirming a selection calls back to `ChordItem` with the chosen note name string.

**Radix note:** The popover anchoring, focus trapping, Escape-to-close, and portal are all handled by `@radix-ui/react-popover` (wired in Issue 15 via `ChordItem`). This issue implements the piano keyboard content rendered inside `Popover.Content`. For the ♯/♭ toggle, use `@radix-ui/react-toggle` → `Toggle.Root` for correct `aria-pressed` semantics. For the Confirm/Cancel close button, use `Popover.Close`.

Depends on: **Issue 0k** (Radix installed), **Issue 14** (CSS tokens), **Issue 15** (`ChordItem` wires this component in via the Notes button).

## Implementation Details
- [ ] Create `src/components/ui/PianoKeyPopover.tsx` and `PianoKeyPopover.css`
- [ ] **Radix:** The floating panel is implemented with `@radix-ui/react-popover` (provided by `ChordItem` as the outer `Popover.Root` + `Popover.Content`). `PianoKeyPopover` renders as the content inside `Popover.Content`; it does not manage its own open/close state or positioning.
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

<!-- NOTE: Issue 16a (Measure CRUD) has been removed — Add/Delete Chord actions are now
     built directly into ChordItem (Issue 15) via the Add Chord Here and Delete Chord buttons. -->