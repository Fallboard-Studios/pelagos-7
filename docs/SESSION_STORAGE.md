# Session Storage & Persistence

**Status: design doc for [Roadmap Phase 12](roadmap/roadmap.md) — not yet implemented.** Nothing in this file describes current app behavior; there is no localStorage or persistence code anywhere in `src/` today. Update this banner and fold this content into an implementation-sourced version once `storageEngine.ts`/`stateResolver.ts`/`urlSerializer.ts` land.

**Related docs:** [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) (the seed determinism this design depends on) · [ANIMATION_SYSTEM.md](ANIMATION_SYSTEM.md) (timelineMap, for FirmwareResetModal's flash) · [COMPANIES.md](COMPANIES.md) (the Company shape this persists, including the spawn-generated-vs-user-created id split) · [roadmap/roadmap.md](roadmap/roadmap.md) Phase 6 (deterministic robot IDs), Phase 9 (Robot Options, the source of overrides), Phase 10 (Companies), Phase 12 (this phase)

## What Gets Persisted

Robot attributes are already fully derived from the active AS seed and locale coordinates — [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) guarantees the same seed always regenerates the same world. So this design does **not** persist full robot state. It persists the minimum needed to reproduce a session exactly:

1. Active AS seed and plot coordinates (X, Y) — Sector Settings (Phase 5)
2. Global Audio Rig FX settings (Compressor, EQ3, LPF, HPF, Delay, Reverb, Limiter) — not seed-derived; set explicitly by the operator (Phase 4)
3. Per-robot manual overrides from Robot Options, keyed by robot ID — only the fields an operator explicitly changed (job assignment, docking-state override, battery warning threshold, transducer pressure ratio, oscillator layer params, ADSR envelope, rhythmic density/motif length/octave bounds/note variance). Every other field regenerates fresh from the seed.
4. Companies ([COMPANIES.md](COMPANIES.md)), in two different shapes depending on origin:
   - **Spawn-generated companies** persist the same way robot overrides do — a diff (membership changes, `lastEditedOptions`) keyed by the company's deterministic `spawnSystem.ts` id, reapplied on top of the regenerated roster.
   - **User-created companies** (via `CompanyCrudControls`, id from `crypto.randomUUID()`) don't exist in a regenerated roster at all — there's no seed to recreate them from. These persist as **complete objects** (id, name, `robotIds`, `lastEditedOptions`), not a diff. The random id only needs to stay stable once saved; it's never re-derived.

The payload is a **diff on top of a regenerated roster** for everything seed-derived, plus the small set of objects (user-created companies) that have no seed to regenerate from in the first place. This keeps saves small and keeps reload/share behavior predictable: regenerate from the seed, reapply the override diffs, then splice in any full objects that aren't part of the regenerated world.

## Hard Requirement: Deterministic IDs for Anything Diffed

This design only works if regenerating from the same seed reproduces the same IDs in the same order, so a persisted diff can be matched back up to the right entity. **Robot IDs** already satisfy this — Phase 6 replaced the original `crypto.randomUUID()` with a seed-derived id (`generateRobotId`, `src/systems/spawnSystem.ts`), through the noise-map/seed utilities [PROCEDURAL_GENERATION.md](PROCEDURAL_GENERATION.md) documents. **Spawn-generated Companies** likewise already use a deterministic id (`generateCompanyId`, same file) for the same reason.

**User-created Companies** are the one exception, deliberately: a company made by hand via `CompanyCrudControls` has no seed to derive an id from in the first place, so it keeps `crypto.randomUUID()` (see [COMPANIES.md](COMPANIES.md)'s Forbidden Patterns). This doesn't violate the determinism requirement above — that requirement only applies to entities meant to be *matched back up* against a regenerated roster. A user-created company is never regenerated; it's persisted as a complete object instead (see "What Gets Persisted"), so its id just needs to stay stable once saved, not be re-derivable from the seed.

## The Persistence Engine

- A Zustand `subscribe()` listener, not a polling loop. The shared save handler is debounced (roughly 500ms–1s) and fires on writes to locale coordinates/seed, Audio Rig settings, or Robot Options overrides. This avoids `setInterval`-style polling for state changes the stores can already notify on, and avoids writing to localStorage on every intermediate slider-drag tick.
- Writes a single namespaced key to `localStorage` — `src/utils/storageEngine.ts`.

## Load-Time Resolution Hierarchy

`src/utils/stateResolver.ts` resolves state at startup by stepping down a fixed priority order — it never prompts the operator:

1. **URL query string.** If a compressed state payload is present, decode and apply it. Highest priority — this is what makes a shared link reproduce the sender's exact session, overrides included.
2. **`localStorage` cache.** If the URL is clean, load the last background-saved state.
3. **Procedural fallback.** If both are empty, generate a fresh baseline seed and start clean.

## URL State Compression

No new dependency: compress the serialized state object with the native `CompressionStream`/`DecompressionStream` Web API (`'deflate-raw'`), then base64url-encode the compressed bytes for a URL-safe string (`src/utils/urlSerializer.ts`). If `CompressionStream` isn't available in the runtime, fall back to plain base64url-encoding the uncompressed JSON — a longer URL, but link sharing still works rather than failing outright.

## Destructive Actions: FirmwareResetModal

A full state wipe (clear `localStorage`, strip the URL query string, regenerate at a fresh procedural baseline) is exposed as a diegetic hardware action, not a generic "Are you sure?" browser-style confirm:

- Use `@radix-ui/react-alert-dialog` — already installed, already the established pattern for destructive confirmations elsewhere in the app — rather than inventing a new confirmation mechanism.
- On confirm, the screen plays a "hard diagnostic warning" flash before reboot. This must be a GSAP timeline registered in `timelineMap` (`setTimeline`/`killTimeline`), per [ANIMATION_SYSTEM.md](ANIMATION_SYSTEM.md) — not a raw CSS class toggle or a `setTimeout`-driven effect.
- The reset is labeled `SYSTEM_FIRMWARE_RESETS` in the UI copy, keeping the industrial telemetry framing consistent with the rest of the console.

## Forbidden Patterns

- Don't persist full robot objects — persist the seed/coordinates plus an override diff, per "What Gets Persisted" above.
- Don't persist spawn-generated Companies as full objects either — same override-diff treatment as robots, keyed by their deterministic id. Only user-created Companies (no seed to regenerate from) get persisted in full.
- Don't poll with `setInterval` for saves the store can already notify you about — use a debounced `subscribe()` listener.
- Don't add a compression dependency (e.g. lz-string) — use the native `CompressionStream`/`DecompressionStream` API.
- Don't build FirmwareResetModal as a plain `window.confirm()` or an undifferentiated generic modal — it must use `AlertDialog` and the diegetic firmware-reset framing.
- Don't key robot or spawn-generated-Company overrides by anything other than their deterministic id (see "Hard Requirement" above) — a random id silently breaks override reapplication on the very next reload. This doesn't apply to user-created Companies, which are persisted in full rather than diffed.
