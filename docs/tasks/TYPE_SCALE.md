# Implementation Plan: App-Wide Type Scale

Source spec: [docs/specs/TYPE_SCALE.md](../specs/TYPE_SCALE.md). Source intent: [docs/intent/type-scale.md](../intent/type-scale.md). Roadmap item 12.

## Overview

Replace the current 3 raw px font-size tokens plus 7 scattered one-off literal values with a real semantic type-scale system (7 size tokens, 4 weight tokens, rem-based), add a second self-hosted font (Titillium Web, via a new `@fontsource/titillium-web` dependency) for the 11 leaf `ControlSchema` primitives, and fix the named "accordion/directional-panel labels are too small" complaint with an explicit size/weight bump on those two containers. A new container-query mechanism (`container-name: sc-control`) gives leaf controls a compact text fallback when their box is too narrow (mobile/cramped slider labels), with zero new classes or JSX changes. Pure CSS + one dependency + two doc updates — no component props, types, or behavior change anywhere.

## Architecture Decisions

- **Old tokens are kept alongside the new ones until every consumer has migrated, then deleted in a dedicated final task (Task 10) — not deleted up front in Task 2.** Deleting `--font-size-sm/md/lg` before every consumer (8 files across Phases 2 and 4) is migrated would leave those files' `font-size` computed value invalid (falls back to the inherited size, not a hard error, but a visible, uncontrolled regression) for however many commits the migration takes. Landing new + old side by side keeps the app visually correct at every commit boundary, per `incremental-implementation`'s "always leave the system working" rule — matches this plan's own Checkpoint-per-phase structure.
- **`DualLabel.css` migrates first (Task 3), on its own, before any leaf control.** Every leaf control's compact-fallback behavior (§1.4 of the spec) depends on `DualLabel.css`'s own `@container sc-control` rule existing — sequencing it first means Tasks 4-6 each land against an already-correct `DualLabel`, rather than 3 batches all needing to land before compact-fallback becomes observable anywhere.
- **The 11 leaf-control CSS files are split into 3 batches of 3-4 files (Tasks 4-6), not one 11-file task.** Keeps every task at or under the ~5-file guideline; grouped by shape, not alphabetically — Task 6 (the 3 voxel-track sliders) is its own batch because those files also replace an existing `__value` literal and add a second `@container` rule, not just the root-selector addition Tasks 4-5 make.
- **Font dependency + `main.tsx` import changes (Task 1) and the `index.css` token rewrite (Task 2) are two independent tasks, not one** — different files, no ordering dependency on each other, both must land before Phase 2 can start. Safe to do in either order or in parallel.
- **Task 1 removing Rajdhani's 300/400 weight imports is sequenced together with Task 2's `:root` weight-default change, both in Phase 1** — confirmed via the spec's own inventory that no file anywhere sets an explicit `font-weight: 300` or a standalone explicit `400` outside `:root` itself, so this is safe to do immediately rather than deferring to the final cleanup phase.
- **Standalone-`DualLabel` host files and the plain one-off-literal files are split into two tasks (8 and 9) despite both being "Phase 4"** — Task 8's 3 files need a genuine per-file judgment call (which selector wraps the `DualLabel`, per spec §1.5) while Task 9's 5 files are a mechanical token-reference swap with no new mechanism; separating them keeps Task 9 low-risk and fast to verify independently of Task 8's extra investigation step.

## Dependency Graph

```
Task 1 (Titillium Web dependency + main.tsx imports)  ─┐
Task 2 (index.css: new tokens, old tokens kept)        ─┴──→ Checkpoint: Foundation
                                                                  │
Task 3 (DualLabel.css) ──────────────────────────────────────────┤
                                                                  ├──→ Task 4 (Button/CoordsInput/TextInput/Toggle)
                                                                  ├──→ Task 5 (RadioButton/Stepper/StepperWithToggle/Lfo)
                                                                  └──→ Task 6 (SliderLinear/SliderLog/SliderCenteredZero)
                                                                          │
                                                          Checkpoint: Leaf controls migrated
                                                                          │
                                                          Task 7 (AccordionContainer.css + DirectionalPanel.css)
                                                                          │
                                                          Checkpoint: Label-size complaint fixed
                                                                          │
                                              ┌───────────────────────────┴───────────────────────────┐
                                     Task 8 (standalone-DualLabel host files)          Task 9 (remaining one-off-literal files)
                                              └───────────────────────────┬───────────────────────────┘
                                                                          │
                                                          Checkpoint: All consumers migrated
                                                                          │
                                                Task 10 (delete old --font-size-sm/md/lg tokens)
                                                                          │
                                                Task 11 (docs: COMPONENT_LIBRARY.md + roadmap.md)
                                                                          │
                                                          Checkpoint: Complete
```

Tasks 4, 5, and 6 have no dependency on each other (all depend only on Tasks 1-3) and can be parallelized. Tasks 8 and 9 have no dependency on each other (both depend only on Task 7 having landed, so the full token surface and label-bump precedent exist) and can be parallelized.

## Task List

### Phase 1: Foundation

- [ ] **Task 1: Add Titillium Web dependency and update `main.tsx` imports**

  **Description:** Add `@fontsource/titillium-web` to `package.json` (spec §1.3 — run `npm view @fontsource/titillium-web version` and pin the real current version, don't guess). In `main.tsx`, add 6 new import lines (latin + latin-ext, weights 400/600/700) and remove the 4 existing Rajdhani 300/400 import lines (latin + latin-ext).

  **Acceptance criteria:**
  - [ ] `package.json` lists `@fontsource/titillium-web` at its real installed version.
  - [ ] `main.tsx` imports exactly `latin-400`/`latin-ext-400`/`latin-600`/`latin-ext-600`/`latin-700`/`latin-ext-700` from `@fontsource/titillium-web`.
  - [ ] `main.tsx` no longer imports any Rajdhani `300` or `400` weight file (latin or latin-ext).
  - [ ] `main.tsx`'s existing doc comment above the Rajdhani imports is updated to reflect the trimmed weight set (500/600/700 only), matching the file's existing comment-explains-the-imports convention.

  **Verification:**
  - [ ] `npm install` completes cleanly.
  - [ ] `npm run build` succeeds (confirms the new import paths resolve).
  - [ ] `npm run dev`, load the app, confirm no console errors about missing font files.

  **Dependencies:** None.

  **Files:** `package.json`, `src/main.tsx`

  **Estimated scope:** XS (2 files)

- [ ] **Task 2: Add new type-scale tokens to `src/index.css`**

  **Description:** Add `--font-controls`, the 7 `--font-size-*` tokens, and the 4 `--font-weight-*` tokens (spec §1.2/§4's canonical block) to `:root`. Change `:root`'s existing `font-weight: 400;` line to `font-weight: var(--font-weight-regular);`. Delete the 2 leftover unused Vite-scaffold rules (`h1 { font-size: 3.2em; ... }` and the bare `button { ... }` rule, `index.css:105-119`) — confirmed zero real consumers. **Do not remove `--font-size-sm/md/lg` yet** — 8 files still read them until Phases 2 and 4 land (Task 10 removes them).

  **Acceptance criteria:**
  - [ ] `:root` contains all 12 new custom properties from spec §1.2/§4, with the exact values given there.
  - [ ] `:root`'s base `font-weight` reads `var(--font-weight-regular)`.
  - [ ] The old `--font-size-sm: 12px; --font-size-md: 16px; --font-size-lg: 20px;` block is still present, unchanged.
  - [ ] The `h1 { font-size: 3.2em; ... }` and bare `button { ... }` rules are gone from `index.css`.

  **Verification:**
  - [ ] `npm run build:types` clean.
  - [ ] `npm run lint` clean.
  - [ ] `npm run dev`, confirm the app renders with no visual change from before this task (new tokens exist but have no consumers yet; old tokens' consumers are untouched).

  **Dependencies:** None.

  **Files:** `src/index.css`

  **Estimated scope:** XS (1 file)

### Checkpoint: Foundation
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] App renders with no visual change from before Phase 1 (both old and new tokens coexist; nothing consumes the new ones yet).
- [ ] Review with human before proceeding.

---

### Phase 2: Leaf-control migration (container queries + Titillium Web)

- [ ] **Task 3: Migrate `DualLabel.css`**

  **Description:** Replace `__lore`'s `0.7rem` with `var(--font-size-label-lore)` and `__human`'s `0.85rem` with `var(--font-size-label)`. Add the new `@container sc-control (max-width: 120px)` rule (spec §1.4/§4) dropping both to `var(--font-size-label-compact)`.

  **Acceptance criteria:**
  - [ ] No literal `0.7rem`/`0.85rem` remains in `DualLabel.css`.
  - [ ] The `@container sc-control` rule exists and targets both `__lore` and `__human`.
  - [ ] `DualLabel.tsx` itself is untouched (no props/markup change).

  **Verification:**
  - [ ] `npm test -- DualLabel` passes unmodified (asserts text content/presence, not computed size — spec §5).
  - [ ] `npm run build:types` / `npm run lint` clean.
  - [ ] Manual: render any control with both `loreLabel`/`humanLabel` set, confirm both lines still render (sizes will look identical to before until a `sc-control` container ancestor exists — that lands in Tasks 4-6).

  **Dependencies:** Task 2 (needs the new tokens to exist).

  **Files:** `src/components/ui/controls/DualLabel.css`

  **Estimated scope:** XS (1 file)

- [ ] **Task 4: Migrate `Button`, `CoordsInput`, `TextInput`, `Toggle`**

  **Description:** Add `font-family: var(--font-controls); font-weight: var(--font-weight-control); container-type: inline-size; container-name: sc-control;` to each file's own root selector (`.sc-button`, `.sc-coords-input`, `.sc-text-input`, `.sc-toggle`) — pure additions, no existing font rule to replace in any of the four (spec §2 confirms via grep).

  **Acceptance criteria:**
  - [ ] All 4 root selectors carry all 4 new declarations.
  - [ ] No other rule in any of the 4 files changes.

  **Verification:**
  - [ ] `npm test -- Button CoordsInput TextInput Toggle` passes unmodified.
  - [ ] `npm run build:types` / `npm run lint` clean.
  - [ ] Manual: DevTools computed-style check on one live instance of each — confirm `font-family` resolves to `"Titillium Web"` and the root element shows `container-type: inline-size` in the Layout/computed panel.

  **Dependencies:** Task 3.

  **Files:** `src/components/ui/controls/Button.css`, `CoordsInput.css`, `TextInput.css`, `Toggle.css`

  **Estimated scope:** S (4 files, single mechanical addition each)

- [ ] **Task 5: Migrate `RadioButton`, `Stepper`, `StepperWithToggle`, `Lfo`**

  **Description:** Same 4-declaration addition as Task 4, applied to `.sc-radio-button`, `.sc-stepper`, `.sc-stepper-toggle`, `.sc-lfo`.

  **Acceptance criteria:**
  - [ ] All 4 root selectors carry all 4 new declarations.
  - [ ] No other rule in any of the 4 files changes.

  **Verification:**
  - [ ] `npm test -- RadioButton Stepper Lfo` passes unmodified (`StepperWithToggle` has no current consumer per `docs/COMPONENT_LIBRARY.md` — confirm its test file, if any, still passes).
  - [ ] `npm run build:types` / `npm run lint` clean.
  - [ ] Manual: DevTools computed-style check on `RadioButton` and `Lfo` (the two with live consumers) confirming `font-family: "Titillium Web"`.

  **Dependencies:** Task 3.

  **Files:** `src/components/ui/controls/RadioButton.css`, `Stepper.css`, `StepperWithToggle.css`, `Lfo.css`

  **Estimated scope:** S (4 files, single mechanical addition each)

- [ ] **Task 6: Migrate `SliderLinear`, `SliderLog`, `SliderCenteredZero`**

  **Description:** Add the same 4-declaration root addition to `.sc-slider-linear`, `.sc-slider-log`, `.sc-slider-centered-zero`. Additionally, in each file, replace the `__value` selector's literal (`0.75rem` in all 3, confirmed) with `var(--font-size-label)`, and add a `@container sc-control (max-width: 120px)` rule dropping that same `__value` selector to `var(--font-size-label-compact)` (spec §1.4/§4).

  **Acceptance criteria:**
  - [ ] All 3 root selectors carry all 4 new declarations.
  - [ ] No literal `0.75rem` remains in any of the 3 files.
  - [ ] Each file has its own `@container sc-control` rule targeting its own `__value` class.

  **Verification:**
  - [ ] `npm test -- SliderLinear SliderLog SliderCenteredZero` passes unmodified.
  - [ ] `npm run build:types` / `npm run lint` clean.
  - [ ] Manual: narrow a drawer (or the browser window) until a horizontal slider's box row is at its 3-box overflow floor and confirm the value-readout text visibly steps down to the compact size, then back up with room — spec §5.3's core manual check, for all 3 slider types. Repeat for at least one vertical slider stacked in a narrow mobile-width column.
  - [ ] Manual: confirm slider track/box position and size are pixel-identical to before this task — only text size should ever change (spec §3's `container-type: inline-size` constraint).

  **Dependencies:** Task 3.

  **Files:** `src/components/ui/controls/SliderLinear.css`, `SliderLog.css`, `SliderCenteredZero.css`

  **Estimated scope:** S (3 files, two changes each)

### Checkpoint: Leaf controls migrated
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] All 11 leaf controls (§1.5's list) render in Titillium Web, confirmed via DevTools computed style on at least one live instance of each.
- [ ] Compact container-query fallback confirmed firing on narrow sliders (Task 6's manual check) and at least one non-slider control (e.g. a narrow `Toggle` row).
- [ ] No layout/position shift anywhere — visual diff against pre-Phase-2 screenshots if available, or a careful by-eye pass across every drawer.
- [ ] Review with human before proceeding.

---

### Phase 3: Fix the named complaint

- [ ] **Task 7: Bump `AccordionContainer`/`DirectionalPanel` label size and weight**

  **Description:** Add the new `.sc-accordion__row .sc-dual-label__human` rule to `AccordionContainer.css` and `.sc-directional-panel > .sc-dual-label__human` to `DirectionalPanel.css` (both set `font-size: var(--font-size-heading-sm); font-weight: var(--font-weight-medium);`, spec §1.6). Tokenize `AccordionContainer.css:70`'s `.sc-accordion__indicator { font-weight: 600; }` to `var(--font-weight-medium)` (same value).

  **Acceptance criteria:**
  - [ ] Both new selectors exist, scoped exactly as specified (descendant selector for accordion, direct-child combinator for the panel) so a nested control's own `DualLabel` is never caught.
  - [ ] `.sc-dual-label__lore` is untouched by either new rule — only `__human` is targeted.
  - [ ] `.sc-accordion__indicator`'s weight is now `var(--font-weight-medium)`, same computed value (600) as before.
  - [ ] Neither file gains `container-type`/`container-name` (out of scope per spec §1.4).

  **Verification:**
  - [ ] `npm test -- AccordionContainer DirectionalPanel` passes unmodified (spec §5: verify no test asserts the literal `600` in a way that would need updating — it shouldn't, since the computed value is unchanged).
  - [ ] `npm run build:types` / `npm run lint` clean.
  - [ ] Manual: open a drawer with both an accordion and a directional panel, confirm both labels are visibly bigger and heavier than before, and still render in Rajdhani (DevTools computed `font-family`, not just by eye — Rajdhani/Titillium Web look similar at a glance per spec §5.1).
  - [ ] Manual: confirm a `SliderLinear` (or any leaf control) rendered *inside* an open accordion still shows its own Titillium Web label at the normal (non-bumped) size — the scoped selector must not leak into nested content.

  **Dependencies:** Task 3 (needs `DualLabel.css`'s migrated `__human` selector to exist as the override target).

  **Files:** `src/components/ui/controls/AccordionContainer.css`, `DirectionalPanel.css`

  **Estimated scope:** S (2 files)

### Checkpoint: Label-size complaint fixed
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Accordion and directional-panel labels confirmed bigger/heavier, still Rajdhani, no leakage into nested controls.
- [ ] Review with human before proceeding.

---

### Phase 4: Remaining consumers

- [ ] **Task 8: Migrate standalone-`DualLabel` host files**

  **Description:** In `RobotSelectionCard.tsx`/`.css`, `RobotDisplaySection.tsx`/`.css`, and `SectorSettingsDrawer.tsx`/`.css`, identify the exact element wrapping each standalone `<DualLabel>` usage (spec §1.5 flags `SectorSettingsDrawer.tsx:74`'s wrapper as needing confirmation during Implement) and add `font-family: var(--font-controls); font-weight: var(--font-weight-control);` to that selector — no `container-type` (spec §1.4's explicit scope decision). Also migrate each file's own other one-off literal in the same pass: `RobotSelectionCard.css`'s `.__value` (`var(--font-size-sm)` → `var(--font-size-label)`), `RobotDisplaySection.css`'s `.__value` (tokenize its existing `font-weight: 600` to `var(--font-weight-medium)`, and add the family/weight addition to `.__row`), `SectorSettingsDrawer.css`'s `.__status-line` (`0.95em` → `var(--font-size-label)`).

  **Acceptance criteria:**
  - [ ] All 3 standalone-`DualLabel` wrapper selectors carry `font-family: var(--font-controls)` and `font-weight: var(--font-weight-control)`.
  - [ ] `RobotSelectionCard.css`'s `.__value`, `SectorSettingsDrawer.css`'s `.__status-line` no longer reference `var(--font-size-sm)`/`0.95em`.
  - [ ] `RobotDisplaySection.css`'s `.__value` weight is now `var(--font-weight-medium)`, same computed value (600).
  - [ ] No `container-type`/`container-name` added anywhere in this task.

  **Verification:**
  - [ ] `npm test -- RobotSelectionCard RobotDisplaySection SectorSettingsDrawer` passes unmodified.
  - [ ] `npm run build:types` / `npm run lint` clean.
  - [ ] Manual: DevTools computed-style check confirming all 3 standalone `DualLabel` rows (Robot Name/Job/Battery/Docked/Audio in the selection card and display section, the sector-settings status header) render in Titillium Web.

  **Dependencies:** Task 7 (comes after the label-bump precedent is settled, per this plan's parallelization note — no direct code dependency).

  **Files:** `src/components/selection/RobotSelectionCard.css`, `src/components/robot/RobotDisplaySection.css`, `src/components/panels/screen/console/SectorSettingsDrawer.css`

  **Estimated scope:** S (3 files, one small investigation step)

- [ ] **Task 9: Migrate remaining one-off-literal files**

  **Description:** Swap the remaining old-token/literal references to the new tokens — no new mechanism, pure value swaps. `PowerRockerSwitch.css`: 3 references (`var(--font-size-md)` on the dialog title, `var(--font-size-sm)` ×2 on description/button) — pick `var(--font-size-label)` vs `var(--font-size-label-lore)` per line by visual judgment (spec §7 item 2 — these are on `--font-mono` text, family untouched). `Header.css` and `SleeveContainer.css`: 1 `var(--font-size-sm)` reference each → `var(--font-size-label)` (also `--font-mono` text, family untouched). `SkippedNotesCounter.css`: 1 `var(--font-size-sm)` reference → `var(--font-size-label)` (`--font-mono` text). `ConsolePanel.css`: `.console-panel__stub`'s `14px` → `var(--font-size-label)` — first confirm in `ConsolePanel.tsx` whether `.console-panel__stub` still has a live render path (spec §7 item 5); migrate the literal regardless of the answer.

  **Acceptance criteria:**
  - [ ] No `var(--font-size-sm)`/`var(--font-size-md)`/`14px` reference remains in any of the 5 files.
  - [ ] `--font-mono` stays the `font-family` on every line touched here — only the size token reference changes.
  - [ ] `.console-panel__stub`'s live-vs-dead status is noted in the PR/commit description either way.

  **Verification:**
  - [ ] `npm test -- PowerRockerSwitch Header SleeveContainer SkippedNotesCounter ConsolePanel` passes unmodified.
  - [ ] `npm run build:types` / `npm run lint` clean.
  - [ ] Manual: trigger the power-off confirm dialog, check the header status row, the sleeve logo, and (dev mode) the skipped-notes counter — confirm all still render in `--font-mono` at a reasonable size, no regression.

  **Dependencies:** Task 7 (parallelizable with Task 8 — see Dependency Graph).

  **Files:** `src/components/ui/physical/PowerRockerSwitch.css`, `src/components/panels/screen/Header.css`, `src/components/panels/physical/SleeveContainer.css`, `src/components/debug/SkippedNotesCounter.css`, `src/components/panels/screen/console/ConsolePanel.css`

  **Estimated scope:** M (5 files, mechanical swaps)

### Checkpoint: All consumers migrated
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Repo-wide grep for `--font-size-sm`, `--font-size-md`, `--font-size-lg`, and the literals `0.7rem`, `0.85rem`, `0.95em`, `14px` (font-size context) returns zero remaining hits outside `index.css`'s own now-unused token definitions.
- [ ] Full manual check list from spec §5 run once, end to end.
- [ ] Review with human before proceeding.

---

### Phase 5: Cleanup and docs

- [ ] **Task 10: Remove the old `--font-size-sm/md/lg` tokens**

  **Description:** Delete the 3-line old token block from `src/index.css`, now that Checkpoint "All consumers migrated" has confirmed zero remaining references anywhere in `src/`.

  **Acceptance criteria:**
  - [ ] `--font-size-sm`, `--font-size-md`, `--font-size-lg` no longer appear in `index.css` or anywhere in `src/`.

  **Verification:**
  - [ ] Repo-wide grep for all 3 names returns zero results.
  - [ ] `npm run build:types` / `npm run lint` / `npm test` / `npm run build` all clean.

  **Dependencies:** Checkpoint "All consumers migrated" (Tasks 8 and 9 both landed).

  **Files:** `src/index.css`

  **Estimated scope:** XS (1 file)

- [ ] **Task 11: Update documentation**

  **Description:** Update `docs/COMPONENT_LIBRARY.md`'s "CSS tokens" section — it currently states "No new CSS custom properties were introduced in this phase," no longer true; add the new font-size/weight/family tokens and the `sc-control` container-query name, or point to this spec. Mark roadmap item 12 done in `docs/todo/roadmap.md` per that document's own existing convention.

  **Acceptance criteria:**
  - [ ] `docs/COMPONENT_LIBRARY.md`'s "CSS tokens" section no longer claims zero new tokens; lists or links the real set.
  - [ ] `docs/todo/roadmap.md` item 12 reflects its shipped status per the doc's existing convention for completed items.

  **Verification:**
  - [ ] Manual read-through — no automated test covers doc content.

  **Dependencies:** Task 10.

  **Files:** `docs/COMPONENT_LIBRARY.md`, `docs/todo/roadmap.md`

  **Estimated scope:** XS (2 files, docs only)

### Checkpoint: Complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Every acceptance criterion across all 11 tasks is met.
- [ ] Full manual check list from spec §5 passes.
- [ ] Docs updated and accurate against the shipped code (spot-checked, not reconstructed from memory).
- [ ] Ready for human review / PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The `120px` container-query breakpoint (spec §1.4) is an unconfirmed engineering default | Low-Medium — could fire too early/late relative to the real mobile label-overflow case (item 13) | Task 6's manual check specifically exercises the narrow-slider case before Phase 2's checkpoint; easy single-value adjustment if wrong, isolated to `DualLabel.css` + 3 slider files |
| `PowerRockerSwitch.css`'s old sm/md split doesn't map 1:1 onto the new label/label-lore split (spec §7 item 2) | Low — visual-only, cosmetic | Task 9 calls out the per-line judgment call explicitly rather than a blind find-replace; manual check included |
| Deleting old tokens (Task 10) before every consumer is confirmed migrated would silently degrade text sizing rather than error | Medium if sequencing is skipped | Task 10 is gated behind its own Checkpoint with an explicit repo-wide grep step, not just "looks done" |
| `container-type: inline-size` on 11 new elements could theoretically shift layout in a way not caught by automated tests (jsdom applies no real layout, per `GLOBAL_VOLUME_CONTROL.md`'s own precedent finding a real-browser-only bug) | Medium | Every Phase-2/3 task's manual check explicitly includes a "confirm no position/size shift" step, not just a font-family check |
| Standalone-`DualLabel` host files' compact-fallback scope (spec §7 item 1) may turn out wrong once seen on a real narrow mobile layout | Low | Explicitly deferred, not silently decided — flagged in Task 8 and in the spec itself; adding the 2-line container declaration later is a small, isolated follow-up if needed |

## Open Questions

None remaining from the spec — every item in spec §7 is either resolved into a specific task's acceptance criteria (items 2, 3, 5 → Tasks 9, 6, 9 respectively) or explicitly deferred with a stated reason (items 1, 4 → noted in Task 8 and the Risks table above, not silently decided).
