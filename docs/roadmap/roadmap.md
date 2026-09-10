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

- Console Theming (Phase 11) will later drive CSS custom properties by *scale* — large/structural tokens (backgrounds) from the planet seed, small/accent tokens (buttons, text, borders) from the locale seed. Name and group new design tokens with that split in mind now, so Phase 11 doesn't have to rename or regroup anything this phase already established.

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

**Done** — see [docs/specs/ATTENUATION_STYLE.md](../specs/ATTENUATION_STYLE.md) and [docs/tasks/ATTENUATION_STYLE.md](../tasks/ATTENUATION_STYLE.md). Confirmed shipped on `main`: `attenuationStyleStore.ts`, `AttenuationStyleView.tsx`, and `types/attenuationStyle.ts` all exist, `Locale.dayStartTimestamp` is live, and the internal-rename groundwork this phase deliberately left alone was picked up by 10.4 below.

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

**Done** — see [docs/specs/LFO_DRIFT.md](../specs/LFO_DRIFT.md) and [docs/tasks/LFO_DRIFT.md](../tasks/LFO_DRIFT.md). Confirmed shipped on `main` as `src/engine/lfoDrift.ts` — since superseded in shape (not scope) by 10.3's 4-group reshape immediately below.

### About

This phase adds a second, hidden modulation layer over the *entire* set of currently-active Phase 0 LFOs at once — one global Drift control in the Audio Rig, not a per-drawer one — so sustained modulation reads as organic drift rather than a fixed, perfectly repeating cycle, without exposing a second raw oscillator sub-interface anywhere in the UI. A small fixed pool of 8 shared secondary oscillators, each at its own deterministic phase offset, stands in for "one drift oscillator per active LFO": with likely 70-100+ primaries bound in a typical session (most robot/global targets seed active), giving each its own dedicated secondary oscillator would meaningfully tax the audio thread for an effect nobody can actually hear as more "independent" past a handful of distinct phases — 8 buckets is enough that no two primaries read as synchronized, at a constant node cost that doesn't scale with how many LFOs happen to be active. Because `Tone.LFO`'s `frequency` is a `Signal` and `amplitude` is a `Param`, wiring a pool oscillator into either one hits the same `Signal.override`/`Param`-reset behavior `connectLfoTarget` already had to work around for its own target connections (`docs/AUDIO_SYSTEM.md`) — this phase reuses that fix rather than re-deriving it. Rate Drift/Depth Drift are planet-seeded, like the rest of the Audio Rig's values, so different Attenuation Styles feel like they drift by different default amounts without anyone touching a slider — the two sliders exist as an override, not a requirement. A silenced target (Depth already `0`) stays silent regardless of drift, by explicit design.

### Docs

- `docs/AUDIO_SYSTEM.md`'s "LFO Modulation" section — extend with the shared-pool signal graph (8 phase-offset secondary LFOs → per-primary `Gain` attenuators → each active primary's `frequency`/`amplitude`), the bipolar scaling math once defined, and the new global getter/setter API — plus an explicit note that the override-disable fix already documented there applies to these connections too.
- `docs/COMPONENT_LIBRARY.md` — no primitive-level change (no new component, `SliderCenteredZero` is reused as-is); note in `audioRigConfig.ts`'s own doc coverage (if any) that a Drift accordion exists alongside the seven effect blocks.

## 10.3 LFO Modulation Engine — Multi-Group Drift

Follow-up to 10.2, inserted the same way (out of sequence, not renumbering later phases). Confirmed via `/interview-me` — source of intent: [docs/intent/lfo-drift-groups.md](../intent/lfo-drift-groups.md).

### About

10.2 shipped "Stacked LFO Drift" scoped down to a single shared pool of 8 secondary oscillators and one global Rate Drift/Depth Drift pair applied uniformly to every LFO in the app. This phase builds the stack the name always implied: 4 independent drift groups — EQ3, Low-Pass Filter, High-Pass Filter, and one shared group for every robot-level LFO — each with its own dedicated oscillator pool (sized to that group's own real target ceiling, not a uniform 8), its own independently-seeded Rate Drift/Depth Drift amount, and its own pair of sliders in the Audio Rig. Every mechanic 10.2 already shipped — the deterministic bucket-hash assignment, the bounded swing math, the Depth Drift silence guard, the `Signal.override` fix reuse — carries over per-group unchanged; this phase restructures which pool a primary hashes into and which drift amount applies, not the underlying mechanism.

**Done** — see [docs/specs/LFO_DRIFT_GROUPS.md](../specs/LFO_DRIFT_GROUPS.md) and [docs/tasks/LFO_DRIFT_GROUPS.md](../tasks/LFO_DRIFT_GROUPS.md) (superseding 10.2's single-pool spec). Confirmed shipped on `main`: `src/types/lfo.ts`'s `DriftGroupId = 'eq3' | 'filterLPF' | 'filterHPF' | 'robots'` and `DRIFT_GROUP_IDS` match this section's own 4-group description exactly; `src/engine/lfoDrift.ts` implements the per-group pools.

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

**Done** — see [docs/specs/ATTENUATION_STYLE_RENAME.md](../specs/ATTENUATION_STYLE_RENAME.md) and [docs/tasks/ATTENUATION_STYLE_RENAME.md](../tasks/ATTENUATION_STYLE_RENAME.md). Confirmed shipped on `main`: `attenuationStyleStore.ts`, `AttenuationStyleView.tsx`, and `types/attenuationStyle.ts` carry the renamed identifiers throughout.

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

## 10.5 Company Assignment: Select → RadioButton

Inserted out of sequence, following 10.1–10.4's own precedent (not renumbering later phases). Not
derived from the roadmap draft — raised directly by Crawford during review, confirmed via
`/interview-me`. Source of intent: [docs/intent/company-assignment-radio.md](../intent/company-assignment-radio.md).

### Restructure

- The robot→company assignment `Select` dropdown, at both real call sites (`RobotSelectionCard`,
  `RobotDisplaySection`), replaced by `RadioButton` — Freelance first, then every company in order,
  the same option order `Select` already used. `assignRobotToCompany` and every other piece of the
  company data flow are unchanged; this is a control-type swap only.
- `Select` removed entirely — component, schema, tests — taking the Design System's live primitive
  count from 15 back to 14. `Select`'s own Phase 10 addition is undone; `DirectionalPanel`, added
  after `Select`, is unaffected and remains at 14 alongside the original 13.

**Done** — see [docs/specs/COMPANY_ASSIGNMENT_RADIO.md](../specs/COMPANY_ASSIGNMENT_RADIO.md) and
[docs/tasks/COMPANY_ASSIGNMENT_RADIO.md](../tasks/COMPANY_ASSIGNMENT_RADIO.md). Shipped as scoped —
`buildCompanySelectSchema` renamed to `buildCompanyAssignmentSchema` (returning a `RadioButtonSchema`),
both real consumers converted, `Select.tsx`/`.css`/`.test.tsx` deleted, `SelectSchema` removed from
`controls.ts`/`CONTROL_SCHEMA_TYPES`. One follow-up addition beyond the original scope, also
confirmed directly with Crawford mid-implementation: `RadioButton` now pops each option on
`mouseEnter`/`mouseLeave` too, matching `Button`'s own hover-pop feedback — reversing
[11.1.6](#1116-oblique-cabinetry-radiobutton)'s original "no hover/partial-pop on unselected
options" exclusion, and applying to every `RadioButton` consumer app-wide (the primitive has no
per-instance variant), not just the two company-assignment rows. See
`docs/specs/OBLIQUE_CABINETRY_RADIO_BUTTON.md`'s own post-ship amendment note and
`docs/COMPONENT_LIBRARY.md`'s `RadioButton` section for the up-to-date behavior.

### About

A UI preference against dropdowns for this one interaction, not a data-model concern — surfaced
while reviewing the app with the Oblique Cabinetry series (11.1.1–11.1.9) freshly in progress, which
is what caught the conflict with 11.1.8 (below) before that item's own work began.

### Docs

- `docs/COMPONENT_LIBRARY.md` updated: primitive count 15 → 14, `Select`'s table row and its own
  subsection removed.
- `docs/COMPANIES.md`'s "Company Membership" section updated for `RadioButton`.
- `CLAUDE.md`'s reference bullet needed no edit — it already read "14," stale since `DirectionalPanel`
  shipped (14→15, never updated), made accidentally correct again by this phase's own removal
  (15→14). See `docs/specs/COMPANY_ASSIGNMENT_RADIO.md` §1.5.

## 11. Console Theming — Cut

Originally scoped and shipped as one combined phase with a 2.5D "Oblique Cabinetry" rendering system for the interactive primitives, folded together because Cabinetry's face colors consume this phase's own seed-driven tokens directly. Split back into two separate roadmap items during scoping (confirmed via `/interview-me`, see [docs/intent/console-theming.md](../intent/console-theming.md)); this phase (seed-driven color tokens alone) was then fully implemented — `consoleTheme.ts`'s bounded HSL generation, `contrastRatio.ts`'s exhaustive WCAG-AA proof, `Tablet.tsx` wiring, the `Console.css`/`SleeveContainer.css` fixes — and evaluated against the real running app. **Cut at Crawford's call, not reverted for a bug**: the WCAG-safety-for-every-seed guarantee forced the structural tier into a narrow, same-y lightness band and pushed the accent tier too light/vivid to guarantee its own contrast margin — a tension structural to "provably safe for every seed" fighting "visually distinct per seed," not something a bounds-tuning pass could resolve. Replaced with a hand-picked static palette instead. Full retrospective, what was tried, and directions worth trying if this gets revisited: [docs/CONSOLE_THEMING.md](../CONSOLE_THEMING.md). The original Create/Restructure/About/Docs sections describing the seed-driven design are preserved below the cut line for historical reference; treat them as describing what was tried, not current or planned behavior.

### Docs

- `docs/CONSOLE_THEMING.md` rewritten to record the cut, the reasoning, and what replaced it.
- `docs/intent/console-theming.md`, `docs/specs/CONSOLE_THEMING.md`, `docs/tasks/CONSOLE_THEMING.md` kept as-is, as a historical record of what was actually tried (bounds, variety technique, everything) — each now carries a pointer to the cut status rather than being rewritten.
- CLAUDE.md's reference-doc entry for `docs/CONSOLE_THEMING.md` updated to match.
- **Phase 11.1 originally described Cabinetry's face-shading as consuming this phase's *seed-driven* tokens — that premise no longer held once the tokens went static.** Resolved when 11.1 was split into the 11.1.1–11.1.5 series below: 11.1.1 now points face-shading at the actual static "Ballast" tokens (`--color-accent`/`--color-surface`) instead.

<details>
<summary>Original Phase 11 content (seed-driven design, as tried — historical reference only)</summary>

### Create

- Pure seed-to-theme module (e.g. src/utils/consoleTheme.ts, alongside seedUtils.ts/getSeededVal.ts) computing bounded, legible HSL values — large/structural tokens (`--color-bg`, `--color-surface`) from the active AS seed; small/accent tokens (`--color-accent`, `--color-border`) from the active locale's coordinate seed. `--color-text-primary`/`--color-text-muted` stay fixed, not seed-derived — legibility for the body/label text read throughout every drawer wins over full-palette variety.
- Wiring so retransmitting a seed in Sector Settings (Phase 5) recomputes and visibly updates the theme
- Respect `prefers-reduced-motion` on the retransmit transition (color change), following the same `@media (prefers-reduced-motion: reduce)` pattern already used in PowerRockerSwitch.css — the new theme still applies, it just snaps instead of animating

### Restructure

- The CSS custom properties in src/index.css (`--color-bg`, `--color-surface`, `--color-border`, `--color-accent`) become the seed-driven output target, replacing today's static Vite-default values. `--color-text-primary`/`--color-text-muted` are unchanged.

### About

This phase gives the console itself a seed-derived visual identity, split by scale rather than by physical part: the AS seed drives large/structural areas — large background regions inside the Glass — while the active locale's coordinate seed drives small accent elements wherever they sit, buttons/borders on the Glass-side chrome (body/label text stays fixed for legibility). Colors stay bounded and legible the same way robot color generation already is (see ROBOT_DESIGN.md), verified against WCAG AA (4.5:1 normal text / 3:1 large text/UI components) for every possible seed, not just typical ones — this is real interactive chrome sitting on a fixed dark background, not a decorative shape a bad roll can shrug off. Retransmitting a new seed in Sector Settings (Phase 5) visibly recolors the console, reinforcing the same "this is a piece of field equipment reporting what it's tuned to" fiction the rest of the console already leans on (SYSTEM_FIRMWARE_RESETS, the power-off confirm, etc.). Because the theme is a pure function of the seed and coordinates already being persisted by Sector Settings, it needs no separate storage of its own — Session Storage (Phase 12) restoring the seed automatically restores the look. Out of scope here: WorldView/terrain/sky styling (deferred to v2), robot visuals (locked to audio attributes per CLAUDE.md, untouched by this phase), the power rocker switch and the rest of the Sleeve casing (out of scope for now — see docs/CONSOLE_THEMING.md), and the Oblique Cabinetry rendering system itself (Phase 11.1.1–11.1.5).

</details>

## 11.1.1 Oblique Cabinetry: Foundation & Button

Split out of the original single "Oblique Cabinetry UI" item — which scoped all 7 Design System primitives (`Button`, `Toggle`, `SliderLinear`, `SliderLog`, `SliderCenteredZero`, `Stepper`, `StepperWithToggle`) plus the voxel-track slider rendering as one phase — into a sequence of smaller items, one per component, so each ships and reviews independently. `Stepper`/`StepperWithToggle` are dropped from Cabinetry scope entirely: neither has a live consumer today (`docs/COMPONENT_LIBRARY.md` — Phase 10.2 moved their former use cases to `SliderLinear`), so a cosmetic system for controls nothing renders isn't worth scoping now; revisit if either gets a real consumer again. This item also resolves a stale premise carried over from the original combined draft: face-shading consumes Console Theming's actual static "Ballast" tokens (`--color-accent`/`--color-surface`, `src/index.css`) rather than the seed-driven tokens Phase 11 shipped and then cut (see `docs/CONSOLE_THEMING.md`). **Done** — see [docs/intent/oblique-cabinetry-foundation.md](../intent/oblique-cabinetry-foundation.md), [docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md](../specs/OBLIQUE_CABINETRY_FOUNDATION.md), and [docs/tasks/OBLIQUE_CABINETRY_FOUNDATION.md](../tasks/OBLIQUE_CABINETRY_FOUNDATION.md). Confirmed shipped on `feature/cabinetry-foundation`: `CabinetBox.tsx`/`.css` and `Button.tsx`/`.css` carry the described behavior, including the pop-proportional glow and sharp front-face corners added after a real visual pass (not part of the original spec draft — see the spec's own § 1.8), plus a resize-flicker fix and a CSS/JS duplication collapse both found by a `code-review-and-quality` pass afterward (spec § 1.9 and § 1.3 respectively).

### Create

- **Cabinet-box rendering primitive**, shared by every remaining 11.1.x item — an SVG overlay stacked on a primitive's existing Radix/native element (`Slider.Root`/`Track`/`Thumb`, `Switch`/`Toggle` root, `<button>`), `pointer-events: none`, reading that element's own `value`/`checked`/focus state as props to drive its pop/fill animation. **The underlying interactive element stays exactly as-is and keeps doing 100% of the real interaction** — pointer events, drag, keyboard, focus ring, ARIA state — never owning a hit-area itself. Same technique `SliderCenteredZero` already uses for its zero-anchored fill (`docs/COMPONENT_LIBRARY.md`), generalized rather than reinvented. Opaque Top Face and Left Face `<polygon>`s anchor to a fixed footprint and GSAP-morph their points (~250ms, `power2.out`) to bridge the gap as the front face travels along a fixed 2:1 projection vector (2px right per 1px down); labels/text live inside the front face's own `<g>` so they slide with it for free. This *is* the "stationary hit box" the geometry needs — the front face slides as a pure visual while the real interactive element underneath never moves, which is what prevents hover flutter (an element sliding away from the cursor and re-triggering its own hover state), a side effect of keeping Radix in charge rather than a separate mechanism to build.
- **Face-shading** deriving the Top/Left Face polygons' lighter/darker fill from the existing `--color-accent` token via CSS `color-mix()`, computed at render time — no new CSS custom properties, no JS helper module (superseded this Create bullet's original `src/utils/cabinetShading.ts` illustrative filename; resolved as pure CSS during the spec pass, reusing `docs/specs/CONSOLE_THEMING.md § 1.3`'s own `color-mix()` precedent instead).
- **`Button` cabinet behavior**, the foundation's first real consumer: a single box per control. Box width is variable, sized to the button's own content; height is 32px (mobile) / 40px (tablet) / 48px (desktop). Off state rests fully flat (0px offset, side walls collapsed); active/hover/focus/click pops fully out along the 2:1 vector, a **fixed** magnitude (`CABINET_POP_DISTANCE` down, double that right — `src/utils/cabinetGeometry.ts`) — not scaled by box height, corrected after implementation once seen rendered (the original height-scaled version read as far too much protrusion at the 40/48px tiers), then tuned by feel more than once since. This doc doesn't restate the exact current distance — it's still being tuned; read the source constant, not this line, for the real number. The clickable/touchable area originally extended to cover the full popped-out footprint too (CSS padding, matching that fixed distance exactly — 2×/1× the constant, not the box height); **removed 2026-09-09** (confirmed via `/interview-me`, see `docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md § 1.6`'s post-implementation correction) in favor of a static backing layer showing through a translucent popped facade — the hit target is now exactly the flat-state box, not the popped one. The front face carries no `border-radius` — sharp corners, added after a real visual pass, matching the walls' own straight-edged geometry (a rounded front panel on straight walls read as inconsistent once actually seen rendered); its background is accent-tinted (`--color-accent`), not surface-tinted, since it carries real text — also 2026-09-09, scoped to `Button` alone (`docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md § 1.4`'s correction).
- **Pop-proportional glow**, added the same visual pass: the walls (the "back" of the box, not the moving front face) glow via `filter: drop-shadow()`, scaled by a `--cabinet-glow` CSS custom property tweened `0→1` by the same GSAP timeline that drives the pop offset — so the glow tracks exactly how far the box has popped, not a separately-eased effect. Set on a shared wrapper element (not the front face) so the walls, a *sibling* of the front face rather than its descendant, can inherit it via CSS custom property cascade. Full rationale: `docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md § 1.8`.
- **No animation replay on a width/boxHeight-only change** — found by code review, not the manual visual pass (that kind of flicker only shows up on a *dependency* change during an *unrelated* interaction, e.g. resizing the window across a breakpoint while a button is still focused, which a pop-in/pop-out check alone won't exercise). `CabinetBox` now tracks the `popped` value its geometry effect last actually ran for and only replays the animated tween on a real transition; a dependency-only re-run repositions instantly instead. `Toggle`/the sliders inherit this fix for free via the shared primitive — worth remembering it needs to be *kept*, not silently lost if that effect shape gets copied and simplified. Full rationale: `docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md § 1.9`.
- **The breakpoint/pop-distance CSS duplication was collapsed to one JS source**, not just documented more carefully — also found by code review, after `CABINET_POP_DISTANCE` alone had gone stale in prose three times as it was retuned by feel. `CabinetBox` now applies `--cabinet-box-height`/`--cabinet-pop-distance` as inline custom properties computed directly from the JS constants; `CabinetBox.css` no longer redeclares either independently via `@media` rules. Full rationale: `docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md § 1.3`.

### Restructure

- `Button` (`src/components/ui/controls/`) re-renders internally through the cabinetry system — same `schema`/`onClick` props contract as today (`ControlSchema` union unchanged), so no domain config file needs to change.
- Every cabinet pop/collapse and wall-polygon morph runs as a GSAP timeline registered in `timelineMap` (`setTimeline`/`killTimeline`), following `AccordionContainer`'s existing pattern (`docs/COMPONENT_LIBRARY.md`) — no timeline state in Zustand or React state, and (per CLAUDE.md's Strict Separation guardrail) the timeline only drives the cosmetic pop/morph, never calls `AudioEngine` — `onClick` still fires straight from the native `<button>`'s own handler, since the underlying interactive element never changed.

### About

Establishes the cabinet-box visual language — flat and inert at rest, extruding toward the user when active — as a reusable mechanism rather than a per-primitive reimplementation, proved out on the primitive with the least surface area (one box, two states, no voxel-track) before 11.1.2–11.1.5 each wire it into a more involved primitive. The stationary-hit-box rule (front face slides, back frame never does, and only the back frame is ever listened to) is the load-bearing constraint that keeps hover state stable during the slide animation — a correctness rule, not a style preference, and true of every later item too. `CabinetBox` as shipped — geometry, face-shading, glow, and sharp corners together — is the reference example every later 11.1.x item's own cabinet box should match, confirmed explicitly by Crawford after a real visual pass, not just the geometric fundamentals. Out of scope here: `Toggle` and every slider (11.1.2–11.1.5), `Stepper`/`StepperWithToggle` (dropped, see above), the actual per-row box-count/layout question (resolved by 11.1.3's self-fitting box count, not deferred to a separate later phase after all), WorldView/terrain/sky styling, robot visuals (locked to audio attributes per CLAUDE.md), and the power rocker switch/`SleeveContainer` (out of scope for now — see `docs/CONSOLE_THEMING.md`).

### Docs

- `docs/CONSOLE_THEMING.md` gains the cabinet geometry/projection-vector/face-shading/glow rules — done, shipped alongside `docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md`.
- `docs/COMPONENT_LIBRARY.md` gains a note once this item ships: `Button`'s internal rendering changed (cabinet SVG/GSAP instead of flat markup) while its `ControlSchema`/props contract stayed identical — done.

## 11.1.2 Oblique Cabinetry: Toggle

Wires `Toggle` into the cabinet-box mechanism 11.1.1 built — the second and last single-box (non-voxel-track) consumer. Depends on 11.1.1 having shipped. **Done** — see [docs/intent/oblique-cabinetry-toggle.md](../intent/oblique-cabinetry-toggle.md), [docs/specs/OBLIQUE_CABINETRY_TOGGLE.md](../specs/OBLIQUE_CABINETRY_TOGGLE.md), and [docs/tasks/OBLIQUE_CABINETRY_TOGGLE.md](../tasks/OBLIQUE_CABINETRY_TOGGLE.md). Confirmed shipped on `main` (PR #431): `Toggle` renders through `CabinetBox` as described below, and `CabinetBox` itself gained the `boxHeight`/optional-`children` additions this item needed — both later reused unchanged by 11.1.3's `VoxelTrack`.

### Create

- **`Toggle` cabinet behavior**: the same single-box pop/flat mechanism as `Button` (11.1.1) — same footprint math, same fixed 2:1 vector (`CABINET_POP_DISTANCE`-based, not scaled by box height — see 11.1.1's own correction above), same flat-footprint hit area (11.1.1's 2026-09-09 correction removed the padding-based extension for both — see above), **same pop-proportional glow and sharp (no `border-radius`) front-face corners** (11.1.1's `CabinetBox` already provides both for free via the shared primitive — nothing Toggle-specific to build for either; Toggle's own bare, textless box keeps the `--color-surface` default rather than `Button`'s accent-tinted override) — but keyed off the control's `checked`/`active` value instead of a momentary click. Popped-out is the resting "on" state, not a transient click response; flat is "off."

### Restructure

- `Toggle` (`src/components/ui/controls/`) re-renders internally through the cabinetry system — same `schema`/`value`/`onChange` contract as today. Its existing `isActive` CSS hook (`docs/COMPONENT_LIBRARY.md`) continues to reflect the same `active` value the cabinet box now also reads.
- Same `timelineMap` registration and Strict Separation constraint as 11.1.1 — `onChange` still fires straight from Radix's `Switch`/toggle root, never from the cabinet timeline.

### About

Confirms the foundation generalizes past its first consumer with no new mechanism, only a different state source (`checked` vs. a momentary click) — the real test of whether 11.1.1's primitive is actually reusable rather than Button-shaped. Out of scope here: every slider (11.1.3–11.1.5), `Stepper`/`StepperWithToggle` (dropped, see 11.1.1), and the same layout/WorldView/robot-visual/Sleeve exclusions as 11.1.1.

### Docs

- `docs/COMPONENT_LIBRARY.md` gains the same "internal rendering changed, contract didn't" note for `Toggle` once this item ships.

## 11.1.3 Oblique Cabinetry: SliderLinear (Voxel-Track Foundation)

Wires `SliderLinear` into the cabinet-box mechanism and, alongside it, builds the voxel-track rendering shared by all 3 sliders (`SliderLinear`, `SliderLog`, `SliderCenteredZero`) — a genuinely different rendering shape from Button/Toggle's single box, so it's built once here rather than three times. 11.1.4 and 11.1.5 each wire this same voxel-track system into their own primitive as thin follow-ups. Depends on 11.1.1 having shipped (reuses its cabinet-box primitive and face-shading helper). Confirmed via `/interview-me` — source of intent: [docs/intent/oblique-cabinetry-slider-linear.md](../intent/oblique-cabinetry-slider-linear.md).

**Done** — see [docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md](../specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md) and [docs/tasks/OBLIQUE_CABINETRY_SLIDER_LINEAR.md](../tasks/OBLIQUE_CABINETRY_SLIDER_LINEAR.md). Confirmed shipped on `main` (PR #433): `VoxelTrack`/`voxelTrackMath.ts` exist and `SliderLinear` renders through them exactly as described below, plus all 5 post-ship refinements the task doc's own "Post-ship refinements" section records (the extrusion-falloff/straddle-box redesign, the `skipMountAnimation` remount-flash fix, the hit-area/backing-layer change shared with 11.1.1, the trailing-reserve overflow fix, and the vertical-default infinite-loop fix) — all already on `main` as of this pass, not still pending.

### Create

- **Voxel-track rendering**: a row of uniform cabinet boxes replacing the traditional track+handle — 32×32px facades 8px apart (mobile), 40×40px at 10px apart (tablet), 48×48px at 12px apart (desktop). Box size and gap are fixed; **box count is not** — it's derived live from the slider's own container rather than authored per-schema or held to one flat constant app-wide.
- **Self-fitting box count**: a `ResizeObserver` on the slider's *parent* (never its own rendered element — self-observation would feed back into itself the moment the computed count changes the slider's own width, the same reasoning `useAutoSliderOrientation` already documents for orientation) fits as many fixed-size boxes as possible without overflowing, recomputed live on every resize. Composes with the existing `SliderOrientation` system rather than replacing it: `'horizontal'`/`'vertical'`/`'auto'` resolve exactly as they do today, and box-count-fitting then fills whatever length the *resolved* axis has — orientation answers "which way," this answers "how many." A container too narrow to fit even 3 boxes at the current breakpoint's size clamps to 3 and lets the row scroll/overflow, rather than shrinking boxes below their fixed size. **Post-implementation correction, 2026-09-09:** the fit originally left no room for the last (nearest-max) box's own pop-out bleed, so a container whose width happened to land on an exact multiple of `(boxSize + gap)` visibly overflowed at value 100% (found live — Limiter/Tempo/Automatic Effects) — a `computeVoxelTrackTrailingReserve(axis)` reserve is now subtracted before fitting and re-added when sizing `Slider.Root`. See `docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md § 1.13`. **Second post-implementation correction, same day:** the *vertical* case's own "live-measure the parent" fallback (used whenever `verticalHeight` is omitted, which is every real caller today) was genuinely circular for any parent whose height auto-sizes to its content — an infinite resize loop, found live for both `orientation: 'auto'` and explicit `orientation: 'vertical'` schemas. Fixed by defaulting to a fixed `VOXEL_TRACK_DEFAULT_VERTICAL_HEIGHT` (256px, restoring `docs/specs/VERTICAL_SLIDERS.md`'s own original non-measuring default) instead of falling through to live measurement. See `docs/specs/OBLIQUE_CABINETRY_SLIDER_LINEAR.md § 1.14`.
- **Dual-fill value readout**: every box fully below the current value renders 100% `--color-accent` on its front face; every box fully above renders 100% inactive-color; the one box straddling the exact value is hard-split between the two at the local percentage within that box.
- **Extrusion-falloff**: the straddling box pops fully out (`popT: 1` against the same fixed `CABINET_POP_DISTANCE`/2:1 vector every Cabinetry item uses — not a box-height-scaled amount; 11.1.1 itself moved off height-scaling to a fixed distance before this item was specced, see `docs/specs/OBLIQUE_CABINETRY_FOUNDATION.md § 1.2`); boxes above it (toward the max, not yet filled) stay flat; boxes below it (toward the min, already filled) step down in equal decrements from the straddling box's 100% to 0% at the box nearest the minimum end, which does not extrude at all — the decrement scales with however many boxes currently sit below the straddling one, since that count is no longer fixed.
- **`SliderLinear` cabinet behavior**: the first consumer of the voxel-track system above, using the primitive's existing plain linear min/max mapping to place the straddling box and its local split percentage.

### Restructure

- `SliderLinear` (`src/components/ui/controls/`) re-renders internally through the voxel-track system — same `schema`/`value`/`onChange`/`disabled`/`verticalHeight` contract as today, including all 3 `SliderOrientation` values (`docs/COMPONENT_LIBRARY.md`).
- Same `timelineMap` registration and Strict Separation constraint as 11.1.1/11.1.2, extended to the per-box extrusion/fill transitions and the box-count refit — `onChange` still fires straight from Radix's `Slider.Root` drag/keyboard handling.

### About

The voxel-track mechanism built here is deliberately shared infrastructure, not `SliderLinear`-specific — 11.1.4 (`SliderLog`) and 11.1.5 (`SliderCenteredZero`) reuse it unchanged, swapping in only their own value-mapping math, so Volume, Detune, Gain, and every ADSR field still read as the same physical control family once all three ship. Because box count now self-fits to whatever container space a drawer's ordinary CSS gives a slider, this item fully resolves the "how many boxes fit in a given row" question — there's no separate later layout-rebuild phase left to decide it; a drawer's own row/grid sizing stays ordinary layout, untouched by this item. Same layout/WorldView/robot-visual/Sleeve exclusions as 11.1.1.

### Docs

- `docs/CONSOLE_THEMING.md` gains the voxel-track dual-fill/extrusion-falloff rules alongside 11.1.1's cabinet geometry notes.
- `docs/COMPONENT_LIBRARY.md` gains the "internal rendering changed, contract didn't" note for `SliderLinear`, plus a pointer to the shared voxel-track mechanism for 11.1.4/11.1.5 to reference rather than restate.

## 11.1.4 Oblique Cabinetry: SliderLog

Wires `SliderLog` into the voxel-track system 11.1.3 built. Depends on 11.1.3 having shipped. Confirmed via `/interview-me` — source of intent: [docs/intent/oblique-cabinetry-slider-log.md](../intent/oblique-cabinetry-slider-log.md).

**Done** — see [docs/specs/OBLIQUE_CABINETRY_SLIDER_LOG.md](../specs/OBLIQUE_CABINETRY_SLIDER_LOG.md) and [docs/tasks/OBLIQUE_CABINETRY_SLIDER_LOG.md](../tasks/OBLIQUE_CABINETRY_SLIDER_LOG.md). Scope ended up wider than this section's own original draft, resolved during the intent/spec passes rather than deferred: the interview surfaced a real architecture question the roadmap stub didn't address — `SliderLinear.tsx`'s inline `boxSize`/`gap`/`boxCount`/`trackLength`/`rootStyle` glue was extracted into a new shared hook, `useVoxelTrackSlider` (`src/components/ui/controls/`), and `SliderLinear.tsx` itself was retrofitted to call it, verified as a strictly behavior-preserving refactor (all 23 of its existing tests pass with a literal empty `git diff`) before `SliderLog` was allowed to depend on the same hook. `SliderLog`'s own box placement uses its normalized `t` (`sliderLogValueToT`'s output, the same value already fed to Radix's `Slider.Root`), not the raw log-scaled value against `schema.min`/`schema.max` — `voxelTrackMath.ts` assumes linear spacing, and only `t`-space is linear for a log curve. `verticalHeight` gained the identical fitting-budget semantics 11.1.3 already established for `SliderLinear`. `sliderLogMath.ts`'s own curve is untouched.

### Create

- **`SliderLog` cabinet behavior**: the same dual-fill/extrusion-falloff voxel-track rendering as `SliderLinear`, with the straddling box and local split percentage placed using the primitive's existing epsilon-floor log curve (`sliderLogMath.ts`, `docs/COMPONENT_LIBRARY.md`) instead of a plain linear mapping — no new value-mapping logic, just feeding the existing curve's output into 11.1.3's box-placement math.

### Restructure

- `SliderLog` (`src/components/ui/controls/`) re-renders internally through the voxel-track system — same `schema`/`value`/`onChange`/`disabled`/`verticalHeight` contract as today.

### About

Confirms the voxel-track mechanism generalizes across value-mapping curves with no new rendering logic, only a different `t → value` function feeding the same box-placement math — the intended shape of 11.1.3's split. Same layout/WorldView/robot-visual/Sleeve exclusions as prior items.

### Docs

- `docs/COMPONENT_LIBRARY.md` gains the "internal rendering changed, contract didn't" note for `SliderLog`.

## 11.1.5 Oblique Cabinetry: SliderCenteredZero

Wires `SliderCenteredZero` into the voxel-track system 11.1.3 built. Depends on 11.1.3 having shipped; not yet interviewed/specced. Unlike 11.1.4, this isn't a pure drop-in: `SliderCenteredZero`'s fill is zero-anchored, not min-anchored (`sliderCenteredZeroMath.ts` computes the zero point generally, not hardcoded to 50%), so 11.1.3's "below/above the current value" dual-fill rule needs to become "below/above the zero point, then further split by which side of zero the current value sits on" — the exact voxel-level adaptation is left open here, to be worked out during this item's own spec-driven-development pass rather than settled at roadmap level.

**Done** — see [docs/intent/oblique-cabinetry-slider-centered-zero.md](../intent/oblique-cabinetry-slider-centered-zero.md), [docs/specs/OBLIQUE_CABINETRY_SLIDER_CENTERED_ZERO.md](../specs/OBLIQUE_CABINETRY_SLIDER_CENTERED_ZERO.md), and [docs/tasks/OBLIQUE_CABINETRY_SLIDER_CENTERED_ZERO.md](../tasks/OBLIQUE_CABINETRY_SLIDER_CENTERED_ZERO.md). The adaptation the roadmap left open above resolved to a fixed dead-center seam (`Math.floor(boxCount / 2)`, never the schema's own proportional zero point) rather than a proportional split — `voxelTrackMath.ts` gained a sibling function, `computeVoxelBoxStatesCenteredZero`, that reuses `computeVoxelBoxStates` per side (the negative side reversed) rather than a new independent formula. Box count is forced even (`computeEvenBoxCount`, floored at a new `VOXEL_TRACK_MIN_BOX_COUNT_EVEN` of `4`) via a small, additive `forceEven` option on `useVoxelTrackSlider`; extrusion-falloff is per-side via 2 new optional fields on `VoxelBoxState` that `VoxelTrack.tsx` prefers when present, falling back to its existing whole-row behavior otherwise. `sliderCenteredZeroMath.ts` (the pre-Cabinetry `computeFillRect`/`zeroPointPercent`/`valuePercent`) is deleted. This is the last of the 3 voxel-track sliders — `VoxelTrack.tsx`/`voxelTrackMath.ts`/`useVoxelTrackSlider` are now exercised by all 3 intended consumers (`SliderLinear`, `SliderLog`, `SliderCenteredZero`) and should be treated as stable, closed infrastructure going forward.

### Create

- **`SliderCenteredZero` cabinet behavior**: the voxel-track rendering adapted to a zero-anchored fill instead of a min-anchored one — the box(es) spanning from the zero point to the current value read as "filled" (100% `--color-accent`), the remainder as inactive, with the same hard-split-straddling-box and extrusion-falloff rules as 11.1.3 applied relative to that filled span rather than the track's min end.

### Restructure

- `SliderCenteredZero` (`src/components/ui/controls/`) re-renders internally through the voxel-track system — same `schema`/`value`/`onChange`/`disabled`/`verticalHeight` contract as today.

### About

The last of the 3 sliders and the one genuine adaptation of 11.1.3's mechanism, not just a swapped-in math function — worth flagging in review as the item most likely to surface an actual voxel-track design gap (e.g. what an all-zero or value-crosses-zero-mid-box state looks like) rather than a straightforward wiring pass. Same layout/WorldView/robot-visual/Sleeve exclusions as prior items.

### Docs

- `docs/COMPONENT_LIBRARY.md` gains the "internal rendering changed, contract didn't" note for `SliderCenteredZero`.
- `docs/CONSOLE_THEMING.md`'s voxel-track section (added by 11.1.3) gains the zero-anchored adaptation once this item resolves it.

## 11.1.5.1 Oblique Cabinetry: SliderLinear vertical box verification

Inserted out of sequence, not renumbering later phases (same pattern as 10.1–10.4 and 11.2). Real vertical `SliderLinear` consumers exist today (`robotOptionsConfig.ts`'s per-layer Gain/Phase/Interval sliders, all `orientation: 'vertical'`), but vertical voxel-track box sizing/layout has never been manually verified against one — `useVoxelTrackBoxCount.ts`'s own comment ("No real vertical `SliderLinear` consumer exists yet to verify a self-observing fix against, so this stays conservative") predates those config entries and was never revisited once they landed. Depends on 11.1.3 having shipped (it has); not yet interviewed/specced — the exact scope (what's actually broken, if anything, and whether "stays conservative" should change now that a real consumer exists to test against) is left open here.

**Done** — confirmed via `/interview-me`, 2026-09-10 (no separate intent/spec/tasks docs; a verification-pass finding, not a new feature). The manual check found one real bug: `CabinetBox`'s `left-face` wall (`src/components/ui/controls/CabinetBox.tsx`) hardcoded its height to the full `boxHeight` regardless of `frontHeight`, so a vertical straddle box's wall stayed full-size and, anchored to its own (correctly-sized, smaller) wrapper, visibly slid up/down as the dragged value changed `frontHeight` instead of shrinking in place. Fixed by sizing the wall to `frontHeight ?? boxHeight` directly — no live measurement needed, since `frontHeight` is already the caller's own known synchronous value. Because the fix lives in shared `CabinetBox`, it also resolved the identical bug for `SliderLog` (11.1.5.2) and `SliderCenteredZero` (11.1.5.3) in the same change — see those items. Verified live against `robotOptionsConfig.ts`'s per-layer Gain/Phase/Interval. `useVoxelTrackBoxCount.ts`'s vertical parent-observation conservatism was also checked against these real consumers and confirmed to already read correctly as shipped — no self-observation fix needed; its own stale "no real consumer yet" comment updated to reflect that. See `docs/CONSOLE_THEMING.md`'s "Voxel-track sliders" section for the full derivation.

### Create

- Nothing new by default — this is a verification pass first. A fix only if the manual check below actually finds one.

### Restructure

- Likely candidates, pending findings: `useVoxelTrackBoxCount.ts`'s vertical-measurement conservatism (parent-observation vs. self-observation, per its own comment above) revisited against a real consumer; `VoxelTrack.css`'s column-reverse box ordering/gap/sizing checked in the real running app (Robot Options drawer's Gain/Phase/Interval sliders), not just in jsdom.

### About

- Same category of gap 11.1.5's own `flipStraddleFill` bug surfaced for the horizontal axis — invisible to the automated test suite by construction (jsdom applies no real layout), findable only by eye. Vertical's `column-reverse` (min-at-bottom) is a genuinely different DOM-to-visual mapping than horizontal's `row` (min-at-left), so nothing about the horizontal fix guarantees the vertical axis is even self-consistent, let alone correct. Same layout/WorldView/robot-visual/Sleeve exclusions as prior items.

### Docs

- `docs/CONSOLE_THEMING.md`'s "Voxel-track sliders" section gains a vertical-specific note if anything is found/fixed.
- `useVoxelTrackBoxCount.ts`'s own "no real consumer yet" comment updated to reflect current config reality either way — it's stale today regardless of what this item finds.

## 11.1.5.2 Oblique Cabinetry: SliderLog vertical box verification

Same shape as 11.1.5.1, for `SliderLog`. Real vertical consumers: `audioRigConfig.ts`'s Low-Pass/High-Pass Filter Frequency and Resonance (Q) sliders, all `orientation: 'vertical'`. Depends on 11.1.4 having shipped (it has); not yet interviewed/specced.

**Done** — same shared `CabinetBox` `left-face` wall fix as 11.1.5.1 (found and fixed there in one pass; see that item and `docs/CONSOLE_THEMING.md`'s "Voxel-track sliders" section for the full writeup), verified separately here against `SliderLog`'s own real vertical consumers: `audioRigConfig.ts`'s Low-Pass/High-Pass Filter Frequency and Resonance (Q). No `SliderLog`-specific issues found — `sliderLogValueToT`'s own `t`-space box placement reads correctly on the vertical axis.

### Create

- Nothing new by default — verification first, fix only if the manual check finds one.

### Restructure

- Likely candidates, pending findings: the same `useVoxelTrackBoxCount.ts` vertical-measurement question as 11.1.5.1 (shared by both sliders via `useVoxelTrackSlider`); `SliderLog`'s own `t`-space box placement (`sliderLogValueToT`) checked specifically on the vertical axis, since every one of its own tests to date exercises the math in isolation from real vertical layout.

### About

- Same rationale as 11.1.5.1 — this is the second of the 3 sliders sharing the same underlying vertical-fitting code path (`useVoxelTrackSlider`/`useVoxelTrackBoxCount`), so a finding here may also apply to `SliderLinear` (11.1.5.1) and vice versa; each item still gets its own real consumer checked rather than assuming one slider's result covers the others. Same layout/WorldView/robot-visual/Sleeve exclusions as prior items.

### Docs

- `docs/CONSOLE_THEMING.md`'s "Voxel-track sliders" section gains a vertical-specific note if anything is found/fixed, consolidated with 11.1.5.1's own note rather than duplicated.

## 11.1.5.3 Oblique Cabinetry: SliderCenteredZero vertical box verification

Same shape as 11.1.5.1/11.1.5.2, for `SliderCenteredZero` — and the most consequential of the three to check. Real vertical consumers: `audioRigConfig.ts`'s EQ3 Low/Mid/High and `robotOptionsConfig.ts`'s per-layer Detune, all `orientation: 'vertical'`. Depends on 11.1.5 having shipped (it has); not yet interviewed/specced.

**Done** — same shared `CabinetBox` `left-face` wall fix as 11.1.5.1, verified against `SliderCenteredZero`'s real vertical consumers: `audioRigConfig.ts`'s EQ3 Low/Mid/High and `robotOptionsConfig.ts`'s per-layer Detune. `flipStraddleFill`'s CSS `order`-swap was specifically re-checked against a real vertical `column-reverse` render (the concern this item's own "About" section raised) and confirmed still correct — the negative side's filled piece lands on the seam side as intended, no correction needed. See `docs/CONSOLE_THEMING.md`'s "Zero-anchored dual-fill" section.

### Create

- Nothing new by default — verification first, fix only if the manual check finds one.

### Restructure

- Likely candidates, pending findings: the shared vertical-fitting question (11.1.5.1/.2); and specifically, `flipStraddleFill`'s own CSS `order`-swap fix (11.1.5's own post-ship bugfix) has only ever been verified via jsdom attribute assertions (`data-flip` presence, the `states` array's own correctness) — never against a real vertical `column-reverse` render. The horizontal fix's own correctness was independently re-derived by hand during code review; the vertical case has not been.

### About

- The most consequential of the 3 vertical-verification items: `SliderCenteredZero` is both the newest voxel-track slider and the one whose most recent change (the dead-center-seam split, plus the `flipStraddleFill` bugfix) was reasoned about and tested primarily in horizontal terms. Confirming the seam still lands correctly, per-side falloff still ramps the right direction, and the flip fix still puts the filled piece on the correct (now top/bottom, not left/right) side for a real vertical EQ3/Detune slider is this item's actual point — not a formality. Same layout/WorldView/robot-visual/Sleeve exclusions as prior items.

### Docs

- `docs/CONSOLE_THEMING.md`'s "Zero-anchored dual-fill" section (added by 11.1.5) gains a vertical-specific note if anything is found/fixed.
- `docs/specs/OBLIQUE_CABINETRY_SLIDER_CENTERED_ZERO.md` gains a short addendum if the `flipStraddleFill` mechanism needed any correction for the vertical axis.

## 11.1.6 Oblique Cabinetry: RadioButton

Wires `RadioButton` into the cabinet-box mechanism. Radix's `ToggleGroup` renders one segment per `schema.options` entry, which puts this item closer in shape to `Toggle` (11.1.2) than to `Button`'s single momentary box or the sliders' continuous voxel-track — each segment is itself a discrete on/off state (selected vs. not), just N of them instead of one. Depends on 11.1.1 having shipped (reuses its cabinet-box primitive and face-shading) and reuses 11.1.2's state-keyed (not click-keyed) pop precedent; not yet interviewed/specced.

### Create

- **`RadioButton` cabinet behavior**: one `CabinetBox` per `ToggleGroup.Item` (one per `schema.options` entry), each keyed off whether it is the currently-selected value — popped for the selected option, flat for every other, generalizing 11.1.2's value-keyed (not momentary) pop from one box to N. Same fixed 2:1 vector, pop-proportional glow, and sharp front-face corners as every prior item, inherited from `CabinetBox` for free.
- **Row layout**: options render as a horizontal row of boxes, mirroring today's flat `ToggleGroup` row. Exact box sizing/spacing against option label content is left open here — `RadioButton` has no fixed box-count precedent the way the sliders' breakpoint-driven footprints do (`docs/reference/ROBOT_DATA_GRID.md`'s Audio Setting has 4 options, Layer Type and LFO Shape have their own counts) — to be settled during this item's own spec-driven-development pass.

### Restructure

- `RadioButton` (`src/components/ui/controls/`) re-renders internally through the cabinetry system — same `schema`/`value`/`onChange`/`disabled` contract as today. `disabled` continues to disable the whole `ToggleGroup.Root` at once (no per-item disabled), matching every other primitive's single `disabled` flag.
- Same `timelineMap` registration and Strict Separation constraint as every prior item — `onChange` still fires straight from Radix's `ToggleGroup.Root`, never the cabinet timeline. The existing deselect-to-empty guard (Radix's single-mode `ToggleGroup` emitting `''` when the active item is clicked again) is preserved unchanged.

### About

`RadioButton` is the fourth consumer of 11.1.1's foundation and the first with more than one box per control — closer in that respect to the voxel-track sliders (11.1.3) than to `Button`/`Toggle`, but discrete-option-keyed rather than continuous-value-keyed, so it reuses 11.1.2's "state, not click" pop rule per-box rather than 11.1.3's dual-fill/extrusion-falloff math — there's no "between two options" state to render, only "selected" or not. Unlike a slider, `RadioButton`'s box count isn't a free design choice self-fitted to available space (11.1.3) — it's fixed by `schema.options.length`, a domain value this item can't shrink or grow to fit a row. Whether a longer option set (still open — Audio Setting has 4, Layer Type and LFO Shape have their own counts) borrows 11.1.3's clamp-and-scroll fallback or needs its own answer is left to this item's own interview/spec pass, not yet numbered here. Same layout/WorldView/robot-visual/Sleeve exclusions as every prior item.

### Docs

- `docs/COMPONENT_LIBRARY.md` gains the "internal rendering changed, contract didn't" note for `RadioButton` once this item ships.

## 11.1.7 Oblique Cabinetry: AccordionContainer

Wires `AccordionContainer`'s trigger row into the cabinet-box mechanism — a single box wrapping the trigger's existing `+`/`−` indicator plus `DualLabel` content, popped when open and flat when closed, reusing 11.1.2's state-keyed pop rule (open/closed is exactly that shape: a persistent boolean, not a momentary click). The content panel's own existing GSAP height-tween expand/collapse is unchanged and out of scope — this item touches the trigger only. Depends on 11.1.1 having shipped; not yet interviewed/specced.

### Create

- **`AccordionContainer` trigger cabinet behavior**: the trigger's existing `+`/`−` indicator and `DualLabel` content move inside a single `CabinetBox`, keyed off the same local `open` state `AccordionContainer` already tracks — **not** `contentActive`, the status-light concept already removed entirely from this component (`docs/COMPONENT_LIBRARY.md`'s `AccordionContainer` section). Popped is open, flat is closed. Same fixed 2:1 vector, glow, and sharp corners as every prior item.
- The box's width spans the full trigger row — content-sized like `Button`'s variable width (11.1.1), not a fixed square like `Toggle`'s (11.1.2) — so the indicator+label content still reads as one clickable row rather than shrinking to a small square.

### Restructure

- `AccordionContainer` (`src/components/ui/controls/`) re-renders its trigger internally through the cabinetry system — same `schema`/`children`/`defaultOpen` contract as today. `handleValueChange`/`animateTo` (the existing content-height GSAP timeline) are unchanged; the trigger's own pop is a second, independent `timelineMap` entry, not a replacement for the content-height one.
- Per CLAUDE.md's Strict Separation guardrail, the trigger's cabinet timeline only drives its own pop/glow — `Accordion.Root`'s `onValueChange` still fires the open-state change directly, same as today.

### About

The first item to attach cabinetry to a control that already carries its own independent GSAP timeline (content expand/collapse) — proves the two timelines can coexist in `timelineMap` under distinct keys without either fighting the other, a pattern later items may need again if any future control wants both a pop animation and its own separate content animation. Same layout/WorldView/robot-visual/Sleeve exclusions as every prior item; the content panel and its inner children are explicitly untouched.

### Docs

- `docs/COMPONENT_LIBRARY.md`'s `AccordionContainer` section gains the same "internal rendering changed, contract didn't" note, scoped explicitly to the trigger.

## 11.1.8 Oblique Cabinetry: Select — Cut

**Cut before any implementation began, not reverted for a bug**: `Select` itself was removed by
[10.5](#105-company-assignment-select--radiobutton) — a UI preference against dropdowns for its one
real use (robot→company assignment) — so there is no longer a trigger to wire into Cabinetry. The
original scope below (a single state-keyed `CabinetBox` around `RadixSelect.Trigger`'s content) was
never built; preserved for historical reference only, the same way `## 11`'s own original content is
kept below its cut line.

<details>
<summary>Original 11.1.8 content (Select trigger cabinetry, as scoped — historical reference only, never implemented)</summary>

Wires `Select`'s trigger into the cabinet-box mechanism — a single box wrapping the existing `RadixSelect.Trigger` content (`RadixSelect.Value` plus the `▾` icon), popped while open and flat when closed. The open floating options panel (`RadixSelect.Content`, rendered through a `Portal`) is unchanged and out of scope, the same way `AccordionContainer`'s content panel stayed out of scope in 11.1.7. Depends on 11.1.1 having shipped; not yet interviewed/specced.

### Create

- **`Select` trigger cabinet behavior**: `RadixSelect.Trigger`'s content renders inside a single `CabinetBox`, content-sized like `Button`'s variable-width box (not a fixed square), popped while open — reusing the state-keyed precedent 11.1.2/11.1.7 established, since `Select`'s open state is exactly as persistent as `Accordion`'s — and flat when closed. Same fixed 2:1 vector, glow, and sharp corners as every prior item.

### Restructure

- `Select` (`src/components/ui/controls/`) re-renders its trigger internally through the cabinetry system — same `schema`/`value`/`onChange`/`disabled` contract as today. `RadixSelect.Portal`/`Content`/`Viewport`/`Item` markup for the open options panel is untouched.
- Same `timelineMap` registration and Strict Separation constraint as every prior item — `onValueChange` still fires straight from `RadixSelect.Root`.

### About

The third state-keyed (not momentary-click-keyed) consumer, after `Toggle` (11.1.2) and `AccordionContainer`'s trigger (11.1.7), and the first whose popped state is driven by Radix's own internal open/closed rather than a value this app's own state holds — confirms the mechanism doesn't care which side owns the boolean it reads. The options panel itself stays flat, unstyled markup, matching how `AccordionContainer`'s content panel stayed out of scope in 11.1.7 — Cabinetry styles triggers/controls, not floating or expanding content areas, a rule this item makes explicit for the first time rather than a new one. Same layout/WorldView/robot-visual/Sleeve exclusions as every prior item.

### Docs

- `docs/COMPONENT_LIBRARY.md` gains the "internal rendering changed, contract didn't" note for `Select`, plus the "Cabinetry styles triggers, not floating content" rule for future items to reference rather than restate.

</details>

## 11.1.9 Oblique Cabinetry: TextInput / CoordsInput

Wires `TextInput` into the cabinet-box mechanism. **Settled directly by Crawford, confirmed via `/interview-me`
(2026-09-10), not left to this item's own spec pass**: the `<input>` itself keeps acting exactly like a plain
input always has — typing, focus, caret, text selection, and `disabled` styling all completely untouched, no
new hover/focus/content-keyed pop or any other state-keyed pop added on top, and the box itself never reacts
to `disabled` either (always popped, purely decorative). `TextInput` gets [`DirectionalPanel`](specs/OBLIQUE_CABINETRY_DIRECTIONAL_PANEL.md)'s
own *facade boundary* (a single permanently-popped, non-animating `CabinetBox` wrapping `DualLabel` + the
field together, label inside the box) but explicitly **not** its nesting-context mechanism — every `TextInput`
instance always renders its own facade unconditionally, with zero awareness of what composes it. Source of
intent: [docs/intent/oblique-cabinetry-text-input.md](../intent/oblique-cabinetry-text-input.md). Depends on
11.1.1 and `DirectionalPanel`'s own Cabinetry treatment (shipped) having landed; not yet interviewed/specced
beyond this constraint.

### Create

- **`TextInput` cabinet behavior**: a single `CabinetBox` facade wraps `DualLabel` + the `<input>` together,
  `popped` a literal `true` (never a variable) plus `skipMountAnimation` — reusing `DirectionalPanel`'s own
  facade boundary (`docs/specs/OBLIQUE_CABINETRY_DIRECTIONAL_PANEL.md` §1), not `AccordionContainer`'s
  two-box split (11.1.7) or any prior state-keyed precedent. Unconditional and self-contained — no
  `DirectionalPanelNestingContext`-style mechanism, no per-instance opt-out; every real and future `TextInput`
  consumer (Company name, Sector Settings AS name, `CoordsInput`'s two fields, an eventual robot-detail name
  field) gets exactly the same single facade with no special-casing. The box must not obscure the native
  `<input>`'s own text/caret — `CabinetBox`'s existing `pointer-events: none` overlay convention (11.1.1)
  already guarantees this structurally, the same caret-cursor concern already resolved once for `Toggle`'s
  own empty box (`docs/specs/OBLIQUE_CABINETRY_TOGGLE.md`) — this item's own eventual spec pass should still
  confirm it explicitly for a real text-entry element, not assume the precedent transfers automatically.
- **`CoordsInput` needs no Create item of its own and no special-casing** — confirmed directly: it composes
  two `TextInput` instances with no rendering of its own beyond its own wrapping `DualLabel` and field row,
  and each inner `TextInput` renders its own facade exactly as it would standalone. The natural result is two
  independent popped boxes side by side (X, then Y) — a side effect of `CoordsInput`'s existing composition,
  not a deliberate design choice about `CoordsInput` specifically. Explicitly **not** `DirectionalPanel`'s
  "only the top-level instance gets a facade" pattern, even though the underlying nesting shape (one
  `ControlSchema`-driven component composing another) looks structurally similar.

### Restructure

- `TextInput` (`src/components/ui/controls/`) re-renders internally through the cabinetry system — same
  `schema`/`value`/`onChange`/`numeric`/`disabled` contract as today. `CoordsInput`'s own X/Y
  `TextInputSchema` construction and rounding/blank-guard logic are unchanged, and its own `.tsx` needs no
  edit at all — its two-box appearance falls out of `TextInput`'s own change with zero call-site changes.
- The facade never actually animates (literal `popped={true}` + `skipMountAnimation`) and never reads
  `disabled` — so, matching `AccordionContainer`'s own static facade instance and `DirectionalPanel`'s own
  facade, no real `timelineMap` tween is ever registered for it; the box still needs a `timelineKey` prop
  (required), used only for the harmless unmount `killTimeline` call.
- Same Strict Separation constraint as every prior item, though there's nothing left to separate here beyond
  the native `<input>`'s own existing `onChange` — no GSAP-driven state ever reaches it.

### About

The last of the 14 primitives to receive Cabinetry — `Stepper`/`StepperWithToggle` were already dropped (see
11.1.1), `Select` was cut entirely (see 11.1.8, above) rather than dropped from Cabinetry specifically, and
`DualLabel` is pure layout/display with no interactive hit box of its own and was never in scope. Previously
flagged, like 11.1.5 was, as the item most likely to surface a genuine design gap, since free text is the one
control shape in the entire inventory with no natural "popped" state precedent among 11.1.1–11.1.7's
click/value/open-keyed options — resolved by sidestepping that gap entirely rather than filling it: no new
pop-trigger mechanism, just `DirectionalPanel`'s existing static-facade *look*. Deliberately simpler than
`DirectionalPanel` itself, though: no nesting-context, because `TextInput` — unlike `DirectionalPanel`, which
is designed to nest arbitrarily deep — has no actual "box inside a box" problem to solve, only ever composed
by a handful of fixed call sites (`CoordsInput` today) that don't themselves need Cabinetry awareness. Same
layout/WorldView/robot-visual/Sleeve exclusions as every prior item.

### Docs

- `docs/COMPONENT_LIBRARY.md` gains the "internal rendering changed, contract didn't" note for `TextInput`
  once this item ships, describing the static per-instance facade (no pop-trigger rule to document, since
  there isn't one) and explicitly noting `CoordsInput` needed no code change of its own.

## 11.2 Cabinetry Verification: Accessibility & Performance

Follow-up to the 11.1.1–11.1.9 series, inserted the same way (out of sequence, not renumbering later phases), same as 10.1–10.4. Not a new feature — a dedicated verification pass once every Cabinetry item has actually shipped, before treating it as launch-ready.

### About

Cabinetry's design (each 11.1.x item's own Restructure section) keeps each primitive's real Radix element in charge of all interaction and hands accessibility semantics off to Radix "for free," rather than rebuilding hit-testing/focus/ARIA from scratch — but that's an architectural intent, not a verified outcome, and this is a change touching every interactive primitive in the app at once. This phase is the check: a real keyboard-only walkthrough of every drawer (Robot Options, Audio Rig, Sector Settings, Company Manager), confirming the focus ring stays visible against a fully popped-out cabinet box (not obscured by the front face's z-index), confirming tab order wasn't disturbed by the SVG overlay's own DOM position, confirming `prefers-reduced-motion` actually cancels every cabinet timeline (pop, wall-polygon morph, and the voxel dual-fill transition alike) rather than just the ones the primitive spec called out first-hand, and a screen-reader pass over the slider voxel tracks specifically (the visual dual-fill/extrusion state carries real information — current value, how close to min/max — that must still be available to `aria-valuenow`/`aria-valuetext` via the underlying Radix `Slider`, not just implied visually). Extended by 11.1.6–11.1.9's own additions to the same check: `RadioButton`'s multi-box row (focus/selection state legible across every segment, not just the first), `AccordionContainer`'s trigger-only box (confirming the trigger's own focus ring and the coexisting content-height timeline both still behave correctly alongside the new pop timeline) — `Select`'s own equivalent check no longer applies, since 11.1.8 was cut (10.5) before it was ever built — and whatever pop-trigger `TextInput`/`CoordsInput` lands on (confirming it doesn't fight native text selection or caret visibility, the same class of bug already found once for `Toggle`, `docs/specs/OBLIQUE_CABINETRY_TOGGLE.md`).

Bundled with the same pass rather than split into a separate item: a performance check across the primitive-heaviest screens (Audio Rig's seven effect blocks plus the Drift accordion, Robot Options' Signature Array with its per-layer LFO groups) now that every rendered slider/button/toggle carries its own GSAP timeline on top of whatever LFO-target-group/AccordionContainer timelines already existed — confirming that stacking hasn't reintroduced the kind of load 10.2's own spec flagged as a real constraint at "70-100+ primaries in a typical session," now compounded by a visual layer on every one of them.

### Docs

- docs/CONSOLE_THEMING.md gets a short "Verified" appendix once this phase completes, rather than a separate doc — recording what was checked and any fixes made, so the Cabinetry rules and their verification live in one place.

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
