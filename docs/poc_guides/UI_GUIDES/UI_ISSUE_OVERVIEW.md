
🗂️ **Store Overview**

Pelagos-7 uses modular Zustand stores to manage state in a scalable, maintainable way. Below are the core stores and their responsibilities:

- **robotStore**: Manages all robot state, selection, and mutations.
    - State: array of robots, selectedRobotId
    - Actions: addRobot(), removeRobot(), updateRobot(), getRobotById(), setSelectedRobotId()

- **oceanStore**: Manages world/environment state (e.g., day length, world settings, actor positions).
    - State: world settings, actors, dayLengthMeasures, etc.
    - Actions: setDayLength(), setWorldSetting(), addActor(), removeActor(), etc.

- **audioStore**: Manages global audio FX, BPM, and related settings.
    - State: globalAudio, bpm, etc.
    - Actions: setGlobalAudio(), setBPM(), etc.

- **uiStore**: Manages UI state, navigation, and panel logic.
    - State: activeView, theme, language, isFullscreen, panel states, selection
    - Actions: setActiveView(), setTheme(), setLanguage(), setFullscreen(), setPanelState(), setSelection()

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
        New Zustand store with: activeView: 'ocean' | 'robot' | 'composition' | 'fx' | 'settings', theme, language, isFullscreen.
        Actions: setActiveView(), setTheme(), setLanguage(), setFullscreen().
        All state JSON-serializable; no Tone nodes, GSAP timelines, or DOM refs stored here.

    Issue 0f: Remove robot.audioAttributes.reverb (src/types/Robot.ts, all construction sites).
        Remove reverb: number from AudioAttributes — it was stored but never read by AudioEngine (dead state).
        Global reverb is now handled by GlobalAudioSettings.reverb and the _globalReverb node in AudioEngine.
        Update spawnSystem, tests, and any other AudioAttributes construction sites.

    Issue 0g: Add dayLengthMeasures and setDayLength to oceanStore (src/stores/oceanStore.ts).
        Store: oceanStore
        Add dayLengthMeasures: number (default: 96, unit: measures) to oceanStore.settings.
        Add setDayLength(measures: number) action.
        Update setCurrentMeasure to wrap using dayLengthMeasures and derive currentHour proportionally.

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

    Issue 2: Build Glass-Mounted Transport Bar.
        Horizontal bar pinned to the top of GlassViewport.
        Contains: Play/Pause/Stop controls, BPM display, and Measure counter.
        All controls are touch targets (minimum 44×44px per WCAG).
        Transport is rendered on the glass — not in the sleeve.

    Issue 3: Build Navigation System.
        Tablet/desktop: vertical icon bar on the left edge of GlassViewport (inside the glass, not the sleeve).
        Mobile: bottom tab bar on GlassViewport.
        Responsive toggle between the two layouts driven by CSS breakpoints.
        Navigation state (active view) lives in uiStore.activeView.

    Issue 4: Implement View-Switching Logic (State management to toggle "Active Viewport").
        Active view state lives in uiStore.activeView.
        Swaps the content area of GlassViewport between: 'ocean' | 'robot' | 'composition' | 'fx' | 'settings'.

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

    Issue 8: Build World Options Module (BPM & Length of Day Dual-Speed Steppers).
        BPM stepper calls setBPM(bpm) — updates store and Tone.Transport simultaneously.
        Length of Day stepper calls setDayLength(measures) — unit is measures, default 96.

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

        Vertical Power Bars (linear fill sliders, touch-optimized, minimum 44×44px touch target) for:
            Phase → robot.audioAttributes.phase (added in Issue 0d).
            Gain → robot.masterVolume (top-level field, already exists).
            Detune → robot.audioAttributes.detune (added in Issue 0d).

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

    Issue 16: Implement Measure CRUD (New/Delete Measure buttons with safety confirmations).


🎛️ Milestone 5: Global Audio FX Rack

Goal: The master signal chain processing.
Depends on: audioStore (globalAudio state, FX), AudioEngine (FX chain).

    Issue 17: Build Universal FX Wrapper (1×1 Bypass Toggle + Group Border).
        Global bypass toggle maps to audioStore.globalAudio.globalBypass → AudioEngine.setGlobalBypass().
        Per-effect bypass toggle maps to audioStore.globalAudio.<effect>.enabled → AudioEngine.setEffectBypass(effect, enabled).

    Issue 18: Implement Reverb & Delay Modules (Value Strips).
        All parameters use Value Strips (horizontal or vertical high-contrast fill bars) — no knobs or grippable controls.
        Reverb: decay, preDelay, dampening, wet → AudioEngine.setGlobalReverb().
        Delay: delayTime, feedback, wet → AudioEngine.setGlobalDelay().

    Issue 19: Implement Compression & EQ Modules (Value Strips).
        All parameters use Value Strips.
        Compressor: threshold, ratio, attack, release, knee → AudioEngine.setGlobalCompressor().
        EQ3: low, mid, high gain → AudioEngine.setGlobalEQ().

    Issue 20: Implement Filter & Chorus Modules (Value Strips).
        All parameters use Value Strips.
        LPF: frequency, Q → AudioEngine.setGlobalFilterLPF().
        HPF: frequency, Q → AudioEngine.setGlobalFilterHPF().
        Chorus: rate, depth, delayTime, feedback, wet → AudioEngine.setGlobalChorus().


📊 Milestone 6: System Utilities & Polish

Goal: Data visualization, settings, and final responsive cleanup.
Depends on: uiStore (theme, language, fullscreen), settingsStore (Issues 0h), notificationStore (Issue 0i), sessionStore (Issue 0j).

    Issue 21: Build Data Vis Viewport (TBD Grid area for telemetry).

    Issue 22: Build Settings Overlay (Theme Switcher & Graphic Settings).
        Theme and language state lives in uiStore (setTheme, setLanguage).

    Issue 23: 360px Collapsed Sleeve Pass.
        Set --sleeve-width: 30px on mobile — the sleeve narrows to its minimum housing width.
        Navigation drops to the bottom tab bar on the GlassViewport (see Issue 3).
        GlassViewport enters vertical scroll "tape" mode: all views stack in a single scrollable column, making the interface feel like a long tape of data being pulled out of a compact handheld unit.
        Verify all views from Milestones 2–5 stack and scroll correctly at 360px viewport width.