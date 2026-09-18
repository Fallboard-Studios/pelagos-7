# Implementation Plan: Accordion Lazy Mount

Source spec: [docs/specs/ACCORDION_LAZY_MOUNT.md](../specs/ACCORDION_LAZY_MOUNT.md) (approved 2026-09-18, all §7 questions resolved). Covers [Roadmap 17.2.2](../todo/roadmap.md#1722-performance-lazy-mount-collapsed-accordion-content). Measured with the harness from 17.2.1 ([docs/PERFORMANCE.md](../PERFORMANCE.md), `npm run perf`). Internal to one primitive — no schema change, no Zustand change, no `AudioEngine`/`BeatClock` change, no new dependency, no call-site edit in any consumer component.

## Overview

`AccordionContainer` stops building a section's controls until the section is first opened; once mounted, content stays mounted (closing only hides it). The first-open height animation is deferred to a `useLayoutEffect` so `scrollHeight` is measured after the content commits. The change itself is one small edit to one component — the bulk of the work is (a) recording an honest **pre-change baseline** before touching anything, (b) migrating roughly 160 `render(...)` calls in five drawer test files so the suite stays green throughout, and (c) proving the result with the profiling harness against thresholds fixed in advance (spec §5.3).

**Ordering principle: the suite is green after every task.** Tests are migrated to open their sections *before* the component changes (a no-op under eager mounting), so the component change lands against a suite that already tolerates it. The pre-change baseline is recorded before the component change lands, so before/after numbers come from the same harness at the same settings.

## Architecture Decisions

- **Keep mounted after first open** (spec §1.4, Q1) — preserves `useLfoTargetGroup`'s local selection, avoids replaying mount cost, keeps the close animation trivial.
- **Test migration via a shared helper, not a component prop** (Q2) — `src/testUtils/openAccordions.ts`, beside the existing `cssRuleBody.ts`. `AccordionContainer`'s public contract is untouched.
- **First-open animation deferred with `useLayoutEffect`, not a timer** (spec §3/§4.1) — `CLAUDE.md` forbids timer-driven animation, and an after-paint effect would flash an open-but-empty section.
- **Migration is verified with a throwaway prototype, never committed.** The recipe (used in Tasks 4–5): temporarily change `{children}` to `{open ? children : null}` in `AccordionContainer.tsx`'s content-inner `div`, run the migrated file(s), then `git checkout -- src/components/ui/controls/AccordionContainer.tsx`. A file is only "migrated" once it passes 100% under the prototype *and* under the unmodified component.
- **Thresholds are fixed now, not after the fact** (Q4): spec §5.3 criteria 1–3 are gates; criterion 4 (first-open cost) is recorded, not gated (Q5). A missed gate is reported to Crawford, not re-tuned.
- **Animation timing is adjustable, but only as evidence-driven Task 8 work** — Crawford is open to it (spec §3); nothing is retuned speculatively.
- **Docs land last (Task 9)**, once the shipped behavior is real — the precedent [docs/tasks/SLIDER_LINEAR_READ_ONLY.md](SLIDER_LINEAR_READ_ONLY.md) set.
- **Stacked commits on `bug/view-change-slowdown`, one per task, no push** until Crawford says so. Tone `lookAhead` (17.2.4) stays untouched so the measurements aren't contaminated.

## Dependency Graph

```
Task 1 (harness: per-section first-open steps)
    │
    └──→ Task 2 (record PRE-change baseline)  ──────────────────────────────┐
                                                                            │
Task 3 (openAccordions helper + test)                                       │
    │                                                                       │
    ├──→ Task 4 (AudioRigDrawer.test.tsx → open sections)                   │
    └──→ Task 5 (4 robot-drawer test files → open sections)                 │
              │                                                             │
              └────────────→ Task 6 (lazy mount in AccordionContainer) ←────┘
                                  │
                                  └──→ Task 7 (POST-change measurement vs. §5.3 gates)
                                            │
                                            └──→ Task 8 (smoothness pass, conditional tuning)
                                                      │
                                                      └──→ Task 9 (docs + roadmap close-out)
```

Tasks 1→2 and 3→(4,5) are independent chains and could run in parallel; Task 6 needs both. Recommended: run them sequentially in numeric order anyway — each is small, and Task 2's ~10 minutes of harness runs shouldn't overlap with other edits to the working tree.

## Task List

### Phase 1: Measure first (no product code changes)

- [ ] **Task 1: Harness — per-section first-open steps**

  **Description:** Extend `scripts/perf/profile.mjs` so that, after opening Fleet Params and after opening a robot's detail page, it opens **every** accordion on the page once, in turn (click each `.sc-accordion__trigger` whose `aria-expanded` is `false`), and reports one table row per section — labeled from the trigger's own text, with the same columns as every other step (tasks ≥100 ms, longest, total in ≥100 ms tasks, cabinet boxes, boxes in closed accordions). A short settle time (≈1.5 s) is enough for these. Pre-change, these rows show near-zero cost (the content is already mounted, only the height tween runs); post-change they show the mount cost that moved here — the before/after pair is exactly what spec §5.3.4 asks to be recorded. The existing steps and their order are otherwise unchanged so previously-recorded rows stay comparable.

  **Acceptance criteria:**
  - [ ] After "open Fleet Params" the table gains one row per accordion on that page; after "open first robot (detail)" it gains one row per accordion on the detail page. No row is added for an accordion that was already open.
  - [ ] Each row's label identifies its section (e.g. `fleet › EQ & Filters`, `detail › Source`) using the trigger's visible text, not an index.
  - [ ] Every existing step row is still produced with unchanged columns and unchanged relative order (new rows sit between existing ones; none replace them).
  - [ ] The script exits cleanly and leaves no Chrome process or temp profile behind (existing behavior, re-confirmed).

  **Verification:**
  - [ ] `npx eslint scripts/perf/profile.mjs` clean.
  - [ ] `npm run build && npx vite preview --port 4173`, then `npm run perf -- --throttle 1` prints the new rows; row count matches the number of collapsed `.sc-accordion__trigger` elements seen via DevTools on those two screens.
  - [ ] Manual check: pre-change first-open rows show small longest-task values (no mount work) — sanity that the step measures what it claims to.

  **Dependencies:** None.

  **Files:** `scripts/perf/profile.mjs`

  **Estimated scope:** S (1 file).

- [ ] **Task 2: Record the pre-change baseline**

  **Description:** With the component **unchanged** (HEAD before Task 6), run the harness 3× at `--throttle 1` and 3× at `--throttle 4` against a fresh production build and record medians and ranges in a new dated section of `docs/PERFORMANCE.md` — "Pre-change baseline for 17.2.2" — covering every step row including the robot-detail steps and Task 1's per-section rows. This is the reference every §5.3 gate in Task 7 is measured against; it must be recorded *before* Task 6 changes the numbers. The existing 2026-09-18 table (2 runs, no robot-detail rows) stays as history and is not overwritten.

  **Acceptance criteria:**
  - [ ] New section holds, per step: median and min–max of `tasks ≥100 ms`, `longest`, `total in ≥100 ms tasks`, `cabinetBoxes`, `boxes in closed accordions`, at both 1× and 4×, from 3 runs each (run count stated).
  - [ ] The git commit SHA and build type (production, minified) measured are stated, so the baseline is reproducible.
  - [ ] The three numbers spec §5.3 gates against are called out explicitly, per screen: Fleet Params open and robot-detail open (longest task, and total in ≥100 ms tasks at 4×), and the Probes list longest task at 1×.
  - [ ] Any run that looks anomalous (e.g. a different box count from robot roster drift) is noted, not silently dropped.

  **Verification:**
  - [ ] `git diff` shows only `docs/PERFORMANCE.md` changed; `git status` clean afterward.
  - [ ] Spot-check: recorded medians are consistent with the earlier 2026-09-18 single-run values (e.g. Fleet Params open at 1× ≈ 200–340 ms longest).

  **Dependencies:** Task 1.

  **Files:** `docs/PERFORMANCE.md`

  **Estimated scope:** XS (1 doc file; ~10 minutes of harness time across 6 runs).

### Checkpoint: Baseline recorded
- [ ] Baseline section committed; component code still untouched; `npm test` still green (nothing product-side changed).
- [ ] Review with human before proceeding.

---

### Phase 2: Test infrastructure and migration (behavior-neutral)

- [ ] **Task 3: `openAllAccordions` test helper**

  **Description:** Add `src/testUtils/openAccordions.ts` exporting `openAllAccordions(root = document.body)`: expands every currently-collapsed `AccordionContainer` under `root` by clicking its trigger (inside `act`), so a test can assert against content that lazy mounting will no longer render while closed. Write its own test first, per repo TDD. The query is confirmed against the trigger Radix actually renders (a `<button class="sc-accordion__trigger" aria-expanded="false">`); spec §4.3's snippet is illustrative, not authoritative.

  **Acceptance criteria:**
  - [ ] Given a tree with several closed accordions, all of them report `aria-expanded="true"` after the call.
  - [ ] Already-open accordions are left open (not toggled closed).
  - [ ] Non-accordion buttons in the same tree are never clicked.
  - [ ] `root` scoping works: accordions outside the given root are untouched.
  - [ ] Exports only the helper; no dependency on any drawer or store.

  **Verification:**
  - [ ] `npx vitest run src/testUtils/openAccordions.test.ts` passes (written first, seen failing, then passing).
  - [ ] `npm run build:types` and `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/testUtils/openAccordions.ts`, `src/testUtils/openAccordions.test.ts`

  **Estimated scope:** S (2 files).

- [ ] **Task 4: Migrate `AudioRigDrawer.test.tsx`**

  **Description:** The largest file (74 tests, ~74 `render(` matches). Add a file-local `renderOpen(ui)` wrapper that calls `render` then `openAllAccordions(container)`, and switch the tests to it. Tests that assert a section is *closed* keep plain `render`. No assertion is edited, weakened, or removed — the diff should be `render(`→`renderOpen(` plus one import and the wrapper.

  **Acceptance criteria:**
  - [ ] All 74 existing tests still pass against the **unmodified** component.
  - [ ] With the throwaway prototype applied (`{open ? children : null}`, reverted afterward — see Architecture Decisions), all 74 still pass. This is the proof the migration is complete.
  - [ ] The diff contains no changed `expect(...)` line and no deleted test.
  - [ ] Working tree is clean of the prototype after verification (`git diff -- src/components/ui/controls/AccordionContainer.tsx` empty).

  **Verification:**
  - [ ] `npx vitest run src/components/panels/screen/console/AudioRigDrawer.test.tsx` — unmodified component: 74/74.
  - [ ] Same command with the prototype applied: 74/74; then revert and re-run: 74/74.
  - [ ] `npm run lint` clean.

  **Dependencies:** Task 3.

  **Files:** `src/components/panels/screen/console/AudioRigDrawer.test.tsx`

  **Estimated scope:** S (1 file; large but mechanical).

- [ ] **Task 5: Migrate the four robot-drawer test files**

  **Description:** Same treatment for `AudioSettingSection.test.tsx` (~21 `render(` matches), `PingContourDrawer.test.tsx` (~14), `PingControlsDrawer.test.tsx` (~21; it already has a local `renderDrawer` — extend it), and `SignatureArrayDrawer.test.tsx` (~29). Also run `CompanyCrudControls.test.tsx` five times on the unmodified component and under the prototype to settle whether its single intermittent failure (spec §1.6) is accordion-related, flaky on its own, or neither.

  **Acceptance criteria:**
  - [ ] All four files pass fully against the unmodified component and fully under the prototype (20 + 14 + 23 + 28 tests, per the spec's baseline counts).
  - [ ] Diff is limited to the import, the `renderOpen` wrapper (or extension of `renderDrawer`), and `render(`→`renderOpen(` swaps — no `expect` touched, no test removed.
  - [ ] `CompanyCrudControls.test.tsx` outcome is written down in the commit message: (a) accordion-related → fixed here with the same helper (adds that file to this task's diff), (b) pre-existing flake unrelated to this work → noted, and a backlog line added (`docs/todo/backlog.md`), or (c) not reproducible in 5 runs → noted.
  - [ ] Prototype fully reverted afterward.

  **Verification:**
  - [ ] `npx vitest run src/components/robot/AudioSettingSection.test.tsx src/components/robot/PingContourDrawer.test.tsx src/components/robot/PingControlsDrawer.test.tsx src/components/robot/SignatureArrayDrawer.test.tsx` — green, both ways (unmodified, then prototype, then reverted).
  - [ ] `npx vitest run src/components/company/CompanyCrudControls.test.tsx` ×5, both ways.
  - [ ] `npm run lint` clean.

  **Dependencies:** Task 3.

  **Files:** `src/components/robot/AudioSettingSection.test.tsx`, `src/components/robot/PingContourDrawer.test.tsx`, `src/components/robot/PingControlsDrawer.test.tsx`, `src/components/robot/SignatureArrayDrawer.test.tsx` (+ `src/components/company/CompanyCrudControls.test.tsx` only if outcome (a)).

  **Estimated scope:** M (4–5 files).

### Checkpoint: Test migration complete
- [ ] Full `npm test`, `npm run lint`, `npm run build:types` green against the **unmodified** component.
- [ ] The prototype run of the whole suite fails only in places outside the migrated files (i.e. none of the previously-failing 129–130 tests remain failing under the prototype).
- [ ] Review with human before proceeding.

---

### Phase 3: The change

- [ ] **Task 6: Lazy mount in `AccordionContainer`**

  **Description:** Implement spec §4.1. Write the `describe('lazy mount')` tests (spec §5.2, items 1–8) first and see them fail, then add `hasOpened` state (initial `defaultOpen`), the `pendingFirstOpenAnimation` ref, the `useLayoutEffect([hasOpened])` that runs `animateTo(true)` after a first-open commit, the `handleValueChange` branch, and `{hasOpened ? children : null}` inside the content-inner `div`. Also add the integration guard to `AudioRigDrawer.test.tsx` (spec §5.2): rendering mounts no controls from never-opened sections, and opening one section mounts only that section's controls — the test that fails if anyone re-adds an eager mount. `forceMount`, the always-rendered content wrapper, `animateTo`'s body, durations, and reduced-motion handling are untouched.

  **Acceptance criteria:**
  - [ ] A never-opened section renders none of its children (mount counter of a probe child stays 0).
  - [ ] First open mounts the children **and** the height tween's target equals the (stubbed) measured `scrollHeight` — i.e. measured after mount, not synchronously before it. A synchronous implementation fails this test.
  - [ ] First open registers exactly one timeline (`setTimeline` once); the layout effect does not double-fire `animateTo`.
  - [ ] Open → close → reopen: children stay mounted (mount count 1) and local child state survives; the reopen takes the synchronous path.
  - [ ] `defaultOpen` mounts children immediately and still sets wrapper `height: auto`; `prefers-reduced-motion` first open still mounts and snaps; trigger `aria-expanded`/`aria-controls` valid on a never-opened section.
  - [ ] Every pre-existing `AccordionContainer.test.tsx` test passes unmodified.
  - [ ] The full suite passes, including the Task 4–5 files, `CompanyCrudControls.test.tsx`, and the new integration guard. (If a previously-unseen failure appears, it is diagnosed, not skipped.)
  - [ ] No file outside the list below changes — in particular no consumer component (`AudioRigDrawer.tsx`, the four robot drawers) and no CSS.

  **Verification:**
  - [ ] `npx vitest run src/components/ui/controls/AccordionContainer.test.tsx` — new tests red before, green after.
  - [ ] `npx vitest run src/components/panels/screen/console/AudioRigDrawer.test.tsx` green including the integration guard.
  - [ ] `npm test` (full suite) green; `npm run build:types`, `npm run lint`, `npm run build` clean.

  **Dependencies:** Tasks 2, 4, 5. (Task 2 is a *sequencing* dependency: the baseline must be recorded before this lands.)

  **Files:** `src/components/ui/controls/AccordionContainer.tsx`, `src/components/ui/controls/AccordionContainer.test.tsx`, `src/components/panels/screen/console/AudioRigDrawer.test.tsx`

  **Estimated scope:** S–M (3 files).

### Checkpoint: Change landed
- [ ] `npm test`, `npm run lint`, `npm run build:types`, `npm run build` all clean.
- [ ] Every pre-existing test passes; none deleted or weakened.
- [ ] `git diff` since the baseline commit touches `AccordionContainer.tsx` only among product files.
- [ ] Review with human before proceeding.

---

### Phase 4: Prove it

- [ ] **Task 7: Post-change measurement against the §5.3 gates**

  **Description:** Rebuild, then run the harness 3× at 1× and 3× at 4× — same machine, same settings, same steps as Task 2 — and record a new dated **"Post-change (17.2.2)"** section in `docs/PERFORMANCE.md` beside the baseline. Evaluate each spec §5.3 criterion explicitly, pass/fail, in that section. Per Q4, thresholds are not re-tuned after the fact; a miss is reported to Crawford as-is. Per Q5, first-open costs (criterion 4) are recorded but do not gate.

  **Acceptance criteria:**
  - [ ] **Gate 1 (deterministic):** `boxes in closed accordions` is 0 immediately after each tile opens; total `.sc-cabinet-box` ≤ 25 (Fleet Params), ≤ 150 (Probes list), ≤ 55 (robot detail); Nav & Comms still 26.
  - [ ] **Gate 2 (1×, medians of 3):** no task ≥ 100 ms opening Fleet Params or a robot's detail page; Probes list longest task ≤ 50% of the Task 2 median.
  - [ ] **Gate 3 (4×, medians of 3):** total time in ≥ 100 ms tasks for Fleet Params open and robot-detail open down ≥ 60% vs the Task 2 medians.
  - [ ] **Recorded, not gated:** per-section first-open cost table (1× and 4×), with the largest called out; any section over 100 ms at 1× is listed.
  - [ ] Each gate is marked PASS or MISS with its numbers. On a MISS: work stops, the numbers go to Crawford, and no threshold or the baseline is edited to fit.

  **Verification:**
  - [ ] `git diff` shows only `docs/PERFORMANCE.md`; run counts and commit SHA stated.
  - [ ] Numbers sanity-checked against the pre-change table (post-change rows should be strictly smaller for tile opens, larger-but-small for first-opens).

  **Dependencies:** Task 6.

  **Files:** `docs/PERFORMANCE.md`

  **Estimated scope:** XS (1 doc file; ~10 minutes of harness time).

- [ ] **Task 8: Smoothness pass — jump / flash check, and conditional animation tuning**

  **Description:** jsdom can't see frames (spec §5.3.7, Risk R1), so this is measured in real Chrome. Add a `--smoothness` mode to the harness (or a sibling script if cleaner) that, at 390, ~820, and 1280 px widths and at 1× and 4× throttle, opens a never-opened section and samples its `.sc-accordion__content` height (and `aria-expanded`) on every animation frame via an injected in-page sampler — verification tooling only, not app code — then reports: (a) any frame where the section is `aria-expanded="true"` but height is 0 or content-inner is empty *after the first post-click frame* (an "open but empty" flash), (b) the largest single-frame height jump after the tween's final eased frame (the R1 `height: auto` correction jump), (c) frames dropped during the open. Then close and reopen and confirm the reopen path is unchanged. **Only if** the numbers show a real problem, or Crawford's own look does, apply the approved latitude (spec §3): re-measure `scrollHeight` inside the tween's `onComplete` before releasing to `auto`, and/or adjust `ACCORDION_DURATION`/`ACCORDION_FADE_DURATION`/easing in `accordionAnimation.ts`/`AccordionContainer.tsx`. Nothing is retuned speculatively.

  **Acceptance criteria:**
  - [ ] Measurements for (a), (b), (c) recorded for all three widths at both throttles, in `docs/PERFORMANCE.md`.
  - [ ] (a) is zero everywhere. (b) is ≤ 2 px at every width (no visible snap). If either fails, a fix is made and the measurement re-run until it passes — or the residual is reported to Crawford with numbers.
  - [ ] If any animation duration/easing/sequencing is changed: the affected `AccordionContainer.test.tsx`/`accordionAnimation` tests are updated *with the reason*, the `prefers-reduced-motion` snap is verified still intact, and the change is justified in the commit message by the measurement that motivated it.
  - [ ] If nothing needed changing, that is recorded ("measured, no adjustment needed") — not padded with speculative tweaks.
  - [ ] Crawford has looked at it in a real browser at mobile and desktop widths and confirmed it reads smooth (I can verify frames, not feel — this is a human sign-off, listed at the checkpoint).

  **Verification:**
  - [ ] `npx eslint scripts/perf/profile.mjs` clean; `npm test`, `npm run lint`, `npm run build:types`, `npm run build` still green if any product/test file changed.
  - [ ] Re-run of Task 7's harness after any timing change confirms gates 1–3 still pass (a timing tweak must not regress them).

  **Dependencies:** Task 6 (Task 7 not required, but a tuning change should be re-verified against it).

  **Files:** `scripts/perf/profile.mjs`, `docs/PERFORMANCE.md`; conditionally `src/components/ui/controls/AccordionContainer.tsx`, `src/components/ui/controls/accordionAnimation.ts`, `src/components/ui/controls/AccordionContainer.test.tsx`.

  **Estimated scope:** M (2 files always, up to 5 if tuning is needed).

### Checkpoint: Proven
- [ ] Gates 1–3 PASS (or misses reported with numbers and a decision from Crawford).
- [ ] Smoothness measurements recorded; no open-but-empty frame; no visible height jump.
- [ ] Crawford's visual sign-off at mobile and desktop widths.
- [ ] Review with human before proceeding.

---

### Phase 5: Docs and close-out

- [ ] **Task 9: Docs and roadmap**

  **Description:** Update `docs/COMPONENT_LIBRARY.md` in both places the spec names — the `AccordionContainer` contract (mount-on-first-open, stays mounted) and the Phase 11.1.7 paragraph that currently claims `handleValueChange`/`animateTo`/`contentRef` are "byte-for-byte unchanged," which is no longer true; add a short note to `docs/PERFORMANCE.md` that `boxes in closed accordions` is now a regression alarm (expected 0) rather than a waste metric; mark roadmap 17.2.2 done with a shipped-vs-drafted note (including any timing changes from Task 8 and the Task 5 `CompanyCrudControls` finding); update the spec's status line to "implemented" and correct §1.1/§5.3 wording if the shipped behavior differs. Docs land last so they describe what shipped, not what was drafted.

  **Acceptance criteria:**
  - [ ] `COMPONENT_LIBRARY.md` describes the lazy-mount contract and no longer asserts `handleValueChange` is unchanged; its `defaultOpen` and `forceMount` explanations are consistent with the code.
  - [ ] `PERFORMANCE.md` states the new meaning of the `boxes in closed accordions` column.
  - [ ] Roadmap 17.2.2 carries a **Done** paragraph in the same style as the other items, naming the measured before/after (from Task 7) and any deviation from the draft (animation timing, `CompanyCrudControls`).
  - [ ] Spec status line reads implemented; no stale "draft"/"not yet approved" language remains in it.
  - [ ] A grep for the old claim (`byte-for-byte unchanged` near `handleValueChange`) finds nothing stale.

  **Verification:**
  - [ ] Every doc claim checked against the merged code (paths, line references, constant names) — per the repo's "verify roadmap against code" rule.
  - [ ] `git diff` limited to the four doc files above.

  **Dependencies:** Tasks 7, 8.

  **Files:** `docs/COMPONENT_LIBRARY.md`, `docs/PERFORMANCE.md`, `docs/todo/roadmap.md`, `docs/specs/ACCORDION_LAZY_MOUNT.md`

  **Estimated scope:** M (4 doc files).

### Checkpoint: Complete
- [ ] All spec §5.3 criteria met (or explicitly reported as missed with numbers).
- [ ] `npm test`, `npm run lint`, `npm run build:types`, `npm run build` clean.
- [ ] Working tree clean; one commit per task on `bug/view-change-slowdown`, unpushed.
- [ ] Ready for review — and for 17.2.3, whose baseline is now this task's post-change section.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| First-open measures unsettled content, causing a height jump when `height: auto` takes over (spec R1) | Med | Task 8 measures the jump per width at 1×/4× and has approved latitude to re-measure in `onComplete` and/or retune timing. |
| Post-change numbers miss a gate (e.g. the Probes list can't reach ≤ 50% because ~137 non-accordion boxes remain) | Med | Gates were fixed up front (Q4); a miss is reported with numbers, not re-tuned. The remaining cost is 17.2.3/17.2.5's job by design. |
| Baseline drifts between Task 2 and Task 7 (robot roster grows over a run; machine load) | Med | 3 runs each, medians and ranges, same machine and settings; box-count drift noted, not hidden (`docs/PERFORMANCE.md` already documents the variance). |
| A test-migration edit silently weakens an assertion (spec R4) | Med | Tasks 4–5 require a diff with no changed `expect` line and no deleted test; reviewer checks the diff for `render`→`renderOpen` and nothing else. |
| Task 6 surfaces a failure the prototype run didn't (the prototype rendered on `open`, not `hasOpened`) | Low | Full-suite run is a Task 6 acceptance criterion; new failures are diagnosed, never skipped. |
| The one `CompanyCrudControls` intermittent failure is a real, separate flake | Low | Task 5 settles it with 5 runs both ways and records the outcome in the commit message and (if separate) the backlog. |
| Harness timing steps mutate app state, making later steps non-comparable | Low | Task 1 places per-section opens after the corresponding tile-open step; the tile is remounted by later steps (`back to …`), which resets section state. |

## Open Questions

None blocking. Spec §7's five questions are resolved (Crawford, 2026-09-18). One item to watch rather than decide now: if Task 8's measurements show the deferred first-open animation needs more than the approved timing/easing latitude (e.g. a structural change to how the height is measured), stop and bring it back as a spec amendment rather than expanding the task in place.
