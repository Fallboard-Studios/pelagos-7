
🗂️ **Store Overview**

Pelagos-7 uses modular Zustand stores to manage state in a scalable, maintainable way. Below are the core stores and their responsibilities:

- **robotStore**: Manages all robot state, selection, and mutations.
    - State: array of robots, selectedRobotId
    - Actions: addRobot(), removeRobot(), updateRobot(), getRobotById(), setSelectedRobotId()

- **oceanStore**: Manages world/environment state (e.g., planet size, world settings, actor positions).
- **oceanStore**: Manages the runtime scene state for the ocean view (actors, transient visuals, and scene runtime values).
        - State: actors, transient visual state, scene runtime values (not planet-scoped persistent world data).
        - Actions: setActors(), addActor(), removeActor(), setSceneRuntimeValue(), etc.

- **planetStore**: Manages planet-level persisted world data (one or more planets; each planet owns its day cycle and locales).
        - State: planets: Record<planetId, Planet>
            - `Planet` shape: { id: string, name: string, size: 'small'|'medium'|'large', locales: string[], currentLocaleId?: string, dayStartTimestamp?: number }
        - Actions: addPlanet(), removePlanet(), setPlanetSize(planetId, size), setDayStartTimestamp(planetId, ts), selectLocale(planetId, localeId)

- **localeStore**: Manages per-locale persisted world data (robots, actors, locale coordinates and settings scoped to a locale).
        - State: locales: Record<localeId, Locale>
            - `Locale` shape: { id: string, name: string, coordinates: { x: number, y: number }, robots: string[], actors: string[], settings: Record<string, any> }
        - Actions: addLocale(planetId, locale), removeLocale(localeId), setLocaleCoordinates(localeId, coords), addRobotToLocale(localeId, robotId), setLocaleSetting(localeId, key, value)

- **audioStore**: Manages global audio FX, BPM, mute state, and related settings.
    - State: globalAudio, bpm, isMuted, preMuteVolume, etc.
    - Actions: setGlobalAudio(), setBPM(), setMuted(), etc.

- **uiStore**: Manages UI state, navigation, and panel logic.
    - State: activeView, theme, language, isFullscreen, isPoweredOn, panel states, selection
    - Actions: setActiveView(), setTheme(), setLanguage(), setFullscreen(), setPowerOn(), setPowerOff(), setPanelState(), setSelection()

- **settingsStore**: Manages persistent user preferences (e.g., reduced motion, accessibility, saved themes, language).
    - State: user preferences
    - Actions: setPreference(), loadPreferences(), savePreferences()

- **notificationStore**: Manages in-app notifications, alerts, and toasts.
    - State: notifications array
    - Actions: addNotification(), removeNotification(), clearNotifications()

- **sessionStore**: Manages session-specific data (e.g., current file/session, unsaved changes, authentication state).
    - State: session info, unsaved changes, auth state
    - Actions: setSession(), setAuthState(), setUnsavedChanges()

This modular approach keeps state logic clean, improves React performance, and makes the system easier to extend.

🛠 Project: Pelagos-7 Industrial UI

Description: Responsive "Sleeve & Glass" touchscreen tablet interface. The entire UI lives on an in-world industrial tablet. The left sleeve is fixed decorative housing; the right GlassViewport is the full touchscreen where all interaction occurs. As the browser grows on the X-axis, more of the tablet slides out of the sleeve. No physical buttons, no knobs — everything is rendered on the glass.
View: Board (Kanban) / Table

⚙️ Milestone 0: Engine & State Foundation (Prerequisites)

Goal: Establish the backing types, state, and AudioEngine wiring that all later milestones depend on. No UI work begins on Milestones 1–6 until these issues are complete.


    Issue 0a: Define GlobalAudioSettings Type (src/types/).
        Store: audioStore
        New interface with per-effect param structs (reverb, delay, compressor, eq3, filterLPF, filterHPF, chorus).
        Each effect has an enabled: boolean for per-effect bypass.
        Top-level globalBypass: boolean for master bypass.
        All values must be JSON-serializable (Zustand rule).


    Issue 0b: Create audioStore.ts (src/stores/audioStore.ts) for global audio settings.
        Store: audioStore
        Add globalAudio: GlobalAudioSettings field with sensible defaults to audioStore.
        Add setGlobalAudio(effect, partial) per-effect setter action in audioStore.
        Add setBPM(bpm): updates audioStore.bpm AND Tone.Transport.bpm.value.

    Issue 0c: Wire Global FX Chain in AudioEngine (src/engine/AudioEngine.ts).
        Store: audioStore
        Instantiate global nodes: Tone.Reverb, Tone.FeedbackDelay, Tone.Chorus, Tone.EQ3, Tone.Filter (LPF), Tone.Filter (HPF).
        Rewire master chain: _masterCompressor → _globalEQ → _globalLPF → _globalHPF → _globalChorus → _globalDelay → _globalReverb → Destination.
        Per-effect bypass: set effect.wet.value = 0; for dry effects (EQ3, Compressor) use a pass-through gain swap.
        Global bypass: short-circuits the entire chain.
        Expose setter methods: setGlobalReverb(), setGlobalDelay(), setGlobalChorus(), setGlobalFilterLPF(), setGlobalFilterHPF(), setGlobalEQ(), setGlobalCompressor(), setGlobalBypass(), setEffectBypass(effect, enabled).


    Issue 0d: Add name, phase, and detune to Robot Type (src/types/Robot.ts, src/systems/spawnSystem.ts).
        Store: robotStore
        Add name: string to Robot interface; generate procedural names in spawnSystem.
        Add phase: number (0–360 degrees) and detune: number (cents) to AudioAttributes.
        Wire phase and detune in AudioEngine.reserveVoice() alongside the existing waveform application.
        Update all AudioAttributes construction sites and test fixtures.


    Issue 0e: Create uiStore.ts (src/stores/uiStore.ts).
        Store: uiStore
        New Zustand store with: activeView: 'ocean' | 'robot' | 'composition' | 'fx' | 'settings', theme, language, isFullscreen, isPoweredOn: boolean (default: false).
        Actions: setActiveView(), setTheme(), setLanguage(), setFullscreen(), setPowerOn(), setPowerOff().
        All state JSON-serializable; no Tone nodes, GSAP timelines, or DOM refs stored here.

    Issue 0f: Remove robot.audioAttributes.reverb (src/types/Robot.ts, all construction sites).
        Remove reverb: number from AudioAttributes — it was stored but never read by AudioEngine (dead state).
        Global reverb is now handled by GlobalAudioSettings.reverb and the _globalReverb node in AudioEngine.
        Update spawnSystem, tests, and any other AudioAttributes construction sites.

    Issue 0l-1: Define `Planet` and `Locale` TypeScript types (src/types/planet.ts, src/types/locale.ts).
        Create `Planet` (id, name, size, locales, currentLocaleId, dayStartTimestamp, currentHour) and `Locale` (id, planetId, name, coordinates, robots, actors, settings, currentMeasure) interfaces.
        Also exports `PlanetSize` and `LocaleSettings`. All values JSON-serializable.
        Export from src/types/index.ts. No runtime code.

    Issue 0l-2: Create `src/constants/time.ts` — `PLANET_DURATION_MS` and `computeLocalTime`.
        `PLANET_DURATION_MS`: small = 3 min, medium = 6 min, large = 9 min.
        `computeLocalTime(planetHour, longitudeX)`: returns `((planetHour + longitudeX / 15) % 24 + 24) % 24` — wraps correctly for negative longitudes.
        Pure functions, no side effects. Depends on Issue 0l-1 (PlanetSize type).

    Issue 0l-3: Implement `src/stores/planetStore.ts`.
        Store: planetStore
        Seeded with `DEFAULT_PELAGOS` (id: 'pelagos', name: 'Pelagos', size: 'medium') on init.
        Actions: addPlanet(), removePlanet(), setPlanetSize(planetId, size), setDayStartTimestamp(planetId, ts), setCurrentHour(planetId, hour), setCurrentLocale(planetId, localeId).
        `addPlanet` enforces unique names (case-insensitive) — returns boolean; sets `dayStartTimestamp` based on `planetInitialHour` so the planet starts at the correct in-world hour.
        Exports `DEFAULT_LOCALE_ID` constant used by localeStore seed.
        Depends on: Issue 0l-1, 0l-2.

    Issue 0l-4: Implement `src/stores/localeStore.ts`.
        Store: localeStore
        Seeded with `DEFAULT_LOCALE` (id: DEFAULT_LOCALE_ID, planetId: 'pelagos', coordinates: {x:0, y:0}) on init.
        Actions: addLocale(), removeLocale(), setLocaleData(localeId, partial), addRobotToLocale(), removeRobotFromLocale(), updateRobotInLocale().
        `locales` is a `Record<string, Locale>` map for O(1) access.
        Owns: robots[], actors[], settings (bpm, maxRobots, minRobots), currentMeasure per locale.
        Depends on: Issue 0l-1, 0l-3 (DEFAULT_LOCALE_ID).

    Issue 0l-5: Add `activeLocaleLocalTime` to uiStore; strip duplicate fields from oceanStore.
        Add `activeLocaleLocalTime: number | null` (default null) and `setActiveLocaleLocalTime(t)` to uiStore.
        Remove from oceanStore: robots, actors, robot/actor actions, settings.planetSize, dayStartTimestamp, currentHour, planetHour, planetMinute, currentMeasure, lightnessMultiplier, and all their actions — all now owned by planetStore or localeStore.
        Remaining oceanStore: selectedRobotId / selectRobot(), totalInteractions / incrementInteractions().
        Update all consumers across src/ to read from usePlanetStore or useLocaleStore.
        Depends on: Issue 0l-3, 0l-4.

    Issue 0l-6: Unit tests for planetStore and localeStore.
        src/stores/planetStore.test.ts: init seed, setPlanetSize, setCurrentHour, setDayStartTimestamp, setCurrentLocale, addPlanet/removePlanet.
        src/stores/localeStore.test.ts: init seed, addRobotToLocale/removeRobotFromLocale/updateRobotInLocale, addLocale/removeLocale, setLocaleData.
        All tests reset store state in beforeEach. npm test must pass with no failures.
        Depends on: Issue 0l-3, 0l-4, 0l-5.

    Issue 0h: Create settingsStore.ts (src/stores/settingsStore.ts).
        Store: settingsStore
        State: reducedMotion: boolean, accessibilityMode: boolean, savedTheme: string, language: string.
        Actions: setPreference(key, value), loadPreferences(), savePreferences().
        Persisted via localStorage. All state JSON-serializable; no DOM refs or Tone nodes.

    Issue 0i: Create notificationStore.ts (src/stores/notificationStore.ts).
        Store: notificationStore
        State: notifications: Notification[] — each entry has id: string, message: string, type: 'info' | 'warning' | 'error', timestamp: number.
        Actions: addNotification(notification), removeNotification(id), clearNotifications().
        All state JSON-serializable.

    Issue 0j: Create sessionStore.ts (src/stores/sessionStore.ts).
        Store: sessionStore
        State: sessionId: string | null, unsavedChanges: boolean, authState: 'unauthenticated' | 'authenticated'.
        Actions: setSession(id), setAuthState(state), setUnsavedChanges(flag).
        All state JSON-serializable.

    Issue 0b-delta: Add mute state to audioStore.
        Additive change to existing audioStore (post Issue 0b).
        Add isMuted: boolean (default false), preMuteVolume: number (default 1.0), setMuted(muted: boolean), setPreMuteVolume(volume: number).
        All new state is JSON-serializable. Prerequisites for Issue 2d (Mute button).

    Issue 0c-delta: Add transport methods to AudioEngine.
        Additive change to existing AudioEngine (post Issue 0c).
        Add killAll(): cancels all scheduled transport events, releases all voices, calls Transport.stop() and resets to 0. Called by Power Off confirm (Issue 2a) and Restart (Issue 2b).
        Add pause(): calls Transport.pause() without resetting position. Called by Pause button (Issue 2c).
        Add resume(): calls Transport.start() from current position. Called by Pause button (Issue 2c).
        Add setMasterVolume(volume: number): clamps to [0, 1] and applies to master gain node. Called by Mute button (Issue 2d).
        Add getMasterVolume(): returns current master gain value. Called by Mute button (Issue 2d) to snapshot pre-mute level.

    Issue 0e-delta: Add isPoweredOn to existing uiStore.
        Additive change to existing uiStore (post Issue 0e).
        Add isPoweredOn: boolean (default false), setPowerOn(), setPowerOff() to uiStore.
        Prerequisites for Issue 2 (scaffold gating) and Issue 2a (Power button).

    Issue 0l-delta: Add activeConsoleTab to uiStore.
        Additive change to existing uiStore (post Issue 0e/0e-delta).
        Add activeConsoleTab: 'session' | 'composition' | 'robotOptions' | 'robotEditor' | 'audioRig' | 'settings' (default: 'session').
        Add setActiveConsoleTab(tab: ActiveConsoleTab) action.
        activeView from Issue 0e is superseded by this tab system — remove or deprecate it if no other consumers remain.
        All state JSON-serializable; prerequisite for Issues 3 and 4.

    Issue 0g-delta: Replace dayLengthMeasures with Planet Size and real-clock time-of-day.
        Migration of existing oceanStore (post Issue 0g).
        Remove dayLengthMeasures and setDayLength; add planetSize: 'small' | 'medium' | 'large' (default 'medium') with setPlanetSize(size).
        PLANET_DURATION_MS: small = 3 min, medium = 6 min, large = 9 min.
        Add dayStartTimestamp: number (wall-clock ms) and setDayStartTimestamp(ts); derive currentHour from wall-clock elapsed time.
        Time-of-day setInterval runs in the ocean scene/system — explicitly permitted (world/visual timing, not musical timing).

    Issue 0k: Install Radix UI Primitives (package.json).
        Decision: All interactive UI primitives are built on unstyled @radix-ui/* packages. Radix handles ARIA roles, focus trapping, roving tabindex, and keyboard contracts; project design tokens own all visual styling.
        Install the following packages (all unstyled, peer dep: react ≥17):
            @radix-ui/react-toolbar — TransportBar (Issue 2)
            @radix-ui/react-dialog — confirmation modals (Issue 2a, Issue 16)
            @radix-ui/react-alert-dialog — destructive confirmations (Issue 16)
            @radix-ui/react-toggle — stateful single-button toggles
            @radix-ui/react-toggle-group — Pause / Mute toggle buttons (Issues 2c, 2d)
            @radix-ui/react-tabs — Navigation + View-Switching (Issues 3, 4)
            @radix-ui/react-popover — Piano Keyboard Popover (Issue 15)
            @radix-ui/react-select — Waveform dropdown, Planet Size selector (Issues 8, 12)
            @radix-ui/react-slider — ADSR nodes & Value Strips (Issues 11, 12, 18, 19, 20)
            @radix-ui/react-switch — Bypass toggles, settings booleans (Issues 17, 22)
            @radix-ui/react-separator — dividers within toolbar and panels
            @radix-ui/react-tooltip — button tooltips throughout
            @radix-ui/react-visually-hidden — screen reader labels
            @radix-ui/react-dropdown-menu — context menus (robot interactions, future)
        Do NOT install @radix-ui/themes — the project uses its own design tokens.
        Prerequisite for all M8 interactive UI issues.

🏳️ Milestone 1: Core Architecture & Navigation

Goal: Establish the asymmetric Sleeve/Glass shell and the state machine for view swapping.
Depends on: Issue 0e (uiStore).

    Issue 1: Define Asymmetric Shell Wrapper (SleeveContainer + GlassViewport).
        Create SleeveContainer: position fixed; left: 0; height: 100vh; width driven by --sleeve-width CSS custom property (~30px mobile, ~80px tablet, ~120px desktop).
        Create GlassViewport: flex sibling filling the remaining viewport width; height: 100vh; overflow: hidden at the shell level (individual views scroll internally).
        The sleeve is purely decorative housing — no interactive elements are rendered inside it.
        All UI, controls, navigation, and transport live inside GlassViewport.

    Issue 1a: Build Sleeve Physical Aesthetics.
        Stamped/embossed logo mark rendered inside SleeveContainer (decorative only, no interaction).
        Occlusion shadow: a CSS linear-gradient (~16–24px, dark → transparent) pinned to the left edge of GlassViewport, simulating the physical depth of the glass sitting inside the sleeve.
        Guide rails: subtle horizontal SVG lines at the top and bottom edges of the GlassViewport, representing the mechanical tracks that keep the screen attached as it extends along the X-axis.
        No interactive elements in the sleeve. No buttons, controls, or transport here.

    Issue 2: Build Glass-Mounted Transport Bar (Scaffold).
        Creates TransportBar component shell: bar layout, four stubbed button slots (Power always enabled; Restart/Pause/Mute disabled on load via isPoweredOn gating), measure display (M: --- when off), BPM display (dimmed when off).
        App.tsx cleanup: removes PlayButton overlay, removes hardcoded % 96 from subscribeToMeasure.
        Transport is rendered on the glass — not in the sleeve.
        Radix: use @radix-ui/react-toolbar → Toolbar.Root + Toolbar.Button for the button group; gives roving tabindex keyboard navigation for free.

    Issue 2a: TransportBar — Power Button.
        Power On (isPoweredOn === false): clicking the rocker starts the audio systems by calling `powerController.start()` (which delegates to `AudioEngine.start()` and resets harmony). The UI flip (`useUIStore.setPowerOn()`) and the visual wake animation are currently handled in `PowerRockerSwitch` via a GSAP timeline stored in `timelineMap` under the id `tablet-power-on`. There is also a convenience helper `powerController.powerOnSequence()` which will run the same audio startup and invoke the reusable animation in `src/systems/powerAnimations.ts` if callers prefer a controller-owned animation.
        Power Off (isPoweredOn === true): the rocker shows a confirmation modal; on confirm the component calls `powerController.shutdownWithAnimation()`. That method (current implementation) stops spawn/factory/collision systems, calls `AudioEngine.killAll()`, clears ocean actors (`useOceanStore.setActors([])`), flips `useUIStore.setPowerOff()`, and triggers the reusable dimming animation via `playTabletPowerOff()` (timeline id `tablet-power-off`). Note: the expressive sleeve-drain animation from earlier iterations is not currently active — implement `playSleeveDrain()` in `src/systems/powerAnimations.ts` and call it prior to system shutdown if you want that effect.
        Radix: confirmation modal uses @radix-ui/react-dialog → Dialog.Root + Dialog.Content + Dialog.Title + Dialog.Description.

    Issue 2b: TransportBar — Restart Button.
        Disabled when isPoweredOn === false.
        On click: killAll() → setCurrentMeasure(0) → AudioEngine.start(). No modal, no GSAP, no power state change.

    Issue 2c: TransportBar — Pause Button.
        Disabled when isPoweredOn === false.
        Toggles between playing and paused: AudioEngine.pause() / resume(); isPaused is local React state (not in Zustand).
        Radix: replace Toolbar.Button stub with Toolbar.ToggleGroup + Toolbar.ToggleItem (single) for correct aria-pressed semantics.

    Issue 2d: TransportBar — Mute Button.
        Disabled when isPoweredOn === false.
        On mute: getMasterVolume() → setPreMuteVolume() → setMasterVolume(0) → setMuted(true).
        On unmute: setMasterVolume(preMuteVolume) → setMuted(false).
        Radix: replace Toolbar.Button stub with Toolbar.ToggleGroup + Toolbar.ToggleItem (single) for correct aria-pressed semantics.

    Issue 3: Build Root Layout Grid (Four-Panel Shell).
        GlassViewport is divided into four persistent, named areas using CSS Grid. All four panels render unconditionally — no display:none toggling at the root level.

        Desktop layout (≥768px):
            CSS Grid: 2 columns (2fr 1fr) × 3 rows — [transport-height: auto] [world-view: auto] [console: 1fr].
            TransportBar:  column 1, row 1. Flush top-left; same width as WorldView (~2/3 of GlassViewport).
            WorldView:     column 1, row 2. 16:9 aspect ratio enforced with aspect-ratio: 16/9; fills available column width. Flush left, directly below TransportBar.
            RobotList:     column 2, rows 1–2 (row-span). Flush top-right; same combined height as TransportBar + WorldView. Width is the remaining ~1/3 of the glass (flexible).
            Console:       columns 1–2, row 3 (column-span, full width). Fills all remaining vertical space below WorldView and RobotList (1fr).

        Mobile layout (<768px):
            All four panels stack full-width in a single column.
            Order (top to bottom): TransportBar (position: sticky, top: 0) → WorldView → Console → RobotList.
            TransportBar shrinks to icon/compact form on mobile.

        Both WorldView and RobotList always render regardless of the active Console tab.
        Depends on: Issue 1 (shell), Issue 0l-delta (activeConsoleTab).

    Issue 3a: Build Robot List Panel (Persistent Right Column).
        RobotList is the persistent right-column panel established in Issue 3 (column 2, rows 1–2 on desktop; bottom area on mobile).
        Renders a scrollable list of all current robots; each row shows the robot's name and a visual indicator of its active/muted/solo state.
        Clicking a robot row sets robotStore.selectedRobotId and calls uiStore.setActiveConsoleTab('robotEditor') — the Console switches to the Robot Editor tab for that robot.
        No robot-editing controls live in this panel; it is a picker only.
        On mobile: renders below the Console as a compact horizontal scrolling strip or a collapsed expandable drawer.
        Depends on: Issue 3, robotStore.
        Note: this is the persistent gallery view; deep robot editing lives in the Robot Editor Console Tab (Issue 10).

    Issue 4: Build Console Panel + Console Navigation.
        Console renders ConsoleNavigation (tab list) at its top/left edge and a content area that mounts the active tab's component.
        Navigation tabs: Session Settings | Composition | Robot Options | Robot Editor | Audio Rig | Settings.
        Tab selection calls uiStore.setActiveConsoleTab(tab); content area renders the matching component keyed to activeConsoleTab.
        Radix: use @radix-ui/react-tabs → Tabs.Root + Tabs.List + Tabs.Trigger + Tabs.Content. Tabs.Root orientation="horizontal" on mobile, orientation="vertical" on desktop if layout permits; otherwise use Tabs.Trigger only for the nav rail and drive Tabs.Content separately via activeConsoleTab.
        Console Navigation is entirely inside GlassViewport — never in SleeveContainer.
        Depends on: Issue 3, Issue 0l-delta.

    Issue 5: Create Glass Screen-Wear Overlay.
        SVG/PNG procedurally generated scratches and cracks layered over GlassViewport only.
        The sleeve surface is separate (see Issue 1a) — screen wear is glass-only.
        Overlay is a non-interactive, pointer-events: none layer at high z-index within GlassViewport.



🌊 Milestone 2: Session & World Management Console Tab

Goal: World-level view setup and planet/locale component hierarchy.
Depends on: planetStore, localeStore (0g/0l), oceanStore (0g-delta), uiStore (activeConsoleTab via 0l-delta), Issue 4 (Console + ConsoleNavigation).

    Issue 6: Size Ocean Scene Inside WorldView.
        Remove the 100vw × 100vh full-screen assumption from OceanScene; it must fill the WorldView bounds only.
        WorldView passes its bounding box to OceanScene via CSS layout (no explicit pixel values).
        On desktop, WorldView expands as more of the GlassViewport is revealed along the X-axis.
        No new controls; pure layout/sizing change.

    Issue 9: Build `PlanetView`, `LocaleView`, and `OceanView` Components.
        Implements the four-level world view hierarchy: WorldView → PlanetView → LocaleView → OceanView → OceanScene.
        PlanetView owns the real-time day-cycle tick (`setInterval`, 1000 ms) using `PLANET_DURATION_MS[planet.size]`; writes `currentHour` to `planetStore` and `activeLocaleLocalTime` to `uiStore` each second.
        LocaleView computes `localTime = computeLocalTime(currentHour, locale.coordinates.x)` and passes it to OceanView.
        OceanView is a thin named wrapper around OceanScene; receives `localTime` as a prop.
        All components fill parent bounds via `width: 100%; height: 100%`.
        Depends on: Issue 0l-1 through 0l-5 (planetStore, localeStore, PLANET_DURATION_MS, computeLocalTime, uiStore.activeLocaleLocalTime).

    Issue 10: Seed Infrastructure — `derivePlanetSeed`, `getSeededVal`, `precomputeDataX`, and `noiseMaps` registry.
        Establishes the deterministic seed system. All game-logic randomness is replaced with reproducible noise-map lookups; the same planet name + locale coordinates always produces the same world.
        src/utils/seedUtils.ts: `derivePlanetSeed(name)` (lowercase + strip non-alphanumeric); `planetInitialHour(seed)` (letter-average → integer 0–23); `localeCoordSeed(x, y)` (maps -179…179 coords to 0–129,599).
        src/utils/getSeededVal.ts: `precomputeDataX(dataId)` converts a stable string key to a deterministic float **once at module scope** (must not be called per-note on the audio hot path); `getSeededVal(noiseMap, dataId, offset, min, max)` is the general-purpose sampler for non-hot-path callers.
        src/utils/noiseMaps.ts: module-level `Map` registry keyed by planet/locale ID; `getPlanetNoiseMap`, `getLocaleNoiseMap`, `evictPlanetNoiseMap`, `evictLocaleNoiseMap`, `tryGetLocaleNoiseMap` (null-safe for audio engine).
        Planet name uniqueness enforced in `addPlanet()`; `DEFAULT_PELAGOS.dayStartTimestamp` initialised from `planetInitialHour`.
        Depends on: Issue 0l-3, 0l-4.

    Issue 11: Wire noise map creation into planet and locale lifecycle.
        Eagerly primes planet and locale noise maps in `addPlanet`/`addLocale`; evicts them in `removePlanet`/`removeLocale`.
        Default maps for `pelagos` and `DEFAULT_LOCALE_ID` are primed at module scope in their respective store files so maps are available before the first React render.
        No noise-map logic inside Zustand state — side effects belong at the call sites only.
        Depends on: Issue 10.

    Issue 12: Replace `Math.random()` in spawn, idle, interaction, and melody systems with `getSeededVal`.
        spawnSystem: generateRobotName, pickSpawnInterval, generateSpawnPosition, generateAudioAttributes — all accept `(noiseMap, offset)` and use stable dataId keys.
        idleSystem: pickIdleTarget uses `getSeededVal` for x/y coordinates.
        interactionSystem: pickInteractionEvents uses `getSeededVal` for melody-event selection.
        melodyGenerator: call sites pass `() => getSeededVal(noiseMap, 'melody.rand', callIndex++)` as the injectable `rand` parameter — no changes to melodyGenerator internals.
        DataId strings are stable keys; renames are breaking seed changes and must be documented in CONTRIBUTION_GUIDE.md.
        Depends on: Issue 11.

    Issue 13: Seed AudioEngine velocity variance; replace beatClock schedule ID with `crypto.randomUUID()`.
        AudioEngine: two module-level constants `VELOCITY_ROLL_X = precomputeDataX('audio.velocityRoll')` and `VELOCITY_VARIANCE_X = precomputeDataX('audio.velocityVariance')` computed once at import — never inside the scheduling callback. Hot path calls `noiseMap(VELOCITY_ROLL_X, noteIndex % 97)` only (O(1), safe at 240+ BPM). Falls back to no variance when no locale map is available (tests, headless).
        beatClock: schedule ID replaced with `crypto.randomUUID()` — natively implemented, faster than the previous `Math.random().toString(36)` pattern.
        Depends on: Issue 11, 12.


🤖 Milestone 3: Robot Management Console Tabs

Goal: Spawn control and per-robot synthesis editing via the Console.
Depends on: robotStore (0d), uiStore (activeConsoleTab), Issues 3–4.
Note: All interactive elements must meet the 44×44px minimum touch target size (WCAG 2.5.5).

    Issue 9: Build Robot Options Console Tab.
        Renders when activeConsoleTab === 'robotOptions'.
        Min/Max Robots: Range Input → robotStore min/max robot count.
        Auto Spawn Robots: Toggle → robotStore autoSpawn flag.
        Spawn Frequency: Slider → robotStore spawnFrequency.
        New Robot: Button → spawns a new robot via robotStore, then calls setActiveConsoleTab('robotEditor') and sets selectedRobotId to the new robot. The RobotList panel (Issue 3a) updates automatically as it observes robotStore.
        Depends on: Issues 3–4, Issue 3a.

    Issue 10: Build Robot Editor Console Tab Shell + Robot Editor Navigation.
        Renders when activeConsoleTab === 'robotEditor'.
        Shows the most recently created/selected robot by default (reads selectedRobotId from robotStore).
        Robot Editor Navigation: Radix sub-tabs within the Console content area for three sub-tabs: Robot Meta | Robot Audio | Robot Oscillators.
        Robot Editor Console: the panel below the sub-tabs that renders the active sub-tab's content.
        Sub-tab state is local to this component (not in Zustand) — it does not need global persistence.
        Radix: @radix-ui/react-tabs → Tabs.Root + Tabs.List + Tabs.Trigger + Tabs.Content (nested inside the outer Console tabs).
        Depends on: Issues 3–4, Issue 9 (New Robot trigger).

    Issue 11: Robot Meta Sub-Tab.
        Renders inside Robot Editor Console when Robot Meta sub-tab is active.
        Name: Textbox → robot.name (Issue 0d).
        Age: read-only Display → robot age (derived value; no store write).
        Persist: Toggle → robot persistence flag in robotStore.
        Preset Selection: Dropdown + Load Robot Preset Button → robotStore preset loading.
        Copy Robot: Dropdown → robotStore copy action (target robot selector).
        Link To Robot: Dropdown → robotStore link action (target robot selector).
        Radix: Dropdown selectors use @radix-ui/react-select.

    Issue 12: Robot Audio Sub-Tab.
        Renders inside Robot Editor Console when Robot Audio sub-tab is active.
        Solo, Mute, Highlight: Radio group → robotStore per-robot solo/mute/highlight flags.
        Rhythmic Density: Slider → maps to melody density parameter (define exact backing field in this issue; document the decision).
        Note Variance: Slider → maps to melody variance parameter (define exact backing field in this issue).
        Octave Range: Range Input (dual-thumb) → robot octave min/max in robotStore.
        New Melody: Button With Confirmation → regenerates melody for selected robot via robotStore.
        Radix: Radio group uses @radix-ui/react-radio-group; sliders use @radix-ui/react-slider; confirmation uses @radix-ui/react-alert-dialog.

    Issue 13: Robot Oscillators Sub-Tab.
        Renders inside Robot Editor Console when Robot Oscillators sub-tab is active.
        Robot Oscillator Type: Dropdown → robot.audioAttributes.waveform.
        Robot Oscillator Detune: Dual Speed Stepper → robot.audioAttributes.detune (Issue 0d).
        Robot Oscillator Gain: Dual Speed Stepper → robot.masterVolume.
        Robot Oscillator Phase: Slider → robot.audioAttributes.phase (Issue 0d).
        Robot Oscillator Pulsewidth: Dual Speed Stepper → Tone oscillator width; render conditionally when waveform === 'square' only.
        Robot Oscillator ADSR Canvas: HTML Canvas with 4 draggable nodes (Attack, Decay, Sustain, Release), bezier curve visualization; uses pointer/touch events. Maps to robot.audioAttributes ADSR fields.
        Select Robot Oscillator Preset: Dropdown + Load Robot Oscillator Preset: Button With Confirmation.
        Delete This Oscillator: Button With Confirmation.
        New Oscillator: Button → adds an oscillator layer to the selected robot.
        Radix: Waveform dropdown uses @radix-ui/react-select; for each slider @radix-ui/react-slider; preset confirmation uses @radix-ui/react-alert-dialog.
        No rotary knobs — all continuous controls are touch-friendly linear sliders or steppers.


🎹 Milestone 4: Composition Console Tab

Goal: Chord sequence editing and note selection.
Depends on: audioStore (harmony/chord state), oceanStore (measure state), uiStore (activeConsoleTab).
Note: All interactive elements must meet the 44×44px minimum touch target size (WCAG 2.5.5).

    Issue 14: Build Composition Console Tab Shell.
        Renders when activeConsoleTab === 'composition'.
        Renders a scrollable list of ChordItem components, one per chord in the sequence (from audioStore chord state).
        Shell only in this issue — ChordItem renders a placeholder until Issue 15.
        Depends on: Issues 3–4.

    Issue 15: Build Chord Item Component.
        Repeating list item component; one instance per chord in the sequence.
        Notes Button → opens Piano Keyboard Popover (Issue 16) anchored to this chord item.
        Delete Chord: Button With Confirmation → removes this chord from the sequence via audioStore.
        Add Chord Here: Button With Confirmation → inserts a new chord after this position in the sequence via audioStore.
        Radix: confirmations use @radix-ui/react-alert-dialog.

    Issue 16: Build Piano Keyboard Popover (Note Selector).
        Floating popover triggered from the Notes button on a ChordItem.
        Renders a visual keyboard with white and black keys for note/octave selection.
        Selected notes update the chord's note array in audioStore.
        Radix: @radix-ui/react-popover → Popover.Root + Popover.Trigger + Popover.Content + Popover.Close.


🎛️ Milestone 5: Audio Rig Console Tab

Goal: Master signal chain processing surfaced in the Console.
Depends on: audioStore (globalAudio, FX state — Issues 0a–0c), AudioEngine (FX chain — Issue 0c), uiStore (activeConsoleTab).

    Issue 17: Build Audio Rig Console Tab Shell + Audio Rig Navigation.
        Renders when activeConsoleTab === 'audioRig'.
        Audio Rig Navigation: Radix sub-tabs for Audio Meta | Reverb | Compression | Delay | Filters | Chorus | EQ.
        Audio Rig Console: panel content area below the sub-tabs rendering the active sub-tab's component.
        Sub-tab state is local to this component (not Zustand).
        Radix: nested @radix-ui/react-tabs inside the outer Console Tabs.
        Depends on: Issues 3–4, Issues 0a–0c.

    Issue 18: Build Universal FX Effect Block (Reusable Wrapper).
        Reusable FXEffectBlock component: label (string), per-effect bypass toggle, children slot.
        Per-effect bypass toggle reads audioStore.globalAudio[effectKey].enabled; on toggle calls setGlobalAudio(effectKey, { enabled }) AND AudioEngine.setEffectBypass(effectKey, enabled).
        When enabled = false: children dim via CSS opacity + pointer-events: none; label shows BYPASSED badge; bypass toggle itself remains fully interactive.
        Global bypass toggle at the Audio Rig level (top of the tab): reads globalAudio.globalBypass; calls AudioEngine.setGlobalBypass(enabled). A dedicated setGlobalBypass(enabled) action may be required in audioStore — decide and document at implementation time.
        Radix: all bypass toggles use @radix-ui/react-switch → Switch.Root + Switch.Thumb.
        Used by Issues 19–24 as the wrapper for each effect sub-tab.

    Issue 19: Audio Meta Sub-Tab.
        Renders inside Audio Rig Console when Audio Meta sub-tab is active.
        BPM: Dual Speed Stepper → audioStore.setBPM(bpm).
        Volume Indicator: read-only VU display → derived from audioStore master volume.

    Issue 20: Reverb Sub-Tab.
        Renders inside Audio Rig Console when Reverb sub-tab is active. Wrapped in FXEffectBlock (Issue 18).
        Room Size, Wet/Dry Mix, Pre-Delay, Damping, Width: Value Strips (horizontal high-contrast fill bars) → AudioEngine.setGlobalReverb().
        Reverb Bypass: handled by FXEffectBlock per-effect toggle.
        Radix: each Value Strip uses @radix-ui/react-slider → Slider.Root + Slider.Track + Slider.Range + Slider.Thumb.

    Issue 21: Compression Sub-Tab.
        Renders inside Audio Rig Console when Compression sub-tab is active. Wrapped in FXEffectBlock.
        Threshold, Ratio, Attack, Release, Knee: Value Strips → AudioEngine.setGlobalCompressor().
        Compression Bypass: handled by FXEffectBlock.
        Radix: @radix-ui/react-slider for each Value Strip.

    Issue 22: Delay Sub-Tab.
        Renders inside Audio Rig Console when Delay sub-tab is active. Wrapped in FXEffectBlock.
        Delay Time, Feedback, Wet/Dry: Value Strips → AudioEngine.setGlobalDelay().
        Delay Bypass: handled by FXEffectBlock.
        Radix: @radix-ui/react-slider for each Value Strip.

    Issue 23: Filters Sub-Tab.
        Renders inside Audio Rig Console when Filters sub-tab is active. Two FXEffectBlock sections: High Pass and Low Pass.
        High Pass: Cutoff Frequency, Resonance Value Strips → AudioEngine.setGlobalFilterHPF(). High Pass Bypass toggle.
        Low Pass: Cutoff Frequency, Resonance Value Strips → AudioEngine.setGlobalFilterLPF(). Low Pass Bypass toggle.
        Radix: @radix-ui/react-slider; bypass toggles via FXEffectBlock.

    Issue 24: Chorus Sub-Tab.
        Renders inside Audio Rig Console when Chorus sub-tab is active. Wrapped in FXEffectBlock.
        Rate, Depth, Delay Time, Feedback, Wet/Dry: Value Strips → AudioEngine.setGlobalChorus().
        Chorus Bypass: handled by FXEffectBlock.
        Radix: @radix-ui/react-slider for each Value Strip.

    Issue 25: EQ Sub-Tab.
        Renders inside Audio Rig Console when EQ sub-tab is active. Wrapped in FXEffectBlock.
        Low, Mid, High: Value Strips → AudioEngine.setGlobalEQ().
        EQ Bypass: handled by FXEffectBlock.
        Radix: @radix-ui/react-slider for each Value Strip.


⚙️ Milestone 6: Settings, Utilities & Responsive Polish

Goal: User preferences, final responsive cleanup, and data visualization.


    Issue 26: 360px Collapsed Sleeve Pass.
        Set --sleeve-width: 30px at ≤768px breakpoint — sleeve narrows to minimum housing width.
        Console stacks below WorldView on mobile; ConsoleNavigation remains accessible.
        Verify all Console tabs from Milestones 2–5 stack and scroll correctly at 360px viewport width.
        WorldView shrinks gracefully; OceanScene remains usable and legible at minimum width.

    Issue 27: Build Session Settings Console Tab. ⚠️ Build Last
        Renders when activeConsoleTab === 'session'.
        Built after planetStore, localeStore (Issue 0l), and the PlanetView/LocaleView hierarchy (Issue 9) are stable.
        Locale name: inline editable text field → useLocaleStore.setLocaleName(localeId, name).
        Active planet name: read-only info display from usePlanetStore.
        Save: serialises localeStore (robots, actors, settings, currentMeasure) and planetStore (name, size, dayStartTimestamp) to localStorage under `pelagos-session-v1`.
        Load: reads `pelagos-session-v1` from localStorage; validates shape before applying; shows error if malformed.
        Clear: deletes `pelagos-session-v1` and resets both stores to defaults; requires confirmation before proceeding.
        No BPM field (BPM lives in Composition Console, Issue 14a). No Planet Size selector (size is set at planet creation; not surface-editable here). No connection to oceanStore (transient runtime store only).
        Radix: destructive confirmations use @radix-ui/react-alert-dialog; non-destructive confirmations use @radix-ui/react-dialog.
        Depends on: Issue 0l (planetStore, localeStore fully stable), Issue 9 (PlanetView/LocaleView hierarchy confirmed).
