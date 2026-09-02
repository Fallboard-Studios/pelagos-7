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
**Status:** ☐ open · **Confidence:** medium — not yet diverged, but architecturally unlinked.

CLAUDE.md's guardrail ("96 measures = 1 day cycle") is encoded as two separately-declared module
constants, each `96`, in unrelated subsystems with no shared import:
- [`beatClock.ts:21`](../src/engine/beatClock.ts#L21) `MEASURES_PER_CYCLE = 96` — drives
  `getCurrentHour()`/measure-wrap for audio/harmony (documented in
  [`BEAT_CLOCK.md:26`](BEAT_CLOCK.md#L26)).
- [`lightingUtils.ts:6`](../src/utils/lightingUtils.ts#L6) `DAY_CYCLE_MEASURES = 96` — drives
  building-lighting phase, consumed by
  [`Factory.tsx:93,108,113`](../src/components/actors/Factory.tsx#L93).

By design these run off different clocks (Factory.tsx derives its `lightMeasure` from Attenuation
Style local time, not the transport — [`Factory.tsx:89-91`](../src/components/actors/Factory.tsx#L89-L91)),
so this may be an intentional split rather than a bug — but nothing ties the two `96`s together, and
a stale comment already gestures at a variable `dayLengthMeasures`
([`Factory.tsx:105`](../src/components/actors/Factory.tsx#L105)) that doesn't exist as a real field.

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
**Status:** ☐ open · **Confidence:** low-medium — unlikely to change (declared non-negotiable), but
matches the exact concept the original bug was about.

Enforced structurally by the `EighthNotes` 8-tuple type
([`harmonySystem.ts:29`](../src/engine/harmonySystem.ts#L29)), but the numeric bounds derived from
it are bare literals, not a named constant:
- [`melodyGenerator.ts:212`](../src/engine/melodyGenerator.ts#L212) `Math.min(7, Math.max(0, ...))`
- [`melodyGenerator.ts:560`](../src/engine/melodyGenerator.ts#L560) `Math.floor(rand() * 8)`
- Test fixtures independently reflect `% 8` in several places (e.g.
  [`melodyGenerator.test.ts:431`](../src/engine/melodyGenerator.test.ts#L431)).

### 5. `MIN_LEAD` fallback literal — minor, mostly defensive
**Status:** ☐ open · **Confidence:** low — no current drift; only bites a future test mock.

[`AudioEngine.ts:47`](../src/engine/AudioEngine.ts#L47): `const MIN_LEAD = CONST_MIN_LEAD ?? 0.1;`
duplicates [`constants/index.ts:22`](../src/constants/index.ts#L22)'s `MIN_LEAD = 0.1` as a fallback
literal. Never fires in production (the import is never falsy); only fires if a test mocks
`../constants` without including `MIN_LEAD`. Current mock
([`AudioEngine.test.ts:166`](../src/engine/AudioEngine.test.ts#L166)) correctly matches at `0.1`. If
the real constant ever changes, this fallback silently stays behind for any test mocking the module
without updating it too.

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
