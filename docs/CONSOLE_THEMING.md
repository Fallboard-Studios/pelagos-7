# Console Theming

**Status: tried and cut (Roadmap Phase 11).** A seed-driven color theming system for the console's
Glass-side UI was built, wired up, and evaluated against the real running app — then reverted at
Crawford's call. `src/index.css` defines static colors again, same as before this phase ever started.
This doc now records what was tried and why it didn't stay, so the reasoning isn't re-litigated later
(and so `docs/intent/console-theming.md` / `docs/specs/CONSOLE_THEMING.md` / `docs/tasks/CONSOLE_THEMING.md`,
which still describe the seed-driven design in detail, aren't mistaken for current behavior).

**Related docs:** [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) (the noise-map registry this
design built on) · [ROBOT_DESIGN.md](ROBOT_DESIGN.md) (the bounded-HSL, no-static-palette precedent
this design followed, then deliberately diverged from) · [UI_SHELL.md](UI_SHELL.md) (Sleeve/Glass
split, `ScreenViewport` boundary) · [roadmap/roadmap.md](roadmap/roadmap.md) Phase 11 (this phase,
now marked cut) · Phase 11.1 (Oblique Cabinetry UI — its face-shading was scoped to consume this
phase's *seed-driven* tokens; that premise no longer holds, see the note there)

## What was built

`src/utils/consoleTheme.ts` computed bounded HSL values — `--color-bg`/`--color-surface` from the
active Attenuation Style's seed, `--color-accent`/`--color-border` from the active locale's coordinate
seed — applied as an inline style on `Tablet.tsx`'s `.tablet` root, following the same
`getSeededVal`/noise-map pattern every other procedurally-generated system in this codebase uses
(robots, buildings, melodies). A companion `contrastRatio.ts` proved, via an exhaustive hue sweep, that
every possible seed cleared WCAG AA against the app's fixed text colors. It shipped, worked correctly,
and was fully tested — the decision to cut it was aesthetic, not a bug.

## Why it was cut

The WCAG-AA-for-every-seed guarantee forced the structural tier (`--color-bg`/`--color-surface`) into
a 9-percentage-point lightness band (5–14%) to protect fixed-text contrast, and pushed the accent tier
the opposite direction (72–88% lightness) to guarantee 3:1 against that dark background. In practice
this read as "the same dark gray, faintly tinted" for the tier that was supposed to feel structural,
and "too light/vivid" for the tier that was supposed to read as restrained chrome — the safety
constraint dominated the visual outcome rather than serving it. This was a foreseeable tension, not a
surprise: `docs/specs/CONSOLE_THEMING.md §7` flagged the structural-tier variety question as an open
risk before it ever shipped, and it went unresolved because there was no tuning fix available —
provably-safe-for-every-seed and visually-distinct-per-seed pull in opposite directions by
construction, so no amount of bound-adjustment was going to resolve it.

There's also a scope question worth naming: "no static/fixed color palette" was carried over from
[ROBOT_DESIGN.md](ROBOT_DESIGN.md)'s rule for robots without re-litigating whether it actually applied
here. Robots are small, numerous, and decorative — a bad procedural roll is forgettable. Console chrome
is the one thing on screen at all times. Different subject, no obligation to inherit the same rule.

## What's there instead

A hand-picked static palette — same 4 CSS custom properties (`--color-bg`/`--color-surface`/
`--color-accent`/`--color-border`) in `src/index.css`, same fixed `--color-text-primary`/
`--color-text-muted`, chosen with actual taste rather than generated inside a safety envelope. See
`src/index.css` for the current values.

## What was reverted

All of it, cleanly — `git revert` on `feature/theme-and-boxes`, confirmed `src/` byte-identical to the
pre-phase state:

- `src/utils/contrastRatio.ts` / `.test.ts` (WCAG contrast math)
- `src/utils/consoleTheme.ts` / `.test.ts` (the bounded HSL generation)
- `Tablet.tsx`'s theme wiring and its test coverage
- `Console.css`'s `color-mix()` re-derivation of `.console`'s glass translucency
- `index.css`'s theme-token comments and the global retransmit-crossfade transition rule
- The `SleeveContainer.css`/`PowerRockerSwitch` fix for the seed-color leak that was found and fixed
  mid-phase (both were inheriting seed-driven color despite being explicitly out of scope — see the
  git history on `feature/theme-and-boxes` if that bug class matters for a future attempt)
- `PaletteSample`, the dev-only debug overlay that showed the computed theme values live

## If this gets revisited later

The intent/spec/tasks docs (`docs/intent/console-theming.md`, `docs/specs/CONSOLE_THEMING.md`,
`docs/tasks/CONSOLE_THEMING.md`) are kept as a historical record of what was actually tried, bounds and
all — worth reading before re-attempting a seed-driven approach, so the same tension doesn't get
rediscovered from scratch. A few directions that weren't tried and might resolve the actual tension
(rather than just re-tuning the same bounds):

- Decouple safety from variety by construction — only constrain what's provably load-bearing (text
  sits on `surface`, not `bg`; `bg` itself may not need the same guarantee) instead of squeezing both
  tiers to protect fixed text everywhere.
- A curated-bucket hybrid: hash the seed to pick among a small hand-designed set of hue families,
  using the seed only for fine variation within the chosen family — deterministic and never
  hardcoded to one look, but a person vets the floor of what's possible instead of trusting math to
  always land somewhere decent.
- Apply the seed as a subtle tint/overlay on a static base rather than a full independent HSL
  derivation — "reacts to the seed" stays true with a much smaller chance of landing somewhere bad.
