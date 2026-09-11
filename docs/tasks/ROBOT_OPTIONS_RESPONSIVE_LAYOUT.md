# Implementation Plan: Robot Options — Responsive Layout Rework

Source spec: [docs/specs/ROBOT_OPTIONS_RESPONSIVE_LAYOUT.md](../specs/ROBOT_OPTIONS_RESPONSIVE_LAYOUT.md). Source intent: [docs/intent/robot-options-responsive-layout.md](../intent/robot-options-responsive-layout.md). Layout/orientation-only, reusing the `'responsive'` mechanism `AUDIO_RIG_RESPONSIVE_LAYOUT.md` already built and verified — no new panel-orientation mechanism, no `AudioEngine`/`BeatClock`/Zustand-shape change, no new `ControlSchema` variant. One task (Source's Robot Drift fix) is a real bug fix, not a layout change, and is explicitly gated on live reproduction this session cannot do alone.

## Overview

Retire `'auto'`-resolved orientation from `robotOptionsConfig.ts` and its 3 consumer drawers, mirroring the Audio Rig phase's approach exactly: fixed slider values, `'responsive'` panels where mobile/tablet should stack and desktop should share a row. Additionally: give Volume a real accordion it doesn't have today (with a 2-column desktop split that needs `AudioSettingSection` to bypass the shared `LfoTargetGroup` wrapper the same way `AudioRigLfoGroup` already does), relabel "Off" to "Auto", and fix a confirmed-but-unexplained rendering bug in Source's Robot Drift panel.

## Architecture Decisions

- **Volume's accordion work is staged additive-then-consumer-rewire**, same reason `AUDIO_RIG_RESPONSIVE_LAYOUT.md`'s EQ & Filters work was: removing `ROBOT_OUTPUT_PANEL_SCHEMA` the same task that stops using it (Task 2) is safe since it has exactly one consumer (`AudioSettingSection.tsx`); adding the 3 new consts first (Task 1) keeps every intermediate commit buildable.
- **Every other config-only change (Tasks 3, 4, 5, 6) is independent of the Volume work and of each other** — literal value edits or additive schema changes with no shared consumer. They all touch `robotOptionsConfig.ts`/`.test.ts`, though, so — same file-contention caution `AUDIO_RIG_RESPONSIVE_LAYOUT.md`'s own plan flagged — run them sequentially within one session rather than truly parallel-editing that file across agents.
- **Source's Robot Drift bug (Tasks 7-8) is split into investigate-then-fix**, not one task, because a fix cannot be scoped — let alone test-written-first — before a root cause exists. Task 7's own acceptance criteria allow it to end in "root cause identified" *or* "blocked, needs Crawford's live input" — both are valid, verifiable outcomes; guessing a fix without either is not.
- **Docs (Task 9) land last**, once every schema's final shipped shape is real — same precedent both prior phases used. If Task 7/8 stalls waiting on live input, Task 9 can still land for everything else and note Source as a known-open item, rather than blocking all documentation on one stuck task.

## Dependency Graph

```
Task 1 (robotOptionsConfig.ts — Volume accordion additive)
    │
    ▼
Task 2 (AudioSettingSection.tsx rewrite + ROBOT_OUTPUT_PANEL_SCHEMA removal)
    │
    ▼
Checkpoint: Volume complete
    │
    ├──→ (independent, any order) Task 3 (Off -> Auto)
    ├──→ (independent, any order) Task 4 (slider orientation fixes)
    ├──→ (independent, any order) Task 5 (Melody panels -> responsive)
    ├──→ (independent, any order) Task 6 (Envelope: column + 2 sub-rows)
    │
    ▼
Checkpoint: Melody/Envelope/labels complete
    │
Task 7 (Source: investigate Robot Drift bug) ──→ Task 8 (Source: fix, once root cause known)
    │                                                  │
    └──────────────────────┬───────────────────────────┘
                            ▼
                 Checkpoint: All sections complete
                            │
                            ▼
                    Task 9 (docs sync)
                            │
                            ▼
                    Checkpoint: Complete
```

Tasks 3-6 have no dependency on Task 1/2 or each other — they can be done first, last, or interleaved with the Volume work. Tasks 7-8 are also independent of Tasks 1-6, but Task 7 may block on Crawford's live input (no browser access this session) — don't let that stall Tasks 1-6 or Task 9's non-Source content.

## Task List

### Phase 1: Volume accordion

- [ ] **Task 1: `robotOptionsConfig.ts` — Volume accordion additive groundwork**

  **Description:** Per spec §1.2/§4.1: add `VOLUME_ACCORDION_SCHEMA: AccordionSchema` (`id: 'robotOptions.volumeAccordion'`, `humanLabel: 'Volume'`, `loreLabel: 'Probe Acoustic Amplitude'`), `VOLUME_ROW_PANEL_SCHEMA: DirectionalPanelSchema` (`id: 'robotOptions.volumeRow'`, `orientation: 'responsive'`, unlabeled), and `VOLUME_SETTINGS_COLUMN_PANEL_SCHEMA: DirectionalPanelSchema` (`id: 'robotOptions.volumeSettingsColumn'`, `orientation: 'column'`, unlabeled). `ROBOT_OUTPUT_PANEL_SCHEMA` stays exactly as it is, still exported, still the only thing `AudioSettingSection.tsx` reads — nothing consumes the 3 new exports yet.

  **Acceptance criteria:**
  - [ ] All 3 new exports exist with the exact shape above.
  - [ ] `VOLUME_ACCORDION_SCHEMA.id` does not collide with `VOLUME_SCHEMA.id` (`'robotOptions.volume'`) or any other existing id in the file.
  - [ ] `ROBOT_OUTPUT_PANEL_SCHEMA` is untouched; `AudioSettingSection.tsx` is not modified this task.

  **Verification:**
  - [ ] `npx vitest run src/data/robotOptionsConfig.test.ts` passes (new assertions for all 3 exports' shape, labels, and id uniqueness).
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean — confirms the additive change alone doesn't break `AudioSettingSection.tsx`, which still reads the old field.

  **Dependencies:** None.

  **Files:** `src/data/robotOptionsConfig.ts`, `src/data/robotOptionsConfig.test.ts`

  **Estimated scope:** S (2 files, 3 new consts)

- [ ] **Task 2: `AudioSettingSection.tsx` — accordion + 2-column split; remove `ROBOT_OUTPUT_PANEL_SCHEMA`**

  **Description:** Per spec §1.2/§4.2: replace the current `<DirectionalPanel schema={ROBOT_OUTPUT_PANEL_SCHEMA}>` + `<LfoTargetGroup>` structure with `<AccordionContainer schema={VOLUME_ACCORDION_SCHEMA}>` wrapping `<DirectionalPanel schema={VOLUME_ROW_PANEL_SCHEMA}>`, which wraps `<DirectionalPanel schema={VOLUME_SETTINGS_COLUMN_PANEL_SCHEMA}>` (Audio Setting radio + the Volume row) beside a plain `<div>` holding the shared `Lfo` display. Call `useLfoTargetGroup({ groupId: 'robotOptions.volume', fields: [...] })` directly (the hook, not the `<LfoTargetGroup>` component) to get `{ selected, transitioning, select, isTargeted, displayValue, displayLabel }`, matching `AudioRigLfoGroup`'s own pattern exactly. The Volume row gets `className={withActiveClass('audio-setting-section__row sc-lfo-target-group__row', isTargeted('volume'))}` with `onClick`/`onFocus` calling `select('volume')`, mirroring `AudioRigLfoGroup`'s per-field row wiring. Remove `ROBOT_OUTPUT_PANEL_SCHEMA` from `robotOptionsConfig.ts` and its test now that nothing consumes it.

  **Acceptance criteria:**
  - [ ] `AudioSettingSection` renders exactly one `.sc-accordion`, labeled "Volume".
  - [ ] On mobile/tablet: Audio Setting, Volume, and the Lfo display all render in one stacked column, in that DOM order.
  - [ ] On desktop: Audio Setting + Volume render in one column, the Lfo display renders as a sibling column beside it.
  - [ ] Clicking or focusing the Volume row still marks it targeted (`isTargeted('volume')` true) — the click/focus-to-select behavior is unchanged, even though it's the only field.
  - [ ] The shared Lfo display still shows Rate/Depth, reflects `value.volumeLfo`, and calls `onVolumeLfoChange` correctly — no behavior change to the LFO editing itself.
  - [ ] `disabled` still propagates to the Audio Setting radio, the Volume slider, and the Lfo display's controls.
  - [ ] `AudioSettingSectionProps` is unchanged — no new prop; `RobotOptionsTab.tsx`/`CompanyOptionsSection.tsx` need no edit.
  - [ ] `ROBOT_OUTPUT_PANEL_SCHEMA` no longer exists anywhere in `robotOptionsConfig.ts`, its test, or `AudioSettingSection.tsx`.

  **Verification:**
  - [ ] `npx vitest run src/components/robot/AudioSettingSection.test.tsx src/data/robotOptionsConfig.test.ts` passes. Per spec §5: relabel/rewrite `'renders Volume as a bare slider... no AccordionContainer wrapping it'` to assert an accordion labeled "Volume" instead; rewrite the `DirectionalPanel wrapper` describe block's label assertion and add the 2-column structural + tier assertions (stub `matchMedia`, same pattern `AudioRigDrawer.test.tsx` established).
  - [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` clean.
  - [ ] Manual check: open Robot Options for a single robot (`npm run dev`), confirm the new accordion, the 2-column desktop split, and the 1-column mobile/tablet stack.

  **Dependencies:** Task 1.

  **Files:** `src/components/robot/AudioSettingSection.tsx`, `src/components/robot/AudioSettingSection.css` (only if the 2-column layout needs a new rule — verify, don't assume), `src/components/robot/AudioSettingSection.test.tsx`, `src/data/robotOptionsConfig.ts`, `src/data/robotOptionsConfig.test.ts`

  **Estimated scope:** M (4-5 files — the component rewrite is the substantial part; the config cleanup riding along is a small deletion)

### Checkpoint: Volume complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Manual check of the Volume accordion at mobile/tablet/desktop widths.
- [ ] Review with human before proceeding.

---

### Phase 2: Independent config changes (parallelizable in intent, sequential in execution — see Architecture Decisions)

- [ ] **Task 3: `AUDIO_SETTING_SCHEMA` — "Off" → "Auto"**

  **Description:** Per spec §1.3/§4.1: change the `{ value: 'none', label: 'Off' }` options-array entry to `{ value: 'none', label: 'Auto' }`. No other entry changes; the stored value (`'none'`) is unchanged.

  **Acceptance criteria:**
  - [ ] `AUDIO_SETTING_SCHEMA.options` still has exactly 4 entries, same 4 values, `'none'`'s `label` is now `'Auto'`.
  - [ ] No `robotOptionsActions`/`Robot['audioMode']` type or logic changes.

  **Verification:**
  - [ ] `npx vitest run src/data/robotOptionsConfig.test.ts src/components/robot/AudioSettingSection.test.tsx` passes — rename/update the `'Audio Setting has all 4 options, including Off'` test (values-only assertion is unaffected, but its description is now wrong; add a `label` assertion for `'Auto'`); update `AudioSettingSection.test.tsx`'s `['Off', 'Mute', 'Solo', 'Highlight']` list to `['Auto', 'Mute', 'Solo', 'Highlight']`.
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.

  **Dependencies:** None.

  **Files:** `src/data/robotOptionsConfig.ts`, `src/data/robotOptionsConfig.test.ts`, `src/components/robot/AudioSettingSection.test.tsx`

  **Estimated scope:** XS (3 files, one literal string change)

- [ ] **Task 4: `robotOptionsConfig.ts` — slider orientation fixes**

  **Description:** Per spec §1.6/§4.1: change `DENSITY_SCHEMA`, `MOTIF_LENGTH_SCHEMA`, `PITCH_REPEAT_SCHEMA`, `OCTAVE_RANGE_MIN_SCHEMA`, `OCTAVE_RANGE_MAX_SCHEMA`, `NOTE_VARIANCE_SCHEMA`, `ATTACK_SCHEMA`, `DECAY_SCHEMA`, `SUSTAIN_SCHEMA`, `RELEASE_SCHEMA` from `orientation: 'auto'` to `orientation: 'horizontal'`, each in place. `VOLUME_SCHEMA` (already `'horizontal'`) and Signature Array's layer schemas (already `'vertical'`) are untouched.

  **Acceptance criteria:**
  - [ ] All 10 named schemas report `orientation === 'horizontal'`.
  - [ ] No other schema in the file changes.

  **Verification:**
  - [ ] `npx vitest run src/data/robotOptionsConfig.test.ts` passes — rewrite `'Ping Controls (...) is auto'` to assert `'horizontal'` for all 6 melody/frequency sliders; rewrite `'Ping Contour (...) is auto'` to assert `'horizontal'` for all 4 ADSR sliders.
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.

  **Dependencies:** None (parallelizable with Tasks 1-3, 5-6; file-contention caution applies against them per Architecture Decisions).

  **Files:** `src/data/robotOptionsConfig.ts`, `src/data/robotOptionsConfig.test.ts`

  **Estimated scope:** S (2 files, 10 literal value edits)

- [ ] **Task 5: `robotOptionsConfig.ts` — Melody panels → `'responsive'`**

  **Description:** Per spec §1.4/§4.1: change `RHYTHM_PANEL_SCHEMA.orientation` and `FREQUENCY_PANEL_SCHEMA.orientation` from `'row'` to `'responsive'`. Both consts are already rendered by `PingControlsDrawer.tsx` via existing `<DirectionalPanel schema={...}>` calls — no consumer-code change needed; the behavior change is live the moment the value flips (the `'responsive'` mechanism itself needs no work — it already exists and is proven by `AUDIO_RIG_RESPONSIVE_LAYOUT.md`).

  **Acceptance criteria:**
  - [ ] `RHYTHM_PANEL_SCHEMA.orientation === 'responsive'`.
  - [ ] `FREQUENCY_PANEL_SCHEMA.orientation === 'responsive'`.
  - [ ] `PHRASING_PANEL_SCHEMA` (the outer wrapper around `RHYTHM_PANEL_SCHEMA` + Click Track + Reset Melody) is untouched — still fixed `'column'`.
  - [ ] Density/Motif Length/Pitch Repeat render as 3 stacked rows below 1024px, 1 shared row above; Octave Min/Max/Note Variance do the same.

  **Verification:**
  - [ ] `npx vitest run src/data/robotOptionsConfig.test.ts` passes — update `FREQUENCY_PANEL_SCHEMA`'s existing orientation assertion to `'responsive'`; add a new describe block for `RHYTHM_PANEL_SCHEMA` (confirmed via direct search: **no prior test coverage exists for this schema at all** — this is new coverage, not a rewrite) asserting `'responsive'`, its labels, and a unique id versus `PHRASING_PANEL_SCHEMA`.
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
  - [ ] Manual check (stub or resize to cross 640px/1024px): both row-groups flip correctly at the tier boundaries.

  **Dependencies:** None (parallelizable with Tasks 1-4, 6; same file-contention caution).

  **Files:** `src/data/robotOptionsConfig.ts`, `src/data/robotOptionsConfig.test.ts`

  **Estimated scope:** S (2 files, 2 literal value changes + new test coverage for a previously-untested schema)

- [ ] **Task 6: Envelope — `PING_CONTOUR_PANEL_SCHEMA` → column + 2 `'responsive'` sub-rows**

  **Description:** Per spec §1.4/§4.1/§4.3: change `PING_CONTOUR_PANEL_SCHEMA.orientation` from `'row'` to `'column'` (`loreLabel`/`humanLabel` unchanged). In `PingContourDrawer.tsx`, replace the flat 4-slider row with 2 nested `DirectionalPanel`s — `{ id: 'robotOptions.pingContour.topRow', type: 'directionalPanel', orientation: 'responsive' }` wrapping Attack+Decay, and `{ id: 'robotOptions.pingContour.bottomRow', type: 'directionalPanel', orientation: 'responsive' }` wrapping Sustain+Release — both inline object literals at their call sites, matching `AudioRigDrawer.tsx`'s own Compressor `topRow`/`bottomRow` style (not new `robotOptionsConfig.ts` exports).

  **Acceptance criteria:**
  - [ ] Attack+Decay share a row and Sustain+Release share a row on desktop; each pair stacks to 2 separate rows on mobile/tablet.
  - [ ] ADSR's left-to-right/top-to-bottom order is preserved: Attack, Decay, Sustain, Release.
  - [ ] `PING_CONTOUR_PANEL_SCHEMA`'s `loreLabel`/`humanLabel` are unchanged (`'PING CONTOUR'`/`'Ping Contour'`).
  - [ ] `PingContourDrawerProps` is unchanged; every existing Attack/Decay/Sustain/Release value-conversion and disabled-state behavior is unaffected.

  **Verification:**
  - [ ] `npx vitest run src/data/robotOptionsConfig.test.ts src/components/robot/PingContourDrawer.test.tsx` passes — update `PING_CONTOUR_PANEL_SCHEMA`'s orientation assertion to `'column'`; add assertions (stubbing `matchMedia`) that the 2 sub-rows resolve `'row'` at desktop, `'column'` at mobile/tablet.
  - [ ] `npm run build:types`, `npm run lint`, `npm run build` clean.
  - [ ] Manual check: Envelope's "two across" desktop pairing and mobile/tablet one-per-row stacking.

  **Dependencies:** None (parallelizable with Tasks 1-5; same file-contention caution against `robotOptionsConfig.ts`).

  **Files:** `src/data/robotOptionsConfig.ts`, `src/data/robotOptionsConfig.test.ts`, `src/components/robot/PingContourDrawer.tsx`, `src/components/robot/PingContourDrawer.test.tsx`

  **Estimated scope:** M (4 files — one schema value change plus a real JSX restructure)

### Checkpoint: Melody/Envelope/labels complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Manual check of Melody and Envelope's row-groups, and the "Auto" label, at mobile/tablet/desktop widths.
- [ ] Review with human before proceeding.

---

### Phase 3: Source — Robot Drift bug (investigate, then fix)

- [ ] **Task 7: Investigate the Robot Drift rendering bug**

  **Description:** Per spec §1.5/§7 item 1 — this is a `debugging-and-error-recovery` reproduce-first task, not a design task. Confirmed symptom: `RobotDriftPanel`'s 2 `SliderCenteredZero` controls (Rate Drift, Depth Drift), rendered last in `SignatureArrayDrawer.tsx`, show no visible content — only the panel's outer box/label renders. Existing `SignatureArrayDrawer.test.tsx` assertions already pass in jsdom (the sliders exist with correct `aria-valuenow`), so this is very likely a real-browser-only issue jsdom cannot surface. Investigation steps, in order: (1) attempt to reproduce via the running app (`npm run dev`) — open Robot Options, scroll to the bottom of Source, confirm the empty-panel symptom directly rather than trusting the report secondhand; (2) if reproducible, check the browser console for errors/warnings; (3) inspect the DOM directly (are the slider elements present but invisible — e.g. zero width/height — or genuinely absent?); (4) check whether `RobotDriftPanel` is ever mounted more than once concurrently (e.g. both `RobotOptionsTab` and `CompanyOptionsSection ` rendering `SignatureArrayDrawer` at the same time) — a duplicate `timelineMap`/CabinetBox-facade key collision (`audioRig.lfoDrift.robots`-derived) is one of 3 unconfirmed hypotheses in spec §7; (5) compare `RobotDriftPanel`'s render path against a working layer panel's (Baseline/Coaxial/Harmonic) for any structural difference beyond "standalone component vs. `.map()`-rendered." **If this session cannot reproduce the bug (no browser access), this task ends by reporting that clearly and asking Crawford for a console screenshot, a description of exactly what the DOM inspector shows, or direct confirmation/denial of each of the 3 hypotheses — that is a valid, complete outcome for this task, not a failure to finish it.**

  **Acceptance criteria:**
  - [ ] Either: a specific, confirmed root cause is identified and written down (with the evidence that confirmed it), **or**: the task concludes with a specific, itemized request for the information needed from Crawford to proceed — never a guess presented as a finding.
  - [ ] No code is changed as part of this task — investigation only.

  **Verification:**
  - [ ] N/A (investigation task, not a code change) — the acceptance criteria above are the verification.

  **Dependencies:** None.

  **Files:** None (investigation only; a scratch note of findings may be kept but isn't a deliverable).

  **Estimated scope:** Unknown — could be XS (a quick console-error finding) or could require a full round-trip with Crawford before Task 8 can even begin.

- [ ] **Task 8: Fix the Robot Drift rendering bug**

  **Description:** Implement the fix for whatever root cause Task 7 identified, following TDD — write a failing test that reproduces the bug first (which may need to be a `browser-testing-with-devtools`-driven check rather than a jsdom unit test, if the root cause is genuinely a real-layout-only issue outside jsdom's ability to reproduce), then the minimal fix, then confirm the existing `SignatureArrayDrawer.test.tsx` suite (already passing) still passes. Scope is strictly "make the 2 existing sliders visible and correctly laid out" — no redesign of `RobotDriftPanel`, no new controls, no "real" Shape/Rate/Depth LFO widget it was never meant to have (spec §3).

  **Acceptance criteria:**
  - [ ] Robot Drift's Rate Drift and Depth Drift sliders are visible and interactive in the running app, at the bottom of Source, in both single-robot and company/broadcast mode.
  - [ ] No unrelated change to `RobotDriftPanel`'s scope, data, or the `LFO_DRIFT_GROUPS`/`audioRigConfig.ts` schema it reads from.
  - [ ] **This task is not marked done on a green test suite alone** — Crawford's live confirmation in the running app is required (spec §3), since the bug (and therefore the fix) may not be reproducible in jsdom at all.

  **Verification:**
  - [ ] Whatever regression test the fix's own nature allows (jsdom unit test if the root cause is reproducible there; otherwise document why not, and rely on the manual check below as the real verification).
  - [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` clean.
  - [ ] **Manual check, required, not optional:** Crawford confirms in the running app (single-robot and company/broadcast) that the sliders are visible and interactive.

  **Dependencies:** Task 7 (a root cause, or explicit direction from Crawford in its absence).

  **Files:** Unknown until Task 7 concludes — most likely `src/components/robot/SignatureArrayDrawer.tsx`/`.css`, possibly `CabinetBox.tsx`/`VoxelTrack.tsx` if the root cause turns out to be in shared Cabinetry infrastructure rather than this drawer specifically (in which case, escalate the wider blast radius to Crawford before touching shared code — don't silently expand this task's scope).

  **Estimated scope:** Unknown until Task 7 concludes.

### Checkpoint: All sections complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Full manual check across mobile/tablet/desktop of every section: Volume, Melody, Envelope, and Source's Robot Drift panel actually rendering.
- [ ] Review with human before proceeding — if Task 7/8 is still blocked on Crawford's input, proceed to Task 9 for everything else and note Source as open.

---

### Phase 4: Docs

- [ ] **Task 9: Documentation sync**

  **Description:** Per spec §6: add a short amendment note to `docs/specs/VERTICAL_SLIDERS.md`'s classification table, next to the `robotOptionsConfig.ts` rows (Density/Motif Length/Pitch Repeat/Octave Range/Note Variance, Attack/Decay/Sustain/Release — all listed `'auto'`), pointing at this spec — same treatment `AUDIO_RIG_RESPONSIVE_LAYOUT.md` already gave the `audioRigConfig.ts` rows in that same table. No change expected to `docs/COMPONENT_LIBRARY.md` (the `'responsive'` literal is already documented generically).

  **Acceptance criteria:**
  - [ ] `VERTICAL_SLIDERS.md`'s amendment note covers the `robotOptionsConfig.ts` rows this phase changed, pointing at `ROBOT_OPTIONS_RESPONSIVE_LAYOUT.md`.
  - [ ] The historical classification table itself is left as-is, not rewritten.
  - [ ] If Task 7/8 (Source) is still unresolved at this point, this task's own commit or a note in it says so plainly — don't let the docs imply Source is finished if it isn't.

  **Verification:**
  - [ ] Manual review — spot-check the note against the shipped `robotOptionsConfig.ts`.
  - [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` clean (docs-only change).

  **Dependencies:** Tasks 1-6 (Source's Task 7/8 status is reported, not necessarily required complete — see Architecture Decisions).

  **Files:** `docs/specs/VERTICAL_SLIDERS.md`

  **Estimated scope:** XS (docs only, 1 file)

### Checkpoint: Complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] All acceptance criteria across Tasks 1-6 and 9 met; Task 7/8's status (done or explicitly still blocked) is clear.
- [ ] Full manual check reconfirmed against the final shipped code.
- [ ] Ready for human review / PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tasks 1-6 all edit `robotOptionsConfig.ts`/`.test.ts` — literal parallel execution across sessions risks a merge conflict even though each task's changes are logically independent | Medium if parallelized carelessly, low if sequential | Same mitigation `AUDIO_RIG_RESPONSIVE_LAYOUT.md`'s plan used: run these tasks in the listed order within one session/branch rather than truly concurrently |
| Task 7 cannot be completed by this session alone (no browser access) — could stall the whole phase if treated as a hard blocker | Medium | Task 7's own acceptance criteria explicitly allow "blocked, here's what I need from Crawford" as a valid, complete outcome; Tasks 1-6 and 9 are structured to not depend on Task 7/8 at all |
| Task 8's root cause, once known, might turn out to live in shared Cabinetry infrastructure (`CabinetBox.tsx`/`VoxelTrack.tsx`) rather than `SignatureArrayDrawer.tsx` alone — a much wider blast radius than this phase's own file list anticipates | Medium if it happens | Task 8's own description calls this out explicitly — escalate to Crawford before touching shared code, don't silently expand scope |
| `AudioSettingSection.css` might need a new rule for the 2-column layout that this plan assumes it won't | Low — cosmetic risk only | Task 2's Files list already marks the CSS file as "verify, don't assume" |

## Open Questions

Resolved during Plan (not left open):

- ~~Can Volume's accordion work land as one atomic task?~~ **Resolved: no — staged as Task 1 (additive) then Task 2 (rewrite + cleanup), same reasoning the Audio Rig plan's own EQ & Filters staging used.**
- ~~Should Envelope's schema flip and JSX restructure be 2 tasks?~~ **Resolved: no — combined into Task 6, since (unlike EQ & Filters) neither half is independently meaningful or breaking on its own; splitting would add task-count without a real review-granularity benefit.**
- ~~Is Task 7 a real task if it might not produce a fix?~~ **Resolved: yes — "investigate, report findings or a specific request for more information" is itself a complete, verifiable unit of work, distinct from Task 8's "implement the fix."**

Carried forward from the spec, not blocking this plan:

1. Whether `AudioSettingSection.css`/`PingContourDrawer.css` need new rules (spec §7 item 2) — Tasks 2 and 6 both mark their CSS files "verify, don't assume."
2. Whether `CompanyOptionsSection.test.tsx` has any assertion reaching into these components' internal DOM shape (spec §7 item 3) — not assigned its own task here (unlike `DIRECTIONAL_PANEL_WIRING.md`'s dedicated Task 10 for the same file), since no JSX changes touch `CompanyOptionsSection.tsx`'s own children's *shape* enough to expect it — but flag it for a quick check during Task 2 and Task 6's own implementation, not a separate task.
