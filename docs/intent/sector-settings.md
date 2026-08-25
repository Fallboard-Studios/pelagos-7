# Intent: Sector Settings (Roadmap Phase 5)

Confirmed via `/interview-me` on `main`, 2026-08-25. This is the "why" behind Phase 5's scope in
[docs/roadmap/roadmap.md](../roadmap/roadmap.md#5-sector-settings) — read that first for the
file-level deliverables; this doc resolves the decisions its prose left open. **Depends on
[Locale Seed Decoupling](locale-seed-decoupling.md)** landing first — this feature's core
guarantee (see Success, below) isn't achievable on today's planet-coupled locale noise map.

## Outcome

Sector Settings becomes the console's world-control panel, replacing `ConsolePanel.tsx`'s
`settings` stub. `src/data/sectorSettingsConfig.ts` defines `ControlSchema` data plus preset
lists for two panels, and `SectorSettingsDrawer.tsx` renders a status header (active plot
coordinates + planet name/seed) above both:

- **Planet Calibration** — a `TextInput` for the planet name (the name *is* the seed, per
  `derivePlanetSeed` — there's no separate "seed" field distinct from the name), pre-populated
  with the current planet's name, plus a hand-curated ("promoted") list of lore-flavored preset
  names and a "random" option, both authored as static data in the config file.
- **Plot Tuning** — a `CoordsInput` for locale X/Y, pre-populated with the current locale's
  coordinates, plus its own promoted-preset/random list of interesting coordinate pairs.
- **One shared retransmit `Button`** — not two independent triggers, despite the roadmap prose
  listing a trigger under each panel. Submitting reads whichever field(s) the user actually
  edited:
  - **Planet name changed:** the current planet is discarded outright (no retention — Session
    Storage/local persistence of the old world is Phase 11's job, not this one) and a brand-new
    planet is created using the typed name as both display name and seed. Every planet-seeded
    thing regenerates: the robot roster respawns from scratch, the global Audio Rig chain and
    global LFOs (Phase 4) reseed via the planet's own noise map, `dayStartTimestamp` recomputes.
    If the coordinate fields were left untouched, the new planet's locale sits at the *same*
    coordinates as before — and because of the Locale Seed Decoupling prerequisite, that means
    every locale-derived thing (robots, idle wander, interaction sounds, melody generation,
    per-note velocity variance) comes out **identical** to what it was before the planet
    changed, not just coincidentally similar.
  - **Coordinates changed** (with or without a planet-name change alongside it): every
    locale-derived thing above regenerates against the new coordinates, deterministically, with
    no low-entropy dead zone at round-number inputs (the decoupling prerequisite's fix).
  - **Neither changed:** retransmit is a no-op in effect (nothing to regenerate), though the
    button doesn't need special-case logic to detect this — regenerating "the same" seed
    deterministically just reproduces the same world.

## User

Crawford, exploring different generated worlds and locales from one console panel instead of
editing store state by hand or via URL/debug overrides.

## Why now

Next in the roadmap's phase sequence (Phase 5), and it's the first feature to put free-form
coordinate entry and planet reseeding directly in a user's hands — exactly the two things
Phase 5's own "Known Issue" callout flags as broken on the current architecture. Building this
UI first and discovering the coupling/dead-zone problems live (as that callout warns) is the
thing being avoided by resolving them in the Locale Seed Decoupling doc first.

## Success

- Retransmitting a new planet name (coordinates untouched) yields a robot roster, Audio Rig
  settings, and global LFO state that differ from before — but the *locale's* generated content
  at those unchanged coordinates is provably identical to what those same coordinates would
  produce on any other planet (the decoupling guarantee, exercised end-to-end through the UI
  for the first time).
- Retransmitting new coordinates regenerates locale-derived content deterministically, including
  at round-number inputs that would have collapsed under the old simplex-sampling derivation.
- Both input fields show the *current* planet name / locale coordinates on open, not blank
  fields — a user edits from the live state, not from scratch.
- Promoted presets are a small, hand-authored, lore-consistent list per panel (not user-saved
  favorites) sitting alongside a random option; every label traces to `sectorSettingsConfig.ts`,
  no hardcoded strings in `SectorSettingsDrawer.tsx` (per CLAUDE.md's zero-hardcoded-strings
  rule, same as every other drawer).
- The status header accurately reflects the active plot and planet immediately after a
  retransmit — no stale readout.

## Constraint

- Stays inside CLAUDE.md's guardrails: schema-driven, zero hardcoded labels in the component;
  state stays serializable in Zustand; no Tone/GSAP objects touched directly by this drawer.
- Built entirely on Phase 1's existing primitives (`TextInput`, `CoordsInput`, `Button`,
  `DualLabel`) — no new primitive needed.
- No persistence — a retransmitted-away world is genuinely gone this phase; Session Storage
  (Phase 11) is what will later let a user's edited world survive a reload, out of scope here.

## Out of scope

- Locale Seed Decoupling itself — a separate, prerequisite doc/spec (see above), not part of
  this feature's own implementation work.
- Persisting or reloading a previous world (Phase 11).
- Phase 6's melody rhythm-engine overhaul and robot ID determinism — unrelated, stay in Phase 6.
- User-saved/favorited presets — promoted presets are static designer-authored data only.
- Any change to Robot Selection/Robot Options (Phases 8/9) — a planet-only retransmit respawning
  the robot roster is this phase's concern; how that roster is browsed/edited afterward isn't.
