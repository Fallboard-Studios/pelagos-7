# Implementation Plan: Oblique Cabinetry — Toggle (Roadmap Phase 11.1.2)

Source spec: [docs/specs/OBLIQUE_CABINETRY_TOGGLE.md](../specs/OBLIQUE_CABINETRY_TOGGLE.md). Source intent: [docs/intent/oblique-cabinetry-toggle.md](../intent/oblique-cabinetry-toggle.md). Pure presentation change — no `AudioEngine`/`BeatClock` change, no new Zustand field, no `ToggleSchema`/`ControlSchema` change. Every task below either makes a small additive change to the already-shipped `CabinetBox` primitive (11.1.1) or wires `Toggle` — this phase's only real consumer — through it. None touch audio scheduling, any domain config, or any other primitive.

## Overview

Give `CabinetBox` (shipped in 11.1.1, unmodified in mechanism) two small additive capabilities it doesn't have yet — a fixed-height override and optional `children` — then delete `Toggle`'s pill-track-and-thumb visual entirely and replace it with a bare 32×32px `CabinetBox`, popped when checked, flat when off. Unlike 11.1.1 (which had to build the whole mechanism from nothing), this phase's foundation work is a single small task; the bulk of the real work is the second task, wiring the one real consumer.

## Architecture Decisions

- **`CabinetBox`'s additive props (Task 1) are a separate task from `Toggle` itself (Task 2), not folded together** — same "component change before consumer" sequencing 11.1.1's own Task 5→Task 6 split established (`CabinetBox` before `Button`). This keeps `CabinetBox`'s own test suite (already covering 11.1.1's full contract) provably unbroken by the additive change *before* `Toggle` starts depending on it, isolating risk the same way.
- **Only 2 tasks carry real code** (`CabinetBox`'s additive props, then `Toggle`), plus one docs task — smaller than 11.1.1's 8 tasks because the shared mechanism (projection math, timing, breakpoint hook, the resize-flicker fix, the JS/CSS duplication collapse) is fully reused unmodified. There is no equivalent of 11.1.1's Phase 1 (foundation math modules) or Phase 3 (the primitive itself) to redo here.
- **The docs task (Task 3) depends only on Task 2**, not Task 1 — `docs/COMPONENT_LIBRARY.md`'s note describes `Toggle`'s shipped behavior, which isn't final until Task 2 lands; `CabinetBox`'s own additive props aren't independently documented anywhere (they're an internal implementation detail of how `Toggle` renders, not a new public capability worth its own doc section — matching how 11.1.1 never documented `CabinetBox`'s props shape as its own doc entry either, only `Button`'s/`Toggle`'s consumer-facing behavior).
- **No task in this plan touches a drawer, a domain config file, `Button`, or any other primitive** — confirmed against spec §3's Strict Scope boundary; the 3 sliders remain 11.1.3–11.1.5's own future plans.

## Dependency Graph

```
Task 1 (CabinetBox.tsx additive props: boxHeight, optional children)
        │
        └──→ Task 2 (Toggle.tsx/.css/.test.tsx — wired through CabinetBox)
                        │
                        └──→ Task 3 (docs/COMPONENT_LIBRARY.md)
```

## Task List

### Phase 1: Foundation — additive change to the already-shipped primitive

- [ ] **Task 1: `CabinetBox` — `boxHeight` override + optional `children`**

  **Description:** Modify `src/components/ui/controls/CabinetBox.tsx` per spec §1.2/§4: add an optional `boxHeight?: number` prop that, when supplied, is used instead of `useCabinetBoxHeight()`'s resolved value (the hook is still called unconditionally — Rules of Hooks — its result simply goes unused when overridden); make the existing `children` prop optional (`children?: ReactNode`, was required). No other logic in the file changes — the geometry effect, the resize-flicker fix, the glow tween, and the `--cabinet-box-height`/`--cabinet-pop-distance` inline custom properties are all untouched, just now fed by `boxHeight` (the resolved value, override-or-hook) instead of the hook's return value directly. Extend `CabinetBox.test.tsx` with the 2 new cases from spec §5.

  **Acceptance criteria:**
  - [ ] Every existing `CabinetBox.test.tsx` assertion (11.1.1's full suite — `children` rendering, timeline registration/kill, reduced-motion, wall/glow tweening, border-box measurement, the resize-flicker fix) still passes unmodified — both new props are optional and no existing test passes either one.
  - [ ] `render(<CabinetBox popped={false} timelineKey="test-box" />)` (no `children` at all) renders with no error and an empty `.sc-cabinet-box__front`.
  - [ ] `render(<CabinetBox popped={false} timelineKey="test-box" boxHeight={32}>x</CabinetBox>)` applies `--cabinet-box-height: 32px` on the wrapper — not the `matchMedia`-resolved value (48, under this test file's existing `stubMatchMedia(false)` default) — proving the override wins over the hook's own resolved value.
  - [ ] `Button.tsx`'s call site is untouched — it passes `children` and never `boxHeight`, and behaves identically (`git diff src/components/ui/controls/Button.tsx` is empty for this task).

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/CabinetBox.test.tsx` passes, covering both new cases from spec §5 alongside 11.1.1's full existing suite unmodified.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm run build` clean.
  - [ ] Manual check: none applicable yet — `boxHeight`/optional `children` have zero real consumers until Task 2, same "component before consumer" precedent 11.1.1's own Task 5→6 split used.

  **Dependencies:** None (11.1.1 already shipped and merged to `main`).

  **Files:** `src/components/ui/controls/CabinetBox.tsx`, `src/components/ui/controls/CabinetBox.test.tsx`

  **Estimated scope:** XS (2 files, both changes additive and optional — the lowest-risk task in this plan)

### Checkpoint: Foundation change ships
- [ ] `npm run build:types`, `npm run lint`, `npm run build`, `npm test` all clean (full suite, not just `CabinetBox.test.tsx`) — confirms the additive change is genuinely non-breaking for `Button` and every other real consumer.
- [ ] `CabinetBox` accepts `boxHeight`/optional `children` (verified by its own test suite) with zero other file in the app referencing either yet.
- [ ] Review with human before proceeding.

---

### Phase 2: The real consumer

- [ ] **Task 2: `Toggle` — wired through `CabinetBox`**

  **Description:** Replace `src/components/ui/controls/Toggle.tsx` per spec §4's full replacement: delete `Switch.Thumb`, render `<CabinetBox popped={value} boxHeight={CABINET_TOGGLE_BOX_SIZE} timelineKey={\`cabinet-toggle-${schema.id}\`} />` (no `children`) as `Switch.Root`'s only child; export `CABINET_TOGGLE_BOX_SIZE = 32`; apply `--cabinet-toggle-box-size` as an inline style on `Switch.Root` (spec §1.2 — one JS source for the fixed size, read by both the `boxHeight` prop and the CSS width/height override, not two independently hand-typed `32`s). `popped` is `value` unconditionally — no `!disabled` guard (spec §1.4, a deliberate departure from `Button`'s own rule, reasoned through explicitly there). Replace `Toggle.css` per spec §4: delete the pill-track background/`[data-state='checked']` color rule, `.sc-toggle__thumb`, and the component-local `prefers-reduced-motion` block entirely (`CabinetBox` already owns all of this); add `.sc-toggle__root { width: fit-content; ... }` (mirroring `Button.css`'s own `.sc-button` transparent-click-target rule) and the scoped `.sc-toggle__root .sc-cabinet-box__front` size override. Extend `Toggle.test.tsx` with the 6 new cases from spec §5 — every existing test in the current file stays unchanged and passing.

  **Acceptance criteria:**
  - [ ] Every existing `Toggle.test.tsx` assertion (all 10 cases: `aria-checked` both values, controlled-no-internal-state, `onChange(!value)` on click, `DualLabel` rendering, `isActive` class present/absent, accessible-name fallback, not-disabled-by-default, disabled attribute, no `onChange` when disabled while clicked) still passes unmodified.
  - [ ] `CabinetBox` receives `popped="true"` when `value` is `true`, `"false"` when `value` is `false`.
  - [ ] `CabinetBox` receives `boxHeight={32}` (`CABINET_TOGGLE_BOX_SIZE`) regardless of any `matchMedia` stubbing — proves the size isn't accidentally breakpoint-derived.
  - [ ] `CabinetBox` receives `timelineKey={\`cabinet-toggle-${schema.id}\`}` — distinct from `Button`'s own `cabinet-button-` prefix.
  - [ ] `popped` stays `"true"` when `value` is `true` **and** `disabled` is also `true` (spec §1.4's resolved-by-reasoning decision, directly exercised so a future change to it fails a named test).
  - [ ] No `.sc-toggle__thumb` element exists anywhere in the rendered output (guards against silently reintroducing the deleted pill/thumb markup).
  - [ ] `ToggleSchema`/`ControlSchema` are untouched — `git diff src/types/controls.ts` is empty for this task.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/Toggle.test.tsx` passes (16/16 — the existing 10 plus the 6 new cases from spec §5), mocking `CabinetBox` directly (`vi.mock('./CabinetBox', ...)`, rendering `data-popped`/`data-box-height`/`data-timeline-key`), mirroring `Button.test.tsx`'s own precedent of keeping this file's assertions about `Toggle`'s own event-to-prop logic isolated from `CabinetBox`'s already-proven internals (Task 1 / 11.1.1).
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] `npm run build` clean.
  - [ ] Full suite (`npm test`) re-confirmed clean, including `StepperWithToggle.test.tsx` (unmodified — composes `Toggle` internally, has no live consumer today, but its own existing coverage must keep passing unmocked against the real `Toggle`) and `PingControlsDrawer.test.tsx` (the one real `Toggle` consumer's own test file).
  - [ ] Manual check: load the app, open Robot Options' Ping Controls drawer (`PingControlsDrawer.tsx`'s "Click Track Active" toggle — the only real `Toggle` consumer in the current app) and confirm: flat 32×32px box at rest, pops fully out with the same protrusion/glow as any `Button` when switched on, `Tab`+`Space`/`Enter` keyboard toggling still works, the focus ring renders clearly on both states, the transition snaps instantly under "reduce motion", and a checked-and-disabled toggle (if reachable, else forced via devtools) still renders popped rather than flat.

  **Dependencies:** Task 1.

  **Files:** `src/components/ui/controls/Toggle.tsx`, `src/components/ui/controls/Toggle.css`, `src/components/ui/controls/Toggle.test.tsx`

  **Estimated scope:** S (3 files, mechanical wiring against an already-proven `CabinetBox`, same shape as 11.1.1's own `Button` task)

### Checkpoint: Toggle ships — first visible change
- [ ] `npm run build:types`, `npm run lint`, `npm run build` all clean; `npm test` full suite passes.
- [ ] The one real `Toggle` call site in the app (`PingControlsDrawer.tsx`'s Click Track Active toggle) renders through `CabinetBox` with no call-site changes required — confirmed by `npm run build:types` alone surfacing nothing, since `Toggle`'s props contract didn't change.
- [ ] Manual check from Task 2 completed (or explicitly flagged as not performed, with reasoning, if no browser automation is available in the implementing environment — same honest fallback 11.1.1's own Task 6 used).
- [ ] Review with human before proceeding — in particular, confirm the disabled+checked `popped` call (spec §1.4/§7 item 1) reads correctly against the real running app, since it's the one design point resolved by reasoning rather than direct interview.

---

### Phase 3: Docs

- [ ] **Task 3: `docs/COMPONENT_LIBRARY.md` — Toggle's internal rendering note**

  **Description:** Add a short note under `Toggle`'s row (mirroring `Button`'s own note from 11.1.1) — its internal rendering changed (cabinet SVG/GSAP box instead of a pill track + sliding thumb) while its `ControlSchema`/props contract stayed byte-for-byte identical, per spec §6.

  **Acceptance criteria:**
  - [ ] `docs/COMPONENT_LIBRARY.md` documents that `Toggle` now renders through `CabinetBox` internally, with its props contract unchanged.
  - [ ] The note is spot-checked against `Toggle.tsx`'s actual shipped code (Task 2), not the spec's draft — the documented props shape (`{ schema: ToggleSchema; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }`) matches `Toggle.tsx`'s `ToggleProps` interface exactly.

  **Verification:**
  - [ ] Manual review — spot-checked directly against the shipped `Toggle.tsx`.
  - [ ] `npm run build:types`, `npm run lint` clean (docs-only change).

  **Dependencies:** Task 2.

  **Files:** `docs/COMPONENT_LIBRARY.md`

  **Estimated scope:** XS (docs only)

### Checkpoint: Complete
- [ ] `npm run build:types`, `npm run lint`, `npm run build` all clean; `npm test` full suite passes.
- [ ] All acceptance criteria across all 3 tasks are met, including the Task 2 manual check (or explicitly flagged if no browser automation was available).
- [ ] `docs/COMPONENT_LIBRARY.md` reflects the shipped feature.
- [ ] Ready for PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The disabled+checked `popped` behavior (spec §1.4) was resolved by reasoning during Specify, not directly interviewed — Crawford may actually want "disabled toggles always render flat," matching `Button`'s literal rule | Low–Medium — a one-line change (`popped={!disabled && value}` vs. `popped={value}`) if wrong, but a visible behavior difference from what's shipped | Task 2's acceptance criteria pin the current decision to a named, explicit test (not an incidental side effect) specifically so it's easy to spot and flip in review; the Phase 2 checkpoint calls this out by name for human review before merge |
| `CabinetBox`'s `boxHeight` override (Task 1) is a small API surface change to an already-shipped, `Button`-proven component — a mistake here risks a regression in `Button`, not just `Toggle` | Low — both new props are optional and additive, and Task 1's own acceptance criteria explicitly require `Button`'s call site and full existing `CabinetBox.test.tsx` suite to stay unmodified and passing | Task 1 is its own task/checkpoint, shipped and full-suite-verified *before* `Toggle` (Task 2) starts depending on it — isolates any regression to Task 1 alone, same "component before consumer" sequencing 11.1.1 used for the same reason |
| `StepperWithToggle` composes `Toggle` internally but has no live consumer today — a regression there wouldn't be caught by any real user-facing check | Low — no live consumer means no production impact even if missed | `StepperWithToggle.test.tsx`'s own existing suite is explicitly named in Task 2's verification steps as must-stay-passing, unmocked, so a regression is still caught by CI/local test runs even without a real consumer to notice it manually |

## Open Questions

Resolved during Plan (not left open):

- ~~Does `CabinetBox`'s additive change need its own phase, or can it be folded into the `Toggle` task?~~ **Resolved: separate task/phase**, mirroring 11.1.1's own "component before consumer" split (`CabinetBox` before `Button`) for the same risk-isolation reason.
- ~~Does the docs task depend on both tasks, or just one?~~ **Resolved: Task 3 depends only on Task 2** — `CabinetBox`'s additive props aren't independently documented (an internal implementation detail, not a new public capability), only `Toggle`'s consumer-facing behavior is.

Carried forward from spec §7, not blocking this plan:

1. **The disabled+checked `popped` decision** (spec §1.4/§7 item 1) — resolved by reasoning, not directly interviewed. Flagged above in Risks and at the Phase 2 checkpoint for explicit human review before merge, rather than assumed correct.
2. **Forward note for 11.1.3–11.1.5 (the sliders):** this phase's `CabinetBox` additions (`boxHeight` override, optional `children`) are `Toggle`-driven conveniences on the existing single-box primitive — the sliders build a genuinely different rendering shape (the voxel-track system) and may or may not reuse either addition. Not this plan's concern to resolve; noted so 11.1.3's own plan doesn't assume they carry forward automatically.
