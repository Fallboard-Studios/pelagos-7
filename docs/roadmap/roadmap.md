# Roadmap

## 0. LFO integration

### Create

- Tone.js LFO instance setup, lifecycle management, and signal routing node structures
- Typed getters and setters for LFO attributes (Shape, Rate/Frequency, Depth, Target Parameter Binding)
- Start/Stop/Sync lifecycle hooks for LFO nodes tied to the global audio transport

### Restructure

- Update synthesis layer interfaces to support dynamic parameter modulation inputs

### About

This phase constructs the underlying Tone.js LFO signal modulation core and parameter binding interface before any UI components or synthesis drawers are built. We are creating src/types/lfo.ts to define types for LFO modulation targets, oscillator shapes (Triangle, Sine, Square, Sawtooth), and frequency rate bounds. In src/engine/lfoEngine.ts, alongside the existing AudioEngine and beatClock modules, we are implementing Tone.js LFO node setup alongside pure getter and setter utilities (getLfoSettings, setLfoRate, setLfoDepth, setLfoShape, connectLfoTarget, and disconnectLfoTarget) to allow dynamic parameter modulation across synthesis layers. Finally, we are defining configuration defaults in src/data/lfoConfig.ts and adding unit tests in lfoEngine.test.ts to verify signal scaling and getters/setters in isolation before hooking them into React state or UI drawers in subsequent phases.

### Docs

- docs/AUDIO_SYSTEM.md has no LFO content today — add an "LFO Modulation" section documenting lfoEngine.ts's API alongside the existing AudioEngine API section.

## 1. Architecture & Components

### Create

- Data Files to hold content.
- Stepper Component
- Stepper with active toggle Component
- Slider - linear Component
- Slider - log Component
- Slider - centered zero Component
- LFO Component
- Radio Button Component
- Accordion Container
- Text Input Component
- Coords input Component
- Button Component
- Toggle Component
- Dual Label Component

### About

Combining Architecture and Components into a single initial step establishes a unified, type-safe Design System and Data Engine as our application's foundation. We are decoupling content from UI by authoring pure TypeScript configuration files in src/data/ (typed against core schemas in src/types/controls.ts), while constructing stateless primitive components in src/components/ui/ that accept these schemas as props. This means components like SliderLinear, StepperWithToggle, or DualLabel have zero hardcoded labels or domain logic, allowing us to build and test our complete UI atomic inventory up front before mapping it to domain drawers, session storage, or Web Audio logic. The "LFO Component" here is a UI control primitive (a labeled rate/depth/shape input) distinct from the Tone.js LFO signal engine built in Phase 0 — this component is what a drawer uses to display and edit the engine's state, not a reimplementation of it.

### Docs

- No existing doc covers this primitive/ControlSchema layer — add a new docs/COMPONENT_LIBRARY.md documenting the primitive inventory and the ControlSchema contract, and add it to CLAUDE.md's reference doc list.

### Forward Note

- Console Theming (Phase 11) will later drive CSS custom properties by *scale* — large/structural tokens (backgrounds, casing) from the planet seed, small/accent tokens (buttons, text, borders) from the locale seed. Name and group new design tokens with that split in mind now, so Phase 11 doesn't have to rename or regroup anything this phase already established.

## 2. Layout

### Removal

- Remove most of transport (leave mute) and related code
- Remove existing hub nav
- Remove robot list from main layout
- Desktop is now just a large version of mobile; the tablet will not re-orient on desktop, remove desktop rules for layout, basically.

### Restructure

- Make sure transport/meta data component is sticky.
- Wire locale meta data up to data files, add it to UI
- Make sure time works correctly (based on planet size only)

### About

This phase strips out legacy layout logic to establish a unified, mobile-first application shell that renders identically across mobile, tablet, and desktop viewports without multi-column responsive re-orientation. We are removing redundant desktop layout rules, the main-screen robot list, legacy hub navigation, and non-essential transport controls—retaining only a global mute action. In their place, we are implementing a sticky metadata transport bar fueled by typed data files in src/data/localeMetadataConfig.ts, alongside a simplified time calculation engine in src/utils/planetTime.ts that derives time cycles strictly from planet size parameters, ensuring the interface layout remains locked, focused, and predictable across all devices.

### Docs

- docs/UI_SHELL.md's Overview lists `TransportBar`, `WorldView`, `RobotList`, and `Console` as what `ScreenViewport` renders — update once `RobotList` and most of `TransportBar` are gone.

## 3. Hub

### Removal

- Remove old hub nav
- Remove the Session and Composition console tabs and their placeholder stubs — Session becomes fully automated with no user-facing tile (its job is absorbed by the background persistence engine in Session Storage, Phase 12), and Composition is deferred to a future version

### Restructure

- Rewrite Hub Nav buttons, wire them up to content data files

### About

This phase replaces the legacy Hub navigation with a streamlined, data-driven navigation system that connects directly to our content files. We are stripping out all old hub navigation logic — including the Session and Composition stub tabs, which are dropped rather than rebuilt: Session's job is absorbed by Session Storage's background persistence engine (Phase 12), so there's nothing left for a tile to do, and Composition is deferred to a future version — and building a dedicated HubNav component container that maps over src/data/hubNavConfig.ts. Each button will be rendered using our schema-driven HubNavButton primitive, deriving its primary lore title, secondary human subtitle, and target screen directly from the strongly typed data file without any hardcoded labels or inline routing logic. The remaining hub tiles are Audio Rig (Phase 4), Sector Settings (Phase 5), and Robot Selection (Phase 8).

### Docs

- docs/UI_SHELL.md's "Planned Replacement: Hub Tiles" section becomes real for its tab→tile, surviving-tiles, and Session/Composition-dropped points — fold that content into "Console Navigation" (renaming the section) and delete the "not yet implemented" framing for those points specifically. The `robotOptions`/`robotEditor` points stay planned until Phases 7 and 9 land.

## 4. Audio Rig

### Create

- Update data files with all of those inputs
- Create layout

### About

This phase populates our data engine with the complete global audio processing inventory and builds the corresponding Audio Rig drawer interface — and, unlike earlier drafts of this phase assumed, wires it live rather than leaving it as a presentational scaffold. We are populating src/data/audioRigConfig.ts with strongly typed ControlSchema definitions for all seven global effect blocks, in signal-chain order (3-Band EQ, Low-Pass Filter, High-Pass Filter, Delay, Reverb, Compressor, and Limiter — Chorus was cut entirely partway through this phase, judged the wrong effect for this music, and Limiter added in its place), specifying precise logarithmic bounds, center-zero offsets, units, default values, LFO modulation flags, and lore/human label pairings. Using these schemas, we are constructing the AudioRigDrawer layout, utilizing Accordion containers for each effect module and mapping over parameter schemas with our UI primitives. Because the Web Audio side of this (AudioEngine.setGlobal*/setEffectBypass/setGlobalBypass, and lfoEngine for modulation) already exists from Phase 0, every control in the drawer is wired straight through to it — dragging a slider audibly changes the effect, and per-effect and rig-wide bypass toggles genuinely silence and visually disable their scope, rather than leaving that binding for a later phase. A Decay radio button, living inside the Compressor's own accordion under its other params, swaps the Compressor's position in the chain between "Natural Decay" (default — after Delay and Reverb, so their tails ring out uncompressed) and "Controlled Decay" (before both, tightening them). The seven parameters the grid flags LFO-modulatable each get a nested LFO control wired to lfoEngine (Limiter, Compressor, Reverb, and Delay's own delayTime never get one — no LFO target exists for any of them), and global LFO settings (shape/rate/depth, plus whether each one starts already active) are now seeded per planet the same way the rest of the global effect chain is — a planet can load with real modulation already audible before anything is touched. Each effect's own `enabled` state is genuinely seeded too, not forced on: every effect loads active except Delay, which has roughly a 1-in-4 chance of loading already bypassed.

## 5. Sector Settings

### Create

- Update data files with inputs
- Create Layout

### About

This phase defines the data configurations and layout for the Sector Settings view, allowing users to reseed the global planet environment and jump to specific plot coordinates. We are populating src/data/sectorSettingsConfig.ts with control schemas and preset lists for two main operational panels: Planet Calibration (seed entry, retransmit trigger, and promoted or random seed presets) and Plot Tuning (X and Y coordinate entry, retransmit trigger, and promoted or random locale presets). Using these schemas, we are building SectorSettingsDrawer.tsx to render a status readout header displaying the active plot and planet seed, followed by the calibration and tuning sections using our established UI primitives (TextInput, CoordsInput, Button, and DualLabel). All controls will draw their lore and human labels from the data config, creating a clean, schema-driven sector control panel ready for coordinate seeding logic in later phases.

### Known Issue

- Simplex noise collapses to a **low-entropy result at "clean" aligned coordinates** — not just `(0, 0)`, a whole class of coordinates. Verified directly against `simplex-noise`/`alea` with 8 different seeds: `(0, 0)` gave exactly `0` for all 8 (a true dead zone, every seed identical); `(0.5, 0.5)` gave only 3 distinct values across 8 seeds; `(1, 1)` gave 5; even `(3.7, -8.2)` only gave 6. A higher-precision, non-aligned point like `(12.3456, 67.891)` gave 8/8 distinct values. `localeStore.ts`'s `DEFAULT_LOCALE.coordinates` used to sit exactly on the worst case (`0, 0`) — now fixed to a verified-safe point — so the default locale's noise map was invariant to the planet seed, masked until now because the default planet name was itself a fixed literal ("Pelagos"), not because the locale ever actually varied. **This directly threatens Plot Tuning's X/Y coordinate entry (this phase's core feature)**: users naturally gravitate toward round numbers (`0`, `5`, `10.5`), which is exactly the coordinate class most likely to collide across different seeds/plots. Guard at input (reject/nudge round-number coordinates) or fix it structurally (hash/offset the sampling point so no user-typeable coordinate lands on a low-entropy region) — resolve as part of this phase's spec, not discovered again live with real users.

  **Resolved** — see [docs/specs/LOCALE_SEED_DECOUPLING.md](../specs/LOCALE_SEED_DECOUPLING.md); locale noise generation no longer samples through the planet's noise map, eliminating both the planet-coupling and the dead-zone collapse described above.

## 6. Robot Melody & Seed Engine

### Restructure

- ~~Update robot spawning rules so attributes come from planet agnostic lat/long coords seed~~ — **done, and generalized to all locale-derived content** (not just robot spawn attributes) via [docs/specs/LOCALE_SEED_DECOUPLING.md](../specs/LOCALE_SEED_DECOUPLING.md), pulled forward ahead of this phase.
- ~~Robot IDs become deterministic (derived from the seed + spawn index) instead of the current `crypto.randomUUID()`~~
- ~~Update all references to measure length to 16 16th notes~~
- ~~Density: Becomes a percentage. It fills X% of either the entire measure or a motif with that many notes~~
- ~~Motif Length: Number from 1 to 8 (in 16th notes) with an on/off toggle~~
- ~~Note Variance: Has an active toggle. When off, random notes with no weighting. When on, selects 1 to 8 notes from pitch array, weighted~~
- ~~Update localeStore.ts's normalization clamps for `rhythmicDensity`, `rhythmicMotifLength`, and `noteVariance`~~

**Done** — see [docs/specs/ROBOT_MELODY_SEED_ENGINE.md](../specs/ROBOT_MELODY_SEED_ENGINE.md). Scope ended up wider than this file list: `regenerateMelody.ts` and `RobotAudioTab.tsx` were also updated in the same phase, since both call the same `generateMelodyForRobot` API and would have gone stale otherwise.

### About

This phase refactors our core generation algorithms to establish a clean, pure TypeScript math engine, standardizing all measure structures to a fixed 16 sixteenth-note grid and updating robot spawning rules to derive attributes deterministically from planet-agnostic lat/long coordinate seeds, in place of the current planet+locale-coupled noise map derivation (see PROCEDURAL_GENERATION.md). In melodyGenerator.ts, we are implementing the new two-branch rhythm engine where Density acts as a 0 to 100% fill rate, interacting with an opt-in Motif Length (1 to 8 sixteenth notes — down from the current 1–16 range) that either scatters notes freely across the measure when toggled off or tiles and naturally truncates a repeating cell when toggled on. Finally, we are updating Note Variance to handle both unweighted random pitch selection when disabled and a weighted slice of 1 to 8 notes from the pitch array when enabled. Because localeStore.ts normalizes these same fields against the old ranges whenever locale state is written, we are updating its clamp logic in lockstep with the generator so a store write can't silently clamp a valid new-range value into the old one.

### Docs

- docs/MELODY_SYSTEM.md fully updated for: Density as a 0–100% fill rate (was a 4–12 onset count), Motif Length as a 1–8 on/off-toggled value (was a plain 1–16 slider), Note Variance as an on/off toggle, and the `RHYTHMIC_MOTIF_LENGTH_MAX` constant change (16 → 8).
- docs/PROCEDURAL_GENERATION.md — resolve its existing "Planned change" callout on the Locale map bullet now that lat/long seeding is planet-agnostic; update the two-tier planet+locale model description to match.

## 7. Robot Systems Engine

### Removal

- ~~Remove the current Robot Options console tab (robot count min/max slider, auto-spawn toggle) — the new Battery/Docking/Job lifecycle creates every robot once, rather than dynamically spawning and despawning them~~ — **done**. The UI tab itself was already dropped outright back in Phase 3; this phase retired the underlying machinery that outlived it (`startSpawnScheduler`/`stopSpawnScheduler`, the min/max "bounce" logic in `spawnRobot`, and `locale.settings`' `maxRobots`/`minRobots`/`autoSpawn`/`spawnFrequency` fields), plus `RobotsTab`'s "+ New Robot" button — none of it had a purpose once the roster is fixed and created once.
- ~~Remove the `persists` field from Robot and its "Persist" toggle in the robot meta editor — with robots never leaving or arriving under the new lifecycle, there is nothing for a robot to "survive" across a power-off cycle~~ — **done**.

### Create

- ~~Battery System (drain and recharge state)~~ — **done**.
- ~~Dock/Docking System (docked, docking, departing, active states)~~ — **done**.
- ~~Job System (assignment and status tracking)~~ — **done**.

**Done** — see [docs/specs/ROBOT_SYSTEMS_ENGINE.md](../specs/ROBOT_SYSTEMS_ENGINE.md). Scope ended
up wider than this file list, discovered during implementation rather than planning:
`powerController.ts` and `OceanScene.tsx` both called the retired scheduler/removal functions
directly and needed the same `stopRobotLifecycle()` swap `worldTransition.ts` got (required, not
cosmetic — `AudioEngine.killAll()`'s `resetBeatClock()` silently drops the tick's measure
subscription, so the swap is what makes a power cycle keep the lifecycle running, not just a
locale swap).

### About

This phase establishes the pure TypeScript domain models and state machines for autonomous robot behavior, and retires the spawn/despawn and persistence model they replace. We are extending src/types/Robot.ts to define interfaces for the Battery System (tracking drain rates, warning thresholds, and recharge cycles), the Docking System (an explicit state machine, following the existing RobotState const-object pattern, transitioning between docked, docking, departing, and active states), and the Job System (handling task assignments and status tracking). Because robots are now created once rather than dynamically spawned and removed, we are removing the existing RobotOptionsTab (robot count min/max slider and auto-spawn toggle) along with the `persists` field on Robot and its "Persist" toggle in the robot meta editor — neither has a purpose once nothing spawns or despawns after locale load. We will construct pure state utility modules in src/systems/robotSystems.ts to manage these state updates, timer loops, and status transitions deterministically, laying down the core mechanics ready to be hooked into session storage, UI readouts, and audio triggers in subsequent phases.

### Docs

- ~~docs/UI_SHELL.md's "Planned Replacement" point on `robotOptions` becomes real — fold it in and drop the "not yet implemented" framing for that point.~~ — **done**.
- ~~No existing doc covers robot lifecycle (Battery/Docking/Job) — add a new docs/ROBOT_LIFECYCLE.md, in the style of docs/MELODY_SYSTEM.md, documenting the state machines and src/systems/robotSystems.ts's API. Add it to CLAUDE.md's reference doc list.~~ — **done**, see [docs/ROBOT_LIFECYCLE.md](../ROBOT_LIFECYCLE.md).

## 8. Robot Selection

### Restructure

- ~~SVG needs to ignore time/daylight, so each robot's avatar thumbnail stays visually consistent regardless of the active locale's time of day~~ — **done**, via `RobotBody`'s new `ignoreDaylight` prop.

### Create

- ~~Robot Selection hub tile: a list of every robot in the active locale, each entry showing its avatar SVG, job title, Audio Status (mute, solo, highlighted), and Battery Status~~ — **done**.
- ~~Selecting a robot navigates into the Robot Options screen (Phase 9), scoped to that robot, with a back button returning to this list~~ — **done, with a scope adjustment**: Robot Options (Phase 9) doesn't exist yet, so selection routes to `RobotEditorTab`, the same place today's list already routed to. Phase 9 will retarget it without this phase needing to change.

**Done** — see [docs/specs/ROBOT_SELECTION.md](../specs/ROBOT_SELECTION.md). Scope ended up wider
than this file list: the world-view click-through (clicking a robot in the ocean also opens this
tile, gated to the main hub grid state) required a `Console.css` pointer-events fix and a
`Robot.tsx` change, and unifying `AudioStatusBadge`'s new colors with `AccordionContainer`'s and
`PowerRockerSwitch`'s existing hardcoded status-light hex was folded in as one `statusLightColors.ts`
source rather than adding a fourth duplicated palette.

### About

This phase builds Robot Selection as one of the main hub tiles (see Phase 3): selecting it from the hub grid replaces the hub nav area with a list of every robot in the active locale, each rendered as a card. We are modifying the SVG avatar rendering logic to ignore global daylight/time calculations, ensuring each card's thumbnail reads consistently regardless of planet conditions. We are building RobotSelectionCard and AudioStatusBadge components in src/components/selection/ to display assigned job titles, dynamic battery status indicators, and diagnostic audio controls (mute, solo, and highlighted states) powered by typed parameter schemas in src/data/robotSelectionConfig.ts. All status badges derive their lore and human labels from the data layer. Selecting a card navigates into the Robot Options screen (Phase 9) scoped to that one robot, with a back button returning here. When in the main hub navigation state only, robots can be selected by clicking on them in the world view as well as through the robot list. 

## 9. Robot Options

### Removal

- ~~Remove every existing raw slider/input in the robot editor — the Audio Mode toggle group, rhythmic density/motif length/note variance sliders, and octave range slider in RobotAudioTab, and the per-layer waveform/gain/detune/phase/ADSR editors in RobotOscillatorsTab — replaced entirely by the Phase 1 primitives~~ — **done**. `RobotMetaTab`/`RobotAudioTab`/`RobotOscillatorsTab` deleted outright.
- ~~Remove per-layer ADSR envelopes — collapse Signature Array editing down to a single shared ADSR envelope per robot instead of one per oscillator layer~~ — **done**. `OscillatorLayer.adsr` removed from the type entirely; every layer's synth reads the one `audioAttributes.adsr` via `AudioEngine.reserveVoice`'s new required `adsr` parameter.

### Create

- ~~Update data files with inputs for all Robot Options drawers~~ — **done**, see `src/data/robotOptionsConfig.ts`.
- ~~Robot Display drawer~~ — **done, with the scope corrected via `/interview-me`**: Robot Name/Job Data/Battery Data (%)/Docked Status are read-only Dual Label rows (Phase 8's `RobotSelectionCard` pattern) with **no** job reassignment or docking-state override — both stay fully system-driven, correcting an earlier draft of this phase's own prose. Audio Setting (Off/Mute/Solo/Highlight radio) and transducer pressure ratio/Volume (LFO-modulatable, matching `ROBOT_DATA_GRID.md`'s Volume row) are the only editable controls.
- ~~Ping Controls drawer (rhythmic density, motif length, octave bounds, and a ping-reset action)~~ — **done**. Octave Range Min/Max ship as two independent Steppers (per `ROBOT_DATA_GRID.md`), not a dual-thumb slider. Reset Melody is a plain one-click `Button` — no confirmation dialog, for consistency with every other `Button` in the app.
- ~~Ping Contour drawer (single ADSR envelope)~~ — **done**. First-ever UI editing `audioAttributes.adsr` directly; edits call the new `AudioEngine.updateVoiceEnvelope` (no audio gap), never a full re-reservation.
- ~~Signature Array drawer (Baseline, Coaxial, and Harmonic oscillator layers, with LFO modulation frames and per-layer activation toggles)~~ — **done**. Fixed 3-layer array (no more dynamic add/delete); `'noise'` dropped as a selectable layer type; Detune is `±50` cents; Coaxial/Harmonic's Active toggle mutes a layer (excluded from the built composite voice) without discarding its configuration.
- ~~Every control in every drawer is paired with a Dual Label Component (Phase 1) to display its lore/human attribute name, sourced from robotOptionsConfig.ts~~ — **done**.

**Done** — see [docs/specs/ROBOT_OPTIONS.md](../specs/ROBOT_OPTIONS.md) and
[docs/tasks/ROBOT_OPTIONS.md](../tasks/ROBOT_OPTIONS.md). Scope ended up correcting this phase's
own earlier prose (via `/interview-me`), not just building what was drafted: job reassignment,
docking-state override, and a separate "battery warning threshold" field never existed in
`ROBOT_DATA_GRID.md` and were struck rather than built — see `docs/intent/robot-options.md`.
`RobotEditorTab.tsx` was renamed to `RobotOptionsTab.tsx` (it stopped being a tabbed "editor"),
which also required updating `ConsolePanel.tsx`'s import and `ConsolePanel.test.tsx`'s mocks.
`AudioEngine.reserveVoice` gained a required `adsr` parameter and a `filterActiveLayers` step —
placed on `reserveVoice` itself rather than only `reReserveVoice` (the spec's original phrasing),
since a robot's very first voice reservation happens in `spawnSystem.ts`, never `reReserveVoice`.

**Post-launch fixes, found during manual testing and code review, not part of the original 13
tasks:** Volume shipped as a 0–1 `SliderLinear` bound straight to `masterVolume`, baked into each
note's own velocity at schedule time — testing surfaced three real, compounding problems: (1) a
stale per-robot cache meant edits had no audible effect until a robot's next melody reload; (2)
`masterVolume: 0` didn't actually mute, since a velocity floor kept a faint level; (3) even once
live, an edit couldn't reach an already-scheduled/sounding note, since velocity is fixed the
instant a note triggers. The fix was an architecture change (confirmed with the user first, not
assumed): Volume moved off per-note velocity entirely onto each robot's own live per-robot bus
gain (`AudioEngine.reserveVoice`'s `masterVolume` parameter, `AudioEngine.updateRobotMasterVolume`)
— a continuously-live AudioParam, so an edit now affects anything currently sounding, including a
note's release tail. The UI display also moved from a raw 0–1 slider to 0–100% in 1% steps, and
the raw position is now passed through a perceptual/logarithmic taper
(`src/engine/audioEngine/volumeTaper.ts`) before becoming gain — a linear mapping felt nearly flat
across most of the fader's travel. Density (Ping Controls) shipped as the grid's literal `Stepper`
call but proved too slow to dial through a 0–100 range one click at a time, so it became a
`SliderLinear` instead. The Volume LFO was found to be silently inert at every setting — its
declared modulation range pinned its swing to exactly `0` regardless of rate/depth/shape (see
`AUDIO_SYSTEM.md`'s LFO Modulation section) — and Signature Array's Gain and Interval
sliders had the same missing-`step` bug Volume's original 0–1 toggle had, reachable at only 2–3
positions instead of a real range. Code review also caught Interval being shown (but inert) for
Binary/square layers — Tone.js has no width parameter outside `'pulse'` — corrected to Burst/pulse
only, in both the component and this phase's spec. Finally, `RobotDisplaySection` gained the same
sunlight/time-agnostic `RobotBody` avatar `RobotSelectionCard` already used, so Robot Options'
header reads consistently with the Robot Selection hub.

### About

This phase tears out the existing hand-built robot editor — RobotAudioTab's Audio Mode toggle group and density/motif/note-variance/octave sliders, and RobotOscillatorsTab's per-layer waveform/gain/detune/phase/ADSR editors — and rebuilds it as the Robot Options screen, reached by selecting a robot from the Robot Selection hub tile (Phase 8), scoped entirely to the currently selected robot. We are populating src/data/robotOptionsConfig.ts with parameter schemas for all four drawers and constructing dedicated components in src/components/robot/, each control paired with a DualLabel showing its lore and human attribute name. These include RobotDisplay for read-only Name/Job/Battery(%)/Docking-status display (unchanged from Phase 8's display pattern, no job/docking override, no gauge widget), plus editable Audio Setting (Off/Mute/Solo/Highlight) and an LFO-modulatable transducer pressure ratio slider; PingControlsDrawer for rhythmic density, motif length, octave bounds, and a ping-reset action; PingContourDrawer for a single logarithmic ADSR envelope — replacing the current per-layer ADSR editing, so a robot has one shared envelope instead of one per oscillator layer; and SignatureArrayDrawer for configuring Baseline, Coaxial, and Harmonic oscillator layers with LFO modulation frames and layer-activation toggles. All controls will consume schema definitions from our data configs, maintaining strict presentation logic while preparing the UI to connect directly to the underlying Robot Systems Engine (Phase 7).

### Docs

- ~~docs/UI_SHELL.md's "Planned Replacement" point on `robotEditor` becomes real — fold it in and delete the entire "Planned Replacement" section, since by this phase all of Phases 3/7/8/9 have shipped.~~ — **done**.
- ~~docs/ROBOT_DESIGN.md's Shape Parameters section describes spawn-time shape values as "the gain-weighted, normalized average of a robot's oscillator layers' ADSR envelopes" — with ADSR moved to a single shared envelope per robot, there's nothing left to average; reword to read directly from the one envelope.~~ — **done**.
- ~~docs/AUDIO_SYSTEM.md's "Layered / Composite Voices" section lists an optional per-layer `adsr` field on `OscillatorLayer` — update once ADSR moves off individual layers and onto the robot.~~ — **done**. Scope ended up wider than this one section: `AUDIO_SYSTEM.md`'s own `AudioEngine` interface listing (`reserveVoice`/`createCompositeVoice`'s signatures, the new `updateVoiceEnvelope`) and its LFO Seeding section (which had claimed robot-level LFO `active` was "purely a runtime UI concern never part of the generated data" — no longer true once this phase seeded it) both needed the same pass.
- docs/reference/ROBOT_DATA_GRID.md's Audio Setting Options column corrected to include "Off" (4th option, not the stale 3); Density's Min/Max corrected from `1`/`16` to `0`/`100` (stale since Roadmap Phase 6 shipped, never caught until this phase's spec research) — **done**, not part of the original Docs list but required for the grid to match shipped behavior.

## 10. Companies

### Create

- `src/types/Company.ts`: `Company` (`id`, `name`, `robotIds: string[]`, `lastEditedOptions?: CompanyOptionsSnapshot`) and `CompanyOptionsSnapshot`, mirroring every editable field the four Robot Options sections expose (Audio Setting, Volume + its LFO, Ping Controls, Ping Contour, Signature Array) — everything except the read-only Display rows (Name/Job/Battery/Docking) and the Reset Melody action, neither of which makes sense at company scope.
- `Locale.companies: Company[]` (src/types/locale.ts) alongside `robots`/`actors`, seeded once at spawn the same way the roster is — `spawnInitialRoster` (src/systems/spawnSystem.ts) gains a company-generation pass: a seeded count of 2-3 companies, each with a seeded 3-4 robots (disjoint, drawn from the 12-robot roster — leaving a meaningful chunk Freelance by default), each company given a generated name (the same Adjective+Noun word-list pattern `generateRobotName` already uses). Distinct from spawn generation, a new `MAX_COMPANIES = 6` constant (src/constants/index.ts) caps how many companies can exist at once, giving a player room to create more by hand via CRUD after spawn.
- `Robot.companyId?: string` (src/types/Robot.ts) — undefined means Freelance (the default; no separate boolean needed).
- `localeStore.ts` gains `addCompany`/`updateCompany`/`removeCompany`/`getCompanyById`, mirroring the existing `addRobot`/`updateRobot`/`removeRobot`/`getRobotById` pattern exactly. `removeCompany` clears `companyId` on every member robot first (mirrors `removeLocale`'s per-robot AudioEngine cleanup loop) — the "deleting a company frees its robots to Freelance" behavior this phase calls for.
- `uiStore.ts` gains `selectedCompanyId: string | null` (default `null`, the "None" button) and `selectCompany`, independent of `selectedRobotId` — company-glow and single-robot-select-glow are two separate, non-conflicting visual states, not a shared selection slot.
- A new `Select` primitive (`src/components/ui/controls/Select.tsx` + a `SelectSchema` variant in `src/types/controls.ts`) — the Design System's 14th primitive (`docs/COMPONENT_LIBRARY.md`, `CLAUDE.md`'s reference bullet, and `CONTROL_SCHEMA_TYPES`'s "all 13 variants covered" runtime assertion in `controls.test.ts` all updated to 14). Used for the robot→company assignment dropdown in both `RobotSelectionCard` and `RobotDisplaySection`, listing every company by name plus a "Freelance" option that clears `companyId`.
- `src/data/companyConfig.ts` — schemas for the company button row, the CRUD panel (Create/Rename/Delete, `TextInput` pre-filled with the generated name so a create action can be accepted as-is or edited before confirming), and the "Freelance" label, following the same typed-config-file convention every other drawer already uses.
- A new `CompanyOptionsPanel` component rendered by `RobotsTab` beneath the existing robot card list: the company button row (one button per company, capped at `MAX_COMPANIES`, plus "None"), the CRUD controls, and then the same four editable sections `RobotOptionsTab` uses — greyed out (`disabled`) with no bound value when "None" is selected, bound to the selected company's snapshot otherwise.

**Done** — see [docs/specs/COMPANIES.md](../specs/COMPANIES.md) and
[docs/tasks/COMPANIES.md](../tasks/COMPANIES.md). Shipped shape differs from this draft's naming in
a few places, none of them scope changes: `CompanyOptionsPanel` above shipped as three composed
components (`CompanyManager` mounting `CompanyButtonRow` + `CompanyCrudControls` +
`CompanyOptionsSection`), not one; company spawn generation is its own function,
`spawnInitialCompanies` (`src/systems/spawnSystem.ts`), called from `worldTransition.ts`'s
`initializeLocale` right after `spawnInitialRoster` rather than folded into it; and `localeStore.ts`
gained two more company actions than listed here — `getCompanyMembers` and the atomic
`assignRobotToCompany` (robot reassignment is a single cross-entity transition, not composed from
separate `updateRobot`/`updateCompany` calls at the call site, mirroring `removeCompany`'s own
shape). A real bug in `assignRobotToCompany` — re-selecting a robot's already-assigned company
silently dropped it from that company's `robotIds` — was found in code review before merge and
fixed with regression coverage; see `localeStore.test.ts`.

### Restructure

- `RobotDisplaySection`'s Audio Setting/Volume/Volume-LFO handlers and each of `PingControlsDrawer`/`PingContourDrawer`/`SignatureArrayDrawer`'s per-field handlers are extracted into shared pure functions (e.g. `applyAudioMode`, `applyVolume`, `applyDensity`, ...) that do exactly what today's inline handlers do — `updateRobot` plus whatever live `AudioEngine`/`lfoEngine`/`regenerateMelody` call already accompanies it. Both the existing single-robot drawers and the new `CompanyOptionsPanel` call the same functions; the panel's `onChange` handlers just loop them across `company.robotIds` instead of calling once. This is required, not cosmetic — a company-wide volume change that only wrote `updateRobot` without also calling `AudioEngine.updateRobotMasterVolume` per member would reproduce the exact stale-cache bug Phase 9's post-launch fixes already found and fixed for the single-robot case.
- `RobotSelectionCard` and `RobotDisplaySection` each gain a company row: `DualLabel` plus the new `Select`, defaulting to "Freelance," updating both the robot's `companyId` and the old/new company's `robotIds` via the store actions above on change.
- `Robot.tsx` (world view) adds a second CSS hook alongside `isSelected` — `isCompanyMember`, true when `robot.companyId === selectedCompanyId` and `selectedCompanyId !== null` — reusing the same glow treatment `.robot.selected` already defines rather than inventing a second visual language for "selected."

### About

This phase introduces Companies — user-managed groups of robots that let every Robot Options field be edited across many robots at once instead of one at a time, aimed squarely at the tedium of manually matching settings across several robots by hand (and trying to remember what was set last time) when tuning them to sound cohesive. A locale spawns with 2-3 companies of 3-4 robots each, seeded the same deterministic way everything else about a fresh locale is generated, leaving a meaningful chunk of the 12-robot roster Freelance by default — Companies read as a real, seeded part of the locale's identity from the moment it loads, not an empty feature waiting for manual setup; any robot not assigned is Freelance, the implicit default rather than a distinct flag. `MAX_COMPANIES` (6) is a separate CRUD ceiling on top of that, not the spawn target. Retransmitting a new seed in Sector Settings (Phase 5) regenerates Companies fresh along with the rest of the roster — nothing about a company survives a reseed, matching how nothing else does either, and reading as part of the same "new world" event lore-wise. We are extending `RobotsTab` (Roadmap Phase 8) with a company button row plus CRUD (create/rename/delete) beneath the existing robot card list, and a `CompanyOptionsPanel` beneath that reusing the same `RobotDisplaySection`/`PingControlsDrawer`/`PingContourDrawer`/`SignatureArrayDrawer` primitives Robot Options (Phase 9) already built — with "None" selected, every control renders disabled with no bound value; selecting a company populates the panel from that company's own persistent snapshot (seeded from its first member's current values the first time it's edited, then updated field-by-field on every subsequent edit, so re-selecting a company later picks up exactly where its last edit left off) and every field edit fans out through the same `updateRobot`/`AudioEngine`/`lfoEngine`/`regenerateMelody` calls the single-robot drawers already make, once per member robot — a company edit is a broadcast, not a live link, so a user editing one member robot afterward changes only that robot, same as today. Selecting a company also highlights its members' cards in the list and glows them in the world view, reusing the existing single-robot selection visual rather than inventing a second one. Because the Design System's fixed 13-primitive inventory (Phase 1) has no dropdown, and both the robot list and Robot Options need one to reassign a robot's company, this phase adds a 14th primitive, `Select` — the first addition to that inventory since Phase 1 shipped it.

### Forward Note

- Session Storage (Phase 12) will need to persist Companies the same way it persists Robot Options overrides — `companies` alongside the per-robot override map, keyed by the same kind of deterministic ID `spawnSystem.ts` already gives robots (Phase 6), so a reload can reapply company membership and each company's snapshot rather than losing it. Nothing here needs to change for that; noted so Phase 12 doesn't discover it mid-implementation.
- That deterministic-ID matching only covers spawn-generated companies. A company created by hand via `CompanyCrudControls` has a `crypto.randomUUID()` id (deliberate — see `docs/COMPANIES.md`'s Forbidden Patterns list; there's no seed to derive it from) and doesn't exist in a freshly-regenerated roster at all, so it can't be reapplied as a diff the way robot overrides and spawn-companies can. Phase 12 must persist user-created companies as complete objects (id, name, robotIds, snapshot) in the save payload, not as an ID-keyed diff. The random id itself is fine for this — it only needs to stay stable once saved, not be re-derivable from the seed.

### Docs

- ~~`docs/COMPONENT_LIBRARY.md` updated for the 14th primitive (`Select`); `CLAUDE.md`'s reference bullet text ("The 13 stateless UI primitives") updated to 14.~~ — **done**.
- ~~No existing doc covers Companies — add a new `docs/COMPANIES.md`, in the style of `docs/ROBOT_LIFECYCLE.md`, documenting the `Company`/`CompanyOptionsSnapshot` shape, the seeded spawn-time generation, and the broadcast-not-link edit semantics. Add it to CLAUDE.md's reference doc list.~~ — **done**, see [docs/COMPANIES.md](../COMPANIES.md).
- ~~`docs/UI_SHELL.md`'s Robots tile description gains the company row/panel — it currently only describes the robot list.~~ — **done**.

## 10.1 Attenuation Style (single-planet reskin)

Inserted out of sequence — deliberately numbered 10.1 rather than renumbering every phase after it.

### Create

- `Locale` gains its own `dayStartTimestamp: number` (`types/locale.ts`), replacing the field of the same name currently on `Planet`. Computed at locale-build time (`buildLocale`, `worldTransition.ts`) directly from that locale's own `coordinates.x` — no seed, no shared clock: `dayStartTimestamp = Date.now() - (Math.abs(x % 24) / 24) * DAY_DURATION_MS`. `DAY_DURATION_MS` is a new fixed `6 * 60_000` constant (`constants/time.ts`), replacing the three-entry `PLANET_DURATION_MS` table. This makes "on load, current time is `abs(x % 24)` hours, zero minutes" true by construction for whichever locale is current, with no separate reconciliation step.
- New AS-seeded factory recolor path: today, factory hue/sat/greeble come *only* from the locale's own noise map via `generateFactoryId()` (`factoryPlacementSystem.ts`) — placement, count, and color are all locale-(x/y)-derived, and an AS-only retransmit never touches an already-populated locale's actors at all (`retransmitPlanetOnly`'s existing "same robots/actors/edits, no regeneration" behavior). Add a color component seeded from `getPlanetNoiseMap` (the same AS-seed source `generateGlobalAudioSettings`/`generateGlobalLfoSettings` already sample) and a dedicated pass that recolors an existing locale's factories in place — position/count/id untouched — triggered specifically by an AS-only retransmit. This is genuinely new coupling, not a rename: nothing today makes factory appearance react to a planet swap at all.

### Restructure

- **The retransmit branch that recalculates world time inverts.** Today, only a planet swap (`retransmitPlanetOnly`) produces a new `dayStartTimestamp`, and `retransmitCoordsOnly` explicitly preserves it (see that function's own comment in `worldTransition.ts`). Under this change it's the reverse: only a coordinate-changing branch (`retransmitCoordsOnly`, `retransmitBoth`) recalculates time, because it's the one building a fresh `Locale` (whose `dayStartTimestamp` is derived at construction, per Create above); the AS-only branch must leave the current locale's `dayStartTimestamp` alone entirely. Flagging explicitly because it's easy to get backwards if the new branch is written by analogy to today's structure.
- `PlanetView.tsx`'s per-second tick reads `dayStartTimestamp` off the current `Locale` instead of the current `Planet`, and computes the displayed hour directly from it — `computePlanetHour`'s size parameter and `computeLocalTime`'s longitude-offset composition (`constants/time.ts`) are both retired. There is no persistent, cross-locale clock to offset from (only one locale is ever mounted at a time via `currentLocaleId`); a locale's displayed hour is exactly the hour its own `dayStartTimestamp` implies, no second step.
- `SectorSettingsDrawer.tsx`'s "Planet Calibration" section becomes "Attenuation Style" in every user-facing string only — `PLANET_NAME_SCHEMA`'s `loreLabel`/`humanLabel`/`placeholder` and `PLANET_NAME_PRESETS` (`sectorSettingsConfig.ts`; the current Kryndara/Vessport Null/Halcyon Drift/The Rusting presets read as literal planet names and need reflavoring to receiver/attenuation-style names), plus `TransportBar.tsx`'s "Planet: {name}" status readout. `generateRandomPlanetName()` keeps producing the same 8-char alphanumeric string unchanged — it just no longer implies a place name. Internal identifiers (`Planet`, `PlanetSize`, `usePlanetStore`, `planetStore.ts`, `derivePlanetSeed`, `getPlanetNoiseMap`, `RetransmitInput.planetName`, the `?seed=`/`window.__GLOBAL_PLANET_SEED__` debug override) are deliberately **not** renamed — this stays a UI reskin, keeping the diff small, not a project-wide rename.
- Delete `PlanetSize` (`types/planet.ts`), `Planet.size`, `setPlanetSize` (`planetStore.ts`), and `planetInitialHour` plus its letter-average algorithm (`seedUtils.ts`) — all dead once the initial hour is x-derived rather than seed-derived.

### About

This phase reframes "visiting a different planet" as "retuning the receiver" — the user never leaves the one world; changing the Attenuation Style (AS) just changes how the same transmission is being interpreted. Mechanically this is closer to a reskin than a new feature: the exact seeded-generation pipeline that already drives Global Audio Rig timbre and Global LFO settings from a planet name (`generateGlobalAudioSettings`/`generateGlobalLfoSettings`, `globalAudioSeed.ts`) is untouched — it's retargeted to fire on an AS change instead of a planet change, with no change to *how* it generates. Robots, companies, and melodies are already purely locale-(x/y)-seeded and are confirmed unaffected by an AS change today, matching the requirement that melodies stay x/y-dependent. Two things do need real work, not just a rename: World Time drops the three planet-size options in favor of a fixed 6-minute day, with a locale's on-load hour computed directly from its own X coordinate rather than from the AS's seed — and because that ties time to the locale rather than the AS, `dayStartTimestamp` moves off `Planet` onto `Locale`, and the retransmit branch that recalculates it flips accordingly (coordinate changes now drive time; AS changes never do, the reverse of today). Factory *color* gains a new AS-seeded component so the backdrop's palette shifts with the receiver's interpretation, while factory *placement* stays exactly as locale/coordinate-derived as it is today — deliberately decoupled, since position is "where," not "how it's being read."

### Forward Note

- Two not-yet-built phases already describe "planet seed" as a design concept: Console Theming (Phase 11 — "planet seed drives large/structural tokens") and Session Storage (Phase 12 — "Active planet seed and plot coordinates" as item 1 of what gets persisted). Neither phase's design *logic* needs to change — the underlying seed mechanism (`getPlanetNoiseMap`, keyed by name) is untouched by this phase — but both should read "AS seed" by the time they're actually implemented, so they aren't built against stale terminology.

### Docs

- `docs/BUILDING_DESIGN.md` — the "seeded by the actor ID" description of factory color needs a follow-up note once this phase ships: color also depends on the AS seed, not only the locale's.
- No existing doc covers Sector Settings' user-facing renaming or the reworked World Time formula in one place — add one (or extend `docs/specs/SECTOR_SETTINGS.md`) and add it to `CLAUDE.md`'s reference doc list.

## 10.2 LFO Modulation Engine (Stacked LFO Drift)

Extends Phase 0's LFO engine with a second modulation layer; inserted here rather than renumbering every phase after it, same as 10.1. Source of intent: [docs/intent/lfo-drift.md](../intent/lfo-drift.md) (confirmed via `/interview-me`) — supersedes an earlier per-target draft of this phase that was reviewed and rejected before any of it was built (wrong file paths, and a per-target/per-drawer UI design the interview replaced with a single global control).

### Create

- One new **global** drift pair, not a `LfoSettings` field — `rateDrift`/`depthDrift` are Audio Rig-wide values (bipolar, roughly `-1.0`–`1.0`, default `0.0`, seeded per planet), not per-target/per-robot state, so they live in `GlobalAudioSettings`/`globalAudioSeedRanges.ts` alongside the rest of the Audio Rig's seeded fields, not on `LfoSettings` itself (`src/types/lfo.ts` is unchanged).
- `src/engine/lfoEngine.ts` — the actual file (a top-level sibling of `AudioEngine.ts`, **not** a member of the `src/engine/audioEngine/` subfolder, which holds only lower-level Tone helpers like `compositeVoice.ts`/`globalFx.ts`/`panning.ts`). At module init, lazily construct a **fixed pool of 8 shared hidden secondary `Tone.LFO`s** (0.03 Hz sine, ~33s cycle), each given a distinct, deterministic phase offset spread across the pool — not randomized (`Math.random()` has no place here per this module's existing `getSeededVal`-only convention), not one secondary oscillator per active primary. Whenever a primary LFO is connected (`connectLfoTarget`), it also connects to one pool oscillator — picked deterministically by hashing its own instance key, so the same target always lands on the same bucket — through its own small pair of `Gain` nodes (still per-primary; the swing has to scale relative to that primary's own current rate/range, which doesn't generalize across primaries the way the phase source does).
- Route each pool oscillator's per-primary-attenuated output into that `primaryLfo.frequency` (a `Signal`) and `primaryLfo.amplitude` (a `Param`) through the **same override-disable-then-restore sequence `connectLfoTarget` already uses** for its own target connections (`lfoEngine.ts`, the `signal.override = false` step before `.connect()`, then restoring the destination's pre-connect value after). `Tone.Signal`'s `override` flag resets the destination to `0` the instant anything `.connect()`s to it, regardless of gain staging — this is exactly the bug class `docs/AUDIO_SYSTEM.md`'s LFO Modulation section already documents as "the worst LFO bug found here," discovered once and fixed for the primary-to-target connections; the pool-to-primary connections are just as exposed to it and must reuse the fix, not rediscover it.
- **Depth Drift must never move a target off `0`.** Since `Depth Drift` is additive and bounded to stay non-negative, a naive implementation could still nudge a target whose own Depth is currently `0` (deliberately silenced) into brief audible modulation. Guard explicitly: a primary with base depth `0` gets no depth-drift connection at all, full stop — confirmed via interview as a deliberate rule, not an oversight to catch in review.
- Export `setGlobalLfoRateDrift`/`setGlobalLfoDepthDrift` (or equivalent) from the same `lfoEngine` object (plain exported object, no class, matching the module's existing shape) — these update the shared pool's gain-staging inputs for every currently-connected primary, not a single target's settings.
- `src/components/ui/controls/Lfo.tsx` is **not** touched by this phase — there is no per-target drift UI. Instead, one new accordion in `src/data/audioRigConfig.ts` (a sibling of the existing seven effect-block accordions, not nested inside any of them) holds exactly two `SliderCenteredZero` controls: Rate Drift and Depth Drift.

### Restructure

- `lfoEngine.ts`'s connection bookkeeping (`activeLfos`/`connectedSignals`) extended so a primary's disconnect path also tears down its pool-drift `Gain` pair — the shared pool oscillators themselves are never torn down (they're app-lifetime, not per-target).
- **No changes to** `src/types/lfo.ts`, `Lfo.tsx`, `src/data/robotOptionsConfig.ts`, `src/data/companyConfig.ts`, or `CompanyOptionsSection.tsx` — none of them have any per-target drift state to add, since drift is one global amount, not a per-`LfoSettings` field.

### About

This phase adds a second, hidden modulation layer over the *entire* set of currently-active Phase 0 LFOs at once — one global Drift control in the Audio Rig, not a per-drawer one — so sustained modulation reads as organic drift rather than a fixed, perfectly repeating cycle, without exposing a second raw oscillator sub-interface anywhere in the UI. A small fixed pool of 8 shared secondary oscillators, each at its own deterministic phase offset, stands in for "one drift oscillator per active LFO": with likely 70-100+ primaries bound in a typical session (most robot/global targets seed active), giving each its own dedicated secondary oscillator would meaningfully tax the audio thread for an effect nobody can actually hear as more "independent" past a handful of distinct phases — 8 buckets is enough that no two primaries read as synchronized, at a constant node cost that doesn't scale with how many LFOs happen to be active. Because `Tone.LFO`'s `frequency` is a `Signal` and `amplitude` is a `Param`, wiring a pool oscillator into either one hits the same `Signal.override`/`Param`-reset behavior `connectLfoTarget` already had to work around for its own target connections (`docs/AUDIO_SYSTEM.md`) — this phase reuses that fix rather than re-deriving it. Rate Drift/Depth Drift are planet-seeded, like the rest of the Audio Rig's values, so different Attenuation Styles feel like they drift by different default amounts without anyone touching a slider — the two sliders exist as an override, not a requirement. A silenced target (Depth already `0`) stays silent regardless of drift, by explicit design.

### Docs

- `docs/AUDIO_SYSTEM.md`'s "LFO Modulation" section — extend with the shared-pool signal graph (8 phase-offset secondary LFOs → per-primary `Gain` attenuators → each active primary's `frequency`/`amplitude`), the bipolar scaling math once defined, and the new global getter/setter API — plus an explicit note that the override-disable fix already documented there applies to these connections too.
- `docs/COMPONENT_LIBRARY.md` — no primitive-level change (no new component, `SliderCenteredZero` is reused as-is); note in `audioRigConfig.ts`'s own doc coverage (if any) that a Drift accordion exists alongside the seven effect blocks.

## 10.3 LFO Modulation Engine — Multi-Group Drift

Follow-up to 10.2, inserted the same way (out of sequence, not renumbering later phases). Confirmed via `/interview-me` — source of intent: [docs/intent/lfo-drift-groups.md](../intent/lfo-drift-groups.md).

### About

10.2 shipped "Stacked LFO Drift" scoped down to a single shared pool of 8 secondary oscillators and one global Rate Drift/Depth Drift pair applied uniformly to every LFO in the app. This phase builds the stack the name always implied: 4 independent drift groups — EQ3, Low-Pass Filter, High-Pass Filter, and one shared group for every robot-level LFO — each with its own dedicated oscillator pool (sized to that group's own real target ceiling, not a uniform 8), its own independently-seeded Rate Drift/Depth Drift amount, and its own pair of sliders in the Audio Rig. Every mechanic 10.2 already shipped — the deterministic bucket-hash assignment, the bounded swing math, the Depth Drift silence guard, the `Signal.override` fix reuse — carries over per-group unchanged; this phase restructures which pool a primary hashes into and which drift amount applies, not the underlying mechanism. Not yet spec'd — see the intent doc for the confirmed scope and constraints.

## 10.4 Attenuation Style Internal Rename

Follow-up to 10.1, inserted the same way (out of sequence, not renumbering later phases). Raised
directly during review of 10.1's shipped state, not via `/interview-me` — source of intent:
[docs/intent/attenuation-style-rename.md](../intent/attenuation-style-rename.md).

### Restructure

- Reverses 10.1's own "internal identifiers are not renamed" constraint. Every "Planet"-named
  identifier, filename, and CSS class that means the Attenuation Style concept becomes
  `AttenuationStyle`-flavored, spelled out in full: `Planet` → `AttenuationStyle`, `usePlanetStore` →
  `useAttenuationStyleStore`, `derivePlanetSeed` → `deriveAttenuationStyleSeed`, `PlanetView.tsx` →
  `AttenuationStyleView.tsx`, `PLANET_NAME_PRESETS` → `ATTENUATION_STYLE_PRESETS`,
  `window.__GLOBAL_PLANET_SEED__` → `window.__GLOBAL_ATTENUATION_STYLE_SEED__`, and so on through
  `worldTransition.ts`'s own construction/retransmit helpers and `Locale.planetId` →
  `Locale.attenuationStyleId`. `DEFAULT_PELAGOS` keeps its own proper-noun name (only its type
  changes). `PlanetState` (dead, unused) is deleted rather than renamed.
- No behavioral change anywhere — confirmed no `getSeededVal`/`precomputeDataX` `dataId` string
  contains "planet," so this cannot affect any generated world's seed/determinism.

### About

10.1 deliberately scoped itself to a UI/copy reskin, keeping "Planet" as the internal name of the
same concept "Attenuation Style" now fronts user-facing — flagged at the time as "a separate, later
unit of work." This phase is that work: closing the two-names-one-concept gap before it calcifies
into more call sites and docs that have to guess which name is "the real one."

### Docs

- `docs/CONSOLE_THEMING.md` and `docs/SESSION_STORAGE.md` — resolve 10.1's own Forward Note now:
  "planet seed" becomes "AS seed" in both, since the underlying identifier rename makes the old
  phrasing stale immediately rather than waiting for Phase 11/12 to actually be built.
- This section (`## 11`/`## 12` below) gets the same "planet seed" → "AS seed" terminology pass, for
  the same reason.
- Live reference docs (`PROCEDURAL_GENERATION.md`, `BUILDING_DESIGN.md`, `COMPANIES.md`,
  `UI_SHELL.md`, `CLAUDE.md`'s own doc-index blurbs) get their "planet"-as-AS-concept references
  updated to match. `docs/specs/ATTENUATION_STYLE.md`, `docs/tasks/ATTENUATION_STYLE.md`,
  `docs/intent/attenuation-style.md`, `docs/specs/SECTOR_SETTINGS.md`,
  `docs/specs/LOCALE_SEED_DECOUPLING.md`, and this roadmap's own `## 10.1` section stay untouched —
  historical record of what was decided at the time, including 10.1's own now-reversed
  no-rename call.

## 11. Console Theming

### Create

- Pure seed-to-theme module (e.g. src/utils/consoleTheme.ts, alongside seedUtils.ts/getSeededVal.ts) computing bounded, legible HSL values — large/structural tokens (`--color-bg`, `--color-surface`, casing silhouette geometry) from the active AS seed; small/accent tokens (`--color-accent`, `--color-border`, button/text colors) from the active locale's coordinate seed
- Generated exterior silhouette for SleeveContainer — decorative indents/bands driven by the AS seed, rendered as SVG (SleeveContainer is currently a flat CSS box with no SVG at all; this follows the same generated-geometry pattern the robot shape components already use, not a new mechanism). The section connecting the sleeve to the glass can be uniform across seeds.
- Wiring so retransmitting a seed in Sector Settings (Phase 5) recomputes and visibly updates the theme
- Respect `prefers-reduced-motion` on the retransmit transition (color and casing-silhouette change), following the same `@media (prefers-reduced-motion: reduce)` pattern already used in PowerRockerSwitch.css — the new theme still applies, it just snaps instead of animating

### Restructure

- SleeveContainer.tsx/.css goes from a static CSS box to a component consuming generated theme values, the same way robot components consume audioAttributes — no existing phase currently touches this file
- The CSS custom properties in src/index.css (`--color-bg`, `--color-surface`, `--color-border`, `--color-accent`, `--color-text-primary`, `--color-text-muted`) become the seed-driven output target, replacing today's static Vite-default values

### About

This phase gives the console itself a seed-derived visual identity, split by scale rather than by physical part: the AS seed drives large/structural areas — the Sleeve casing's exterior silhouette, decorative indents/bands, and color, plus large background regions inside the Glass — while the active locale's coordinate seed drives small accent elements wherever they sit, buttons/text/borders on both the casing's decorative details and the Glass-side chrome. The casing's interior edge, the boundary touching ScreenViewport, stays static so nothing generated ever encroaches on or covers screen content. Colors stay bounded and legible the same way robot color generation already is (see ROBOT_DESIGN.md), since this is real interactive chrome sitting on a fixed dark background, not a decorative shape — a bad roll can't just look a little odd. Retransmitting a new seed in Sector Settings (Phase 5) visibly reshapes and recolors the console, reinforcing the same "this is a piece of field equipment reporting what it's tuned to" fiction the rest of the console already leans on (SYSTEM_FIRMWARE_RESETS, the power-off confirm, etc.). Because the theme is a pure function of the seed and coordinates already being persisted by Sector Settings, it needs no separate storage of its own — Session Storage (Phase 12) restoring the seed automatically restores the look. Out of scope here: WorldView/terrain/sky styling (deferred to v2), robot visuals (locked to audio attributes per CLAUDE.md, untouched by this phase), and the power rocker switch itself (stays fixed, not seed-styled).

### Docs

- No existing doc covers UI chrome theming — add a new docs/CONSOLE_THEMING.md (in the design-doc style of SESSION_STORAGE.md, since this hasn't shipped yet either) documenting the scale-based token split, the bounded-HSL generation rules, and the SleeveContainer interior/exterior boundary constraint. Add it to CLAUDE.md's reference doc list.

## 12. Session Storage

### Create

- Persistence engine: a debounced Zustand `subscribe()` listener (not a polling loop) that background-saves to localStorage on changes to locale/seed, Audio Rig settings, or Robot Options overrides
- State resolver: URL query string → localStorage cache → fresh procedural seed, in that fixed priority order
- URL state serializer: native `CompressionStream`/`DecompressionStream` (`'deflate-raw'`) plus base64url encoding, with an uncompressed base64url fallback if `CompressionStream` is unavailable — no new dependency
- FirmwareResetModal: an `AlertDialog`-based full-state wipe (clears localStorage, strips the URL query string, regenerates at a fresh procedural baseline), with a GSAP flash timeline registered in timelineMap, labeled `SYSTEM_FIRMWARE_RESETS` in the UI — the flash timeline respects `prefers-reduced-motion` (same pattern as PowerRockerSwitch.css), skipping straight to the reset when set

### Restructure

- Persisted state is a diff, not a snapshot: active seed/coordinates, global Audio Rig settings, and a per-robot override map (keyed by robot ID) holding only the fields an operator explicitly changed in Robot Options — everything else regenerates from the seed on load
- Depends on Phase 6's robot IDs becoming deterministic, so overrides can be reapplied by ID after the roster regenerates

### About

This phase replaces the (currently nonexistent) session/storage handling with an automated background persistence engine, URL serialization, and a strict state-loading hierarchy. There is no localStorage or persistence code anywhere in src/ today, so this is greenfield — the only thing to remove is the SESSION console tab stub, already handled by Phase 3. We are building src/utils/storageEngine.ts (flat alongside the rest of src/utils/) to debounce-save on meaningful Zustand store changes rather than polling on a fixed timer, acting like a rugged field recorder's non-volatile flash storage. We are implementing src/utils/stateResolver.ts to enforce the fixed startup resolution order — URL payload, then localStorage, then a fresh procedural seed — and src/utils/urlSerializer.ts to compress state with the native CompressionStream API into a dense, URL-safe string for direct link sharing. Because robot attributes are already fully seed-derived (see PROCEDURAL_GENERATION.md), the persisted/shared payload is a small diff — seed, coordinates, Audio Rig settings, and any operator overrides from Robot Options — reapplied on top of a freshly regenerated roster, not a full snapshot. Finally, we are building FirmwareResetModal.tsx (Radix AlertDialog, GSAP flash timeline via timelineMap) to handle full state wipes styled as a hard diagnostic system reset (SYSTEM_FIRMWARE_RESETS), keeping the industrial telemetry aesthetic consistent with the rest of the console.

### Docs

- docs/SESSION_STORAGE.md created as a design doc for this phase — update its "not yet implemented" banner once storageEngine/stateResolver/urlSerializer actually ship. Already added to CLAUDE.md's reference doc list.
