# Implementation Plan: Oblique Cabinetry — TextInput / CoordsInput (Roadmap Phase 11.1.9)

Source spec: [docs/specs/OBLIQUE_CABINETRY_TEXT_INPUT.md](../specs/OBLIQUE_CABINETRY_TEXT_INPUT.md).
Source intent: [docs/intent/oblique-cabinetry-text-input.md](../intent/oblique-cabinetry-text-input.md).
Pure presentation change — no `AudioEngine`/`BeatClock` change, no new Zustand field, no
`TextInputSchema`/`CoordsInputSchema`/`ControlSchema` change. Every task below wires `TextInput` — this
phase's only touched component — through the already-shipped `CabinetBox` (11.1.1) and its `autoHeight` prop
(`DirectionalPanel`, shipped) exactly as-is. None touch `CabinetBox` itself, `DirectionalPanel.tsx`,
`CoordsInput.tsx`, audio scheduling, any domain config, or any other primitive.

## Overview

Like `AccordionContainer` (11.1.7) and `DirectionalPanel` before it, this phase needs **zero** changes to any
shared primitive — every prop `TextInput`'s facade uses on `CabinetBox` (`popped`, `skipMountAnimation`,
`autoHeight`, `timelineKey`, `children`) already exists exactly in the shape this phase needs. That collapses
this plan to 3 tasks: the facade itself (`TextInput.tsx`/`.css`/`.test.tsx`, one atomic change), a small
regression-guard test on the one other file this phase's design decision actually matters for
(`CoordsInput.test.tsx`, unchanged code, one new test), and a docs task.

## Architecture Decisions

- **No "shared-primitive change" task** — spec §1.1–§1.3 confirm every `CabinetBox` capability this phase
  needs (including `autoHeight`) already exists unmodified from `DirectionalPanel`'s own shipped work; there
  is nothing to isolate-and-verify before the consumer task.
- **`TextInput.tsx`/`.css`/`.test.tsx` land as one task, not split by file** — the facade wrapper, its CSS,
  and its test coverage only make sense reviewed together (the CSS's `autoHeight`-dependent rules exist
  because of a specific, spec-documented finding about real label line counts, §1.2; splitting the test file
  out from the implementation would leave a task where "done" can't actually be verified). Matches
  `AccordionContainer`'s own plan (11.1.7 Task 1), not `Toggle`'s two-task "primitive, then consumer" split —
  there's no primitive change here to isolate first.
- **`CoordsInput.test.tsx`'s one new test is its own task, not folded into Task 1** — it's a different file
  testing a different component, with zero code change of its own (spec §1.1/§1.5: `CoordsInput.tsx`/`.css`
  are untouched). Splitting it out keeps Task 1 scoped to the actual facade change and makes the
  regression-guard test (encoding this item's *entire reason for existing* — "per-input, not shared
  facade" — as a checkable assertion, not just prose) independently reviewable. It depends on Task 1 having
  shipped, since it asserts against `TextInput`'s real, unmocked rendering.
- **The docs task depends only on Task 1** — `docs/COMPONENT_LIBRARY.md`'s note describes `TextInput`'s own
  shipped rendering/contract, settled once Task 1 lands; it doesn't need to wait on Task 2's test-only
  addition.
- **No task in this plan touches `CabinetBox.tsx`/`.css`, `DirectionalPanel.tsx`/`.css`, `CoordsInput.tsx`,
  `cabinetGeometry.ts`, `cabinetAnimation.ts`, `useCabinetBoxHeight.ts`, any other primitive, or any domain
  config file** — confirmed against spec §3's Strict Scope boundary and §2's "explicitly not touched" list.
  No real consumer (`CompanyCrudControls.tsx`, `SectorSettingsDrawer.tsx`) needs an edit, since `TextInput`'s
  props contract doesn't change.

## Dependency Graph

```
Task 1 (TextInput.tsx/.css/.test.tsx — CabinetBox facade wiring)
        │
        ├──→ Task 2 (CoordsInput.test.tsx — one new regression test, no code change)
        │
        └──→ Task 3 (docs/COMPONENT_LIBRARY.md)
```
Tasks 2 and 3 are independent of each other — both only need Task 1, and are safe to do in either order or in
parallel.

## Task List

### Phase 1: The consumer — `TextInput`'s facade

- [ ] **Task 1: `TextInput` — permanently-popped, `autoHeight` facade**

  **Description:** Replace `src/components/ui/controls/TextInput.tsx` per spec §1.1/§1.2/§4: wrap the
  existing `<div className="sc-text-input">` (unchanged `DualLabel` + `<input>` inside) in a `CabinetBox` —
  `popped` a literal `true` (never a variable), `skipMountAnimation`, `autoHeight`, keyed by
  `` `cabinet-text-input-facade-${schema.id}` `` — itself wrapped in a new outer
  `<div className="sc-text-input-facade">`. No nesting-context, no per-instance opt-out — every instance
  renders this unconditionally. Replace `TextInput.css` per spec §4: add the facade wrapper/front-face rules
  (`.sc-text-input-facade > .sc-cabinet-box` at `width: 100%`; the front face at `display: block; width:
  100%; height: auto; padding: 12px 14px`), leaving `.sc-text-input`/`.sc-text-input__el`'s existing rules
  untouched. Add the universal `CabinetBox` mock to `TextInput.test.tsx` (extended to capture
  `skipMountAnimation`/`autoHeight`, per spec §5) and the 4 new test cases from spec §5 — every existing test
  in the file stays unchanged and passing underneath the mock.

  **Acceptance criteria:**
  - [ ] Every existing `TextInput.test.tsx` assertion (placeholder, `maxLength`, `onChange` on keystroke,
    controlled `value`, `DualLabel` labels via `loreLabel`/`humanLabel`, plain-vs-numeric rendering,
    accessible-name fallback to `schema.id`, `disabled` default-false and blocking) passes unmodified once
    the `CabinetBox` mock is in place.
  - [ ] The facade instance's `popped` is `"true"` **unconditionally** — verified both with `disabled` unset
    and with `disabled={true}` (it must never flip based on `disabled`, per spec §1.4/§3's explicit
    constraint).
  - [ ] The facade instance receives `skipMountAnimation` and `autoHeight` both `"true"` — no `boxHeight`,
    `frontWidth`/`frontHeight`, `popDistance`, or `zIndex` override passed.
  - [ ] `timelineKey` is exactly `` `cabinet-text-input-facade-${schema.id}` `` (verified against the file's
    own existing `robotName` schema-id fixture).
  - [ ] Both the `<input>` (queryable via `getByRole('textbox'|'spinbutton')`, unchanged) and its `DualLabel`
    text render **inside** the mocked `CabinetBox` element — confirming the label-inside-the-box wrapping
    shape (spec §1.1), not beside it.
  - [ ] `TextInput.css`'s new facade rules use direct-child combinators
    (`.sc-text-input-facade > .sc-cabinet-box`, `.sc-text-input-facade > .sc-cabinet-box > .sc-cabinet-box__front`)
    and set `display: block; width: 100%; height: auto; padding: 12px 14px` on the front face — no
    `user-select: none` anywhere in the file (spec §1.4/§3 — explicitly forbidden for this consumer).
  - [ ] `.sc-text-input`/`.sc-text-input__el`'s pre-existing rules (layout, width, padding, border,
    `:focus-visible` outline) are byte-for-byte unchanged.
  - [ ] `TextInputSchema`/`CoordsInputSchema`/`ControlSchema` (`src/types/controls.ts`) are untouched — `git
    diff src/types/controls.ts` is empty for this task.
  - [ ] `CabinetBox.tsx`/`.css`, `DirectionalPanel.tsx`/`.css`, `CoordsInput.tsx`/`.css`, `cabinetGeometry.ts`,
    `cabinetAnimation.ts`, `useCabinetBoxHeight.ts` are all untouched — `git diff` for each is empty for this
    task.
  - [ ] The `<input>`'s own props (`type`/`inputMode`/`step`/`className`/`aria-label`/`placeholder`/
    `maxLength`/`value`/`onChange`/`disabled`) are byte-for-byte unchanged from today's implementation.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/TextInput.test.tsx` passes in full. Confirm genuinely RED
    first: with the `CabinetBox` mock added to the test file but `TextInput.tsx` not yet changed, the 4 new
    facade-specific cases fail (no `data-testid="cabinet-box"` in the tree) while every pre-existing case
    still passes (they query the real `<input>`/`DualLabel` content directly, unaffected by the mock being
    present but unused). Then GREEN after the implementation change.
  - [ ] `npm run build:types` — zero TypeScript errors.
  - [ ] `npx eslint .` — zero ESLint errors.
  - [ ] `npm run build` — production bundle builds cleanly.
  - [ ] `npm test` (full suite) — passes, including `CompanyCrudControls.test.tsx`/`SectorSettingsDrawer.test.tsx`
    (real, unmocked `CabinetBox` rendering via the global GSAP/`ResizeObserver` mocks in `vitest.setup.ts`,
    same as every other drawer-level test already relies on) — neither asserts against `TextInput`'s internal
    DOM structure (confirmed in spec §2's own research), only role/accessible-name, both unaffected.
  - [ ] Manual check (spec §5, items 1–4 and 6): across all 3 real consumers (Company Manager's Create/Rename
    name fields, Sector Settings' Attenuation Style name field, Sector Settings' `CoordsInput`) — permanently
    popped at rest with no animation ever, facade height reads correctly against both a real 2-line label
    (Company/AS name) and a real 1-line label (`CoordsInput`'s X/Y), typing/focus/caret/selection all work
    exactly as before, a disabled field's box still looks identical to an enabled one's (no flattening), and
    `prefers-reduced-motion` shows no console error either way. **Item 5** (the two-independent-boxes visual
    check for `CoordsInput`) is covered by Task 2's own automated test instead of requiring a manual look,
    though a visual glance costs nothing extra while already checking `CoordsInput`'s row.

  **Dependencies:** None (11.1.1 and `DirectionalPanel`'s own Cabinetry treatment already shipped and merged
  to `main`).

  **Files:** `src/components/ui/controls/TextInput.tsx`, `src/components/ui/controls/TextInput.css`,
  `src/components/ui/controls/TextInput.test.tsx`

  **Estimated scope:** S (3 files — same shape as `AccordionContainer`'s own single consumer task, against
  already-proven `CabinetBox`/`autoHeight` mechanics)

### Checkpoint: TextInput ships — first visible change
- [ ] `npm run build:types`, `npx eslint .`, `npm run build` all clean; `npm test` full suite passes.
- [ ] Every real `TextInput` call site in the app renders through the new facade with zero call-site changes
  required — confirmed by `npm run build:types` alone surfacing nothing, since the props contract didn't
  change.
- [ ] Manual check performed and confirmed (see Task 1's own verification list) — flag explicitly to Crawford
  if a session lacks browser tooling to perform it, same as every prior Cabinetry item's plan has.
- [ ] Review with human before proceeding.

---

### Phase 2: Regression guard for this item's own central decision

- [ ] **Task 2: `CoordsInput.test.tsx` — two independent facades, not one shared**

  **Description:** Per spec §1.6/§5: add one new test to `CoordsInput.test.tsx`, using the file's existing
  real (unmocked) rendering path — it already renders real `CabinetBox`es through `TextInput` today, relying
  on `vitest.setup.ts`'s global no-op `ResizeObserver`/GSAP mocks, unchanged by this task. No import of
  `CabinetBox` is added to this file; the assertion targets the real DOM class `.sc-text-input-facade`
  `TextInput.tsx` now renders (Task 1), confirming exactly 2 render — one per field, not one shared wrapper
  around the whole X/Y row. This is the regression guard for the intent doc's own confirmed correction (the
  nesting-context/shared-facade framing was floated and explicitly rejected during the interview) — without
  it, that design decision is verified only by manual inspection.

  **Acceptance criteria:**
  - [ ] `CoordsInput.test.tsx` gains exactly one new test asserting
    `container.querySelectorAll('.sc-text-input-facade')` has length `2` for a default-rendered `CoordsInput`.
  - [ ] Every pre-existing `CoordsInput.test.tsx` test (two `spinbutton` instances render, controlled x/y
    values, `onChange` wiring for both fields, `DualLabel` label, non-numeric/blank-entry guards, rounding
    behavior, native numeric input type) passes unmodified — none of them touch `TextInput`'s internal DOM
    structure.
  - [ ] `CoordsInput.tsx` and `CoordsInput.css` are untouched — `git diff` empty for both, confirming the
    intent doc's own "needs no code change" claim held.
  - [ ] No `CabinetBox` mock is added to this file — the new test relies on the real, already-proven-safe
    rendering path this file already uses.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/CoordsInput.test.tsx` passes in full. Confirm genuinely
    RED first: run the new test alone against `main` (pre-Task-1) or with Task 1's changes `git stash`ed —
    it fails (0 or 1 `.sc-text-input-facade` elements exist, not 2, since `TextInput` didn't render a facade
    at all before Task 1). Then GREEN once Task 1's changes are present.
  - [ ] `npm run build:types`, `npx eslint .` clean.
  - [ ] `npm test` (full suite) — no regression anywhere else.

  **Dependencies:** Task 1.

  **Files:** `src/components/ui/controls/CoordsInput.test.tsx`

  **Estimated scope:** XS (1 file, one new test, zero source changes)

---

### Phase 3: Docs

- [ ] **Task 3: `docs/COMPONENT_LIBRARY.md` — TextInput's internal rendering note**

  **Description:** Add a short note under `TextInput`'s row (mirroring
  `Button`/`Toggle`/`RadioButton`/`AccordionContainer`/`DirectionalPanel`'s own notes) — its internal
  rendering changed (a permanently-popped, `autoHeight` `CabinetBox` facade wrapping `DualLabel` + the
  `<input>` together) while its `ControlSchema`/props contract stayed byte-for-byte identical, per spec §6.
  Explicitly state that `CoordsInput` needed no code change of its own — its own table row can point at
  `TextInput`'s note rather than duplicating it, since its two-facade appearance is a side effect, not a
  separate feature.

  **Acceptance criteria:**
  - [ ] `docs/COMPONENT_LIBRARY.md` documents that `TextInput` now renders through `CabinetBox` internally
    (one permanently-popped, `autoHeight` facade per instance), with its props contract unchanged. Added as
    its own `### TextInput's Oblique Cabinetry rendering (Roadmap Phase 11.1.9)` section, following the exact
    pattern every prior item's own section uses, in roadmap-item order after `DirectionalPanel`'s.
  - [ ] The note explicitly states `CoordsInput` required no code change — its two independent boxes are a
    side effect of composing two `TextInput`s, not a `CoordsInput`-specific feature.
  - [ ] The note is spot-checked against `TextInput.tsx`'s actual shipped code (Task 1), not the spec's
    draft — the documented props shape (`{ schema: TextInputSchema; value: string; onChange: (value: string)
    => void; numeric?: boolean; disabled?: boolean }`) matches `TextInput.tsx`'s `TextInputProps` interface
    exactly.

  **Verification:**
  - [ ] Manual review — spot-checked directly against the shipped `TextInput.tsx`.
  - [ ] `npm run build:types`, `npx eslint .` clean (docs-only change).

  **Dependencies:** Task 1.

  **Files:** `docs/COMPONENT_LIBRARY.md`

  **Estimated scope:** XS (docs only)

### Checkpoint: Complete
- [ ] `npm run build:types`, `npx eslint .` clean after every task; `npm run build` clean after Task 1 (no
  further source changes in Tasks 2/3 to re-verify against); `npm test` full suite passed after Task 1 with
  no source change since in Task 2 (test-only) or Task 3 (docs-only) to warrant a re-run of the full suite,
  though each task's own focused test file should still be run individually as each lands.
- [ ] All acceptance criteria across all 3 tasks are met, including Task 1's manual check.
- [ ] `docs/COMPONENT_LIBRARY.md` reflects the shipped feature.
- [ ] Not yet reviewed with Crawford — not ready for PR until Task 1's manual check is done and this
  checkpoint is reviewed.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `autoHeight`'s left-face-wall-to-100% mechanism has only ever been proven against `DirectionalPanel`'s own arbitrary block content, not a `DualLabel` + native `<input>` combination specifically | Low — the mechanism itself is content-agnostic (resolves against real CSS height regardless of what produces it), and `TextInput.css`'s own `display: block; height: auto` override is the same pattern `DirectionalPanel.css` already uses | Task 1's manual check explicitly includes both a real 1-line and a real 2-line label case, not just the shorter typical one; spec §1.2 documents the reasoning (and the corrected assumption) inline for a future reader |
| The caret-cursor/text-selection risk flagged in spec §1.4 is reasoned to not apply here (unlike `Toggle`'s bug, which was caused by a box with no text) — but reasoning isn't the same as having actually clicked around a real popped `<input>` in a browser | Low — the reasoning is grounded in *why* `Toggle`'s specific bug occurred (no text node for caret-browsing to find), a condition `TextInput`'s box structurally can't meet | Task 1's manual check explicitly includes clicking near (not just squarely on) a real input's own text, specifically to catch a different-but-adjacent problem class if one exists, rather than treating the reasoning as sufficient on its own |
| `docs/roadmap/roadmap.md § 11.1.9` describes this work accurately as of this plan (already corrected in the same session the intent/spec were written) | None — flagged only so a future reader doesn't assume it's stale the way `11.1.7`'s own roadmap draft was before its intent doc corrected it | No roadmap edit is scheduled in this plan (Task 3 only touches `COMPONENT_LIBRARY.md`); if the roadmap text and the shipped code ever diverge, that's a separate future correction, not something this plan defers by omission |

## Open Questions

Resolved during Plan (not left open):

- ~~Does this phase need a separate "shared-primitive change" task before the consumer task, the way
  `Toggle`'s Task 1 did?~~ **Resolved: no** — spec §1.1–§1.3 confirm every `CabinetBox`/`autoHeight`
  capability this phase needs already exists unmodified; there is nothing to isolate-and-verify first.
- ~~Should `CoordsInput.test.tsx`'s new regression test be folded into Task 1 instead of its own task?~~
  **Resolved: no, kept separate** — it's a different file testing a different component with zero source
  change of its own; splitting it out keeps Task 1 scoped to the actual facade change and makes the
  regression guard for this item's central design decision independently reviewable.

Carried forward from spec §7, not blocking this plan:

1. **Facade padding value (`12px 14px`), reused from `DirectionalPanel.css` as-is.** Resolved in the spec by
   direct reuse, not independently tuned. Flagged again above in Risks only insofar as any sized-by-feel
   Cabinetry constant is — Task 1's manual check is where this actually gets confirmed or adjusted.
2. **Forward note for `11.2`:** the accessibility/performance verification phase (already scoped to extend
   its own check to "whatever pop-trigger `TextInput`/`CoordsInput` lands on") should specifically re-confirm
   the facade doesn't fight native text selection/caret visibility in the real running app, and that a screen
   reader still announces the `<input>`'s own `aria-label` correctly with the new wrapper markup around it.
   Nothing in this plan resolves that ahead of time — `11.2` is the phase scoped to verify it.
