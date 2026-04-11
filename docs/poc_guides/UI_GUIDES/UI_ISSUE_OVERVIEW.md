
🗂️ **Store Overview**

Pelagos-7 uses modular Zustand stores to manage state in a scalable, maintainable way. Below are the core stores and their responsibilities:

- **robotStore**: Manages all robot state, selection, and mutations.
    - State: array of robots, selectedRobotId
    - Actions: addRobot(), removeRobot(), updateRobot(), getRobotById(), setSelectedRobotId()

- **oceanStore**: Manages world/environment state (e.g., planet size, world settings, actor positions).
    - State: world settings, actors, planetSize, currentHour, dayStartTimestamp, etc.
    - Actions: setPlanetSize(), setWorldSetting(), addActor(), removeActor(), etc.

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

    Issue 0g: Add planetSize and real-clock time-of-day system to oceanStore (src/stores/oceanStore.ts).
        Store: oceanStore
        Replace dayLengthMeasures/setDayLength with planetSize: 'small' | 'medium' | 'large' (default: 'medium') in oceanStore.settings; planet size maps to real-world day duration: small=3 min, medium=6 min, large=9 min.
        Add setPlanetSize(size) action.
        Add dayStartTimestamp: number to oceanStore (wall-clock ms when the current day cycle started; set to Date.now() on init) and setDayStartTimestamp(ts) action.
        currentHour is now derived from real elapsed wall-clock time — ((Date.now() - dayStartTimestamp) / planetDurationMs) * 24 — updated every second by a timer in the ocean scene/system, not by beat measures.
        Time of day always advances regardless of power-on/off state. Beat-clock measure advancement is controlled separately by the power state.
        Remove the setCurrentMeasure day-length wrap logic (measures no longer drive time-of-day).

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

    Issue 3: Build Navigation System.
        Tablet/desktop: vertical icon bar on the left edge of GlassViewport (inside the glass, not the sleeve).
        Mobile: bottom tab bar on GlassViewport.
        Responsive toggle between the two layouts driven by CSS breakpoints.
        Navigation state (active view) lives in uiStore.activeView.
        Radix: use @radix-ui/react-tabs → Tabs.Root (orientation="vertical" on tablet, orientation="horizontal" on mobile) + Tabs.List + Tabs.Trigger. Note: Tabs.Content siblings must be co-located with Tabs.List — verify this does not conflict with the GlassViewport layout before committing. If DOM structure is incompatible, use Tabs.Trigger only for the nav rail and render content separately via uiStore.activeView.

    Issue 4: Implement View-Switching Logic (State management to toggle "Active Viewport").
        Active view state lives in uiStore.activeView.
        Swaps the content area of GlassViewport between: 'ocean' | 'robot' | 'composition' | 'fx' | 'settings'.
        Radix: if Issue 3 uses Tabs.Root + Tabs.Content, view switching is handled by Tabs. If nav and content are structurally decoupled, drive visibility from uiStore.activeView directly.

    Issue 5: Create Glass Screen-Wear Overlay.
        SVG/PNG procedurally generated scratches and cracks layered over GlassViewport only.
        The sleeve surface is separate (see Issue 1a) — screen wear is glass-only.
        Overlay is a non-interactive, pointer-events: none layer at high z-index within GlassViewport.


🌊 Milestone 2: Ocean View (The Default Context)

Goal: The primary "Home" landing and high-level environment control.
Depends on: oceanStore (world settings, day length), audioStore (setBPM), uiStore (activeView).

    Issue 6: Build Ocean View Viewport.
        Render OceanScene SVG inside the GlassViewport content area (not full-screen).
        Remove the 100vw × 100vh full-screen sizing assumption; OceanScene fills the available glass space accounting for the transport bar and nav bar offsets.
        On desktop, the scene expands as more of the glass is revealed along the X-axis (sleeve grows, glass grows).

    Issue 7: Build Ocean Management Card (File/Session CRUD buttons with confirmation modals).

    Issue 8: Build World Options Module (BPM Stepper & Planet Size Selector).
        BPM stepper calls setBPM(bpm) — updates store and Tone.Transport simultaneously.
        Planet Size selector replaces the Length of Day stepper: three options — Small (3 min/day), Medium (6 min/day), Large (9 min/day) — call setPlanetSize(size) on oceanStore; this controls how many real-world minutes make up one full in-world day cycle.
        Radix: Planet Size selector uses @radix-ui/react-select → Select.Root + Select.Trigger + Select.Content + Select.Item.

    Issue 9: Integrate Volume VU Indicator (1x1 Display component).


🤖 Milestone 3: Robot Synthesis & Management

Goal: Deep-dive customization of the generative "mining" units.
Depends on: robotStore (robot state, selection), uiStore (selected robot view).

    Issue 10: Build Robot Selection/Gallery (List view for choosing active robot).

    Issue 11: Build Synthesis Module A (General: Name Textbox, Rhythmic Density/Variance Sliders).
        Name Textbox maps to robot.name (added in Issue 0d).
        Note: "Rhythmic Density/Variance" has no current backing type — define mapping before building (e.g., note density in melody, masterVolume jitter). Scope this in the issue.

    Issue 12: Build Synthesis Module B (Oscillators):

        Dropdown for Waveform Type (maps to robot.audioAttributes.waveform).
        Radix: Waveform dropdown uses @radix-ui/react-select → Select.Root + Select.Trigger + Select.Content + Select.Item.

        Vertical Power Bars (linear fill sliders, touch-optimized, minimum 44×44px touch target) for:
            Phase → robot.audioAttributes.phase (added in Issue 0d).
            Gain → robot.masterVolume (top-level field, already exists).
            Detune → robot.audioAttributes.detune (added in Issue 0d).
        Radix: each Vertical Power Bar uses @radix-ui/react-slider → Slider.Root (orientation="vertical") + Slider.Track + Slider.Range + Slider.Thumb.

        Pulsewidth: Vertical Power Bar (maps to Tone oscillator width; render conditionally when waveform = 'square' only).

        No rotary knobs or grippable controls — everything is a touch-friendly linear bar.

    Issue 13: Build ADSR Envelope Cluster.
        HTML Canvas ADSR graph with 4 draggable nodes: Attack, Decay, Sustain, Release.
        Bezier curve visualization connecting the nodes updates in real time as nodes are dragged.
        Uses pointer/touch events for compatibility across the touch screen.
        Maps directly to robot.audioAttributes ADSR fields.


🎹 Milestone 4: Composition & Note Matrix

Goal: The sequence-level control and popover interaction.
Depends on: robotStore (robot melodies), oceanStore (measure state), uiStore (popover state).
Note: All interactive elements in this milestone must meet the 44×44px minimum touch target size.

    Issue 14: Build Note Array Display (Passive visualization of current measures).

    Issue 15: Build Piano Keyboard Popover (Floating octave selector).
        Radix: use @radix-ui/react-popover → Popover.Root + Popover.Trigger + Popover.Content + Popover.Close for the floating panel.

    Issue 16: Implement Measure CRUD (New/Delete Measure buttons with safety confirmations).
        Radix: destructive delete confirmation uses @radix-ui/react-alert-dialog → AlertDialog.Root + AlertDialog.Trigger + AlertDialog.Content + AlertDialog.Action + AlertDialog.Cancel.


🎛️ Milestone 5: Global Audio FX Rack

Goal: The master signal chain processing.
Depends on: audioStore (globalAudio state, FX), AudioEngine (FX chain).

    Issue 17: Build Universal FX Wrapper (1×1 Bypass Toggle + Group Border).
        Global bypass toggle maps to audioStore.globalAudio.globalBypass → AudioEngine.setGlobalBypass().
        Per-effect bypass toggle maps to audioStore.globalAudio.<effect>.enabled → AudioEngine.setEffectBypass(effect, enabled).
        Radix: both bypass toggles use @radix-ui/react-switch → Switch.Root + Switch.Thumb for correct checked/unchecked accessibility semantics.

    Issue 18: Implement Reverb & Delay Modules (Value Strips).
        All parameters use Value Strips (horizontal or vertical high-contrast fill bars) — no knobs or grippable controls.
        Reverb: decay, preDelay, dampening, wet → AudioEngine.setGlobalReverb().
        Delay: delayTime, feedback, wet → AudioEngine.setGlobalDelay().
        Radix: each Value Strip uses @radix-ui/react-slider → Slider.Root + Slider.Track + Slider.Range + Slider.Thumb.

    Issue 19: Implement Compression & EQ Modules (Value Strips).
        All parameters use Value Strips.
        Compressor: threshold, ratio, attack, release, knee → AudioEngine.setGlobalCompressor().
        EQ3: low, mid, high gain → AudioEngine.setGlobalEQ().
        Radix: each Value Strip uses @radix-ui/react-slider → Slider.Root + Slider.Track + Slider.Range + Slider.Thumb.

    Issue 20: Implement Filter & Chorus Modules (Value Strips).
        All parameters use Value Strips.
        LPF: frequency, Q → AudioEngine.setGlobalFilterLPF().
        HPF: frequency, Q → AudioEngine.setGlobalFilterHPF().
        Chorus: rate, depth, delayTime, feedback, wet → AudioEngine.setGlobalChorus().
        Radix: each Value Strip uses @radix-ui/react-slider → Slider.Root + Slider.Track + Slider.Range + Slider.Thumb.


📊 Milestone 6: System Utilities & Polish

Goal: Data visualization, settings, and final responsive cleanup.
Depends on: uiStore (theme, language, fullscreen), settingsStore (Issues 0h), notificationStore (Issue 0i), sessionStore (Issue 0j).

    Issue 21: Build Data Vis Viewport (TBD Grid area for telemetry).

    Issue 22: Build Settings Overlay (Theme Switcher & Graphic Settings).
        Theme and language state lives in uiStore (setTheme, setLanguage).
        Radix: overlay panel uses @radix-ui/react-dialog → Dialog.Root + Dialog.Content. Boolean preference toggles (reducedMotion, accessibilityMode) use @radix-ui/react-switch. Language and theme dropdowns use @radix-ui/react-select.

    Issue 23: 360px Collapsed Sleeve Pass.
        Set --sleeve-width: 30px on mobile — the sleeve narrows to its minimum housing width.
        Navigation drops to the bottom tab bar on the GlassViewport (see Issue 3).
        GlassViewport enters vertical scroll "tape" mode: all views stack in a single scrollable column, making the interface feel like a long tape of data being pulled out of a compact handheld unit.
        Verify all views from Milestones 2–5 stack and scroll correctly at 360px viewport width.