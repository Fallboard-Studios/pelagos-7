# Implementation Plan: Oblique Cabinetry — AccordionContainer (Roadmap Phase 11.1.7)

Source spec: [docs/specs/OBLIQUE_CABINETRY_ACCORDION_CONTAINER.md](../specs/OBLIQUE_CABINETRY_ACCORDION_CONTAINER.md).
Source intent: [docs/intent/oblique-cabinetry-accordion-container.md](../intent/oblique-cabinetry-accordion-container.md).
Pure presentation change — no `AudioEngine`/`BeatClock` change, no new Zustand field, no
`AccordionSchema`/`ControlSchema` change. Every task below wires `AccordionContainer` — this phase's only
touched component — through the already-shipped `CabinetBox` (11.1.1) and `CABINET_TOGGLE_BOX_SIZE`
(11.1.2) exactly as-is. None touch `CabinetBox` itself, `Toggle.tsx`, audio scheduling, any domain config,
or any other primitive.

## Overview

Like `RadioButton` (11.1.6) and unlike `Toggle` (11.1.2), this phase needs **zero** changes to any shared
primitive — every prop it uses on `CabinetBox` (`popped`, `skipMountAnimation`, `boxHeight`, `timelineKey`,
`children`) already exists exactly in the shape this phase needs, and the one constant it needs
(`CABINET_TOGGLE_BOX_SIZE`) is already a public export of `Toggle.tsx`. That collapses this plan to one real
implementation task — the full `AccordionContainer` rewrite, the first Cabinetry item to nest one
`CabinetBox` inside another's front face — plus a docs follow-up.

## Architecture Decisions

- **No "shared-primitive change" task, matching 11.1.6's shape rather than 11.1.2's** — spec §1.1–§1.6
  resolve every implementation-shape question by reusing `CabinetBox`/`Toggle`'s exported constant
  completely unmodified (no new prop, no new export, no rename). There is nothing to isolate-and-verify
  before the consumer task the way `Toggle`'s own `boxHeight`/optional-`children` additions needed to be.
- **`AccordionContainer.tsx`/`.css`/`.test.tsx` land as one task, not split by file or by box** — the facade
  and the toggle box are two instances in the same component, wired in the same render, styled by rules that
  only make sense read together (spec §1.4's selector scoping depends on both existing at once). Splitting
  them into separate tasks would leave an intermediate state with one box built and the other not, which
  isn't independently reviewable or shippable the way `Toggle`'s "primitive, then consumer" split was.
- **The docs task depends only on the core `AccordionContainer` task** — `docs/COMPONENT_LIBRARY.md`'s note
  describes `AccordionContainer`'s own shipped rendering/contract, which is settled once Task 1 lands.
- **No task in this plan touches `CabinetBox.tsx`/`.css`, `Toggle.tsx`/`.css`, `Button.tsx`/`.css`,
  `RadioButton.tsx`/`.css`, `cabinetGeometry.ts`, `cabinetAnimation.ts`, `cabinetBreakpoints.ts`,
  `useCabinetBoxHeight.ts`, `accordionAnimation.ts`, any other primitive, or any domain config file** —
  confirmed against spec §3's Strict Scope boundary and §2's "explicitly not touched" list. No real consumer
  (`PingControlsDrawer.tsx`, `PingContourDrawer.tsx`, `SignatureArrayDrawer.tsx`, `AudioRigDrawer.tsx`) needs
  an edit, since `AccordionContainer`'s props contract doesn't change.

## Dependency Graph

```
Task 1 (AccordionContainer.tsx/.css/.test.tsx — nested facade + toggle CabinetBox wiring)
        │
        └──→ Task 2 (docs/COMPONENT_LIBRARY.md)
```

## Task List

### Phase 1: The consumer — `AccordionContainer`'s nested-`CabinetBox` rewrite

- [ ] **Task 1: `AccordionContainer` — permanently-popped facade + animated toggle box**

  **Description:** Replace `src/components/ui/controls/AccordionContainer.tsx` per spec §1.1–§1.6/§4: keep
  `Accordion.Root`/`Accordion.Item`/`Accordion.Header`/`Accordion.Trigger`/`Accordion.Content` and
  `handleValueChange`/`animateTo`/`contentRef` (the content-height GSAP timeline) exactly as today — this
  task touches the trigger's rendered content only. Inside `Accordion.Trigger`, render an outer `CabinetBox`
  with a literal `popped` (never a variable), `skipMountAnimation`, and a new exported
  `CABINET_ACCORDION_TRIGGER_HEIGHT = 56` as `boxHeight`, keyed by `` `cabinet-accordion-facade-${schema.id}` ``.
  Inside that box's `children`, render a new plain `.sc-accordion__row` wrapper containing an inner
  `CabinetBox` — `popped={open}`, `boxHeight={CABINET_TOGGLE_BOX_SIZE}` (imported from `./Toggle`, not
  redeclared), keyed by `` `cabinet-accordion-toggle-${schema.id}` `` — wrapping the existing `+`/`−`
  `.sc-accordion__indicator` span, followed by the existing `DualLabel`. Replace `AccordionContainer.css`
  per spec §4: delete `.sc-accordion`'s `border`/`border-radius`/`overflow: hidden` and
  `.sc-accordion__trigger`'s own `background-color`; make `.sc-accordion__trigger` a transparent,
  full-width click target (`width: 100%; padding: 0; border: none; background: transparent;`); add the
  direct-child-scoped outer-facade width/layout override
  (`.sc-accordion__trigger > .sc-cabinet-box`/`> .sc-cabinet-box__front`), the new `.sc-accordion__row` row
  layout, the `.sc-accordion__row`-scoped inner-toggle sizing override (reading a new
  `--cabinet-accordion-toggle-size` inline custom property computed from `CABINET_TOGGLE_BOX_SIZE`), and a
  new `background-color: var(--color-surface)` on `.sc-accordion__content-inner`. Restructure the existing
  "places the indicator before the label" test to walk `.sc-accordion__row`'s children instead of the
  trigger's own (its direct children shape changed); extend `AccordionContainer.test.tsx` with the 5 new
  cases from spec §5 — every other existing case stays unchanged and passing.

  **Acceptance criteria:**
  - [ ] Every existing `AccordionContainer.test.tsx` assertion **except** the indicator-ordering one (title
    via `DualLabel`, `aria-expanded` toggling, `setTimeline`/`killTimeline` generically called on
    expand/unmount, reduced-motion snapping, no status light, `defaultOpen` height handling both branches)
    passes unmodified.
  - [ ] The indicator-ordering test is restructured (not deleted) to assert the toggle box precedes
    `DualLabel` within `.sc-accordion__row`, per spec §5 item 1.
  - [ ] Exactly 2 `CabinetBox` instances render per `AccordionContainer`, distinguishable by
    `` `cabinet-accordion-facade-${schema.id}` `` vs. `` `cabinet-accordion-toggle-${schema.id}` ``
    `timelineKey`s — no collision with each other, with the existing content-tween key
    (`` `accordion-${schema.id}` ``), or with any other consumer's own prefix.
  - [ ] The facade instance's `popped` is `true` **unconditionally** — verified both before and after
    clicking the trigger open (it must never flip), and it receives `skipMountAnimation` and
    `boxHeight={CABINET_ACCORDION_TRIGGER_HEIGHT}` (56).
  - [ ] The toggle instance's `popped` mirrors `open` exactly as the old plain indicator's glyph did — `false`
    before the first click, `true` after — and receives `boxHeight={CABINET_TOGGLE_BOX_SIZE}` (32, imported
    from `./Toggle`, not a locally redeclared `32`).
  - [ ] The `+`/`−` glyph (`.sc-accordion__indicator`) renders inside the toggle instance specifically, not
    the facade instance.
  - [ ] `.sc-accordion`'s CSS no longer declares `border`, `border-radius`, or `overflow: hidden`;
    `.sc-accordion__trigger`'s CSS no longer declares its own `background-color`.
  - [ ] `.sc-accordion__content`'s own separate `overflow: hidden` rule (needed for the height tween) is
    unchanged; `.sc-accordion__content-inner` gains a `background-color: var(--color-surface)` rule.
  - [ ] `AccordionSchema`/`ControlSchema` (`src/types/controls.ts`) are untouched — `git diff
    src/types/controls.ts` is empty for this task.
  - [ ] `CabinetBox.tsx`/`.css`, `Toggle.tsx`/`.css`, `Button.tsx`/`.css`, `RadioButton.tsx`/`.css`,
    `cabinetGeometry.ts`, `cabinetAnimation.ts`, `cabinetBreakpoints.ts`, `useCabinetBoxHeight.ts`,
    `accordionAnimation.ts` are all untouched — `git diff` for each is empty for this task.
  - [ ] `handleValueChange`/`animateTo`/`contentRef` and the `Accordion.Content`/`forceMount`/height-tween
    logic are byte-for-byte unchanged from today.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/AccordionContainer.test.tsx` passes — the existing suite
    (minus the one restructured case) plus the 5 new cases from spec §5, mocking `CabinetBox` directly
    (following `Button.test.tsx`/`RadioButton.test.tsx`'s own precedent) for the new per-instance assertions.
  - [ ] `npm run build:types` — zero TypeScript errors.
  - [ ] `npm run lint` — zero ESLint errors.
  - [ ] `npm run build` — production bundle builds cleanly.
  - [ ] `npm test` (full suite) passes, including every real consumer's own test file
    (`PingControlsDrawer.test.tsx`, `PingContourDrawer.test.tsx`, `SignatureArrayDrawer.test.tsx`,
    `AudioRigDrawer.test.tsx`) unmocked against the real `AccordionContainer` — none of them assert against
    the removed chrome or the old direct-children shape (only `.sc-accordion` presence/count,
    `.sc-accordion__content-inner`, and `textContent`, per this spec's own research), but must be re-run to
    confirm rather than assumed.
  - [ ] Manual check (spec §5): across all 4 real consumers (Ping Controls' Melody section, Ping Contour's
    Envelope section, Signature Array's Source section, and at least 2 of Audio Rig's sections including one
    with a long `humanLabel`) — facade renders permanently popped with no animation ever (including across a
    breakpoint-crossing resize); only the small `+`/`−` box animates on click; content panel background reads
    continuous with the facade; keyboard interaction and focus ring both work; stacked accordions in Audio
    Rig stay visually separated by their drawer's own `gap`; reduced-motion still snaps the toggle box
    instantly.

  **Dependencies:** None (11.1.1 and 11.1.2 already shipped and merged to `main`).

  **Files:** `src/components/ui/controls/AccordionContainer.tsx`, `src/components/ui/controls/AccordionContainer.css`, `src/components/ui/controls/AccordionContainer.test.tsx`

  **Estimated scope:** S (3 files — same shape as `Toggle`'s/`RadioButton`'s own single consumer task,
  against already-proven `CabinetBox` mechanics)

### Checkpoint: AccordionContainer ships — first visible change
- [ ] `npm run build:types`, `npm run lint`, `npm run build`, `npm test` (full suite) all clean.
- [ ] Every real `AccordionContainer` call site in the app renders through the new nested-box shape with
  zero call-site changes required — confirmed by `npm run build:types` alone surfacing nothing, since the
  props contract didn't change.
- [ ] Manual check performed against the real running app (see Task 1's own verification list) — flag any
  finding (e.g. the facade height reading too tight/loose against a real long label) for a follow-up fix
  before merge, the same way Toggle's own Task 2 manual check surfaced and fixed a real issue.
- [ ] Review with human before proceeding.

---

### Phase 2: Docs

- [ ] **Task 2: `docs/COMPONENT_LIBRARY.md` — AccordionContainer's internal rendering note**

  **Description:** Add a short note under `AccordionContainer`'s row (mirroring `Button`/`Toggle`/
  `RadioButton`'s own notes) — its internal rendering changed (a permanently-popped facade plus a small
  state-keyed toggle box, replacing plain trigger chrome + a bare text glyph) while its
  `ControlSchema`/props contract stayed byte-for-byte identical, per spec §6. Explicitly call out the
  nested-`CabinetBox` pattern as new to the series (first consumer to nest one `CabinetBox` inside another's
  front face), since a future item may need the same trick.

  **Acceptance criteria:**
  - [ ] `docs/COMPONENT_LIBRARY.md` documents that `AccordionContainer` now renders through `CabinetBox`
    internally (2 nested instances: a static facade, a state-keyed toggle box), with its props contract
    unchanged.
  - [ ] The note is spot-checked against `AccordionContainer.tsx`'s actual shipped code (Task 1), not the
    spec's draft — the documented props shape (`{ schema: AccordionSchema; children: ReactNode; defaultOpen?:
    boolean }`) matches `AccordionContainer.tsx`'s `AccordionContainerProps` interface exactly.

  **Verification:**
  - [ ] Manual review — spot-checked directly against the shipped `AccordionContainer.tsx`.
  - [ ] `npm run build:types`, `npm run lint` clean (docs-only change).

  **Dependencies:** Task 1.

  **Files:** `docs/COMPONENT_LIBRARY.md`

  **Estimated scope:** XS (docs only)

### Checkpoint: Complete
- [ ] `npm run build:types`, `npm run lint`, `npm run build` all clean; `npm test` full suite passes.
- [ ] All acceptance criteria across both tasks are met, including Task 1's manual check.
- [ ] `docs/COMPONENT_LIBRARY.md` reflects the shipped feature.
- [ ] Reviewed with Crawford — ready for PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `CABINET_ACCORDION_TRIGGER_HEIGHT = 56` (spec §1.5) is derived by calculation from `DualLabel`'s typical 2-line stack, not measured against every real label in the app | Low–Medium — a too-short value would visually clip a long/wrapping label; only surfaces in the real running app, not in jsdom | Task 1's manual check explicitly includes a long-`humanLabel` Audio Rig section, not just the shorter typical labels; flagged in the spec itself as "sized by feel, confirm in the real app," same status as every other Cabinetry breakpoint/size constant |
| First Cabinetry item to nest one `CabinetBox` inside another's front face — the direct-child/scoped-descendant selector split (spec §1.4) is a new pattern, not a reused one | Low — purely a CSS-scoping correctness question, verifiable by inspection (does the outer rule's selector chain match only the outer front?) without needing real layout | Acceptance criteria require confirming by direct inspection that no `boxHeight`/sizing override bleeds from one box to the other, not just that tests pass; spec §1.4 documents the reasoning inline for a future reader |
| The facade's "always popped, never animates" behavior depends on `CabinetBox`'s own existing `skipMountAnimation`/`!isTransition` branches continuing to behave as documented (11.1.1) — a future unrelated change to `CabinetBox.tsx` could silently reintroduce a flash | Low — `CabinetBox.tsx` is explicitly out of scope for this task and is a stable, shipped, test-covered primitive | Task 1's own acceptance criteria pin `git diff` on `CabinetBox.tsx` to empty; the "facade `popped` never flips, checked before and after opening" test case is a regression guard specifically for this behavior |
| `docs/roadmap/roadmap.md § 11.1.7`'s own prose still describes the original (superseded) single-box framing | Low — documentation drift only, no functional risk | Spec §7 already flags this explicitly and records the intent doc as the authoritative source; this plan doesn't re-edit the roadmap file, matching every prior item's own practice |

## Open Questions

Resolved during Plan (not left open):

- ~~Does this phase need a separate "shared-primitive change" task before the consumer task, the way
  `Toggle`'s Task 1 did?~~ **Resolved: no** — spec §1.1–§1.6 confirm every `CabinetBox` capability and the
  `CABINET_TOGGLE_BOX_SIZE` constant this phase needs already exist unmodified; there is nothing to
  isolate-and-verify first.
- ~~Should the facade and the toggle box be built as two separate tasks, given they're two different boxes
  with two different lifecycles?~~ **Resolved: no, one task** — they're wired in the same render and styled
  by rules that only make sense together (the selector-scoping split, spec §1.4); an intermediate state with
  only one box built isn't independently reviewable.

Carried forward from spec §7, not blocking this plan:

1. **Exact facade height value (56px).** Resolved in the spec by calculation, not direct measurement against
   every real label. Flagged again above in Risks — Task 1's manual check is where this actually gets
   confirmed or adjusted.
2. **Forward note for 11.1.8–11.1.9:** `Select`'s trigger (11.1.8) is described in the roadmap draft the same
   way 11.1.7's was (a single state-keyed box) — this phase's reframing is worth re-checking during 11.1.8's
   own interview rather than assumed to carry forward. `TextInput`/`CoordsInput` (11.1.9) has no open/closed
   state at all; this phase's two-boxes-with-different-lifecycles pattern is now at least a precedent to
   consider there, not something to invent from scratch. Nothing in this plan resolves either question.
