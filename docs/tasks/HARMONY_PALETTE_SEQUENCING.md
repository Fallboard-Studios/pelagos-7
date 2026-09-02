# Implementation Plan: Harmony Palette Sequencing

Source spec: [docs/specs/HARMONY_PALETTE_SEQUENCING.md](../specs/HARMONY_PALETTE_SEQUENCING.md). Source
intent: [docs/intent/harmony-palette-sequencing.md](../intent/harmony-palette-sequencing.md). Not yet
slotted into [docs/roadmap/roadmap.md](../roadmap/roadmap.md).

## Overview

Replace `harmonySystem.ts`'s hour-of-day-keyed palette lookup (`TIME_PITCHES`, a 24-entry
`Record<number, EighthNotes>` in which hours 12-23 duplicate hours 0-11) with a plain 12-entry
`HARMONY_PALETTES: EighthNotes[]` cycled sequentially — 2 measures per entry, wrapping via
`% HARMONY_PALETTES.length` — with the index derived statelessly from `getCurrentMeasure()` every tick.
`scheduleHarmonyCycle()` drops its `transport` parameter and switches to `beatClock.ts`'s own
`scheduleRepeat`/`cancelSchedule`, removing a locally-duplicated transport interface. The code change is
small enough (3 files, all already fully specified in the spec) to land as one task; two docs tasks
follow it — one updating the behavior docs, one closing the loop on
`docs/DUPLICATE_VALUE_AUDIT.md` item 2, which this change directly affects.

## Architecture Decisions

- **The `harmonySystem.ts` rewrite and the `AudioEngine.ts` call-site fix are one task, not two.**
  `scheduleHarmonyCycle()` losing its `transport` parameter is a breaking signature change — landing it
  without also fixing `AudioEngine.ts:611` in the same commit leaves the build broken
  (`npm run build:types` fails with an excess-argument error). Splitting them would violate the
  "every task leaves the system in a working state" rule, so they're a single task (Task 1).
- **Docs land last, and split into two tasks by audience/purpose, not merged.** `docs/HARMONY_SYSTEM.md`/
  `AUDIO_SYSTEM.md` (Task 2) describe current behavior for a reader of the system; `DUPLICATE_VALUE_AUDIT.md`
  item 2 (Task 3) is a distinct artifact — a bug-tracker-style entry with its own status-line convention
  (items 1/3/4/5 already establish "status + rationale + before/after," not a bare checkbox flip) —
  addressing a different question ("is this still an open finding?"). Same separation-of-concerns
  reasoning `BPM_CONTROL.md`'s plan used to keep its own doc task scoped to one artifact.
- **Task 3 depends on Task 2, not just Task 1.** Item 2's rewrite should cross-reference whatever
  canonical framing Task 2 lands in `HARMONY_SYSTEM.md`, and spec §7's open item 1 (item 2's exact
  resulting status is a judgment call) is best made with the finished behavior docs already written, not
  before.
- **No task for `beatClock.ts` itself** — spec §3 is explicit that `getCurrentHour()` is not modified,
  deprecated, or removed. There is nothing to implement there.

## Dependency Graph

```
Task 1 (harmonySystem.ts + harmonySystem.test.ts + AudioEngine.ts call site)
        │
        └──→ Task 2 (docs/HARMONY_SYSTEM.md + docs/AUDIO_SYSTEM.md)
                      │
                      └──→ Task 3 (docs/DUPLICATE_VALUE_AUDIT.md item 2)
```

## Task List

### Phase 1: Core mechanism

- [ ] **Task 1: `harmonySystem.ts` — sequential palette cycling, plus the `AudioEngine.ts` call-site fix**

  **Description:** Full rewrite per spec §4: `TIME_PITCHES` (`Record<number, EighthNotes>`, 24 keys) →
  `HARMONY_PALETTES` (`EighthNotes[]`, 12 entries — the unique tuples copied verbatim, hours 12-23's
  duplicates dropped, not re-derived); new local `MEASURES_PER_PALETTE_ENTRY = 2` const; index derivation
  switches from `Math.floor(getCurrentHour()) % Object.keys(TIME_PITCHES).length` to
  `Math.floor(getCurrentMeasure() / MEASURES_PER_PALETTE_ENTRY) % HARMONY_PALETTES.length`, recomputed
  fresh every tick (no accumulating counter); `scheduleHarmonyCycle()`/`stopHarmonyCycle()` drop the local
  `TransportLike` interface and `transportInstance` state, switching to `beatClock.ts`'s
  `scheduleRepeat`/`cancelSchedule`; `scheduleHarmonyCycle()` loses its `transport` parameter, and
  `AudioEngine.ts`'s one call site ([line 611](../../src/engine/AudioEngine.ts#L611)) updates to match.
  Per `test-driven-development`: rewrite `harmonySystem.test.ts` first (red against the new expectations),
  then make it pass.

  **Acceptance criteria:**
  - [ ] `HARMONY_PALETTES` contains exactly the 12 unique tuples from the old `TIME_PITCHES[0..11]`,
        copied verbatim (no note re-composition) — spot-check every tuple against the original source
        before deleting it, not just a length check.
  - [ ] `MEASURES_PER_PALETTE_ENTRY` is read by both the index math and the `scheduleRepeat` interval
        string (built as `` `${MEASURES_PER_PALETTE_ENTRY}m` ``) — no independently-written second `2`
        or `'2m'` literal anywhere in the file.
  - [ ] Palette index is stateless (derived fresh from `getCurrentMeasure()` every tick) — no
        `paletteIndex += 1`-shaped accumulator anywhere.
  - [ ] `scheduleHarmonyCycle(): void` (no parameters); the local `TransportLike` interface and
        `transportInstance` are gone from the file entirely.
  - [ ] The "already scheduled" double-call guard (warn + no-op on a second `scheduleHarmonyCycle()`
        call without an intervening `stopHarmonyCycle()`) still holds.
  - [ ] `getAvailableNotes()`, `resetHarmony()`, `setAvailableNotes()` signatures and behavior are
        byte-for-byte unchanged.
  - [ ] `AudioEngine.ts:611` calls `scheduleHarmonyCycle()` with no argument.

  **Verification:**
  - [ ] `harmonySystem.test.ts` rewritten per spec §5: mocks `beatClock`'s `getCurrentMeasure`/
        `scheduleRepeat`/`cancelSchedule` (the old `mockTransport`/`vi.mock('tone', ...)` removed
        entirely); includes the new wraparound/length-independence test and the shared-interval-constant
        assertion (`scheduleRepeat` called with `'2m'`).
  - [ ] `npx vitest run src/engine/harmonySystem.test.ts` passes.
  - [ ] `npx vitest run src/engine/AudioEngine.test.ts` passes with no changes required (confirms the
        existing `vi.mock('./harmonySystem', ...)`'s optional-param typing absorbs the zero-arg call).
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** None.

  **Files:** `src/engine/harmonySystem.ts`, `src/engine/harmonySystem.test.ts`, `src/engine/AudioEngine.ts`

  **Estimated scope:** S (3 files — the rewrite itself is fully specified in spec §4; `AudioEngine.ts`'s
  own change is one line)

### Checkpoint: Core mechanism complete
- [ ] `npm run build:types`, `npm run lint`, `npm test` all clean.
- [ ] Manual check (spec §5): start playback, watch the dev console's `[HarmonySystem] Palette changed
      to index N` lines — `N` advances `0, 1, 2, ..., 11, 0, ...` monotonically, exactly every 2
      measures, independent of BPM.
- [ ] Review with human before proceeding.

---

### Phase 2: Docs

- [ ] **Task 2: `docs/HARMONY_SYSTEM.md` + `docs/AUDIO_SYSTEM.md` — document the sequential-cycling behavior**

  **Description:** Rewrite `docs/HARMONY_SYSTEM.md`'s opening paragraph, "Data Structure", "API",
  "Implementation", "Hour Derivation" (renamed — there is no hour derivation left to describe),
  "Palette Design Guidelines", and "Performance" sections per spec §2; drop the stale
  "falls back to a measure-driven step derived from the locale store" claim (spec §1.6) rather than
  preserving or extending it. Update `docs/AUDIO_SYSTEM.md`'s "Harmony System" subsection
  (~[lines 131-141](../AUDIO_SYSTEM.md#L131-L141)) to match. Every documented name/behavior spot-checked
  directly against Task 1's final shipped source — not reconstructed from the spec from memory, matching
  `BPM_CONTROL.md` Task 6's own verification convention.

  **Acceptance criteria:**
  - [ ] No remaining reference to `TIME_PITCHES`, `getCurrentHour()`, hour-of-day, or "96 measures = 1
        day cycle" framing in either doc's description of harmony palette selection.
  - [ ] `HARMONY_PALETTES`, `MEASURES_PER_PALETTE_ENTRY`, and `scheduleHarmonyCycle()`'s new zero-arg
        signature are named and described accurately, matching Task 1's shipped code exactly.
  - [ ] The doc still clearly states the two clocks are decoupled (harmony's measure-based cycling vs.
        the locale's wall-clock visual day/night cycle) — this distinction predates this change and
        stays true, just described without the now-removed hour-of-day mechanism on the harmony side.
  - [ ] The stale locale-store-fallback claim is gone, not reworded.

  **Verification:**
  - [ ] Manual review — every documented name/behavior checked directly against
        `src/engine/harmonySystem.ts`'s final shipped code (Task 1).
  - [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean (docs-only change,
        no behavioral impact expected).

  **Dependencies:** Task 1.

  **Files:** `docs/HARMONY_SYSTEM.md`, `docs/AUDIO_SYSTEM.md`

  **Estimated scope:** S (docs only, 2 files, but `HARMONY_SYSTEM.md`'s rewrite touches most of its
  sections)

- [ ] **Task 3: `docs/DUPLICATE_VALUE_AUDIT.md` item 2 — resolve or reframe**

  **Description:** Per spec §2/§7 item 1: rewrite item 2 (`MEASURES_PER_CYCLE` / `DAY_CYCLE_MEASURES`)
  now that `harmonySystem.ts`'s only production dependency on `beatClock`'s 96-measure day concept
  (`getCurrentHour()`) is gone. Confirm via a direct source grep — not assumption — whether
  `getCurrentHour()` has any remaining non-test production caller anywhere in `src/`; write the item's
  status line (open / fixed / reframed) to match whatever that grep actually shows, following items
  1/3/4/5's existing "status line + rationale + before/after" convention rather than a bare checkbox
  flip.

  **Acceptance criteria:**
  - [ ] A `getCurrentHour` source grep across `src/` is run and its result (remaining production callers,
        if any) is stated explicitly in the item's rewrite — not inferred from the spec alone.
  - [ ] Item 2's status line reflects that grep's actual result: if `lightingUtils.ts`'s
        `DAY_CYCLE_MEASURES` is confirmed as the only remaining real "day cycle" consumer outside
        `beatClock.ts` itself, the item is reframed (or closed, if the two-independent-constants
        tension is judged fully resolved) rather than left describing the pre-change state.
  - [ ] The rewritten entry cross-references `docs/specs/HARMONY_PALETTE_SEQUENCING.md` and
        `docs/intent/harmony-palette-sequencing.md`, matching the sourcing convention every other item
        in the file already follows.
  - [ ] Item 4's own footnote ("`harmonySystem.ts`'s `TIME_PITCHES` map... left out of scope") is checked
        for staleness now that `TIME_PITCHES` no longer exists, and corrected if it now reads as
        inaccurate.

  **Verification:**
  - [ ] Manual review, including the source grep above, before finalizing the status line.
  - [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean (docs-only).

  **Dependencies:** Task 1, Task 2.

  **Files:** `docs/DUPLICATE_VALUE_AUDIT.md`

  **Estimated scope:** XS (docs only, 1 file)

### Checkpoint: Complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] All acceptance criteria across all 3 tasks are met.
- [ ] `docs/HARMONY_SYSTEM.md`, `docs/AUDIO_SYSTEM.md`, and `docs/DUPLICATE_VALUE_AUDIT.md` all reflect
      the shipped code — every documented name spot-checked against source.
- [ ] Ready for human review / PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hand-transcribing `TIME_PITCHES[0..11]`'s 12 tuples into `HARMONY_PALETTES` introduces a subtle note typo | Medium — a wrong note in one palette entry would be a silent musical regression, easy to miss since nothing type-checks note *content* | Task 1's acceptance criteria require a tuple-by-tuple spot-check against the original source, not just a length/shape check |
| A non-obvious caller of `getCurrentHour()` exists that a simple grep misses (e.g. a dynamic import, a debug-only tool) | Low — would leave Task 3's status line wrong | Task 3 requires the grep result to be stated explicitly in the rewrite, not just assumed from the spec |
| `AudioEngine.test.ts`'s `vi.mock('./harmonySystem', ...)` turns out to have a stricter typing than assumed (spec §2's "not touched, and why") | Low — would surface as a type error the moment Task 1's zero-arg call site lands | Task 1's verification explicitly re-runs `AudioEngine.test.ts` and `build:types`, not just `harmonySystem.test.ts` |

## Open Questions

Carried forward from spec §7 — not blocking, flagged for awareness during the tasks above:

1. Item 2's exact resulting status (open/reframed/closed) is intentionally not pre-decided here — Task 3
   is where that judgment call actually gets made, against real grep evidence.
2. No task in this plan adds an automated test that changes tempo (BPM) mid-run to verify palette
   advancement tracks measures rather than wall-clock time — the Phase 1 checkpoint's manual check is the
   only verification of that property, matching the spec's own scoping (§7 item 2).
