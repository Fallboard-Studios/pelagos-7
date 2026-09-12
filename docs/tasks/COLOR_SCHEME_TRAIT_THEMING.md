# Implementation Plan: Visual Identity — Color Scheme & Trait-Based Theming (Roadmap Phase 14)

Source spec: [docs/specs/COLOR_SCHEME_TRAIT_THEMING.md](../specs/COLOR_SCHEME_TRAIT_THEMING.md). Source intent: [docs/intent/color-scheme-trait-theming.md](../intent/color-scheme-trait-theming.md).

## Overview

Replace the static "Ballast" 4-token palette with a system-wide, trait-based scheme: 7 traits, each a
2-color pair drawn from `docs/reference/accent-colors.css`, feeding a small CSS custom-property
mechanism (`--color-accent-a`/`-b` → derived `--color-accent`/`--color-accent-gradient`) that every
existing `--color-accent` consumer already reads with zero code changes. Each of the 12 robots
additionally gets its own seeded flat identity color, reusing the identical mechanism. No new
dependency, no Tone.js/audio-engine file touched, no GSAP timeline added.

## Architecture Decisions

- **Foundations land before any wiring, in the order the CSS cascade actually needs them.** The color
  sources (`accentColors.ts` → `traits.ts` → `traitColors.ts`) must exist before anything can reference
  them; the CSS mechanism (`index.css`'s new tokens) must exist before the 3 `background-color`→
  `background` swaps and `voxelTrackMath.ts`'s gradient branch have anything real to point at; and
  `AccordionContainer`'s new `style` prop must exist before any of the 4 Robot Options drawer components
  can forward one. This mirrors `docs/tasks/LFO_DRIFT.md`'s own "seed plumbing before the engine that
  consumes it" ordering.
- **Robot identity-color seeding is isolated to its own task, ahead of all wiring**, because it's the
  one foundation task with a real ripple risk: adding a required `identityColor: string` field to
  `Robot` will make `npm run build:types` surface every literal `Robot` object across `src/` that
  doesn't yet set it (not just `spawnSystem.ts`) — the same class of risk `docs/tasks/LFO_DRIFT.md`'s
  own Task 1 called out for a required field on `GlobalAudioSettings`. Landing this alone, before any
  wiring task depends on `robot.identityColor` being readable, means that ripple gets fixed and verified
  in one focused pass rather than discovered mid-wiring.
- **The 11 wiring call sites split by file-touch shape, not strictly by the spec's own table order.**
  `AudioRigDrawer.tsx`'s 2 regions (the 3 accordion groups + Transport & Composition) are one task —
  same file, same mechanical wrapper-`<div>` pattern, no reason to split. The 4 Robot Options drawer
  components each need an identical one-line `style` prop addition — split into 2 tasks of 2 components
  each to stay near the ~5-file guideline once tests are counted, not because there's any real
  dependency between them. `RobotOptionsTab.tsx` (which both sets the robot-color root *and* passes the
  4 trait styles down) is sequenced after both of those drawer tasks, since it needs their new `style`
  prop to exist before it can pass one.
- **The spec's own §7 open item #3 (`docs/COMPONENT_LIBRARY.md` needs a one-line note for
  `AccordionContainer`'s new prop) is included here as a real task**, not left implicit — it was flagged
  in the spec specifically so it wouldn't be missed at this stage.
- **Docs land last**, once the shipped wiring is real and spot-checkable, matching `docs/tasks/
  LFO_DRIFT.md`'s own Phase 5 precedent.
- **Expected interim visual change, not a bug:** once Task 4 (the CSS mechanism) ships but before any
  wiring task lands, the entire app's accent color changes from the old Ballast cyan (`#5fc9dc`) to the
  new ambient default (a white/dark-gray `color-mix()` midpoint — a neutral gray) everywhere, since
  nothing is yet scoped to a specific trait. This is intentional and temporary — call it out during
  Checkpoint 2 review so it isn't mistaken for a regression mid-implementation.

## Dependency Graph

```
Task 1 (accentColors.ts)
    │
    ├──→ Task 2 (traits.ts) ──→ Task 3 (traitColors.ts)
    │                                   │
    ├──→ Task 8 (Robot.identityColor)   │
    │                                   │
Task 4 (index.css mechanism)            │
    │                                   │
    ├──→ Task 5 (CSS gradient swaps)    │
    ├──→ Task 6 (voxelTrackMath.ts)     │
    │                                   │
Task 7 (AccordionContainer style prop)  │
    │                                   │
    ├──→ Task 10 (PingControls+PingContour)     ←── Task 3, Task 4
    ├──→ Task 11 (SignatureArray+AudioSetting)  ←── Task 3, Task 4
    │         │           │
    │         └───┬───────┘
    │             ▼
    │        Task 12 (RobotOptionsTab.tsx) ←── Task 3, Task 8
    │
Task 3, Task 4, Task 8 ──→ Task 13 (RobotSelectionCard.tsx)
Task 3 ──→ Task 14 (CompanyManager + SectorSettingsDrawer)
Task 3, Task 4 ──→ Task 15 (Header.tsx)

Task 9 (AudioRigDrawer.tsx) ←── Task 3, Task 4

Tasks 9, 12, 13, 14, 15 ──→ Task 16 (docs/CONSOLE_THEMING.md)
Task 7 ──→ Task 17 (docs/COMPONENT_LIBRARY.md)
```

## Task List

### Phase 1: Color & type foundations

- [x] **Task 1: `src/constants/accentColors.ts` — the palette source**

  **Description:** Transcribe `docs/reference/accent-colors.css`'s 16 hex values into `ACCENT_COLORS`
  (spec §4), plus `ROBOT_IDENTITY_COLOR_NAMES` (the 13 hue keys, excluding `black`/`white`/`darkGray`).

  **Acceptance criteria:**
  - [x] `ACCENT_COLORS` has exactly 16 keys, each hex value matching `docs/reference/accent-colors.css`
    byte-for-byte.
  - [x] `ROBOT_IDENTITY_COLOR_NAMES` has exactly 13 entries and excludes `black`/`white`/`darkGray`.
  - [x] No other file in the repo hardcodes any of these 16 hex values (spot-check — this is the single
    source per spec §1.1/§3).

  **Verification:**
  - [x] `npx vitest run src/constants/accentColors.test.ts` passes.
  - [x] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/constants/accentColors.ts`, `src/constants/accentColors.test.ts`

  **Estimated scope:** S (1 new file, static data)

- [x] **Task 2: `src/types/traits.ts` — the `Trait` union**

  **Description:** Add `Trait` (the 7-member union) and `TRAIT_IDS` (spec §1.3).

  **Acceptance criteria:**
  - [x] `Trait` has exactly the 7 members: `'spectral' | 'timeSpace' | 'output' | 'composition' |
    'company' | 'seed' | 'header'`.
  - [x] `TRAIT_IDS` contains all 7, matching `Trait` exactly (a runtime-testable "all variants covered"
    assertion, following `CONTROL_SCHEMA_TYPES`'s existing precedent in `src/types/controls.ts`).

  **Verification:**
  - [x] `npx vitest run src/types/traits.test.ts` passes.
  - [x] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/types/traits.ts`, `src/types/traits.test.ts`

  **Estimated scope:** XS (1 union type + 1 const array)

- [x] **Task 3: `src/utils/traitColors.ts` — the trait→color lookup and style helpers**

  **Description:** Add `TRAIT_COLORS` (the 7 hand-picked pairs from spec §1.3/§4) and
  `getTraitColorStyle`/`getRobotColorStyle`.

  **Acceptance criteria:**
  - [x] `TRAIT_COLORS` has exactly one entry per `TRAIT_IDS` member, each a 2-tuple of distinct
    `ACCENT_COLORS` values, matching spec §1.3's table exactly (spectral: cyan/teal, timeSpace:
    blue/plum, output: red/orange, composition: green/lime, company: purple/pink, seed:
    tangerine/yellow, header: white/darkGray).
  - [x] `ACCENT_COLORS.beige` does not appear in any trait pair (deliberately reserved, spec §1.3).
  - [x] `getTraitColorStyle(trait)` returns `{ '--color-accent-a': <first>, '--color-accent-b': <second> }`.
  - [x] `getRobotColorStyle(color)` returns both properties set to the same given value.

  **Verification:**
  - [x] `npx vitest run src/utils/traitColors.test.ts` passes.
  - [x] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** Task 1, Task 2.

  **Files:** `src/utils/traitColors.ts`, `src/utils/traitColors.test.ts`

  **Estimated scope:** S (1 lookup table + 2 small pure functions)

### Checkpoint: Color & type foundations
- [x] `npm run build:types`, `npm run lint` clean. `npx vitest run` (full suite): 2367/2368 pass — the
  one failure (`src/systems/audioSwells.test.ts`) is pre-existing and unrelated (no import path to any
  file this phase touched; passes 65/65 in isolation, so it's a cross-file test-isolation flake in the
  full run, not a regression from Tasks 1-3). Not fixed here — out of scope per this plan's own file list.
- [x] No visible app change yet — these 3 files aren't imported by any rendering code until Phase 2+.
- [ ] Review with human before proceeding.

---

### Phase 2: CSS mechanism (parallelizable with Phase 1)

- [x] **Task 4: `src/index.css` — the `--color-accent-a`/`-b` mechanism**

  **Description:** Replace the single literal `--color-accent` line with the 4-line block from spec
  §1.2/§4: `--color-accent-a`/`-b` base tokens (Header's own pair — white/dark-gray), `--color-accent`
  derived via `color-mix()`, `--color-accent-gradient` derived via `linear-gradient()`. Delete the stale
  `assets/color-theme.json` comment on this block (predates this phase, unrelated — spec §2).
  `--color-bg`/`--color-surface`/`--color-border`/text tokens are untouched.

  **Acceptance criteria:**
  - [x] `--color-accent-a`/`--color-accent-b` exist in `:root` with the Header pair's values.
  - [x] `--color-accent` is `color-mix(in srgb, var(--color-accent-a) 50%, var(--color-accent-b) 50%)`,
    not a literal hex.
  - [x] `--color-accent-gradient` is `linear-gradient(135deg, var(--color-accent-a), var(--color-accent-b))`.
  - [x] `--color-bg`/`--color-surface`/`--color-border`/`--color-text-primary`/`--color-text-muted`
    values are byte-for-byte unchanged.
  - [x] The stale `assets/color-theme.json` reference comment is gone.

  **Verification:**
  - [x] `npm run build`, `npm run dev` — app loads with no console/build errors.
  - [ ] Manual check: every focus-ring outline, `CabinetBox` face tint, and glow now renders in a neutral
    gray (the new ambient default) instead of the old cyan — expected per this plan's own Architecture
    Decisions note, not a bug to chase.

  **Dependencies:** None.

  **Files:** `src/index.css`

  **Estimated scope:** XS (one token block)

- [x] **Task 5: Gradient swap — `CabinetBox.css`, `Button.css`, `RadioButton.css`**

  **Description:** In each file's one relevant rule (`.sc-cabinet-box__backing`, `Button`'s filled front
  face, `RadioButton`'s selected-segment fill), change `background-color: var(--color-accent)` to
  `background: var(--color-accent-gradient)` (spec §1.2/§4).

  **Acceptance criteria:**
  - [x] All 3 rules use `background: var(--color-accent-gradient)`.
  - [x] No other rule in any of the 3 files is touched (each file's `outline`/`color-mix()`/`drop-shadow`
    rules stay on `--color-accent`, per spec §1.2 — they require a solid `<color>`, not a gradient).

  **Verification:**
  - [x] `npx vitest run` for each component's existing test file (`CabinetBox.test.tsx`,
    `Button.test.tsx`, `RadioButton.test.tsx`) — 102/102 pass, unaffected, since these are pure CSS
    changes with no prop/behavior change. New source-content coverage added in
    `accentGradientFill.test.ts` (6 tests) using the existing `getCssRuleBody` helper.
  - [ ] Manual check (not yet done — needs a browser): a `Button`, a filled backing, and a selected
    `RadioButton` segment each show a visible diagonal 2-tone gradient rather than a flat fill.

  **Dependencies:** Task 4.

  **Files:** `src/components/ui/controls/CabinetBox.css`, `src/components/ui/controls/Button.css`, `src/components/ui/controls/RadioButton.css`

  **Estimated scope:** XS (3 files, one line each)

- [x] **Task 6: `voxelTrackMath.ts` — `computeVoxelFillBackground`'s 100%-filled branch**

  **Description:** Change the `fillPercent >= 100` branch's return value from `'var(--color-accent)'`
  to `'var(--color-accent-gradient)'` (spec §1.2/§4). The `fillPercent <= 0` branch and the partial-fill
  branch are unchanged.

  **Acceptance criteria:**
  - [x] `computeVoxelFillBackground(100, ...)` and `(150, ...)` (clamped-above-100 case) both return
    `'var(--color-accent-gradient)'`.
  - [x] `computeVoxelFillBackground(0, ...)` still returns `'var(--color-surface)'`.
  - [x] Every partial-fill (`0 < fillPercent < 100`) return value is byte-for-byte unchanged from before
    this task — still the flat two-color `linear-gradient()` between `--color-accent` and
    `--color-surface` (spec §1.2's deliberate scope-narrowing — do not touch this branch).

  **Verification:**
  - [x] `npx vitest run src/utils/voxelTrackMath.test.ts` passes (58/58), with the 100%-filled assertions
    updated to expect the new value and every partial-fill assertion left untouched. `VoxelTrack.test.tsx`
    (the real consumer) also verified: 27/27 pass.
  - [x] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** Task 4.

  **Files:** `src/utils/voxelTrackMath.ts`, `src/utils/voxelTrackMath.test.ts`

  **Estimated scope:** XS (1 return value in 1 existing function)

### Checkpoint: CSS mechanism
- [x] `npm run build:types`, `npm run lint`, `npm run build` clean. `npx vitest run` (full suite):
  2380/2380 pass — the `audioSwells.test.ts` flake noted at the Phase 1 checkpoint did NOT recur this
  run, confirming it was a flake and not a regression from this phase's own work.
- [ ] Manual check (not yet done — needs a browser): a fully-filled `VoxelTrack` box (e.g. a slider
  dragged to its max) shows the same 2-tone gradient a `Button`/filled `RadioButton` segment does; a
  partially-filled box's straddle segment still shows the flat (non-gradient) split, per Task 6's own
  scope limit.
- [ ] Review with human before proceeding.

---

### Phase 3: `AccordionContainer` prop (parallelizable with Phases 1-2)

- [ ] **Task 7: `AccordionContainer.tsx` — new optional `style` prop**

  **Description:** Add `style?: CSSProperties` to `AccordionContainerProps`, forwarded to
  `Accordion.Root` (spec §1.5.1/§4).

  **Acceptance criteria:**
  - [ ] Passing `style={{ '--foo': 'bar' }}` to `AccordionContainer` results in that custom property
    being present on the rendered `Accordion.Root` element.
  - [ ] Omitting `style` produces byte-for-byte the same rendered output as before this task (every
    existing `AccordionContainer` consumer is unaffected).

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/AccordionContainer.test.tsx` passes, with a new test
    for the `style` prop added and every existing test passing unmodified.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/components/ui/controls/AccordionContainer.tsx`, `src/components/ui/controls/AccordionContainer.test.tsx`

  **Estimated scope:** XS (1 optional prop, forwarded)

### Checkpoint: `AccordionContainer` prop
- [ ] `npm run build:types`, `npm run lint`, `npm test` clean.
- [ ] Review with human before proceeding (can happen in parallel with Checkpoints 1-2).

---

### Phase 4: Robot identity color

- [ ] **Task 8: `Robot.identityColor` — field + seeded generation**

  **Description:** Add `identityColor: string` to `Robot` (`src/types/Robot.ts`) and
  `generateRobotIdentityColor(noiseMap, offset)` to `spawnSystem.ts`, wired into the `robot: Robot =
  {...}` literal in `spawnInitialRoster`, following `generateRobotName`'s exact existing shape (spec
  §1.4/§4).

  **Acceptance criteria:**
  - [ ] Every spawned robot has an `identityColor` that's a hex value from `ROBOT_IDENTITY_COLOR_NAMES`'s
    resolved set.
  - [ ] Identical `(noiseMap, spawnCount)` input produces the same `identityColor` on repeated calls
    (determinism, matching every other seeded field's existing coverage in this file).
  - [ ] At least 2 of the 12 robots in a fixed-seed roster have different `identityColor` values (not a
    constant collapse).
  - [ ] `npm run build:types` surfaces every other literal `Robot` object in `src/` missing
    `identityColor` (test fixtures included) — **all of them are fixed as part of this task, not
    deferred**, per this plan's own Architecture Decisions note on this risk.

  **Verification:**
  - [ ] `npx vitest run src/systems/spawnSystem.test.ts` passes, including new determinism/
    non-degeneracy/membership assertions for `identityColor`.
  - [ ] `npm run build:types` clean (the real check for the ripple risk above — fix every newly-surfaced
    error, don't suppress).
  - [ ] `npm test` (full suite) passes — not just `spawnSystem.test.ts`, since other files (at minimum
    `collisionSystem.test.ts`, `lfoDebug.test.ts` — found constructing raw `Robot` literals directly; a
    broader `npm run build:types` pass may surface more) may need a trivial `identityColor` addition to
    their own fixtures.
  - [ ] `npm run lint` clean.

  **Dependencies:** Task 1 (`ACCENT_COLORS`/`ROBOT_IDENTITY_COLOR_NAMES`).

  **Files:** `src/types/Robot.ts`, `src/systems/spawnSystem.ts`, `src/systems/spawnSystem.test.ts`, plus any other test file `build:types`/`npm test` surfaces (expect at least `src/systems/collisionSystem.test.ts`, `src/engine/lfoDebug.test.ts`)

  **Estimated scope:** M (small logical change, but with a real, only-partially-boundable ripple across test fixtures — see verification)

### Checkpoint: Robot identity color
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Manual check: inspect two different spawned robots' `identityColor` in dev tools/state — confirm
  they differ and are both valid hex values.
- [ ] Review with human before proceeding.

---

### Phase 5: Wiring — Audio Rig

- [ ] **Task 9: `AudioRigDrawer.tsx` — trait-styled group wrappers**

  **Description:** Wrap each of the 3 `AUDIO_RIG_ACCORDION_GROUPS` entries' `<AccordionContainer>` and
  the `TRANSPORT_COMPOSITION_ACCORDION_SCHEMA`'s `<AccordionContainer>` in a `<div
  style={getTraitColorStyle(...)}>` (spec §1.5/§4 — `eqFilters`→`spectral`, `timeSpace`→`timeSpace`,
  `output`→`output`, Transport & Composition→`composition`). No change to `renderBlock()`,
  `LFO_DRIFT_GROUPS`, or `SignatureArrayDrawer` — both inherit their host's trait automatically per spec
  §1.6, confirmed to need no code here.

  **Acceptance criteria:**
  - [ ] Each of the 3 `AUDIO_RIG_ACCORDION_GROUPS` wrapper `<div>`s carries its expected trait's
    `--color-accent-a`/`-b` inline.
  - [ ] The Transport & Composition wrapper carries `composition`'s colors.
  - [ ] No wrapper or style is added anywhere inside `renderBlock()` or around any `LFO_DRIFT_GROUPS`
    entry — confirms spec §1.6's "no dedicated code" finding stays true.

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/console/AudioRigDrawer.test.tsx` passes, with new
    assertions on each group wrapper's inline style.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] Manual check: `npm run dev`, open Audio Rig — EQ & Filters, Time & Space, Output, and Transport &
    Composition each render in a visually distinct color; an EQ3 Drift slider (nested inside EQ &
    Filters) visibly matches EQ & Filters' own color, confirming the inheritance claim, not just the
    group wrapper's own color.

  **Dependencies:** Task 3, Task 4.

  **Files:** `src/components/panels/screen/console/AudioRigDrawer.tsx`, `src/components/panels/screen/console/AudioRigDrawer.test.tsx`

  **Estimated scope:** S (1 file, 4 wrapper `<div>`s following one pattern)

### Checkpoint: Audio Rig wiring
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Review with human before proceeding.

---

### Phase 6: Wiring — Robot Options

- [ ] **Task 10: `PingControlsDrawer.tsx` + `PingContourDrawer.tsx` — `style` prop**

  **Description:** Add an optional `style?: CSSProperties` prop to both components, forwarded to their
  own `<AccordionContainer schema={...} style={style}>` (spec §1.5/§4).

  **Acceptance criteria:**
  - [ ] Both components accept `style` and forward it unchanged to their `AccordionContainer`.
  - [ ] Omitting `style` at either call site produces the same rendered output as before this task.

  **Verification:**
  - [ ] `npx vitest run src/components/robot/PingControlsDrawer.test.tsx src/components/robot/PingContourDrawer.test.tsx` passes, each with a new `style`-forwarding test.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** Task 7.

  **Files:** `src/components/robot/PingControlsDrawer.tsx`, `src/components/robot/PingControlsDrawer.test.tsx`, `src/components/robot/PingContourDrawer.tsx`, `src/components/robot/PingContourDrawer.test.tsx`

  **Estimated scope:** S (2 components, identical one-line addition each)

- [ ] **Task 11: `SignatureArrayDrawer.tsx` + `AudioSettingSection.tsx` — `style` prop**

  **Description:** Same change as Task 10, applied to these 2 components.

  **Acceptance criteria:**
  - [ ] Both components accept `style` and forward it unchanged to their `AccordionContainer`.
  - [ ] Omitting `style` at either call site produces the same rendered output as before this task.
  - [ ] `SignatureArrayDrawer`'s own `ROBOTS_DRIFT_GROUP` content (rendered inside its `AccordionContainer`) is unaffected by this change beyond inheriting whatever `style` its parent now passes.

  **Verification:**
  - [ ] `npx vitest run src/components/robot/SignatureArrayDrawer.test.tsx src/components/robot/AudioSettingSection.test.tsx` passes, each with a new `style`-forwarding test.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** Task 7.

  **Files:** `src/components/robot/SignatureArrayDrawer.tsx`, `src/components/robot/SignatureArrayDrawer.test.tsx`, `src/components/robot/AudioSettingSection.tsx`, `src/components/robot/AudioSettingSection.test.tsx`

  **Estimated scope:** S (2 components, identical one-line addition each)

- [ ] **Task 12: `RobotOptionsTab.tsx` — robot-color root + trait styles passed down**

  **Description:** Add `style={getRobotColorStyle(robot.identityColor)}` to the existing
  `<div className="robot-options">` root; pass `style={getTraitColorStyle('output' |
  'composition' | 'timeSpace' | 'spectral')}` to `AudioSettingSection`/`PingControlsDrawer`/
  `PingContourDrawer`/`SignatureArrayDrawer` respectively (spec §1.5/§4).

  **Acceptance criteria:**
  - [ ] The `robot-options` root carries the current robot's own `identityColor` in both
    `--color-accent-a`/`-b`.
  - [ ] Each of the 4 drawer components receives its own trait's `style`, matching spec §1.5's table.
  - [ ] `RobotDisplaySection`'s own rendered chrome (not itself a drawer) visibly inherits the robot's
    color, not any trait's — no direct change needed to `RobotDisplaySection.tsx` itself.

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/console/RobotOptionsTab.test.tsx` passes, with new
    assertions on the root's style and each drawer's received `style` prop.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] Manual check: open a robot's Options screen — its Name/Job/Battery/Docking header area and card
    render in that robot's own flat color; its 4 drawers each render in their own distinct trait color,
    not the robot's.

  **Dependencies:** Task 3, Task 8, Task 10, Task 11.

  **Files:** `src/components/panels/screen/console/RobotOptionsTab.tsx`, `src/components/panels/screen/console/RobotOptionsTab.test.tsx`

  **Estimated scope:** S (1 file, 5 style props total — 1 root + 4 children)

### Checkpoint: Robot Options wiring
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Manual check (spec §5): two different robots' Options screens show two different header colors
  while both show the same 4 trait colors in their drawers.
- [ ] Review with human before proceeding.

---

### Phase 7: Wiring — remaining regions (parallelizable with each other)

- [ ] **Task 13: `RobotSelectionCard.tsx` — robot-color root**

  **Description:** Add `style={getRobotColorStyle(robot.identityColor)}` to the existing `<li
  className="robot-selection-card">` root (spec §1.5/§4).

  **Acceptance criteria:**
  - [ ] Each rendered card carries its own robot's `identityColor` in both `--color-accent-a`/`-b`.

  **Verification:**
  - [ ] `npx vitest run src/components/selection/RobotSelectionCard.test.tsx` passes, with a new
    assertion on the root's style.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] Manual check: the Robots list shows 12 cards, each with a visually distinct border/glow color
    matching its detail page's own header color (Task 12).

  **Dependencies:** Task 3, Task 4, Task 8.

  **Files:** `src/components/selection/RobotSelectionCard.tsx`, `src/components/selection/RobotSelectionCard.test.tsx`

  **Estimated scope:** XS (1 file, 1 style prop)

- [ ] **Task 14: `CompanyManager.tsx` + `SectorSettingsDrawer.tsx` — trait-color roots**

  **Description:** Add `style={getTraitColorStyle('company')}` to `CompanyManager`'s existing `<div
  className="company-manager">` root, and `style={getTraitColorStyle('seed')}` to
  `SectorSettingsDrawer`'s existing `<div className="sector-settings-drawer">` root (spec §1.5/§4).

  **Acceptance criteria:**
  - [ ] `CompanyManager`'s root carries `company`'s colors.
  - [ ] `SectorSettingsDrawer`'s root carries `seed`'s colors.

  **Verification:**
  - [ ] `npx vitest run src/components/company/CompanyManager.test.tsx src/components/panels/screen/console/SectorSettingsDrawer.test.tsx` passes, each with a new root-style assertion.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] Manual check: the Robots tile's Company Manager section and the Sector Settings tile each render
    in their own distinct color, different from each other and from any Audio Rig trait.

  **Dependencies:** Task 3.

  **Files:** `src/components/company/CompanyManager.tsx`, `src/components/company/CompanyManager.test.tsx`, `src/components/panels/screen/console/SectorSettingsDrawer.tsx`, `src/components/panels/screen/console/SectorSettingsDrawer.test.tsx`

  **Estimated scope:** S (2 unrelated files, identical one-line addition each)

- [ ] **Task 15: `Header.tsx` — trait-color root**

  **Description:** Add `style={getTraitColorStyle('header')}` to the existing `<header
  className="header">` root (spec §1.5/§4).

  **Acceptance criteria:**
  - [ ] The header root carries `header`'s colors explicitly (even though, per spec §1.2, this equals
    `index.css`'s own ambient default today — applied so the two can diverge later with no further code
    change here).

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/Header.test.tsx` passes, with a new root-style
    assertion.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] Manual check (spec §7 open item #2): confirm Header's rendering looks intentional — the "same as
    ambient default" look should read as "this is the Header's own theme," not "Header forgot to get
    themed." Flag to Crawford if it reads ambiguous.

  **Dependencies:** Task 3, Task 4.

  **Files:** `src/components/panels/screen/Header.tsx`, `src/components/panels/screen/Header.test.tsx`

  **Estimated scope:** XS (1 file, 1 style prop)

### Checkpoint: Feature complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Full manual walkthrough (spec §5): all 7 regions (Spectral, Time/Space, Output, Composition,
  Company, Seed, Header) render in visually distinct colors; every one of the 12 robots shows a distinct
  identity color on both its card and detail header; reassigning one trait's pair in `traitColors.ts`
  (a throwaway local edit, reverted after) changes only that trait's regions — the "simple swap" success
  criterion, verified directly rather than only asserted in a unit test.
- [ ] Review with human before proceeding.

---

### Phase 8: Docs

- [ ] **Task 16: `docs/CONSOLE_THEMING.md` — record the shipped trait system**

  **Description:** Add a new section recording the 7 traits, their color pairs, the CSS mechanism, and
  the robot-identity-color system — superseding the "Ballast" static-palette section this phase
  replaces (spec §2).

  **Acceptance criteria:**
  - [ ] The new section documents all 7 traits' names and color pairs, the `--color-accent-a`/`-b`
    mechanism, and the robot-color seeding approach, spot-checked against the actual shipped source.
  - [ ] The old "Ballast" section is marked superseded (not silently deleted — matching this doc's own
    existing convention of recording what was tried and what replaced it).

  **Verification:**
  - [ ] Manual review — every documented value/function name spot-checked directly against the final
    shipped `traitColors.ts`/`accentColors.ts`/`index.css`.
  - [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean (docs-only change).

  **Dependencies:** Task 9, Task 12, Task 13, Task 14, Task 15.

  **Files:** `docs/CONSOLE_THEMING.md`

  **Estimated scope:** S (docs only, but covers the whole shipped system)

- [ ] **Task 17: `docs/COMPONENT_LIBRARY.md` — `AccordionContainer`'s new `style` prop**

  **Description:** One-line addition to `AccordionContainer`'s existing section noting the new optional
  `style` prop and its purpose (trait-color scoping) — flagged explicitly in spec §7 open item #3 so it
  isn't missed.

  **Acceptance criteria:**
  - [ ] `AccordionContainer`'s documented prop list includes `style?: CSSProperties`.

  **Verification:**
  - [ ] Manual review against `AccordionContainer.tsx`'s final shipped props.

  **Dependencies:** Task 7.

  **Files:** `docs/COMPONENT_LIBRARY.md`

  **Estimated scope:** XS (docs only, one line)

### Checkpoint: Complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] All acceptance criteria across all 17 tasks are met.
- [ ] `docs/CONSOLE_THEMING.md` and `docs/COMPONENT_LIBRARY.md` reflect the shipped system.
- [ ] Ready for human review / PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `Robot.identityColor` (Task 8) is a new required field — every literal `Robot` object across `src/` (test fixtures included, not just `spawnSystem.ts`) needs it too | Medium — a missed fixture fails `build:types`/`npm test`, not silently | Task 8's own verification explicitly runs the full suite, not just its own test file, and lists the 2 already-found consumers (`collisionSystem.test.ts`, `lfoDebug.test.ts`) as a floor, not a ceiling |
| The interim visual state after Task 4 but before Phase 5-7's wiring (the whole app briefly reads as flat neutral gray) could be mistaken for a bug mid-review | Low | Called out explicitly in this plan's Architecture Decisions and Checkpoint 2, so a reviewer isn't surprised |
| `voxelTrackMath.ts`'s straddling-box fill staying a flat midpoint rather than a genuine gradient (Task 6) is a deliberate scope-narrowing, not something the intent doc explicitly decided | Low — a visual pass might find it reads inconsistently next to a fully-filled box | Flagged in spec §7 open item #1; revisit only if an actual visual pass finds it inconsistent, not pre-emptively |
| Header's trait pair equaling `index.css`'s own ambient default (Task 4/15) means "Header is themed" and "nothing is themed" look identical today | Low | Task 15's own manual-check step calls this out explicitly, per spec §7 open item #2 |
| The 7 trait pairs (Task 3) are this plan's own concrete color picks, not independently re-derived from a design tool | Low | If a real visual pass finds any pair reads muddy or clashes with a neighboring region, that's a `traitColors.ts` edit to revisit with Crawford, not a reason to change the mechanism (spec §1.3's "simple swap" property exists exactly for this) |

## Open Questions

Carried forward from spec §7, not blocking this plan:

1. **`voxelTrackMath.ts`'s partial-fill scope-narrowing** (Task 6) — revisit only if a real visual pass
   finds it inconsistent.
2. **Header's "themed but looks like the default" question** (Task 15) — confirm during that task's own
   manual check, not before.
3. **A future 8th trait (using the reserved `beige`) or per-company individual colors** are both
   explicitly out of scope for every task above — the mechanism built here (`TRAIT_COLORS`,
   `getTraitColorStyle`) accommodates either later with no structural change, per spec §7 open item #4.
