---
name: Feature
about: Milestone 2 — Session & World Management Console Tab
title: '[M8.2] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 6: Size Ocean Scene Inside WorldView                   -->
<!-- ============================================================ -->

## [M8.2-6] Size Ocean Scene Inside WorldView

## Feature Description
Remove the full-screen assumption from `OceanScene` so it fills the WorldView panel inside the 4-panel GlassViewport shell, not the entire viewport. WorldView enforces `aspect-ratio: 16/9` and `OceanScene` fills it via CSS layout — no explicit pixel values passed. This is a pure sizing/layout change; no new controls or interactive elements are added.

Depends on: **Issue 3** (WorldView panel must exist in the 4-panel grid).

## Implementation Details
- [ ] Remove `width: 100vw; height: 100vh` from `OceanScene.css`
- [ ] Replace with `width: 100%; height: 100%` so the scene inherits its bounds from the parent `WorldView` container
- [ ] `WorldView` enforces `aspect-ratio: 16/9` and `height: 100%` — OceanScene fills this exactly
- [ ] On desktop, WorldView expands as more of GlassViewport is revealed along the X-axis; OceanScene scales with it
- [ ] Confirm spawn and collision systems are still working (they use the scene's SVG `viewBox`, not pixel dimensions)
- [ ] Confirm no horizontal overflow from OceanScene into other grid areas
- [ ] No interactive controls added in this issue (pure sizing change)
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- OceanScene uses an SVG with a `viewBox` — the SVG is resolution-independent and scales cleanly to any parent bounds. The key change is removing the viewport-based sizing so it no longer forces full screen.
- WorldView should be `position: relative; width: 100%; aspect-ratio: 16/9; overflow: hidden` — any absolute-positioned children (overlays, etc.) should be clipped to the scene bounds.
- Confirm `@media (min-width: ...)` breakpoints in `OceanScene.css` do not re-introduce `100vw`/`100vh` values.
- Spawn and collision coordinate systems are SVG `viewBox`-based, not CSS pixel-based — they are unaffected by this change.
- **Target hierarchy (Issue 9):** In the final architecture `WorldView` renders `<PlanetView>` → `<LocaleView>` → `<OceanView>` → `<OceanScene>`. This issue sets `OceanScene` to `width: 100%; height: 100%` so it fills whatever parent wraps it — that rule stays correct at every level of the chain.

## Acceptance Criteria
- [ ] OceanScene fills WorldView bounds; no `100vw`/`100vh` values remain in `OceanScene.css`
- [ ] Scene maintains correct aspect ratio at all breakpoints
- [ ] Spawn, collision, and idle systems continue to function without regression
- [ ] No horizontal overflow from the scene into other grid areas
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/components/OceanScene.css`, `src/components/OceanScene.tsx`, `src/components/layout/WorldView.tsx` (Issue 3)
- Copilot instructions: N/A (layout change)

---

<!-- ============================================================ -->
<!-- ISSUE 9: Planet & Locale Components                         -->
<!-- ============================================================ -->

## [M8.2-9] Build `PlanetView`, `LocaleView`, and `OceanView` components

## Feature Description
Implement the three-layer world view hierarchy that replaces the current direct `WorldView → OceanScene` connection:

```
WorldView
  └── PlanetView          (owns planet time tick; one per active planet)
        └── LocaleView    (computes locale local time from planet hour + longitude offset)
              └── OceanView  (wraps OceanScene; receives localTime prop)
                    └── OceanScene
```

Planet `size` (small/medium/large) determines a full day's real-world duration via `PLANET_DURATION_MS`. Locales derive their local time from the planet's current hour plus a longitude offset: `localTime = (planet.currentHour + locale.coordinates.x / 15) % 24`. The active locale's local time is written to `uiStore.activeLocaleLocalTime` each second so the `TransportBar` can display it.

Depends on: **Issue 0l** (`usePlanetStore`, `useLocaleStore`, `PLANET_DURATION_MS`, `computeLocalTime`, and `uiStore.activeLocaleLocalTime` must all exist).

## Implementation Details
- [ ] Create `src/components/world/PlanetView.tsx` and `PlanetView.css` — props: `planetId: string`
  - Reads `usePlanetStore((s) => s.planets.find(p => p.id === planetId))`
  - Runs a `setInterval` (1000 ms) inside a `useEffect` that computes `currentHour = ((Date.now() - planet.dayStartTimestamp) / PLANET_DURATION_MS[planet.size]) * 24 % 24`, calls `usePlanetStore.getState().setCurrentHour(planetId, currentHour)`, and also calls `useUIStore.getState().setActiveLocaleLocalTime(computeLocalTime(currentHour, activeLocale.coordinates.x))` for the active locale
  - Interval is started on mount and cleared in `useEffect` cleanup
  - This interval is **not** musical timing — `setInterval` is explicitly permitted here (world/visual timing)
  - Renders `<LocaleView localeId={planet.currentLocaleId} planetId={planetId} />`
- [ ] Create `src/components/world/LocaleView.tsx` and `LocaleView.css` — props: `localeId: string`, `planetId: string`
  - Reads `useLocaleStore((s) => s.locales[localeId])`
  - Reads `usePlanetStore((s) => s.planets.find(p => p.id === planetId)?.currentHour ?? 0)`
  - Computes `localTime = computeLocalTime(currentHour, locale.coordinates.x)` (from `src/constants/time.ts`)
  - Renders `<OceanView localTime={localTime} />`
- [ ] Create `src/components/world/OceanView.tsx` and `OceanView.css` — props: `localTime: number`
  - Thin wrapper that passes `localTime` (and any other locale-scoped props) down to `<OceanScene>`
  - Exists so the locale-to-scene boundary is a clear named seam for future scenes
- [ ] Mount `<PlanetView planetId="pelagos" />` inside `WorldView` (replacing any direct `<OceanScene />` reference in `WorldView`)
- [ ] All components use `width: 100%; height: 100%` so they inherit `WorldView` bounds without explicit pixel values

## Technical Notes
- Day length is **entirely driven by `planet.size`** via `PLANET_DURATION_MS`. The size is set on the planet in `planetStore`; there is no separate selector in any console tab.
- `computeLocalTime(planetHour, longitudeX)` is the shared utility in `src/constants/time.ts`; `LocaleView` and the TransportBar both use it.
- `uiStore.activeLocaleLocalTime` is a float (e.g. `14.5` = 14:30). `TransportBar` formats it as `HH:MM`.
- Spawn, collision, and idle systems still read from `oceanStore`/`localeStore` for per-locale robots and actors — they are unaffected by the view hierarchy change.

## Acceptance Criteria
- [ ] `WorldView` renders `<PlanetView>` → `<LocaleView>` → `<OceanView>` → `<OceanScene>`
- [ ] `PlanetView` drives the real-time day-cycle tick using `PLANET_DURATION_MS[planet.size]`; tick runs independent of transport power state
- [ ] `LocaleView` computes `localTime` via `computeLocalTime` and passes it to `OceanView`
- [ ] `uiStore.activeLocaleLocalTime` is updated every second while `PlanetView` is mounted
- [ ] `TransportBar` shows the locale's local time in `HH:MM` format (wired via `useUIStore`)
- [ ] All components fill parent bounds via `width: 100%; height: 100%` with no `100vw`/`100vh`
- [ ] App compiles with no TypeScript errors and `OceanScene` renders inside `WorldView`

## Source Reference
- `src/stores/planetStore.ts`, `src/stores/localeStore.ts`, `src/stores/uiStore.ts` (Issue 0l)
- `src/constants/time.ts` — `PLANET_DURATION_MS`, `computeLocalTime`
- `src/components/layout/WorldView.tsx` (Issue 3)

---

<!-- ============================================================ -->
<!-- ISSUE 10: Seed Infrastructure                                -->
<!-- ============================================================ -->

## [M8.2-10] Seed Infrastructure — planet seed derivation, `getSeededVal`, and `noiseMaps` registry

## Feature Description
Establish the deterministic seed system that removes all `Math.random()` calls from game logic. Every planet has a reproducible seed derived from its name; every locale has a seed derived from its position on that planet's noise map. A single `getSeededVal()` utility replaces direct `Math.random()` calls throughout the codebase. A module-level `noiseMaps` registry holds the (non-serialisable) noise-map functions keyed by planet/locale ID, separating them from Zustand state.

Depends on: **Issue 0l-3** (`usePlanetStore`, planet name field), **Issue 0l-4** (`useLocaleStore`, locale coordinates field).

## Implementation Details

### Planet seed derivation
- [ ] Add `src/utils/seedUtils.ts`:
  ```ts
  import alea from 'alea';

  /**
   * Derive a stable planet seed string from the planet's display name.
   * Lowercases, strips any character that is not a-z or 0-9.
   * E.g. "Pelagos 7!" → "pelagos7"
   */
  export function derivePlanetSeed(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Compute the planet's deterministic initial in-world hour (integer 0–23)
   * from the planet seed.
   *
   * Algorithm: convert each letter in the seed to its 0-based index (a=0 … z=25),
   * take the floor of the average. If the result is outside [0, 23] (possible if
   * all characters are digits), fall back to 0.
   */
  export function planetInitialHour(seed: string): number {
    const letters = seed.replace(/[^a-z]/g, '');
    if (!letters.length) return 0;
    const avg = letters
      .split('')
      .reduce((sum, ch) => sum + (ch.charCodeAt(0) - 97), 0) / letters.length;
    const hour = Math.floor(avg);
    return hour >= 0 && hour <= 23 ? hour : 0;
  }

  /**
   * Convert a locale's (x, y) integer coordinates into a unique seed integer.
   *
   * Coordinates are assumed to be integers in the range -179…179.
   * The total number of distinct (x, y) pairs is 359 × 359 = 128,881.
   * Using 360 × 360 = 129,600 as the upper-bound constant is safe and
   * slightly conservative (128,881 < 129,600).
   *
   * The resulting integer is then passed to `alea()` to seed the locale
   * noise map via `createNoise2D(alea(localeCoordSeed(x, y)))`.
   */
  export function localeCoordSeed(x: number, y: number): number {
    return (x + 180) * 360 + (y + 180); // 0 … 129,599
  }
  ```

### `getSeededVal` utility
- [ ] Add `src/utils/getSeededVal.ts`:
  ```ts
  import alea from 'alea';
  import type { NoiseFunction2D } from 'simplex-noise';

  /**
   * Convert a stable dataId string into a deterministic float in [0, 1].
   * This is the x-axis value passed to a noise map for a given data key.
   *
   * **Hot-path callers (e.g. AudioEngine scheduling) must call this ONCE at
   * module scope and cache the result.** `alea(dataId)()` involves string
   * hashing — calling it hundreds of times per second is measurably slower
   * than Math.random() and can delay the Tone.js scheduling callback.
   *
   * Pattern for audio hot paths:
   *   // module scope — computed once at import time:
   *   const MY_KEY_X = precomputeDataX('my.data.key');
   *   // inside the hot path:
   *   const value = noiseMap(MY_KEY_X, offset);
   */
  export function precomputeDataX(dataId: string): number {
    return alea(dataId)();
  }

  /**
   * Sample a locale noise map at a deterministic (dataId, offset) position
   * and map the [-1, 1] result to [min, max].
   *
   * **Do not call this on the audio scheduling hot path.** Use
   * `precomputeDataX` to cache the x value at module scope and call
   * `noiseMap(x, offset)` directly inside the scheduling callback.
   *
   * @param noiseMap  The locale's 2D noise function (from noiseMaps registry)
   * @param dataId    A stable, unique string key — use the Zustand state key path
   *                  (e.g. 'robots.audioAttributes.waveform') so values are
   *                  consistent across app instances
   * @param offset    Array index for per-element variation (e.g. robot spawn order); default 0
   * @param min       Output range minimum; default 0
   * @param max       Output range maximum; default 1
   */
  export function getSeededVal(
    noiseMap: NoiseFunction2D,
    dataId: string,
    offset = 0,
    min = 0,
    max = 1,
  ): number {
    const x = precomputeDataX(dataId);
    const raw = noiseMap(x, offset);       // simplex noise in [-1, 1]
    return min + ((raw + 1) / 2) * (max - min);
  }
  ```

### `noiseMaps` registry
- [ ] Add `src/utils/noiseMaps.ts`:
  ```ts
  import alea from 'alea';
  import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
  import { derivePlanetSeed, localeCoordSeed } from './seedUtils';

  const planetMaps = new Map<string, NoiseFunction2D>();
  const localeMaps = new Map<string, NoiseFunction2D>();

  /** Create (or return cached) the 2D noise map for a planet, keyed by planet ID. */
  export function getPlanetNoiseMap(planetId: string, planetName: string): NoiseFunction2D {
    if (!planetMaps.has(planetId)) {
      const seed = derivePlanetSeed(planetName);
      planetMaps.set(planetId, createNoise2D(alea(seed)));
    }
    return planetMaps.get(planetId)!;
  }

  /**
   * Create (or return cached) the 2D noise map for a locale.
   *
   * The locale seed is derived by:
   *   1. Sampling the planet's noise map at the locale's coordinates (returns [-1, 1])
   *   2. Mapping that float to an integer in [0, 129,599] via localeCoordSeed
   *   3. Seeding createNoise2D with alea(integer)
   *
   * Two locales with identical coordinates on different planets will have
   * different noise maps because step 1 samples a planet-specific noise function.
   */
  export function getLocaleNoiseMap(
    localeId: string,
    planetId: string,
    planetName: string,
    x: number,
    y: number,
  ): NoiseFunction2D {
    if (!localeMaps.has(localeId)) {
      const planetMap = getPlanetNoiseMap(planetId, planetName);
      const rawSeed = planetMap(x, y); // -1 to 1
      const intSeed = Math.round(((rawSeed + 1) / 2) * (360 * 360 - 1)); // 0–129,599
      localeMaps.set(localeId, createNoise2D(alea(intSeed)));
    }
    return localeMaps.get(localeId)!;
  }

  /** Remove a planet noise map from the registry (call when a planet is removed). */
  export function evictPlanetNoiseMap(planetId: string): void {
    planetMaps.delete(planetId);
  }

  /** Remove a locale noise map from the registry (call when a locale is removed). */
  export function evictLocaleNoiseMap(localeId: string): void {
    localeMaps.delete(localeId);
  }
  ```

### Planet name uniqueness in `planetStore`
- [ ] In `usePlanetStore.addPlanet()`: before adding, check whether any existing planet shares the same name (case-insensitive). If so, log a warning and return without adding. This ensures planet seeds remain unique.
- [ ] Exported `addPlanet` should return `boolean` — `true` if the planet was added, `false` if the name was already taken.

### Wire `dayStartTimestamp` to `planetInitialHour` on planet creation
- [ ] In `usePlanetStore.addPlanet()`: compute `planetInitialHour(derivePlanetSeed(planet.name))` and set `planet.dayStartTimestamp` such that `currentHour` begins at that hour:
  ```ts
  const seed = derivePlanetSeed(planet.name);
  const initialHour = planetInitialHour(seed);
  planet.dayStartTimestamp = Date.now() - (initialHour / 24) * PLANET_DURATION_MS[planet.size];
  ```
- [ ] The same adjustment must be applied to `DEFAULT_PELAGOS` (i.e. its `dayStartTimestamp` at store init should already reflect `planetInitialHour('pelagos')`).

## Acceptance Criteria
- [ ] `derivePlanetSeed('Pelagos 7!')` returns `'pelagos7'`
- [ ] `planetInitialHour('pelagos')` returns a deterministic integer in [0, 23]
- [ ] `localeCoordSeed(-179, -179)` returns `1`; `localeCoordSeed(0, 0)` returns `64,800`; `localeCoordSeed(179, 179)` returns `129,599`
- [ ] `getSeededVal(map, 'foo', 0, 0, 1)` returns the same value on every call with the same map and key
- [ ] `getPlanetNoiseMap('pelagos', 'Pelagos')` returns a stable function; calling it repeatedly returns the same function instance
- [ ] `getLocaleNoiseMap(...)` returns a different map for the same coordinates on different planets
- [ ] Adding two planets with the same name logs a warning and the second is not added
- [ ] `DEFAULT_PELAGOS.dayStartTimestamp` produces a `currentHour` matching `planetInitialHour('pelagos')` at store init
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing features

## Source Reference
- `src/stores/planetStore.ts` (Issue 0l-3)
- `src/stores/localeStore.ts` (Issue 0l-4)
- `src/constants/time.ts` — `PLANET_DURATION_MS`
- Refs: [alea npm](https://www.npmjs.com/package/alea), [simplex-noise v4 API](https://www.npmjs.com/package/simplex-noise)

---

<!-- ============================================================ -->
<!-- ISSUE 11: Wire noise maps at locale/planet creation          -->
<!-- ============================================================ -->

## [M8.2-11] Wire noise map creation into planet and locale lifecycle

## Feature Description
Ensure planet and locale noise maps are created (and cached in the `noiseMaps` registry) at the exact moment a planet or locale is added, and evicted when they are removed. After this issue every system can call `getLocaleNoiseMap()` or `getPlanetNoiseMap()` and receive a ready-to-use noise function without knowing anything about seed derivation.

Depends on: **Issue M8.2-10** (noiseMaps registry and seed utilities must exist).

## Implementation Details

### On planet add
- [ ] In `usePlanetStore.addPlanet()`, after the planet passes the uniqueness check and before it is pushed to state, call `getPlanetNoiseMap(planet.id, planet.name)` to eagerly prime the cache. This also ensures the map exists before any locale on that planet is created.

### On planet remove
- [ ] In `usePlanetStore.removePlanet()`, call `evictPlanetNoiseMap(planetId)` after removing the planet from state.
- [ ] Also call `evictLocaleNoiseMap(localeId)` for every locale that belonged to the removed planet (read the planet's `locales` array before removal).

### On locale add
- [ ] In `useLocaleStore.addLocale(locale)`, after the locale is added to state, call:
  ```ts
  getLocaleNoiseMap(
    locale.id,
    locale.planetId,
    usePlanetStore.getState().planets.find(p => p.id === locale.planetId)!.name,
    locale.coordinates.x,
    locale.coordinates.y,
  );
  ```
  This primes the locale's noise map eagerly.

### On locale remove
- [ ] In `useLocaleStore.removeLocale(localeId)`, call `evictLocaleNoiseMap(localeId)` after removing from state.

### Default seeds at app boot
- [ ] In `planetStore.ts`: after defining `DEFAULT_PELAGOS`, call `getPlanetNoiseMap('pelagos', 'Pelagos')` at module scope (outside the `create` call) to prime the default planet map at import time.
- [ ] In `localeStore.ts`: after defining `DEFAULT_LOCALE`, call `getLocaleNoiseMap(DEFAULT_LOCALE_ID, 'pelagos', 'Pelagos', 0, 0)` at module scope to prime the default locale map at import time. (Coordinates `(0, 0)` → `localeCoordSeed(0, 0)` = 64,800.)

## Technical Notes
- Priming at module scope means the maps are available as soon as the stores are first imported, before any React component mounts. This avoids a null-check race if a system accesses the map during the first render.
- The registry uses `Map` with IDs as string keys — `has()` / `get()` / `set()` / `delete()` are O(1).
- Do not call `createNoise2D` inside Zustand state — it is a side effect that belongs at the call sites above.

## Acceptance Criteria
- [ ] After app boot, `getPlanetNoiseMap('pelagos', 'Pelagos')` returns a `NoiseFunction2D` without creating a new instance
- [ ] After app boot, `getLocaleNoiseMap(DEFAULT_LOCALE_ID, ...)` returns a `NoiseFunction2D` without creating a new instance
- [ ] Calling `removePlanet('pelagos')` causes subsequent `planetMaps.has('pelagos')` to be `false` (evicted)
- [ ] Calling `removeLocale(DEFAULT_LOCALE_ID)` causes subsequent `localeMaps.has(DEFAULT_LOCALE_ID)` to be `false`
- [ ] No Tone nodes, GSAP timelines, or DOM refs are created in any store or utility
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing spawn, idle, or interaction behaviour

## Source Reference
- `src/utils/noiseMaps.ts` (Issue M8.2-10)
- `src/stores/planetStore.ts`, `src/stores/localeStore.ts` (Issue 0l-3, 0l-4)

---

<!-- ============================================================ -->
<!-- ISSUE 12: Migrate game randomness to getSeededVal           -->
<!-- ============================================================ -->

## [M8.2-12] Replace `Math.random()` in spawn, idle, interaction, and melody systems with `getSeededVal`

## Feature Description
Systematically replace all `Math.random()` calls in game-logic systems with `getSeededVal(localeNoiseMap, dataId, offset, min, max)`. After this issue, the same locale on the same planet will produce identical initial robot/actor states across different app instances, as long as the user has not modified anything.

Depends on: **Issue M8.2-11** (locale noise maps must be available at system call sites).

## Implementation Details

Each system function that currently accepts no RNG parameter must be updated to accept (or read) the locale noise map. The pattern is:
```ts
import { getLocaleNoiseMap } from '../utils/noiseMaps';
import { getSeededVal } from '../utils/getSeededVal';
// then inside the function:
const noiseMap = getLocaleNoiseMap(localeId, planetId, planetName, x, y);
```

### `spawnSystem.ts`
- [ ] `generateRobotName(noiseMap, offset)`: replace `Math.floor(Math.random() * ADJECTIVES.length)` with `Math.floor(getSeededVal(noiseMap, 'robot.name.adj', offset, 0, ADJECTIVES.length))`; same pattern for noun. `offset` = spawn count at call time (monotonically incremented per locale).
- [ ] `pickSpawnInterval(noiseMap)`: replace `Math.floor(Math.random() * ...)` with `Math.floor(getSeededVal(noiseMap, 'spawn.interval', spawnCount, SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX + 1))`.
- [ ] `generateSpawnPosition(noiseMap, offset)`: replace the four `Math.random()` position calls for each edge with `getSeededVal(noiseMap, 'spawn.pos.edge', offset, 0, 4)` (floor for edge selection) and `getSeededVal(noiseMap, 'spawn.pos.x', offset, ...)` / `getSeededVal(noiseMap, 'spawn.pos.y', offset, ...)` for coordinate jitter.
- [ ] `generateAudioAttributes(noiseMap, offset)`: replace all `Math.random()` calls (synthType, attack, decay, sustain, release, filterFreq, waveform, phase, detune) with `getSeededVal(noiseMap, 'robot.audio.<param>', offset, min, max)`.
- [ ] All spawn-system functions that currently take no RNG parameter must now accept `(noiseMap: NoiseFunction2D, offset: number)`.

### `idleSystem.ts`
- [ ] `pickIdleTarget(noiseMap, robotIndex)`: replace `Math.random() * WORLD_WIDTH` / `Math.random() * WORLD_HEIGHT` with `getSeededVal(noiseMap, 'idle.target.x', robotIndex, WORLD_MARGIN, WORLD_WIDTH - WORLD_MARGIN)` and the same for y.

### `interactionSystem.ts`
- [ ] `pickInteractionEvents(noiseMap, robotAIndex, robotBIndex)`: replace `Math.floor(Math.random() * robotA.melody.length)` with `Math.floor(getSeededVal(noiseMap, 'interaction.eventA', robotAIndex, 0, robotA.melody.length))` and similarly for `robotB`.

### `melodyGenerator.ts`
- [ ] `melodyGenerator` already supports an injectable `rand: () => number` parameter, defaulting to `Math.random`. Update all call sites that invoke the generator to instead pass `() => getSeededVal(noiseMap, 'melody.rand', callIndex++)` as the `rand` option, where `callIndex` is a local counter that increments per melody generation call. This preserves the existing `rand` injection contract and requires no changes to `melodyGenerator` internals.

### Data-ID stability note
DataId strings must remain stable — they are the "keys" that determine which noise-map position is sampled. If a dataId is renamed in the future, the values for that locale will change (equivalent to a seed migration). Document any dataId renames in `CONTRIBUTION_GUIDE.md`.

## Acceptance Criteria
- [ ] No `Math.random()` calls remain in `spawnSystem.ts`, `idleSystem.ts`, or `interactionSystem.ts`
- [ ] Spawning a locale twice from the same noise map produces robots with identical names, positions, and audio attributes
- [ ] Melodey generation for a given robot produces the same melody indices on repeated calls with the same noise map
- [ ] All existing tests in `spawnSystem.test.ts` pass (update any tests that previously mocked `Math.random` to instead pass a mock `noiseMap`)
- [ ] App compiles with no TypeScript errors
- [ ] No regression in robot spawn, idle pathing, interactions, or melody playback

## Source Reference
- `src/systems/spawnSystem.ts`, `src/systems/idleSystem.ts`, `src/systems/interactionSystem.ts`
- `src/engine/melodyGenerator.ts`
- `src/utils/getSeededVal.ts` (Issue M8.2-10)
- Copilot instructions: "All timing: Tone.Transport / BeatClock (measure-based)."

---

<!-- ============================================================ -->
<!-- ISSUE 13: Seed AudioEngine velocity; fix beatClock ID       -->
<!-- ============================================================ -->

## [M8.2-13] Seed AudioEngine velocity variance; replace `Math.random` schedule ID with `crypto.randomUUID()`

## Feature Description
Two remaining `Math.random()` usages outside game-logic systems:

1. **AudioEngine velocity variance** (`AudioEngine.ts` lines ~799–800): per-note velocity jitter adds musical realism. Replace with `getSeededVal` so velocity variation is structured (repeating over long patterns) rather than purely random, while still sounding natural.
2. **BeatClock schedule ID** (`beatClock.ts` line ~134): uses `Math.random().toString(36).substring(2,11)` to generate a unique string. Replace with `crypto.randomUUID()` which is natively implemented and faster.

Depends on: **Issue M8.2-11** (locale noise maps in registry), **Issue M8.2-12** (getSeededVal utility).

## Implementation Details

### AudioEngine velocity variance
- [ ] Add an optional `localeId?: string` parameter to `AudioEngine.scheduleNote()` (or to the internal helper that applies velocity variance). If `localeId` is provided and a locale noise map exists in the registry, use the noise map for variance; otherwise fall back to no-op (no variance in headless/test contexts).
- [ ] Add two **module-level constants** at the top of `AudioEngine.ts` (computed once at import time — never inside the scheduling callback):
  ```ts
  import { precomputeDataX } from '../utils/getSeededVal';
  // x-axis positions in the noise map for velocity sampling.
  // Pre-computed because alea(string)() does string hashing — doing it
  // per note at 240+ BPM would delay the Tone.js scheduling callback.
  const VELOCITY_ROLL_X     = precomputeDataX('audio.velocityRoll');
  const VELOCITY_VARIANCE_X = precomputeDataX('audio.velocityVariance');
  ```
- [ ] Replace:
  ```ts
  if (Math.random() < VELOCITY_VARIANCE_RATE) {
    const variance = Math.random() * 2 * VELOCITY_VARIANCE_AMOUNT - VELOCITY_VARIANCE_AMOUNT;
  ```
  with:
  ```ts
  const noiseMap = localeId ? tryGetLocaleNoiseMap(localeId) : null;
  // Hot path: noiseMap(constant, offset) is O(1) — equivalent cost to Math.random().
  const roll = noiseMap
    ? (noiseMap(VELOCITY_ROLL_X, noteIndex % 97) + 1) / 2  // maps [-1,1] → [0,1]
    : 0.5;
  if (roll < VELOCITY_VARIANCE_RATE) {
    const variance = noiseMap
      ? noiseMap(VELOCITY_VARIANCE_X, noteIndex % 97) * VELOCITY_VARIANCE_AMOUNT
      : 0;
  ```
  where `noteIndex` is a per-robot counter incremented each time a note is scheduled (mod 97 — a prime — so the noise pattern repeats infrequently). `tryGetLocaleNoiseMap` is a non-throwing variant that returns `null` if the locale isn't registered yet.
- [ ] Add `tryGetLocaleNoiseMap(localeId: string): NoiseFunction2D | null` to `noiseMaps.ts` — returns the map if present, otherwise `null` (no-op for contexts where the map hasn't been created yet, e.g. tests).

### BeatClock schedule ID
- [ ] In `beatClock.ts`, replace:
  ```ts
  const scheduleId = `schedule-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  ```
  with:
  ```ts
  const scheduleId = `schedule-${crypto.randomUUID()}`;
  ```
  `crypto.randomUUID()` is available in all modern browsers and in Node ≥ 14.17. No import is needed — it is on the global `crypto` object.

## Technical Notes
- `noteIndex % 97` (97 is prime) creates a long non-repeating sampling pattern across the noise map. A period of 97 notes is long enough to sound non-repetitive to the human ear.
- `VELOCITY_ROLL_X` and `VELOCITY_VARIANCE_X` **must be module-level constants**, not computed inside the scheduling callback. `precomputeDataX` calls `alea(string)()` which involves string hashing; at 240 BPM with 16 voices that is ~256 hash operations/second on the JS thread — enough to delay the Tone.js lookahead and cause note skips. Pre-computing reduces the hot path to a single `noiseMap(constant, offset)` call, which is O(1) and comparable in cost to `Math.random()`.
- `tryGetLocaleNoiseMap` exists to avoid a hard dependency from AudioEngine to the locale noise map (AudioEngine must not crash if called before a locale is set up, e.g. in tests).
- Guard all noise map lookups in AudioEngine with the `null` fallback to ensure existing `AudioEngine.test.ts` tests continue to pass without any locale setup.

## Acceptance Criteria
- [ ] No `Math.random()` calls remain in `AudioEngine.ts` or `beatClock.ts`
- [ ] `VELOCITY_ROLL_X` and `VELOCITY_VARIANCE_X` are module-level constants — not computed inside the scheduling callback
- [ ] When `localeId` is provided and a noise map exists, velocity variance is deterministic (same note index → same variance)
- [ ] When `localeId` is omitted or map is missing, no velocity variance is applied (clean fallback)
- [ ] `scheduleId` in beatClock is now a UUID string (e.g. `schedule-550e8400-...`)
- [ ] All existing `AudioEngine.test.ts` and `beatClock.test.ts` tests continue to pass
- [ ] App compiles with no TypeScript errors
- [ ] No audible regression in robot melody playback

## Source Reference
- `src/engine/AudioEngine.ts` (~line 799)
- `src/engine/beatClock.ts` (~line 134)
- `src/utils/noiseMaps.ts` — `tryGetLocaleNoiseMap` addition (Issue M8.2-10)
- `src/utils/getSeededVal.ts` (Issue M8.2-10)
- Copilot instructions: "All audio: AudioEngine only (singleton)."
