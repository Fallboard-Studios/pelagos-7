# Procedural Generation & Seeded Determinism

Source of truth: [`src/utils/seedUtils.ts`](../src/utils/seedUtils.ts) · [`src/utils/noiseMaps.ts`](../src/utils/noiseMaps.ts) · [`src/utils/getSeededVal.ts`](../src/utils/getSeededVal.ts)

**Related docs:** [MELODY_SYSTEM.md](MELODY_SYSTEM.md) · [ROBOT_DESIGN.md](ROBOT_DESIGN.md) · [AUDIO_SYSTEM.md](AUDIO_SYSTEM.md)

## What It Is

Pelagos-7 replaces `Math.random()` with a deterministic noise-based sampler almost everywhere game logic needs randomness. The guarantee: **the same planet name + the same locale coordinates always produce the same world** — same robot names, spawn positions, audio attributes, melodies, and idle/interaction behavior. Nothing about the generated world is persisted beyond the seed inputs themselves.

This is a two-tier system: a **planet noise map**, seeded from the planet's name, and a **locale noise map** per locale, seeded by sampling the planet map at that locale's coordinates. Individual values (a robot's attack time, a spawn X position, an idle target) are then sampled from the relevant locale's noise map via a stable string key.

**Not covered here:** factory/building variant selection (`selectVariantFromSeed` in `src/components/actors/factoryVariants.ts`) is a separate, self-contained deterministic mechanism — it seeds its own `Alea(actorId)` PRNG per call and never touches the noise-map registry described below. See [BUILDING_DESIGN.md](BUILDING_DESIGN.md) for that system.

## Seed Derivation (`seedUtils.ts`)

```typescript
derivePlanetSeed(name: string): string   // lowercase, strip non a-z0-9 — "Pelagos 7!" → "pelagos7"
planetInitialHour(seed: string): number  // avg 0-based letter index → hour, clamped 0..23
```

`planetInitialHour` is what lets a newly-added planet start at a plausible in-world hour instead of always at midnight — `planetStore.ts`'s `DEFAULT_PELAGOS` and `addPlanet()` both use it to compute `dayStartTimestamp`.

### Global seed override

A debug/testing escape hatch: setting `window.__GLOBAL_PLANET_SEED__` before load, passing `?seed=` in the URL, or calling `setGlobalPlanetSeedOverride(seed)` forces **every** planet seed and **every** `precomputeDataX` key to be derived from one shared override string, for reproducible screenshots/tests/bug repros. `getGlobalPlanetSeedOverride()` reads the current override (`null` if unset).

## Noise Map Registry (`noiseMaps.ts`)

Two module-scoped `Map`s — **non-serializable, never put these or their contents in Zustand**:

```typescript
getPlanetNoiseMap(planetId: string, planetName: string): NoiseFunction2D
getLocaleNoiseMap(localeId: string, planetId: string, planetName: string, x: number, y: number): NoiseFunction2D
tryGetLocaleNoiseMap(localeId: string): NoiseFunction2D | null   // non-throwing; null if not yet registered
evictPlanetNoiseMap(planetId: string): void
evictLocaleNoiseMap(localeId: string): void
```

- **Planet map:** `createNoise2D(alea(derivePlanetSeed(planetName)))`, cached by `planetId`.
- **Locale map:** samples the planet map at `(x, y)` → a float in `[-1, 1]` → rescaled to an integer in `[0, 129599]` → that integer seeds `createNoise2D(alea(...))`, cached by `localeId`. Two locales with identical `(x, y)` on *different* planets get different noise maps, because the intermediate sample comes from a planet-specific function.
- **Lifecycle:** `planetStore.ts` and `localeStore.ts` prime the default planet/locale's maps eagerly at module scope (so they exist before first render) and again inside `addPlanet`/`addLocale`. `removePlanet`/`removeLocale` call the matching `evict*` function; `removePlanet` also evicts every locale map belonging to that planet.
- `tryGetLocaleNoiseMap` exists specifically for hot-path callers (`AudioEngine`) that must not throw or block if a locale hasn't been registered yet.

## Sampling Values (`getSeededVal.ts`)

```typescript
precomputeDataX(dataId: string): number
getSeededVal(noiseMap: NoiseFunction2D, dataId: string, offset?: number, min?: number, max?: number): number
```

- `precomputeDataX(dataId)` turns a stable string key into a deterministic float via `alea(dataId)()`. **Hot-path callers must call this once at module scope and cache the result** — repeated calls do string hashing and are measurably slower than `Math.random()`, which matters on the audio scheduling path. `AudioEngine.ts`'s `VELOCITY_ROLL_X`/`VELOCITY_VARIANCE_X` (computed once at import) are the canonical example.
- `getSeededVal(noiseMap, dataId, offset, min, max)` is the general-purpose sampler for everything else: it calls `precomputeDataX` internally, samples `noiseMap(x, offset)` (simplex noise, `[-1, 1]`), and rescales to `[min, max]` (defaults `0..1`).
- `dataId` is a stable, human-readable, dot-namespaced key — conventionally the state path it fills (e.g. `'robot.audio.attack'`, `'spawn.pos.x'`). Renaming a `dataId` string changes the seed for every world that used it — treat renames as breaking changes to world generation.
- `offset` is what makes repeated calls with the same `dataId` diverge — typically a spawn count, robot index, or per-call counter (e.g. melody generation uses `spawnCount * 100 + melodyCallIndex++`).

## Call Sites

| Module | Uses it for |
|---|---|
| `spawnSystem.ts` | Robot name (adjective/noun pick), spawn edge/position, full `AudioAttributes` (ADSR, octave register, filter frequency, waveform, oscillator layers, phase/detune/pulse width), copy-vs-generate-fresh chance, copy source pick, motif length, note variance, master volume, and the injected `rand` function passed to `generateMelodyForRobot` |
| `idleSystem.ts` | `pickDestination()` — idle wander target `x`/`y`, keyed by `spawnIndex` and move count |
| `interactionSystem.ts` | Melody event index selection for each robot's interaction sound pick |
| `melodyGenerator.ts` | Never imports `noiseMaps`/`getSeededVal` directly — takes an injectable `rand: () => number` (defaults to `Math.random`). `spawnSystem.ts` wires `getSeededVal(noiseMap, 'melody.rand', ...)` in as that function so melody generation stays seeded without coupling the generator to the noise-map registry |
| `AudioEngine.ts` | `computeNoteVelocitySeeded()` — per-note velocity variance, sampling `tryGetLocaleNoiseMap()` at precomputed `VELOCITY_ROLL_X`/`VELOCITY_VARIANCE_X` positions with a per-robot note counter (mod 97) as the offset |

If a noise map isn't available yet (locale not registered, or no `noiseMap` passed), every caller above falls back to `Math.random()` rather than throwing.

## Gotchas

- Don't call `getSeededVal`/`precomputeDataX` inside a per-note audio callback without precomputing the `dataId` → x-value first (see `precomputeDataX`'s hot-path warning above).
- Don't rename a `dataId` string casually — it's a de facto seed key, not just a debug label.
- Don't store a `NoiseFunction2D` (or anything derived from the registry) in Zustand — it's a closure, not serializable.
- `getLocaleNoiseMap` silently creates-and-caches on first call; there's no way to "re-seed" an existing locale without evicting it first.
