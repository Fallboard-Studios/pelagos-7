# Duplicate-Value Audit

Tracks candidates for the same failure mode found and fixed in `bug/duplicate-melody-event`
(`MelodyEvent`/`RobotMelodyEvent` — two independently-declared, structurally-identical interfaces
kept in sync only by a "keep in sync" comment). Generalized past types: any constant, default,
range, or documented value that's independently declared/stated in two or more places for the same
concept, with nothing but convention holding the copies together.

Not a spec — this is a review-output backlog. Each item gets its own `/interview-me` pass and fix
when picked up; check it off here once merged. Not itself one of CLAUDE.md's Reference docs.

Audited 2026-09-02. Scope: `src/` (constants/defaults/ranges/config literals, parallel
schemas/arrays) and the CLAUDE.md-listed reference docs (living docs only — `docs/tasks/` snapshots
excluded by design).

## Open items

### 1. Locale/transport BPM — already diverged, not just at risk
**Status:** ☑ fixed (2026-09-02, `bugs/duplicate-value-audit`) · **Confidence:** high — this one had
already drifted, not merely duplicated.

**Fix applied:** `Locale.settings`/`LocaleSettings` was dead weight from a retired feature (its only
reader in the whole codebase was the buggy `Factory.tsx:99` line; `AudioEngine.ts` never read it
either, despite several `AudioEngine.test.ts` setups stubbing it). Deleted the type and both creation
sites outright, along with the leftover test boilerplate that stubbed it. `Factory.tsx` now reads
`audioStore.bpm` directly via `useAudioStore`; the `?? 120` fallback (and the now-unused
`useLocaleStore`/`useAttenuationStyleStore` reads it depended on) are gone too, since `audioStore.bpm`
is a global, always-defined number with no "locale not loaded" case to guard against. No
persisted-data migration was needed — `SESSION_STORAGE.md` confirms locale persistence is
unimplemented (Phase 12 design only). Covered by `src/components/actors/Factory.test.tsx`
(reproduces the stale-fallback bug, then proves the live-bpm fix — including reactivity to Tempo-slider
changes and behavior with no locale selected).

There were two independent sources of truth for "this locale's current BPM":
- Live value: `audioStore.bpm` — seeded per-locale via `generateLocaleBpm` (range `[40,100]`,
  `src/utils/localeBpmSeed.ts`), live-adjustable via the Tempo slider, drives
  `AudioEngine`/Transport. Initial default at [`audioStore.ts:191`](../src/stores/audioStore.ts#L191)
  (`bpm: 60`), regenerated via `regenerateBpmFromSeed`
  ([`audioStore.ts:205-206`](../src/stores/audioStore.ts#L205-L206)).
- Stale value (removed): `locale.settings.bpm` — written once at locale creation and never updated
  again, hardcoded to `{ bpm: 60 }` at both creation sites.

[`Factory.tsx:99`](../src/components/actors/Factory.tsx#L99) used to read the stale field —
`s.locales[localeId]?.settings?.bpm ?? 120` — and feed it to `<BubbleStream bpm={bpm}>`
([`Factory.tsx:286`](../src/components/actors/Factory.tsx#L286)), whose prop doc says *"Current
transport BPM; used to convert measures to seconds"*
([`BubbleStream.tsx:21-22`](../src/components/actors/BubbleStream.tsx#L21-L22)). It now reads
`useAudioStore((s) => s.bpm)` at the same line instead.

Bubble cadence never tracked the real seeded/live BPM (only coincidentally matched when the seed
landed near 60), and the `?? 120` fallback already disagreed with the actual default (`60`) used
everywhere else.

### 2. `MEASURES_PER_CYCLE` / `DAY_CYCLE_MEASURES` — one guardrail, two constants
**Status:** ☐ open, reframed (2026-09-02, `feature/harmony-palette-update`) · **Confidence:** low —
was medium; narrowed by [Harmony Palette Sequencing](specs/HARMONY_PALETTE_SEQUENCING.md)
([intent](intent/harmony-palette-sequencing.md)), which removed the only production caller on one
side of the split. The duplication itself (two independently-declared `96` literals) is unchanged —
nothing here has been fixed — only the practical risk of the two silently disagreeing has dropped.

CLAUDE.md's guardrail ("96 measures = 1 day cycle") is still encoded as two separately-declared module
constants, each `96`, in unrelated subsystems with no shared import:
- [`beatClock.ts:21`](../src/engine/beatClock.ts#L21) `MEASURES_PER_CYCLE = 96` — as of this rewrite,
  only backs `getCurrentHour()`'s own internal wrap math. `getCurrentHour()` itself now has **zero
  production callers anywhere in `src/`** (confirmed by grep, 2026-09-02: the only remaining
  references are `beatClock.ts`'s own definition/doc comment, `beatClock.test.ts`'s own tests of the
  function, and an unused stub inside `AudioEngine.test.ts`'s `vi.mock('./beatClock', ...)` block).
  `harmonySystem.ts` was that function's one production caller before this rewrite — it now derives
  its palette index from `getCurrentMeasure()` directly instead (spec §1.3). `getCurrentHour()` was
  deliberately left in place, not removed or deprecated, per the harmony spec's explicit "left as-is"
  call-out — this item does not ask for its removal either.
- [`lightingUtils.ts:6`](../src/utils/lightingUtils.ts#L6) `DAY_CYCLE_MEASURES = 96` — unchanged,
  still drives building-lighting phase, consumed by
  [`Factory.tsx:93,108,113`](../src/components/actors/Factory.tsx#L93). This is now the **only**
  real "day cycle" consumer outside `beatClock.ts` itself.

By design these already ran off different clocks (Factory.tsx derives its `lightMeasure` from
Attenuation Style local time, not the transport — [`Factory.tsx:89-91`](../src/components/actors/Factory.tsx#L89-L91)),
so this was flagged as a possibly-intentional split even before this rewrite. What's changed is
narrower and more concrete: the two constants no longer do the same *kind* of job in production at
all — one drives real, visible behavior; the other only backs an exported-but-uncalled function — so
a future drift between the two `96`s can no longer manifest as an observable bug today. That's why this
item's status stays **open** rather than flipping to fixed: the underlying duplication (two
independently-declared literals for one CLAUDE.md guardrail) is still there, unaddressed, and would
matter again the moment `getCurrentHour()` gains a new caller. A stale comment still gestures at a
variable `dayLengthMeasures` ([`Factory.tsx:105`](../src/components/actors/Factory.tsx#L105)) that
doesn't exist as a real field — untouched by this rewrite, still worth a separate doc fix if picked up.

### 3. `MAX_POLYPHONY = 16` — not centralized like its sibling constants
**Status:** ☑ fixed (2026-09-02, `bugs/duplicate-value-audit`) · **Confidence:** medium —
self-correcting on drift (test would fail), docs wouldn't.

Every other domain-tunable constant lives in `src/constants/index.ts` and gets imported by all
consumers (verified clean for `RHYTHMIC_DENSITY_*`, `PITCH_REPEAT_*`, `OCTAVE_RANGE_*`,
`NOTE_VARIANCE_*`). `MAX_POLYPHONY` was the outlier:
- Was declared as a private, non-exported local const:
  [`AudioEngine.ts:74`](../src/engine/AudioEngine.ts#L74).
- Restated as a literal in `CLAUDE.md` ("Polyphony defaults to MAX_POLYPHONY = 16") and
  [`POLYPHONY_GUIDE.md:9`](POLYPHONY_GUIDE.md#L9).
- Not exported, so `AudioEngine.test.ts` independently hardcoded the loop count (20) and
  expectations (`toBe(16)` / `toBe(4)`) instead of importing it.

**Fix applied:** `MAX_POLYPHONY` moved to [`constants/index.ts`](../src/constants/index.ts) as an
exported constant, alongside `MIN_LEAD` and the other domain-tunable constants. `AudioEngine.ts`
imports it directly (no local const, no defensive fallback — an undefined import fails loudly
rather than silently drifting, unlike item 5's `MIN_LEAD ?? 0.1` pattern). `AudioEngine.test.ts`'s
`../constants` mock now includes it, and the polyphony test derives its trigger-attempt count and
both accept/skip assertions from the imported constant instead of the bare `20`/`16`/`4` literals.
No behavior change — the cap still enforces exactly 16 concurrent voices. CLAUDE.md and
`POLYPHONY_GUIDE.md`'s prose mentions of `16` were left as-is (out of scope — plain-English
restatements of the constant's value, not an independent runtime source of truth).

### 4. Harmony-palette bounds (0..7 / 8 notes) — not centralized despite being a hard guardrail
**Status:** ☑ fixed (2026-09-02, `bugs/duplicate-value-audit`) · **Confidence:** low-medium —
unlikely to change (declared non-negotiable), but matched the exact concept the original bug was
about.

**Fix applied:** added `NOTE_PALETTE_SIZE = 8` to
[`constants/index.ts`](../src/constants/index.ts), distinct from `NOTE_VARIANCE_MAX` (also `8`
today, but a different concept — max tuning-knob value, not palette size — confirmed via
`/interview-me` not to collapse the two). `melodyGenerator.ts`'s three bare-literal sites now import
it: the `applyTonalVariance` clamp (`Math.min(7, ...)` → `Math.min(NOTE_PALETTE_SIZE - 1, ...)`), the
unweighted `Math.floor(rand() * 8)` pick, and the without-replacement pool builders
(`Array.from({ length: 8 }, ...)`, ×2). `melodyGenerator.test.ts`'s note-index bound assertions
(7 locations) now derive from the same import instead of hardcoding `7`/`8`. Pure centralization, no
behavior change — confirmed via `/interview-me` before implementation (out of TDD-ceremony scope,
same as item 3). Full suite (108 files/1736 tests), lint, and type-check all green.

Left out of scope (confirmed in the interview): `harmonySystem.ts`'s palette collection, since each
entry is already structurally enforced by the `EighthNotes` 8-tuple type — not a bare-literal risk
the same way. `melodyGenerator.test.ts:431`'s `% 8` (melody array length, unrelated to palette
bounds) and the `buildMotifOnsets`-related `< 8`/`>= 8` assertions (subdivision/motif-length test
data, a different concept) were also left untouched.

Still enforced structurally by the `EighthNotes` 8-tuple type
([`harmonySystem.ts:12`](../src/engine/harmonySystem.ts#L12)) — `NOTE_PALETTE_SIZE` doesn't replace
that type, it only backs the numeric bounds derived from it downstream. *(Updated 2026-09-02: this
item originally named the palette collection `TIME_PITCHES`, a `Record<number, EighthNotes>` keyed
0-23; [Harmony Palette Sequencing](specs/HARMONY_PALETTE_SEQUENCING.md) renamed/restructured it to
`HARMONY_PALETTES`, a plain 12-entry `EighthNotes[]` — the `EighthNotes` type itself, and this item's
reasoning about it, are unaffected by that rename.)*

### 5. `MIN_LEAD` fallback literal — minor, mostly defensive
**Status:** ☑ fixed (2026-09-02, `bugs/duplicate-value-audit`) · **Confidence:** low — no current
drift; only bit a future test mock.

**Fix applied:** [`AudioEngine.ts:47`](../src/engine/AudioEngine.ts#L47) used to read
`const MIN_LEAD = CONST_MIN_LEAD ?? 0.1;`, duplicating
[`constants/index.ts:22`](../src/constants/index.ts#L22)'s `MIN_LEAD = 0.1` as a fallback literal.
The fallback never fired in production (the import is never falsy — `MIN_LEAD` is a plain literal
export with no environment branching, unlike `DEV_TUNING`); it only existed to paper over
`AudioEngine.test.ts`'s hand-written `vi.mock('../constants', …)`, which restated `MIN_LEAD: 0.1`
(and `WORLD_WIDTH: 1920`, `MAX_POLYPHONY: 16`) as literals alongside the one field that's genuinely
different in tests, `DEV_TUNING`. Removed the fallback and the local alias entirely —
`AudioEngine.ts` now imports and uses `MIN_LEAD` directly, matching item 3's pattern for
`MAX_POLYPHONY`. Fixed the root cause in the test mock too: it now spreads
`vi.importActual('../constants')` and overrides only `DEV_TUNING`, so `MIN_LEAD` (and, as a
mechanical side effect, `WORLD_WIDTH`/`MAX_POLYPHONY`'s duplicate literals in that same block) can
never again silently diverge from `constants/index.ts` — for this constant or any future one nobody
remembers to add to a hand-written mock. `lfoDebug.test.ts` also mocks `../constants` but only
overrides `DEV_TUNING` via a getter and doesn't restate any other constant, so it needed no change.
Confirmed via `/interview-me` before implementation (out of TDD-ceremony scope, same reasoning as
items 3–4 — pure centralization/robustness, no behavior change). Full suite (108 files/1736 tests),
lint, and type-check all green.

## Noted, not tracked as this bug class

- [`ROBOT_LIFECYCLE.md:16`](ROBOT_LIFECYCLE.md#L16) references `RobotAudioTab.tsx`, which doesn't
  exist (actual file is `RobotOptionsTab.tsx`). Stale doc pointer, not a duplicated value — file a
  doc fix separately if it matters.
- `BubbleStream.tsx`'s `MEASURES_BETWEEN_BURSTS = 96`
  ([`BubbleStream.tsx:42`](../src/components/actors/BubbleStream.tsx#L42)) — same numeral as #2
  above, but nothing documents it as intentionally tied to day length. Could be coincidence; not
  confirmed as "the same concept."
- `MAX_ROBOTS`, `BATTERY_*`, `COMPANY_*`, `INITIAL_*` constants (`ROBOT_LIFECYCLE.md`,
  `COMPANIES.md`) — checked doc vs. code, currently consistent; each doc quotes the actual
  `constants/index.ts` block directly rather than restating independently.
- Full sweep of exported interface/type names in `src/` for name collisions, and every "keep in
  sync"/"mirrors"/"structurally identical" comment in `src/` — both already swept clean (see
  `factoryPlacementSystem.ts`'s `DEFAULT_FACTORY_ROW` for the fixed template of this exact pattern).
