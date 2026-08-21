# Implementation Plan: LFO Integration (Roadmap Phase 0)

Source spec: [docs/specs/LFO_INTEGRATION.md](../docs/specs/LFO_INTEGRATION.md). Source intent: [docs/intent/lfo-integration.md](../docs/intent/lfo-integration.md).

## Overview

Wire real Tone.js LFO modulation onto every grid-flagged target (13 per-robot, 9 global-chain), extend seed generation to cover the entire global FX chain from the planet noise map, and close a latent multi-planet bug (`currentPlanetId`) that the seeding work depends on. No UI this phase — verification is unit tests plus a temporary dev-only audible check.

## Architecture Decisions

- **`currentPlanetId` lands first, standalone.** It has zero behavioral risk today (one planet exists in practice) but is a hard dependency for `globalAudioSeed.ts`'s trigger point — sequencing it first means the risky/novel work (seeding, LFO signal-chaining) builds on a stable, already-merged foundation rather than a moving one.
- **Types/config before engine before integration.** `lfo.ts` and `lfoConfig.ts` have no runtime dependencies and can be fully unit-specified before `lfoEngine.ts` exists, which itself can be built and unit-tested against mocked `Signal`/`Param` objects before `AudioEngine.ts` exposes real ones. This means `lfoEngine.ts`'s core lifecycle (start/stop/sync, getters/setters, lazy instantiation) is de-risked independently of the trickier `AudioEngine.ts` surgery.
- **`AudioEngine.ts` exposure is two independent tasks, not one.** Per-robot-voice signals and the global FX chain are genuinely separate subsystems in the existing code (composite voices vs. the module-scoped FX chain built in `loadInstruments`) — splitting avoids a single task touching both.
- **Global effect seed ranges are decided now, not during implementation.** The table in Task 5 resolves the spec's Open Question #3 directly by adopting the ranges already documented as comments in `globalAudio.ts` (already sane, already in the codebase) and assigning log/linear scale from `GLOBAL_CHAIN_GRID.md`'s existing UI column — no ad hoc invention during coding.
- **Phase and BINARY-width are documented divergences, not blockers.** Per spec §7.1, Phase has no Tone.js `Signal` (needs a polling fallback) and Interval only applies to `'pulse'` layers. Both are handled inside Task 11's acceptance criteria rather than treated as unknowns to resolve later.

## Dependency Graph

```
Task 1 (currentPlanetId + selectCurrentPlanet)
    │
    ├── Task 2 (consumer refactor, batch A)
    ├── Task 3 (consumer refactor, batch B)
    │
    └── Task 6 (audioStore wiring) ←── Task 5 (globalAudioSeed.ts) ←── Task 4 (seed range table)

Task 7 (types/lfo.ts) ──→ Task 8 (data/lfoConfig.ts)
                                │
                                ├──→ Task 9 (AudioEngine: robot-voice signal exposure)
                                ├──→ Task 10 (AudioEngine: global-chain signal exposure)
                                │
                                └──→ Task 11 (lfoEngine.ts core lifecycle, mocked signals)
                                        │
                                        └──→ Task 12 (lfoEngine connect/disconnect, real signals — needs 9 & 10)

Task 8 ──→ Task 13 (spawnSystem.ts robot-level LfoSettings generation)

Tasks 6, 12, 13 ──→ Task 14 (dev-only audible check hook)
                            │
                            └──→ Task 15 (docs/AUDIO_SYSTEM.md LFO section)
```

## Task List

### Phase 1: Planet identity foundation

- [ ] **Task 1: Add `currentPlanetId` to `planetStore`**

  **Description:** Add a `currentPlanetId: string` field (default `DEFAULT_PELAGOS.id`), a `setCurrentPlanetId(id: string): void` action, and an exported `selectCurrentPlanet(state: PlanetStore): Planet | undefined` selector to `planetStore.ts`, per spec §4/§7.2.

  **Acceptance criteria:**
  - [ ] `PlanetStore` interface has `currentPlanetId` and `setCurrentPlanetId`.
  - [ ] `selectCurrentPlanet` is exported and returns `planets.find(p => p.id === state.currentPlanetId)`.
  - [ ] Default state has `currentPlanetId: 'pelagos'` (matches `DEFAULT_PELAGOS.id`).

  **Verification:**
  - [ ] `npm test -- planetStore` passes, including a new test asserting `selectCurrentPlanet` returns the right planet after `setCurrentPlanetId`.
  - [ ] `npm run build:types` clean.

  **Dependencies:** None.

  **Files:** `src/stores/planetStore.ts`, `src/stores/planetStore.test.ts`

  **Estimated scope:** XS (1 file + its test)

- [ ] **Task 2: Refactor `planets[0]` consumers — batch A**

  **Description:** Replace `usePlanetStore((s) => s.planets[0]?.currentLocaleId ?? '')` and equivalent one-off `planets[0]` reads with `selectCurrentPlanet(s)` in this batch of files. Selector swap only — no other logic changes (spec §3).

  **Acceptance criteria:**
  - [ ] No remaining `planets[0]` reference in any file in this batch.
  - [ ] Each file uses `selectCurrentPlanet` (or the equivalent `.getState()` call for non-hook contexts).
  - [ ] No behavior change — app still resolves the same locale/planet as before (only one planet exists today).

  **Verification:**
  - [ ] `npm run build:types` clean.
  - [ ] `npm run lint` clean.
  - [ ] Manual check: `npm run dev`, confirm the world/robots/transport bar still render and respond identically to before the change.

  **Dependencies:** Task 1.

  **Files:** `src/App.tsx`, `src/components/robot/Robot.tsx`, `src/components/actors/Factory.tsx`, `src/utils/localeHelpers.ts`, `src/engine/harmonySystem.ts` (comment only)

  **Estimated scope:** S (5 files, mechanical one-line swaps)

- [ ] **Task 3: Refactor `planets[0]` consumers — batch B**

  **Description:** Same as Task 2, for the remaining consumer files.

  **Acceptance criteria:**
  - [ ] No remaining `planets[0]` reference in any file in this batch.
  - [ ] Each file uses `selectCurrentPlanet`.
  - [ ] No behavior change.

  **Verification:**
  - [ ] `npm run build:types` clean.
  - [ ] `npm run lint` clean.
  - [ ] Manual check: Robot Options / Robot Oscillators tabs and the robot list still open and reflect the correct robot data.

  **Dependencies:** Task 1.

  **Files:** `src/components/panels/screen/RobotList.tsx`, `src/components/panels/screen/TransportBar.tsx`, `src/components/panels/screen/worldView/OceanScene.tsx`, `src/components/panels/screen/console/RobotOscillatorsTab.tsx`, `src/components/panels/screen/console/RobotOptionsTab.tsx`

  **Estimated scope:** S (5 files, mechanical one-line swaps)

### Checkpoint: Planet identity foundation
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] No `planets[0]` references remain anywhere in `src/` (grep confirms zero matches).
- [ ] App behavior is unchanged when manually exercised.
- [ ] Review with human before proceeding.

---

### Phase 2: Global effect seed generation

- [ ] **Task 4: Per-field seed range table for `GlobalAudioSettings`**

  **Description:** Produce the (min, max, scale) table for all ~29 fields across the 7 global effects, resolving spec §7.3. Adopt the ranges already documented as comments in `globalAudio.ts`; assign `log`/`linear` scale by cross-referencing `GLOBAL_CHAIN_GRID.md`'s UI column (`SLIDER (Logarithmic)` → log, everything else → linear; `EQ`'s Center-Zero stays linear around 0).

  **Table (ship as a comment block or co-located const in `globalAudioSeed.ts`, per Task 5):**

  | Effect | Field | Min | Max | Scale |
  |---|---|---|---|---|
  | Compressor | threshold (dB) | -60 | 0 | linear |
  | Compressor | ratio | 1 | 20 | linear |
  | Compressor | attack (s) | 0.001 | 1 | log |
  | Compressor | release (s) | 0.01 | 1 | log |
  | Compressor | knee (dB) | 0 | 40 | linear |
  | EQ3 | low (dB) | -12 | 12 | linear (center-zero) |
  | EQ3 | mid (dB) | -12 | 12 | linear (center-zero) |
  | EQ3 | high (dB) | -12 | 12 | linear (center-zero) |
  | Filter (LPF) | frequency (Hz) | 20 | 20000 | log |
  | Filter (LPF) | Q | 0.1 | 20 | log |
  | Filter (HPF) | frequency (Hz) | 20 | 20000 | log |
  | Filter (HPF) | Q | 0.1 | 20 | log |
  | Chorus | rate (Hz) | 0.1 | 10 | linear |
  | Chorus | depth | 0 | 1 | linear |
  | Chorus | delayTime (ms) | 2 | 20 | linear |
  | Chorus | feedback | 0 | 1 | linear |
  | Chorus | wet | 0 | 1 | linear |
  | Delay | delayTime (s) | 0 | 1 | linear |
  | Delay | feedback | 0 | 0.95 | linear |
  | Delay | wet | 0 | 1 | linear |
  | Reverb | decay (s) | 0.1 | 10 | log |
  | Reverb | preDelay (s) | 0 | 0.5 | linear |
  | Reverb | dampening (Hz) | 100 | 8000 | log |
  | Reverb | wet | 0 | 1 | linear |

  **Acceptance criteria:**
  - [ ] Every field in `GlobalAudioSettings` (excluding `enabled`, `globalBypass`, `type`) has an entry.
  - [ ] Each entry's min/max matches the existing doc comment in `src/types/globalAudio.ts` exactly (no silent range changes).
  - [ ] Each entry's scale matches `GLOBAL_CHAIN_GRID.md`'s UI column.

  **Verification:**
  - [ ] Table reviewed against both source files side-by-side (manual check, no test needed — this task produces data, not behavior).

  **Dependencies:** None (pure research/documentation task; can run any time before Task 5).

  **Files:** none yet (table is consumed by Task 5); may be committed as a standalone comment in that file.

  **Estimated scope:** XS (no code)

- [ ] **Task 5: `src/utils/globalAudioSeed.ts` — `generateGlobalAudioSettings`**

  **Description:** Implement `generateGlobalAudioSettings(planetId: string, planetName: string): GlobalAudioSettings`, sampling `getPlanetNoiseMap(planetId, planetName)` directly via `getSeededVal` for every field in Task 4's table (log-scaled fields sample in log space then exponentiate back into range). `enabled` is not seeded — set per spec §3 (see Task 6 for the "force true" override point). `dataId` keys are dot-namespaced (e.g. `'globalAudio.eq3.low'`), per `PROCEDURAL_GENERATION.md` convention.

  **Acceptance criteria:**
  - [ ] `generateGlobalAudioSettings(planetId, planetName)` returns a fully-populated `GlobalAudioSettings`.
  - [ ] Same `(planetId, planetName)` input always produces identical output (determinism).
  - [ ] Different planet names produce different values for at least one field (non-degenerate).
  - [ ] Log-scaled fields (frequency, attack, release, decay, dampening) produce a log-distributed spread across repeated `offset` samples, not a linear one.
  - [ ] All values fall within Task 4's documented min/max per field.

  **Verification:**
  - [ ] `npm test -- globalAudioSeed` passes, covering determinism, range-bounding, and log-vs-linear distribution shape.
  - [ ] `npm run build:types` clean.

  **Dependencies:** Task 4.

  **Files:** `src/utils/globalAudioSeed.ts`, `src/utils/globalAudioSeed.test.ts`

  **Estimated scope:** M (1 new file + test, ~29-field mapping)

- [ ] **Task 6: Wire seeded global audio into `audioStore` on planet change**

  **Description:** Call `generateGlobalAudioSettings` wherever `setCurrentPlanetId` fires (or equivalently, whenever the active planet resolves), and replace `audioStore`'s `globalAudio` with the result — with every effect's `enabled` forced `true` per spec §3/§6. Replaces `DEFAULT_GLOBAL_AUDIO_SETTINGS` as the live source for the current planet.

  **Acceptance criteria:**
  - [ ] `audioStore` gains an action (e.g. `regenerateGlobalAudioFromSeed(planetId, planetName)`) that calls `generateGlobalAudioSettings` and forces every effect's `enabled: true` before writing to `globalAudio`.
  - [ ] The action is invoked at the same point `setCurrentPlanetId` is called (app init and any future planet switch).
  - [ ] `AudioEngine`'s existing `setGlobal*` setters are called with the new values so the live Tone FX chain actually updates (not just the Zustand snapshot).

  **Verification:**
  - [ ] `npm test -- audioStore` passes, including a test that `regenerateGlobalAudioFromSeed` produces `enabled: true` on all 7 effects regardless of what the generator returns.
  - [ ] `npm run build:types`, `npm run lint` clean.
  - [ ] Manual/audible check (can piggyback on Task 14): starting the app with two different planet names produces audibly different global FX character.

  **Dependencies:** Task 1, Task 5.

  **Files:** `src/stores/audioStore.ts`, `src/stores/audioStore.test.ts`

  **Estimated scope:** S (1 file + test)

### Checkpoint: Global effect seed generation
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Global FX settings visibly/audibly vary by planet seed; all 7 effects are on.
- [ ] Review with human before proceeding.

---

### Phase 3: LFO types, config, and engine core

- [ ] **Task 7: `src/types/lfo.ts`**

  **Description:** Define `LfoShape` (`'triangle' | 'sine' | 'square' | 'sawtooth'`), `RobotLfoTargetId` (13 values: `'volume'`, and `'layer{0,1,2}.{gain,detune,phase,pulseWidth}'`), `GlobalLfoTargetId` (9 values: `'eq3.low'`, `'eq3.mid'`, `'eq3.high'`, `'lpf.frequency'`, `'lpf.Q'`, `'hpf.frequency'`, `'hpf.Q'`, `'chorus.delayTime'`, `'delay.delayTime'`), and `LfoSettings { shape: LfoShape; rate: number; depth: number }` (rate 0.1–10 Hz, depth 0–100%, per `ROBOT_DATA_GRID.md`'s LFO MODULE rows).

  **Acceptance criteria:**
  - [ ] All three target-id union types match the grids exactly (13 + 9 members).
  - [ ] `LfoSettings` fields and bounds are documented in comments citing `ROBOT_DATA_GRID.md`.
  - [ ] No `any` types.

  **Verification:**
  - [ ] `npm run build:types` clean.

  **Dependencies:** None.

  **Files:** `src/types/lfo.ts`

  **Estimated scope:** XS (1 file, types only)

- [ ] **Task 8: `src/data/lfoConfig.ts`**

  **Description:** Default `LfoSettings` per target id (both robot and global), following the `globalAudio.ts` `DEFAULT_*` const pattern. Also extend `src/types/layeredAudio.ts` if `OscillatorLayer`/voice-descriptor types need a modulation-input field to type-check against `lfoEngine.ts`'s connect signatures (spec §2).

  **Acceptance criteria:**
  - [ ] `DEFAULT_LFO_SETTINGS: Record<RobotLfoTargetId | GlobalLfoTargetId, LfoSettings>` covers all 22 targets.
  - [ ] No magic numbers — every default cites its source range from Task 7.
  - [ ] `layeredAudio.ts` changes (if any) are additive/optional fields — no existing `OscillatorLayer` consumer breaks.

  **Verification:**
  - [ ] `npm run build:types` clean.
  - [ ] `npm test` — existing `layeredAudio`-dependent tests (if any) still pass unmodified.

  **Dependencies:** Task 7.

  **Files:** `src/data/lfoConfig.ts`, `src/types/layeredAudio.ts`

  **Estimated scope:** S (2 files)

- [ ] **Task 9: `AudioEngine.ts` — expose robot-voice modulation targets**

  **Description:** Add `getRobotModulationTarget(robotId: string, target: RobotLfoTargetId): Tone.Signal<any> | Tone.Param<any> | null` to `AudioEngine`, returning the live `Signal`/`Param` for Gain and Detune, and `null` for Phase/pulseWidth-on-square (handled at the `lfoEngine` layer per Task 12, not here — this function only returns real connectable signals, never a polling proxy).

  **Acceptance criteria:**
  - [ ] Returns the composite voice's per-layer `Tone.Gain.gain` for `'layerN.gain'` targets.
  - [ ] Returns the synth's `oscillator.detune` for `'layerN.detune'` targets.
  - [ ] Returns `null` (not throw) for `'layerN.phase'` and for `'layerN.pulseWidth'` when that layer's type isn't `'pulse'`.
  - [ ] Returns the `PulseOscillator.width` signal for `'layerN.pulseWidth'` when the layer type is `'pulse'`.
  - [ ] Returns `null` for an unreserved/missing `robotId` — never throws.

  **Verification:**
  - [ ] `npm test -- AudioEngine` passes, including new cases for each of the above.
  - [ ] `npm run build:types` clean.

  **Dependencies:** Task 7.

  **Files:** `src/engine/AudioEngine.ts`, `src/engine/AudioEngine.test.ts`

  **Estimated scope:** M (1 file, several new branches; well-isolated by existing composite-voice structure)

- [ ] **Task 10: `AudioEngine.ts` — expose global-chain modulation targets**

  **Description:** Add `getGlobalModulationTarget(target: GlobalLfoTargetId): Tone.Signal<any> | Tone.Param<any> | null` to `AudioEngine`, returning the live nodes already constructed in `loadInstruments` for the 9 global-chain `Has LFO` fields.

  **Acceptance criteria:**
  - [ ] Returns the correct live signal for all 9 `GlobalLfoTargetId` values (EQ3 low/mid/high, LPF freq/Q, HPF freq/Q, Chorus delayTime, Delay delayTime).
  - [ ] Returns `null` (not throw) before `AudioEngine.start()` has constructed the FX chain.

  **Verification:**
  - [ ] `npm test -- AudioEngine` passes, including a case per target and the pre-`start()` `null` case.
  - [ ] `npm run build:types` clean.

  **Dependencies:** Task 7.

  **Files:** `src/engine/AudioEngine.ts`, `src/engine/AudioEngine.test.ts`

  **Estimated scope:** S (same file as Task 9 — sequence after it to avoid merge overlap, but independent in principle)

### Checkpoint: Engine foundations
- [ ] `npm run build:types`, `npm run lint`, `npm test` clean.
- [ ] `AudioEngine`'s two new getters are covered by tests for every target id.
- [ ] Review with human before proceeding.

---

### Phase 4: LFO engine lifecycle and connection

- [ ] **Task 11: `src/engine/lfoEngine.ts` — core lifecycle**

  **Description:** Implement `getLfoSettings`, `setLfoRate`, `setLfoDepth`, `setLfoShape`, and transport-gated `start`/`stop` for a per-target `Tone.LFO`, with lazy instantiation (no node created until first use). Unit-test against a mocked `Signal`-like object — this task does not depend on `AudioEngine`'s real exposure.

  **Acceptance criteria:**
  - [ ] No `Tone.LFO` is constructed until a setter or connect is first called for a given target.
  - [ ] `setLfoRate`/`setLfoDepth`/`setLfoShape` update both the live node (if instantiated) and the persisted `LfoSettings`.
  - [ ] Rate is a plain Hz value — no BeatClock/Transport import for the rate itself.
  - [ ] `start`/`stop` are gated by the transport per spec §3 (confirmed intent's "transport gates start/stop only").

  **Verification:**
  - [ ] `npm test -- lfoEngine` passes.
  - [ ] `npm run build:types` clean.

  **Dependencies:** Task 8.

  **Files:** `src/engine/lfoEngine.ts`, `src/engine/lfoEngine.test.ts`

  **Estimated scope:** M (1 new file, core lifecycle logic)

- [ ] **Task 12: `connectLfoTarget`/`disconnectLfoTarget` — real signal wiring**

  **Description:** Implement `connectLfoTarget`/`disconnectLfoTarget` against `AudioEngine.getRobotModulationTarget`/`getGlobalModulationTarget`. Handle the two documented divergences from spec §7.1 explicitly: Phase uses a manual polling fallback (re-`.set()` each LFO-internal tick, not `.connect()`); pulseWidth on a non-`'pulse'` layer is a documented no-op, not a throw.

  **Acceptance criteria:**
  - [ ] `connectLfoTarget` on a Gain/Detune/global-chain/pulse-width-on-pulse-layer target calls the real `.connect()`.
  - [ ] `connectLfoTarget('layerN.phase', …)` uses the polling fallback and is covered by a test asserting the fallback actually mutates phase over time (e.g. via fake timers/mocked LFO ticks).
  - [ ] `connectLfoTarget` on pulseWidth for a non-`'pulse'` layer no-ops and returns `false` (not throw).
  - [ ] `disconnectLfoTarget` cleanly reverses `connectLfoTarget` for every case above, including canceling the phase-polling fallback.

  **Verification:**
  - [ ] `npm test -- lfoEngine` passes, including all four branches above.
  - [ ] `npm run build:types`, `npm run lint` clean.

  **Dependencies:** Task 9, Task 10, Task 11.

  **Files:** `src/engine/lfoEngine.ts`, `src/engine/lfoEngine.test.ts`

  **Estimated scope:** M (extends Task 11's file; the phase-polling fallback is the highest-risk logic in this whole plan)

- [ ] **Task 13: `spawnSystem.ts` — robot-level `LfoSettings` generation**

  **Description:** Generate `LfoSettings` for each of a robot's 13 targets at spawn time, via `getSeededVal` against the locale noise map, matching the existing pattern used for the rest of `AudioAttributes`.

  **Acceptance criteria:**
  - [ ] Every spawned robot has `LfoSettings` for all 13 `RobotLfoTargetId` values.
  - [ ] Same locale seed + spawn index → identical `LfoSettings` every time (determinism, matching existing `spawnSystem.test.ts` assertions for other attributes).
  - [ ] `dataId` keys follow the `'robot.lfo.<target>.<field>'` dot-namespaced convention.

  **Verification:**
  - [ ] `npm test -- spawnSystem` passes, including new determinism assertions for generated `LfoSettings`.
  - [ ] `npm run build:types` clean.

  **Dependencies:** Task 8.

  **Files:** `src/systems/spawnSystem.ts`, `src/systems/spawnSystem.test.ts`

  **Estimated scope:** S (extends an existing, well-understood generation path)

### Checkpoint: LFO engine complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] Every target id (13 robot + 9 global) has a passing connect/disconnect test.
- [ ] Review with human before proceeding.

---

### Phase 5: Audible verification and docs

- [ ] **Task 14: Temporary dev-only audible check hook**

  **Description:** Add a `DEV_TUNING`-gated hook (e.g. exposed on `window` only in dev builds, per the existing `Debug Tools` pattern in `AUDIO_SYSTEM.md`) that connects one robot-layer target and one global-chain target to an active LFO, so the seeded/connected chain can be confirmed by ear. Explicitly not real UI (spec §3).

  **Acceptance criteria:**
  - [ ] Hook only exists when `DEV_TUNING` is true (stripped from production builds, matching existing `DEV_TUNING`-gated code elsewhere).
  - [ ] Connecting an LFO to a robot's Detune (or Gain) and a global EQ band is audibly confirmable in `npm run dev`.
  - [ ] No component or store references this hook — it's a standalone dev utility, not wired into any UI.

  **Verification:**
  - [ ] Manual/audible check: run `npm run dev`, invoke the hook from the browser console, confirm audible modulation on both a robot voice and the global chain.
  - [ ] `npm run build` — confirm the hook does not appear in the production bundle (or is a documented no-op there).

  **Dependencies:** Task 6, Task 12, Task 13.

  **Files:** `src/engine/lfoEngine.ts` (or a small new `src/engine/lfoDebug.ts` if it doesn't belong inside the engine's public surface — decide during implementation, keep it out of `AudioEngine.ts`'s exported surface either way)

  **Estimated scope:** S

- [ ] **Task 15: `docs/AUDIO_SYSTEM.md` — "LFO Modulation" section**

  **Description:** Document `lfoEngine.ts`'s final API (mirroring the existing "AudioEngine API" section's style), the 22 target ids, the Phase-polling and BINARY-pulseWidth divergences from spec §7.1, and how global/robot LFO settings are seeded.

  **Acceptance criteria:**
  - [ ] New "LFO Modulation" section added, cross-linked from the existing "Related references" list at the top of the doc.
  - [ ] Documents the Phase/pulseWidth divergences explicitly (not glossed over).
  - [ ] Documents the global-chain seed-from-planet-map behavior added in Phase 2.

  **Verification:**
  - [ ] Manual review — doc accurately reflects the shipped API (spot-check every documented function signature against the actual source).

  **Dependencies:** Task 14.

  **Files:** `docs/AUDIO_SYSTEM.md`

  **Estimated scope:** XS (docs only)

### Checkpoint: Complete
- [ ] `npm run build:types`, `npm run lint`, `npm test`, `npm run build` all clean.
- [ ] All acceptance criteria across all 15 tasks are met.
- [ ] `docs/AUDIO_SYSTEM.md` reflects the shipped API.
- [ ] Ready for human review / PR.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Phase-modulation polling fallback (Task 12) is genuinely novel — no existing pattern in the codebase to copy | Medium — could blow past a single session, could introduce timing bugs | Isolated to one task with explicit acceptance criteria; built after the simpler connect paths (Gain/Detune/global) are proven, so the pattern is validated before the hard case |
| `AudioEngine.ts` is already a large, intricate file (1000+ lines) — Tasks 9/10 add more surface | Medium — merge/readability risk | Split into two tasks by subsystem (robot voices vs. global chain) rather than one large task; both are additive getters, not restructuring |
| Up to 156 possible concurrent `Tone.LFO` nodes if every target were bound at once | Low this phase (no UI to trigger mass binding) but real once Phase 9 (Robot Options UI) lands | Lazy instantiation (Task 11) means the ceiling is never approached without deliberate testing; revisit sizing when UI work begins |
| Seed range table (Task 4) silently drifts from Tone.js's actual internal clamping if Tone.js version changes | Low | Table is checked into the plan/code as an explicit, reviewable artifact, not buried in logic — a version bump review can diff it directly |

## Open Questions

None remaining from the spec — all four items in spec §7 are resolved into concrete tasks above (Task 12 for §7.1, Task 1–3 for §7.2, Task 4 for §7.3, and the Risks table above for §7.4's instance ceiling, deferred by design to when UI lands).
