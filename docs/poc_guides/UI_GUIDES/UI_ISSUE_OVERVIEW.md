
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

🛠 Project: Pelagos Industrial UI

Description: Modular, grid-based industrial mining interface (1×1 unit logic).
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

🏳️ Milestone 1: Core Architecture & Navigation

Goal: Establish the persistent "Rugged Shell" and the state machine for view swapping.
Depends on: Issue 0e (uiStore).

    Issue 1: Define Global CSS Grid System (1×1 base unit variables).

    Issue 2: Build Pinned Global Header (Transport Root + Measure Display).

    Issue 3: Build Persistent Mode Switcher (Sidebar for Tablet / Bottom Bar for Mobile).

    Issue 4: Implement View-Switching Logic (State management to toggle "Active Viewport").
        Active view state lives in uiStore.activeView.

    Issue 5: Create Global Screen-Wear Overlay (SVG/PNG overlay for scratches/smudges).


🌊 Milestone 2: Ocean View (The Default Context)

Goal: The primary "Home" landing and high-level environment control.
Depends on: oceanStore (world settings, day length), audioStore (setBPM), uiStore (activeView).

    Issue 6: Build Robot Visualizer Placeholder (4×4 Desktop / Full-width Mobile).

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

        1×1 Digital Knobs for Phase / Gain / Detune.
            Phase → robot.audioAttributes.phase (added in Issue 0d).
            Gain → robot.masterVolume (top-level field, already exists).
            Detune → robot.audioAttributes.detune (added in Issue 0d).

        2×1 Dual-Speed Stepper for Pulsewidth (maps to Tone oscillator width; render conditionally when waveform = square only).

    Issue 13: Build ADSR Envelope Cluster (4x Steppers with visual sparkline).


🎹 Milestone 4: Composition & Note Matrix

Goal: The sequence-level control and popover interaction.
Depends on: robotStore (robot melodies), oceanStore (measure state), uiStore (popover state).

    Issue 14: Build Note Array Display (Passive visualization of current measures).

    Issue 15: Build Piano Keyboard Popover (Floating 1x1 octave selector).

    Issue 16: Implement Measure CRUD (New/Delete Measure buttons with safety confirmations).


🎛️ Milestone 5: Global Audio FX Rack

Goal: The master signal chain processing.
Depends on: audioStore (globalAudio state, FX), AudioEngine (FX chain).

    Issue 17: Build Universal FX Wrapper (1×1 Bypass Toggle + Group Border).
        Global bypass toggle maps to audioStore.globalAudio.globalBypass → AudioEngine.setGlobalBypass().
        Per-effect bypass toggle maps to audioStore.globalAudio.<effect>.enabled → AudioEngine.setEffectBypass(effect, enabled).

    Issue 18: Implement Reverb & Delay Modules (Slider clusters).
        Reverb: decay, preDelay, dampening, wet → AudioEngine.setGlobalReverb().
        Delay: delayTime, feedback, wet → AudioEngine.setGlobalDelay().

    Issue 19: Implement Compression & EQ Modules (Slider clusters).
        Compressor: threshold, ratio, attack, release, knee → AudioEngine.setGlobalCompressor().
        EQ3: low, mid, high gain → AudioEngine.setGlobalEQ().

    Issue 20: Implement Filter & Chorus Modules (Slider clusters).
        LPF: frequency, Q → AudioEngine.setGlobalFilterLPF().
        HPF: frequency, Q → AudioEngine.setGlobalFilterHPF().
        Chorus: rate, depth, delayTime, feedback, wet → AudioEngine.setGlobalChorus().


📊 Milestone 6: System Utilities & Polish

Goal: Data visualization, settings, and final responsive cleanup.
Depends on: uiStore (theme, language, fullscreen), settingsStore (user preferences), notificationStore (notifications), sessionStore (session info).

    Issue 21: Build Data Vis Viewport (TBD Grid area for telemetry).

    Issue 22: Build Settings Overlay (Theme Switcher & Graphic Settings).
        Theme and language state lives in uiStore (setTheme, setLanguage).

    Issue 23: 360px Mobile Optimization Pass (Stacking logic for all previous milestones).