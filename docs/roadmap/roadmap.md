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

- Console Theming (Phase 10) will later drive CSS custom properties by *scale* — large/structural tokens (backgrounds, casing) from the planet seed, small/accent tokens (buttons, text, borders) from the locale seed. Name and group new design tokens with that split in mind now, so Phase 10 doesn't have to rename or regroup anything this phase already established.

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
- Remove the Session and Composition console tabs and their placeholder stubs — Session becomes fully automated with no user-facing tile (its job is absorbed by the background persistence engine in Session Storage, Phase 11), and Composition is deferred to a future version

### Restructure

- Rewrite Hub Nav buttons, wire them up to content data files

### About

This phase replaces the legacy Hub navigation with a streamlined, data-driven navigation system that connects directly to our content files. We are stripping out all old hub navigation logic — including the Session and Composition stub tabs, which are dropped rather than rebuilt: Session's job is absorbed by Session Storage's background persistence engine (Phase 11), so there's nothing left for a tile to do, and Composition is deferred to a future version — and building a dedicated HubNav component container that maps over src/data/hubNavConfig.ts. Each button will be rendered using our schema-driven HubNavButton primitive, deriving its primary lore title, secondary human subtitle, and target screen directly from the strongly typed data file without any hardcoded labels or inline routing logic. The remaining hub tiles are Audio Rig (Phase 4), Sector Settings (Phase 5), and Robot Selection (Phase 8).

### Docs

- docs/UI_SHELL.md's "Planned Replacement: Hub Tiles" section becomes real for its tab→tile, surviving-tiles, and Session/Composition-dropped points — fold that content into "Console Navigation" (renaming the section) and delete the "not yet implemented" framing for those points specifically. The `robotOptions`/`robotEditor` points stay planned until Phases 7 and 9 land.

## 4. Audio Rig

### Create

- Update data files with all of those inputs
- Create layout

### About

This phase populates our data engine with the complete global audio processing inventory and builds the corresponding Audio Rig drawer interface — and, unlike earlier drafts of this phase assumed, wires it live rather than leaving it as a presentational scaffold. We are populating src/data/audioRigConfig.ts with strongly typed ControlSchema definitions for all seven global effect blocks, in signal-chain order (3-Band EQ, Low-Pass Filter, High-Pass Filter, Delay, Reverb, Compressor, and Limiter — Chorus was cut entirely partway through this phase, judged the wrong effect for this music, and Limiter added in its place), specifying precise logarithmic bounds, center-zero offsets, units, default values, LFO modulation flags, and lore/human label pairings. Using these schemas, we are constructing the AudioRigDrawer layout, utilizing Accordion containers for each effect module and mapping over parameter schemas with our UI primitives. Because the Web Audio side of this (AudioEngine.setGlobal*/setEffectBypass/setGlobalBypass, and lfoEngine for modulation) already exists from Phase 0, every control in the drawer is wired straight through to it — dragging a slider audibly changes the effect, and per-effect and rig-wide bypass toggles genuinely silence and visually disable their scope, rather than leaving that binding for a later phase. A rig-level Decay toggle swaps the Compressor's position in the chain between "Natural Decay" (default — after Delay and Reverb, so their tails ring out uncompressed) and "Controlled Decay" (before both, tightening them); the toggle's own visible label always names the currently active state. The seven parameters the grid flags LFO-modulatable each get a nested LFO control wired to lfoEngine (Limiter, Compressor, Reverb, and Delay's own delayTime never get one — no LFO target exists for any of them), and global LFO settings (shape/rate/depth, plus whether each one starts already active) are now seeded per planet the same way the rest of the global effect chain is — a planet can load with real modulation already audible before anything is touched. Each effect's own `enabled` state is genuinely seeded too, not forced on: every effect loads active except Delay, which has roughly a 1-in-4 chance of loading already bypassed.

## 5. Sector Settings

### Create

- Update data files with inputs
- Create Layout

### About

This phase defines the data configurations and layout for the Sector Settings view, allowing users to reseed the global planet environment and jump to specific plot coordinates. We are populating src/data/sectorSettingsConfig.ts with control schemas and preset lists for two main operational panels: Planet Calibration (seed entry, retransmit trigger, and promoted or random seed presets) and Plot Tuning (X and Y coordinate entry, retransmit trigger, and promoted or random locale presets). Using these schemas, we are building SectorSettingsDrawer.tsx to render a status readout header displaying the active plot and planet seed, followed by the calibration and tuning sections using our established UI primitives (TextInput, CoordsInput, Button, and DualLabel). All controls will draw their lore and human labels from the data config, creating a clean, schema-driven sector control panel ready for coordinate seeding logic in later phases.

### Known Issue

- Simplex noise collapses to a **low-entropy result at "clean" aligned coordinates** — not just `(0, 0)`, a whole class of coordinates. Verified directly against `simplex-noise`/`alea` with 8 different seeds: `(0, 0)` gave exactly `0` for all 8 (a true dead zone, every seed identical); `(0.5, 0.5)` gave only 3 distinct values across 8 seeds; `(1, 1)` gave 5; even `(3.7, -8.2)` only gave 6. A higher-precision, non-aligned point like `(12.3456, 67.891)` gave 8/8 distinct values. `localeStore.ts`'s `DEFAULT_LOCALE.coordinates` used to sit exactly on the worst case (`0, 0`) — now fixed to a verified-safe point — so the default locale's noise map was invariant to the planet seed, masked until now because the default planet name was itself a fixed literal ("Pelagos"), not because the locale ever actually varied. **This directly threatens Plot Tuning's X/Y coordinate entry (this phase's core feature)**: users naturally gravitate toward round numbers (`0`, `5`, `10.5`), which is exactly the coordinate class most likely to collide across different seeds/plots. Guard at input (reject/nudge round-number coordinates) or fix it structurally (hash/offset the sampling point so no user-typeable coordinate lands on a low-entropy region) — resolve as part of this phase's spec, not discovered again live with real users.

## 6. Robot Melody & Seed Engine

### Restructure

- Update robot spawning rules so attributes come from planet agnostic lat/long coords seed
- Robot IDs become deterministic (derived from the seed + spawn index) instead of the current `crypto.randomUUID()` — required so Session Storage (Phase 11) can reapply Robot Options overrides by ID after the roster regenerates from a reload or shared link
- Update all references to measure length to 16 16th notes
- Density: Becomes a percentage. It fills X% of either the entire measure or a motif with that many notes
- Motif Length: Number from 1 to 8 (in 16th notes) with an on/off toggle — a reduction from the current 1–16 range. When on, tiles pattern across measure and truncates at measure end. When off, scatters freely
- Note Variance: Has an active toggle. When off, random notes with no weighting. When on, selects 1 to 8 notes from pitch array, weighted
- Update localeStore.ts's normalization clamps for `rhythmicDensity`, `rhythmicMotifLength`, and `noteVariance` — the current `Math.max/min/trunc` logic clamps against the old 4–12 onset-count and 1–16 motif-length ranges; left as-is it would silently mis-clamp the new 0–100% density and 1–8 motif-length values instead of rejecting or correcting them

### About

This phase refactors our core generation algorithms to establish a clean, pure TypeScript math engine, standardizing all measure structures to a fixed 16 sixteenth-note grid and updating robot spawning rules to derive attributes deterministically from planet-agnostic lat/long coordinate seeds, in place of the current planet+locale-coupled noise map derivation (see PROCEDURAL_GENERATION.md). In melodyGenerator.ts, we are implementing the new two-branch rhythm engine where Density acts as a 0 to 100% fill rate, interacting with an opt-in Motif Length (1 to 8 sixteenth notes — down from the current 1–16 range) that either scatters notes freely across the measure when toggled off or tiles and naturally truncates a repeating cell when toggled on. Finally, we are updating Note Variance to handle both unweighted random pitch selection when disabled and a weighted slice of 1 to 8 notes from the pitch array when enabled. Because localeStore.ts normalizes these same fields against the old ranges whenever locale state is written, we are updating its clamp logic in lockstep with the generator so a store write can't silently clamp a valid new-range value into the old one.

### Docs

- docs/MELODY_SYSTEM.md fully updated for: Density as a 0–100% fill rate (was a 4–12 onset count), Motif Length as a 1–8 on/off-toggled value (was a plain 1–16 slider), Note Variance as an on/off toggle, and the `RHYTHMIC_MOTIF_LENGTH_MAX` constant change (16 → 8).
- docs/PROCEDURAL_GENERATION.md — resolve its existing "Planned change" callout on the Locale map bullet now that lat/long seeding is planet-agnostic; update the two-tier planet+locale model description to match.

## 7. Robot Systems Engine

### Removal

- Remove the current Robot Options console tab (robot count min/max slider, auto-spawn toggle) — the new Battery/Docking/Job lifecycle creates every robot once, rather than dynamically spawning and despawning them
- Remove the `persists` field from Robot and its "Persist" toggle in the robot meta editor — with robots never leaving or arriving under the new lifecycle, there is nothing for a robot to "survive" across a power-off cycle

### Create

- Battery System (drain and recharge state)
- Dock/Docking System (docked, docking, departing, active states)
- Job System (assignment and status tracking)

### About

This phase establishes the pure TypeScript domain models and state machines for autonomous robot behavior, and retires the spawn/despawn and persistence model they replace. We are extending src/types/Robot.ts to define interfaces for the Battery System (tracking drain rates, warning thresholds, and recharge cycles), the Docking System (an explicit state machine, following the existing RobotState const-object pattern, transitioning between docked, docking, departing, and active states), and the Job System (handling task assignments and status tracking). Because robots are now created once rather than dynamically spawned and removed, we are removing the existing RobotOptionsTab (robot count min/max slider and auto-spawn toggle) along with the `persists` field on Robot and its "Persist" toggle in the robot meta editor — neither has a purpose once nothing spawns or despawns after locale load. We will construct pure state utility modules in src/systems/robotSystems.ts to manage these state updates, timer loops, and status transitions deterministically, laying down the core mechanics ready to be hooked into session storage, UI readouts, and audio triggers in subsequent phases.

### Docs

- docs/UI_SHELL.md's "Planned Replacement" point on `robotOptions` becomes real — fold it in and drop the "not yet implemented" framing for that point.
- No existing doc covers robot lifecycle (Battery/Docking/Job) — add a new docs/ROBOT_LIFECYCLE.md, in the style of docs/MELODY_SYSTEM.md, documenting the state machines and src/systems/robotSystems.ts's API. Add it to CLAUDE.md's reference doc list.

## 8. Robot Selection

### Restructure

- SVG needs to ignore time/daylight, so each robot's avatar thumbnail stays visually consistent regardless of the active locale's time of day

### Create

- Robot Selection hub tile: a list of every robot in the active locale, each entry showing its avatar SVG, job title, Audio Status (mute, solo, highlighted), and Battery Status
- Selecting a robot navigates into the Robot Options screen (Phase 9), scoped to that robot, with a back button returning to this list

### About

This phase builds Robot Selection as one of the main hub tiles (see Phase 3): selecting it from the hub grid replaces the hub nav area with a list of every robot in the active locale, each rendered as a card. We are modifying the SVG avatar rendering logic to ignore global daylight/time calculations, ensuring each card's thumbnail reads consistently regardless of planet conditions. We are building RobotSelectionCard and AudioStatusBadge components in src/components/selection/ to display assigned job titles, dynamic battery status indicators, and diagnostic audio controls (mute, solo, and highlighted states) powered by typed parameter schemas in src/data/robotSelectionConfig.ts. All status badges derive their lore and human labels from the data layer. Selecting a card navigates into the Robot Options screen (Phase 9) scoped to that one robot, with a back button returning here.

## 9. Robot Options

### Removal

- Remove every existing raw slider/input in the robot editor — the Audio Mode toggle group, rhythmic density/motif length/note variance sliders, and octave range slider in RobotAudioTab, and the per-layer waveform/gain/detune/phase/ADSR editors in RobotOscillatorsTab — replaced entirely by the Phase 1 primitives
- Remove per-layer ADSR envelopes — collapse Signature Array editing down to a single shared ADSR envelope per robot instead of one per oscillator layer

### Create

- Update data files with inputs for all Robot Options drawers
- Robot Display drawer (editable job reassignment and docking-state override; read-only audio status, battery gauge, battery warning threshold, z-index distance, and transducer pressure ratio)
- Ping Controls drawer (rhythmic density, motif length, octave bounds, and a ping-reset action)
- Ping Contour drawer (single ADSR envelope)
- Signature Array drawer (Baseline, Coaxial, and Harmonic oscillator layers, with LFO modulation frames and per-layer activation toggles)
- Every control in every drawer is paired with a Dual Label Component (Phase 1) to display its lore/human attribute name, sourced from robotOptionsConfig.ts

### About

This phase tears out the existing hand-built robot editor — RobotAudioTab's Audio Mode toggle group and density/motif/note-variance/octave sliders, and RobotOscillatorsTab's per-layer waveform/gain/detune/phase/ADSR editors — and rebuilds it as the Robot Options screen, reached by selecting a robot from the Robot Selection hub tile (Phase 8), scoped entirely to the currently selected robot. We are populating src/data/robotOptionsConfig.ts with parameter schemas for all four drawers and constructing dedicated components in src/components/robot/, each control paired with a DualLabel showing its lore and human attribute name. These include RobotDisplay for job reassignment, docking-state overrides, battery warning thresholds, transducer pressure ratio, and read-only status (audio mode, battery gauge, z-index distance); PingControlsDrawer for rhythmic density, motif length, octave bounds, and a ping-reset action; PingContourDrawer for a single logarithmic ADSR envelope — replacing the current per-layer ADSR editing, so a robot has one shared envelope instead of one per oscillator layer; and SignatureArrayDrawer for configuring Baseline, Coaxial, and Harmonic oscillator layers with LFO modulation frames and layer-activation toggles. All controls will consume schema definitions from our data configs, maintaining strict presentation logic while preparing the UI to connect directly to the underlying Robot Systems Engine (Phase 7).

### Docs

- docs/UI_SHELL.md's "Planned Replacement" point on `robotEditor` becomes real — fold it in and delete the entire "Planned Replacement" section, since by this phase all of Phases 3/7/8/9 have shipped.
- docs/ROBOT_DESIGN.md's Shape Parameters section describes spawn-time shape values as "the gain-weighted, normalized average of a robot's oscillator layers' ADSR envelopes" — with ADSR moved to a single shared envelope per robot, there's nothing left to average; reword to read directly from the one envelope.
- docs/AUDIO_SYSTEM.md's "Layered / Composite Voices" section lists an optional per-layer `adsr` field on `OscillatorLayer` — update once ADSR moves off individual layers and onto the robot.

## 10. Console Theming

### Create

- Pure seed-to-theme module (e.g. src/utils/consoleTheme.ts, alongside seedUtils.ts/getSeededVal.ts) computing bounded, legible HSL values — large/structural tokens (`--color-bg`, `--color-surface`, casing silhouette geometry) from the active planet seed; small/accent tokens (`--color-accent`, `--color-border`, button/text colors) from the active locale's coordinate seed
- Generated exterior silhouette for SleeveContainer — decorative indents/bands driven by the planet seed, rendered as SVG (SleeveContainer is currently a flat CSS box with no SVG at all; this follows the same generated-geometry pattern the robot shape components already use, not a new mechanism). The section connecting the sleeve to the glass can be uniform across seeds.
- Wiring so retransmitting a seed in Sector Settings (Phase 5) recomputes and visibly updates the theme
- Respect `prefers-reduced-motion` on the retransmit transition (color and casing-silhouette change), following the same `@media (prefers-reduced-motion: reduce)` pattern already used in PowerRockerSwitch.css — the new theme still applies, it just snaps instead of animating

### Restructure

- SleeveContainer.tsx/.css goes from a static CSS box to a component consuming generated theme values, the same way robot components consume audioAttributes — no existing phase currently touches this file
- The CSS custom properties in src/index.css (`--color-bg`, `--color-surface`, `--color-border`, `--color-accent`, `--color-text-primary`, `--color-text-muted`) become the seed-driven output target, replacing today's static Vite-default values

### About

This phase gives the console itself a seed-derived visual identity, split by scale rather than by physical part: the planet seed drives large/structural areas — the Sleeve casing's exterior silhouette, decorative indents/bands, and color, plus large background regions inside the Glass — while the active locale's coordinate seed drives small accent elements wherever they sit, buttons/text/borders on both the casing's decorative details and the Glass-side chrome. The casing's interior edge, the boundary touching ScreenViewport, stays static so nothing generated ever encroaches on or covers screen content. Colors stay bounded and legible the same way robot color generation already is (see ROBOT_DESIGN.md), since this is real interactive chrome sitting on a fixed dark background, not a decorative shape — a bad roll can't just look a little odd. Retransmitting a new seed in Sector Settings (Phase 5) visibly reshapes and recolors the console, reinforcing the same "this is a piece of field equipment reporting what it's tuned to" fiction the rest of the console already leans on (SYSTEM_FIRMWARE_RESETS, the power-off confirm, etc.). Because the theme is a pure function of the seed and coordinates already being persisted by Sector Settings, it needs no separate storage of its own — Session Storage (Phase 11) restoring the seed automatically restores the look. Out of scope here: WorldView/terrain/sky styling (deferred to v2), robot visuals (locked to audio attributes per CLAUDE.md, untouched by this phase), and the power rocker switch itself (stays fixed, not seed-styled).

### Docs

- No existing doc covers UI chrome theming — add a new docs/CONSOLE_THEMING.md (in the design-doc style of SESSION_STORAGE.md, since this hasn't shipped yet either) documenting the scale-based token split, the bounded-HSL generation rules, and the SleeveContainer interior/exterior boundary constraint. Add it to CLAUDE.md's reference doc list.

## 11. Session Storage

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
