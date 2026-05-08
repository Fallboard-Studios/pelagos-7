# M8: UI / HUD Issues

**Milestone:** M8 - UI / HUD  
**Timeline:** Week 8  
**Goal:** A clean, minimal in-world HUD that lets users control playback, global audio, and individual robots

---

## M8.1: UI Design Spike and Component Library Selection

**Title:** [M8.1] Design HUD wireframes and select component library

**Labels:** research, system: ui, size: M

### Feature Description
Before building any controls, agree on the visual design and the component library (if any) that will back it. The library choice feeds directly from the design — if controls need unstyled primitives, Radix UI alone is sufficient; if richer defaults are needed, Mantine or shadcn/ui may save time. The output of this ticket is a wireframe/mockup and a confirmed library decision, both of which unblock all subsequent M8 tickets.

### Implementation Details

**Scope of the design:**
- HUD is a transparent overlay that sits above the SVG canvas at all times after play starts
- Three zones to lay out:
  - **Playback zone** (bottom-left or top-left): Play/Pause icon button + Volume slider
  - **Menu zone** (top-right or bottom-right): Single hamburger / menu icon button
  - **Menu panel**: Slides in from the right (or appears as a bottom sheet on narrow viewports); contains BPM control, "Edit Robots" entry, FAQ entry
- Aesthetic: dark frosted-glass panels, post-apocalyptic industrial feel — consistent with the existing ocean color theme

**Library evaluation criteria:**
| Criterion | Why it matters |
|---|---|
| Bundle size | Hosted on GitHub Pages; keep total JS lean |
| CSS control | Dark custom aesthetic; library must not impose opinionated defaults |
| Accessibility | Keyboard nav, ARIA roles for sliders, dialogs, toggles |
| TypeScript quality | Strict mode throughout |
| Components needed | Slider, Toggle/Button, Dialog or Sheet, Popover |

**Candidates:**
1. **Radix UI primitives only** (`@radix-ui/react-slider`, `@radix-ui/react-dialog`, etc.) — zero styling, full CSS control, smallest bundle. Recommended if the design stays minimal.
2. **shadcn/ui** — Radix under the hood + copy-paste components styled with Tailwind. Good defaults but requires adding Tailwind to the build.
3. **Mantine** — full component library, great DX, heavier (~80 kB gzip). Worth it only if many components are needed.

**Recommended default:** Radix UI primitives + existing custom CSS. Only ~5 component types are needed; a full library adds more weight than it saves.

**Wireframe deliverable:**
- Sketch (even hand-drawn / Excalidraw) showing HUD zone placement, menu panel layout, and robot editor panel layout
- Annotate which Radix (or other) primitive maps to each control

### Acceptance Criteria
- [ ] Wireframe or mockup produced and attached/linked in this issue
- [ ] Library decision recorded in a brief ADR comment on this issue
- [ ] Library (if any) added to `package.json` and verified to compile
- [ ] No functional code written yet — this is design + setup only
- [ ] All M8.2–M8.7 ticket assignees have reviewed the wireframe

### Reference
- `src/App.tsx` — current layout (PlayButton overlay + OceanScene)
- `src/components/PlayButton.tsx` — existing control to replace/absorb
- `assets/color-theme.json` — color tokens for theming

---

## M8.2: HUD Shell Layout

**Title:** [M8.2] Create persistent HUD overlay shell with zone layout

**Labels:** feature, system: ui, size: S

### Feature Description
Create the structural overlay component that sits above the SVG canvas after audio starts. This ticket is pure layout — no controls yet, just the container with correct positioning, z-index, pointer-event passthrough on empty areas, and the established zone slots.

### Implementation Details
- Create `src/components/hud/HUD.tsx` and `HUD.css`
- The HUD is a `position: fixed; inset: 0` wrapper with `pointer-events: none`; child zones re-enable `pointer-events: auto` only on actual controls so clicks pass through to the SVG underneath
- Three child containers:
  ```
  <div className="hud-playback-zone">   {/* bottom-left */}
  <div className="hud-menu-zone">       {/* bottom-right */}
  <div className="hud-menu-panel">      {/* slide-in panel, hidden by default */}
  ```
- `HUD` accepts a single `isVisible: boolean` prop; when false it renders nothing (used before audio starts)
- Mount `<HUD isVisible={isAudioReady} />` in `App.tsx` alongside `<OceanScene />`
- Remove `<AudioStatus />` debug overlay from production build (keep under `DEV_TUNING` guard)
- No controls inside yet — just the skeleton and CSS custom properties for panel background, border, radius sourced from the color theme

### Acceptance Criteria
- [ ] `HUD.tsx` created in `src/components/hud/`
- [ ] Overlay does not block SVG mouse events in empty areas
- [ ] Three zone containers present with correct CSS positioning
- [ ] `isVisible={false}` renders null
- [ ] `App.tsx` mounts `<HUD>` and passes `isAudioReady`
- [ ] No visual regression on `OceanScene` interaction

### Reference
- `src/App.tsx` — mount point
- `src/components/PlayButton.tsx` — currently the only overlay; this sits alongside it until M8.3 replaces it

---

## M8.3: Play/Pause Toggle

**Title:** [M8.3] Add persistent play/pause toggle to HUD, absorb Web Audio unlock

**Labels:** feature, system: audio, size: S

### Feature Description
The current `PlayButton` overlay disappears after the Web Audio API is unlocked — there is no way to pause the music once it starts. Replace this flow with a persistent play/pause icon button in the HUD playback zone. The first press unlocks Web Audio and starts the Transport; subsequent presses toggle `Transport.start()` / `Transport.stop()`.

### Implementation Details
- Create `src/components/hud/PlayPauseButton.tsx`
- The component manages three internal states internally: `'locked'` (Web Audio not yet started), `'playing'`, `'paused'`
- On first click (`'locked'` state): call `AudioEngine.start()` as before; on success transition to `'playing'`
- On subsequent clicks: toggle `Tone.getTransport().start()` / `Tone.getTransport().stop()`; update local state
- Display: use SVG icon or unicode — `▶` (play) and `⏸` (pause); no text label needed
- Remove `<PlayButton>` from `App.tsx` once this is wired in — `PlayPauseButton` inside the HUD covers the same unlock responsibility
  - Note: the `onSuccess` callback in `App.tsx` (`handleAudioReady`) wires `subscribeToMeasure`; this wiring must move into the new button's success handler or remain in `App.tsx` via the same callback pattern
- Keep the loading/error states from the original `PlayButton` for the initial unlock phase

```typescript
// State machine
type PlayPauseState = 'locked' | 'loading' | 'playing' | 'paused' | 'error';
```

### Acceptance Criteria
- [ ] First click starts audio (Web Audio unlock + Transport play)
- [ ] Subsequent clicks toggle play / pause correctly
- [ ] Button icon reflects current state (play icon when paused, pause icon when playing)
- [ ] Error state displayed if `AudioEngine.start()` fails
- [ ] `<PlayButton>` overlay removed from `App.tsx`
- [ ] `subscribeToMeasure` wiring is preserved (measures still tick)
- [ ] No `setTimeout` or `setInterval` introduced

### Reference
- `src/components/PlayButton.tsx` — logic to absorb
- `src/App.tsx` — `handleAudioReady` / `subscribeToMeasure` wiring
- `src/engine/AudioEngine.ts` — `AudioEngine.start()`

---

## M8.4: Global Volume Slider

**Title:** [M8.4] Add global volume slider to HUD playback zone

**Labels:** feature, system: audio, size: S

### Feature Description
A vertical or horizontal slider in the HUD playback zone that controls the master output volume. Dragging it down fades all audio; dragging it back up restores it. The control targets `Tone.Destination.volume` (in dB) rather than a 0–1 linear scale, since the Web Audio gain is perceptually logarithmic.

### Implementation Details
- Create `src/components/hud/VolumeSlider.tsx`
- Slider range: `-40 dB` (near-silent) to `0 dB` (full) — map the UI range 0–100 to this dB range
- Conversion:
  ```typescript
  // UI value 0-100 → dB
  function uiToDB(value: number): number {
    if (value <= 0) return -Infinity; // mute
    return -40 + (value / 100) * 40; // -40 dB → 0 dB
  }
  ```
- On change: `Tone.getDestination().volume.value = uiToDB(value)`
- Default UI value: `80` (~-8 dB — leaves headroom)
- Use the component library slider primitive chosen in M8.1 (Radix `@radix-ui/react-slider` recommended)
- Do NOT store volume in Zustand — it is audio hardware state, not application state

### Acceptance Criteria
- [ ] Slider renders in HUD playback zone alongside play/pause button
- [ ] Dragging fully left/down silences audio
- [ ] Dragging fully right/up matches previous perceived loudness
- [ ] Default position corresponds to ~-8 dB
- [ ] Volume change is smooth (no clicks/pops — use `volume.rampTo()` if needed)
- [ ] Value not stored in Zustand or React state that causes re-renders

### Reference
- `src/components/hud/HUD.tsx` — playback zone slot
- Tone.js docs: `Tone.getDestination().volume`

---

## M8.5: Main Menu Panel with BPM Control

**Title:** [M8.5] Implement main menu panel with BPM slider

**Labels:** feature, system: ui, size: S

### Feature Description
A menu icon button in the HUD menu zone toggles a slide-in panel (or popover). The panel contains: a BPM slider, an "Edit Robots" button linking to the robot editor (M8.6), and a "FAQ" button opening the FAQ overlay (M8.7). This ticket covers the panel shell and the BPM control only; robot editor and FAQ are separate tickets.

### Implementation Details
- Create `src/components/hud/MenuButton.tsx` — icon button that toggles panel open/closed
- Create `src/components/hud/MenuPanel.tsx` — the panel itself; controlled by a `isOpen: boolean` + `onClose: () => void` prop pair
- Panel open/close animation: GSAP `gsap.to(panelRef.current, { x: 0 })` slide-in from the right; no CSS transitions
- **BPM slider:**
  - Range: `60–180 BPM`
  - On change: `Tone.getTransport().bpm.value = value` AND `useOceanStore.getState().settings.bpm = value`
    - BPM is the one exception stored in state because it affects beat-based game logic (spawn intervals, day/night cycle)
  - Display current value numerically next to the slider
- Panel sections for Robot Editor and FAQ are placeholder buttons for now; they will be wired in M8.6 and M8.7

```typescript
interface MenuPanelProps {
  isOpen: boolean;
  onClose: () => void;
}
```

### Acceptance Criteria
- [ ] Menu button in HUD menu zone toggles panel open/closed
- [ ] Panel slides in/out with GSAP (no CSS transitions)
- [ ] BPM slider range 60–180, current value displayed
- [ ] Changing BPM updates `Tone.Transport.bpm.value` immediately
- [ ] Changing BPM updates `settings.bpm` in the Zustand store
- [ ] "Edit Robots" and "FAQ" placeholder buttons present (non-functional until M8.6/M8.7)
- [ ] Panel close button / click-outside closes the panel

### Reference
- `src/components/hud/HUD.tsx` — menu zone slot
- `src/stores/oceanStore.ts` — `settings.bpm`
- `src/engine/beatClock.ts` — Transport is the source of truth for musical timing

---

## M8.6: Robot Editor Sub-Menu

**Title:** [M8.6] Implement robot editor with real-time CRUD of audio attributes

**Labels:** feature, system: ui, size: L

### Feature Description
A secondary panel (or full-screen overlay) that lists all active robots and allows the user to view and edit each robot's audio and musical attributes in real time. Changes apply immediately and affect both the visual appearance (via re-derived colors/scale) and the sound (via `AudioEngine`). Robots can also be manually spawned or removed from here.

### Implementation Details
- Create `src/components/hud/RobotEditor.tsx`
- Triggered by the "Edit Robots" button in `MenuPanel`; opens as a second slide-in panel or a dialog over the main panel
- **Robot list view:** scrollable list of all robots; each row shows robot ID (shortened), synth type badge, and an "Edit" button
- **Robot detail view** (opens on "Edit"): sliders/selects for all editable attributes:

| Attribute | Control | Range |
|---|---|---|
| `synthType` | Select / button group | waveform (sine / square / triangle / sawtooth) or `layeredWave` descriptor |
| `adsr.attack` | Slider | 0.01–2.0 s |
| `adsr.decay` | Slider | 0.05–2.0 s |
| `adsr.sustain` | Slider | 0.0–1.0 |
| `adsr.release` | Slider | 0.05–4.0 s |
| `filterFreq` | Slider | 0–8000 Hz |
| `reverb` | Slider | 0.0–1.0 |
| `masterVolume` | Slider | 0.0–1.0 |

> **Note:** `octaveOffset` and note indices are set by the robot at spawn time and are not user-editable. The robot editor exposes timbre/envelope attributes only.

- On any change: call `useOceanStore.getState().updateRobot(id, { audioAttributes: { ...updated } })` — visual and audio derive from state automatically
- **Create**: "Spawn Robot" button calls `spawnRobot()` with default/random attributes
- **Delete**: "Remove" button on each list row calls `removeRobot(id)`
- Changes are live — no "save" step needed; the store is the source of truth

### Acceptance Criteria
- [ ] Robot list shows all active robots from the store
- [ ] List updates in real time as robots spawn or are removed
- [ ] Each attribute control updates the store on change
- [ ] Visual changes (color, scale) reflect attribute edits without page reload
 - [ ] Audio changes (waveform / layeredWave, ADSR) apply on the next scheduled note
- [ ] "Spawn Robot" button works; new robot appears in list
- [ ] "Remove" button removes robot from store and scene
- [ ] No non-serialisable data stored in Zustand (no direct synth refs)
- [ ] Panel closes cleanly and clears any local form state

### Reference
- `src/stores/oceanStore.ts` — `updateRobot()`, `removeRobot()`, `robots` array
- `src/systems/spawnSystem.ts` — `spawnRobot()`
- `src/types/Robot.ts` — full `Robot` and `AudioAttributes` interfaces
- `src/engine/AudioEngine.ts` — changes take effect on next note trigger automatically

---

## M8.7: FAQ Overlay

**Title:** [M8.7] Implement FAQ overlay panel

**Labels:** feature, system: ui, size: S

### Feature Description
A full-screen or large modal overlay containing static informational content about the project — what Pelagos-7 is, how robots generate music, and how to interact. Triggered by the "FAQ" button in the main menu panel. Content is static markdown-style text; no data fetching required.

### Implementation Details
- Create `src/components/hud/FAQOverlay.tsx`
- Implemented as a dialog/modal (Radix `@radix-ui/react-dialog` or equivalent from chosen library)
- Covers the full viewport with a semi-transparent dark backdrop; the content panel scrolls if text overflows
- Dismiss: close button, `Escape` key, or click on backdrop
- GSAP fade-in/fade-out on open/close (`opacity: 0 → 1`)
- Content sections (copy to be finalised, placeholder text acceptable in v1):
  - **What is Pelagos-7?** — Brief project description
  - **How does the music work?** — Robots, melody loops, harmony cycles
  - **What do the robot colours mean?** — Audio-to-visual mapping summary (M7)
  - **Controls** — Play/pause, volume, BPM, robot editor
- Store `isOpen` state locally in `FAQOverlay` or lift to `MenuPanel` — either is fine since it has no side effects on the store

### Acceptance Criteria
- [ ] FAQ overlay opens from the "FAQ" button in `MenuPanel`
- [ ] Backdrop covers full viewport; does not interact with scene underneath
- [ ] Dismissible via close button, `Escape`, and backdrop click
- [ ] GSAP fade animation on open/close (no CSS transitions)
- [ ] All four content sections present (placeholder copy acceptable)
- [ ] Accessible: focus trapped inside overlay while open, returns on close
- [ ] No Zustand state used — overlay open/close is purely local UI state

### Reference
- `src/components/hud/MenuPanel.tsx` — trigger button
- `src/components/hud/HUD.tsx` — z-index layering context
