---
name: Feature
about: Milestone 8.0 — Engine & State Foundation (Prerequisites)
title: '[M8.0] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 0a: Define GlobalAudioSettings Type                    -->
<!-- ============================================================ -->

## [M8.0-0a] Define GlobalAudioSettings Type

## Feature Description
Create a new `GlobalAudioSettings` interface in `src/types/` that defines the full parameter surface for all global audio effects. This type is the single source of truth for FX state throughout the app — all Milestone 5 FX Rack UI, audioStore state, and AudioEngine setter methods depend on it.

## Implementation Details
- [ ] Create `src/types/globalAudio.ts` (or add to an appropriate existing types file)
- [ ] Define per-effect param structs: `ReverbSettings`, `DelaySettings`, `CompressorSettings`, `EQ3Settings`, `FilterSettings`, `ChorusSettings`
- [ ] Each effect struct includes `enabled: boolean` for per-effect bypass
- [ ] Top-level `GlobalAudioSettings` interface includes `globalBypass: boolean` and one field per effect
- [ ] All values are JSON-serializable primitives (no Tone nodes, no DOM refs — Zustand rule)
- [ ] Export from `src/types/index.ts`
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)

## Technical Notes
Effect parameter ranges (for reference when writing defaults):
- **Reverb:** `decay` (0.1–10s), `preDelay` (0–0.5s), `dampening` (100–8000 Hz), `wet` (0–1)
- **Delay:** `delayTime` (0–1s), `feedback` (0–0.95), `wet` (0–1)
- **Compressor:** `threshold` (-60–0 dB), `ratio` (1–20), `attack` (0.001–1s), `release` (0.01–1s), `knee` (0–40 dB)
- **EQ3:** `low` (-12–12 dB), `mid` (-12–12 dB), `high` (-12–12 dB)
- **FilterLPF / FilterHPF:** `frequency` (20–20000 Hz), `Q` (0.1–20)
- **Chorus:** `rate` (0.1–10 Hz), `depth` (0–1), `delayTime` (2–20 ms), `feedback` (0–1), `wet` (0–1)

All fields that Tone.js does not expose as `wet` (e.g. EQ3, Compressor) are bypassed via `enabled` flag and AudioEngine routing logic — not by setting `.wet`.

## Acceptance Criteria
- [ ] `GlobalAudioSettings` is importable from `src/types/index.ts`
- [ ] Each effect struct has all required fields with correct TypeScript types
- [ ] `globalBypass: boolean` and per-effect `enabled: boolean` are present
- [ ] No runtime Tone.js or browser dependencies introduced in the type file
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in existing features

## Source Reference
- File: `src/types/Robot.ts` (reference for pattern: existing serializable type conventions)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0b: Add globalAudio and setBPM to audioStore           -->
<!-- ============================================================ -->

## [M8.0-0b] Add globalAudio and setBPM to audioStore

## Feature Description
Create a dedicated `audioStore` to hold the global audio FX state and a properly wired BPM setter. These additions are the state layer that the FX Rack UI (Milestone 5) reads from and writes to.

Depends on: **Issue 0a** (`GlobalAudioSettings` type must exist first).

## Implementation Details
- [ ] Create `audioStore.ts` with `globalAudio: GlobalAudioSettings` and sensible defaults
- [ ] Add `setGlobalAudio(effect: keyof GlobalAudioSettings, partial: Partial<...>)` action — updates a single effect's params via spread merge, preserving other effect settings
- [ ] Add `setBPM(bpm: number)` action: updates `audioStore.bpm` AND calls `Tone.Transport.bpm.value = bpm`; import from AudioEngine or call directly (AudioEngine must already be initialized)
- [ ] Update all references to use `audioStore` for global audio state and actions
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `setBPM` must NOT call `Tone.Transport.bpm.value` if AudioEngine has not been started (audio context not yet running). Guard with an `initialized` check or expose a setter from `AudioEngine` that handles this safely.
- `setGlobalAudio` should do a shallow merge per-effect: `{ ...state.globalAudio, [effect]: { ...state.globalAudio[effect], ...partial } }` — never replace the whole `globalAudio` object in one call, to avoid overwriting unrelated effect settings.

## Acceptance Criteria
- [ ] `useAudioStore.getState().globalAudio` contains correct defaults matching `GlobalAudioSettings`
- [ ] Calling `setBPM(140)` updates both `audioStore.bpm` to `140` and `Tone.Transport.bpm.value` to `140` (when audio is running)
- [ ] `setGlobalAudio('reverb', { wet: 0.5 })` updates only `globalAudio.reverb.wet` — other reverb params and all other effects are unchanged
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in existing features (BPM at 120)

## Source Reference
- File: `src/stores/audioStore.ts`
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0c: Wire Global FX Chain in AudioEngine                -->
<!-- ============================================================ -->

## [M8.0-0c] Wire Global FX Chain in AudioEngine

## Feature Description
Instantiate global Tone.js effect nodes inside `AudioEngine` and rewire the master signal chain to route all audio through them. Expose setter methods that the UI (and oceanStore actions) can call to update effect parameters in real time.

Depends on: **Issue 0a** (`GlobalAudioSettings` type), **Issue 0b** (globalAudio state exists and can be read).

## Implementation Details
- [ ] Declare module-level variables for global nodes: `_globalReverb`, `_globalDelay`, `_globalChorus`, `_globalEQ`, `_globalLPF`, `_globalHPF` (all nullable, initialized in `start()`)
- [ ] Instantiate nodes in `AudioEngine.start()` with safe defaults matching `GlobalAudioSettings` defaults
- [ ] Rewire master chain: `_masterCompressor → _globalEQ → _globalLPF → _globalHPF → _globalChorus → _globalDelay → _globalReverb → Destination`
- [ ] Expose setter methods on the `AudioEngine` export object:
  - `setGlobalReverb(params: Partial<ReverbSettings>)`
  - `setGlobalDelay(params: Partial<DelaySettings>)`
  - `setGlobalChorus(params: Partial<ChorusSettings>)`
  - `setGlobalFilterLPF(params: Partial<FilterSettings>)`
  - `setGlobalFilterHPF(params: Partial<FilterSettings>)`
  - `setGlobalEQ(params: Partial<EQ3Settings>)`
  - `setGlobalCompressor(params: Partial<CompressorSettings>)`
  - `setGlobalBypass(bypass: boolean)` — short-circuits entire chain when true
  - `setEffectBypass(effect: string, enabled: boolean)` — disables individual effect
- [ ] Per-effect bypass: set `effect.wet.value = 0` when `enabled = false` for wet effects; route around dry effects (EQ3, Compressor) using gain nodes
- [ ] All node instantiation guarded for test/headless environments (Tone constructors may not exist in vitest)
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- Follow the existing guard pattern used for `busFilter`, `busGain`, and `panner` in `createCompositeVoice()` — use `typeof ToneCtor === 'function'` checks and fallback minimal stubs for headless test runs.
- `Tone.Reverb` generates an impulse response asynchronously (`await reverb.ready`) — call this in `start()` before the transport starts.
- All setter methods must guard against `null` nodes (AudioEngine not yet started).
- For global bypass, disconnect `_masterCompressor` from the FX chain and connect directly to `Destination`; reconnect on bypass off.
- `_masterCompressor` node and its hardcoded params (threshold -18dB, ratio 6:1, attack 3ms, release 150ms) remain; `setGlobalCompressor()` will allow runtime overrides.
- Gate all diagnostic logs behind `DEV_TUNING`.

## Acceptance Criteria
- [ ] All six global effect nodes are instantiated and connected in the correct chain order
- [ ] Calling `AudioEngine.setGlobalReverb({ wet: 0.8 })` audibly increases reverb on all robot audio
- [ ] Calling `AudioEngine.setEffectBypass('reverb', false)` silences the reverb (wet = 0) without stopping playback
- [ ] Calling `AudioEngine.setGlobalBypass(true)` routes audio directly to output, bypassing all FX nodes
- [ ] Existing per-robot audio routing (panner → busGain → busFilter → _masterCompressor) is preserved and unaffected
- [ ] All vitest tests continue to pass (no failures due to missing Tone constructors)
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/engine/AudioEngine.ts` (see `initSynthPool`, `createCompositeVoice`, `_masterCompressor`)
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 0d: Add name, phase, detune to Robot Type              -->
<!-- ============================================================ -->

## [M8.0-0d] Add name, phase, and detune to Robot Type

## Feature Description
Extend the `Robot` type and `AudioAttributes` with `name`, `phase`, and `detune` fields. Wire `phase` and `detune` into `AudioEngine.reserveVoice()` alongside the existing `waveform` application. Generate robot names in `spawnSystem`. These fields back the Name Textbox and Oscillator Vertical Power Bars in Milestone 3.

## Implementation Details
- [ ] Add `name: string` to `Robot` interface in `src/types/Robot.ts`
- [ ] Add `phase: number` (0–360, degrees) to `AudioAttributes`
- [ ] Add `detune: number` (cents, e.g. -100 to 100) to `AudioAttributes`
- [ ] Update `spawnSystem.ts` to generate a procedural name (e.g. adjective + noun pattern, or `Robot-XXXX` ID) and assign it to `robot.name`
- [ ] Update `AudioEngine.reserveVoice()` to apply `phase` and `detune` to the synth at reservation time (same pattern as existing `waveform` application)
- [ ] Update all `AudioAttributes` construction sites to include `phase` and `detune` defaults
- [ ] Update all `Robot` construction sites to include `name`
- [ ] Update test fixtures in all `*.test.ts` files that construct `Robot` or `AudioAttributes` objects
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)
- [ ] Documentation updated if needed

## Technical Notes
- `phase` maps to `synth.set({ oscillator: { phase } })` — check Tone.js PolySynth/oscillator API for the correct property path. Apply at `reserveVoice()` time since it is set once per voice, like `waveform`.
- `detune` maps to `synth.set({ detune })` — apply at `reserveVoice()` time.
- Name generation in `spawnSystem` should be deterministic-looking but varied enough to feel unique. A simple two-word combo (e.g. `"Iron Drifter"`, `"Null Tide"`) is sufficient. Keep the list in a small constants file if word lists are used.
- `name` is a display field only — no audio or animation system reads it.

## Acceptance Criteria
- [ ] `useOceanStore.getState().robots[0].name` is a non-empty string after spawn
- [ ] `useOceanStore.getState().robots[0].audioAttributes.phase` is a number within 0–360
- [ ] `useOceanStore.getState().robots[0].audioAttributes.detune` is a number (e.g. 0 by default)
- [ ] All existing tests pass with no type errors after fixture updates
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in spawn or melody playback

## Source Reference
- File: `src/types/Robot.ts`, `src/systems/spawnSystem.ts`, `src/engine/AudioEngine.ts` (see `reserveVoice`)
- Copilot instructions: "All audio: AudioEngine only (singleton)."

---

<!-- ============================================================ -->
<!-- ISSUE 0e: Create uiStore.ts                                  -->
<!-- ============================================================ -->

## [M8.0-0e] Create uiStore.ts

## Feature Description
Create a new Zustand store at `src/stores/uiStore.ts` to hold UI-only state: active view, theme, language, fullscreen, and tablet power state. This store is the foundation for view-switching (Milestone 1, Issue 4), the powered-down initial state (Milestone 1, Issue 2), and the Settings Overlay (Milestone 6, Issue 22).

## Implementation Details
- [ ] Create `src/stores/uiStore.ts` following the same pattern as `oceanStore.ts`
- [ ] State shape:
  - `activeView: 'ocean' | 'robot' | 'composition' | 'fx' | 'settings'` (default: `'ocean'`)
  - `theme: 'dark' | 'light'` (default: `'dark'`)
  - `language: string` (default: `'en'`)
  - `isFullscreen: boolean` (default: `false`)
  - `isPoweredOn: boolean` (default: `false`) — controls the tablet's powered-on/off state; false = powered-down on app load
- [ ] Actions: `setActiveView()`, `setTheme()`, `setLanguage()`, `setFullscreen()`, `setPowerOn()`, `setPowerOff()`
- [ ] `setPowerOn()`: sets `isPoweredOn` to `true`
- [ ] `setPowerOff()`: sets `isPoweredOn` to `false`
- [ ] All state is JSON-serializable (no Tone nodes, GSAP timelines, or DOM refs)
- [ ] Export `useUIStore` hook
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `isPoweredOn` is the single source of truth for tablet power state — all components that depend on power state (TransportBar button enablement, ocean display visibility, nav button enablement) should derive from it via `useUIStore`.
- `isFullscreen` stores intent only; the component that renders fullscreen should use the browser Fullscreen API in response to this state, not store the DOM reference itself.
- Do not store any derived or computed values in this store — keep it as a flat, minimal state shape.
- Theme values should align with whatever CSS custom property system is defined in Issue 1 (design tokens).
- Language is a future placeholder; full i18n is out of scope for now. Store the value but no translation logic is required in this issue.

## Acceptance Criteria
- [ ] `useUIStore` is importable from `src/stores/uiStore.ts`
- [ ] `useUIStore.getState().activeView` defaults to `'ocean'`
- [ ] `useUIStore.getState().isPoweredOn` defaults to `false`
- [ ] Calling `setActiveView('fx')` updates `activeView` to `'fx'`
- [ ] Calling `setPowerOn()` sets `isPoweredOn` to `true`; calling `setPowerOff()` sets it to `false`
- [ ] All state values are JSON-serializable
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in existing features

## Source Reference
- File: `src/stores/oceanStore.ts` (reference for store pattern and conventions)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0f: Remove robot.audioAttributes.reverb                -->
<!-- ============================================================ -->

## [M8.0-0f] Remove robot.audioAttributes.reverb

## Feature Description
Remove the `reverb: number` field from `AudioAttributes`. This field was added as a stub but is never read by `AudioEngine` — no per-robot reverb node exists and the value has no effect on sound. Global reverb is now handled exclusively by `GlobalAudioSettings.reverb` and the `_globalReverb` node introduced in Issue 0c. Removing it eliminates dead state and avoids confusion.

Depends on: **Issue 0a** (`GlobalAudioSettings` must exist before removing the per-robot stub).

## Implementation Details
- [ ] Remove `reverb: number` from `AudioAttributes` interface in `src/types/Robot.ts`
- [ ] Remove `reverb` from all `AudioAttributes` construction sites in `src/systems/spawnSystem.ts`
- [ ] Remove `reverb` from all test fixtures in `*.test.ts` files that construct `AudioAttributes` or `Robot` objects
- [ ] Search for any other references to `audioAttributes.reverb` across the codebase and remove/update them
- [ ] Confirm no AudioEngine code reads `audioAttributes.reverb` (it does not — confirm with a grep)
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `audioAttributes.filterFreq` is intentionally NOT removed — it maps to the existing per-robot `busFilter` node in `createCompositeVoice()` and is a valid, wired per-robot feature.
- After removal, any code that previously spread a full `AudioAttributes` object in tests will need the `reverb` key dropped from the literal.
- Run `npm test` after changes to confirm no regressions.

## Acceptance Criteria
- [ ] `reverb` does not appear in the `AudioAttributes` interface
- [ ] All TypeScript construction sites compile without errors
- [ ] `npm test` passes with no failures
- [ ] `audioAttributes.filterFreq` is unaffected and still wired in AudioEngine
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback or visual rendering

## Source Reference
- File: `src/types/Robot.ts`, `src/systems/spawnSystem.ts`, `src/engine/AudioEngine.ts`
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0g: Add planetSize and real-clock time-of-day to oceanStore -->
<!-- ============================================================ -->

## [M8.0-0g] Add planetSize and real-clock time-of-day system to oceanStore

## Feature Description
Replace the measure-coupled day-length system with a real wall-clock time-of-day system driven by a configurable Planet Size setting. Time of day is now a world property derived from elapsed real time — it advances continuously regardless of whether the tablet is powered on. Beat-clock measures are fully decoupled from time of day. This setting is read by the World Options UI (Milestone 2, Issue 8) and the day/night lighting system.

## Implementation Details
- [ ] Remove `dayLengthMeasures: number` and `setDayLength()` from `oceanStore.settings` and the store actions
- [ ] Add `planetSize: 'small' | 'medium' | 'large'` (default: `'medium'`) to `oceanStore.settings`
- [ ] Add `setPlanetSize(size: 'small' | 'medium' | 'large')` action: updates `planetSize` in settings
- [ ] Add a `PLANET_DURATION_MS` constant (in `src/constants/` or inline in the store):
  ```ts
  const PLANET_DURATION_MS = { small: 3 * 60_000, medium: 6 * 60_000, large: 9 * 60_000 } as const;
  ```
- [ ] Add `dayStartTimestamp: number` to oceanStore top-level state (default: `Date.now()` at store init — representing the start of the current day cycle at app load)
- [ ] Add `setDayStartTimestamp(ts: number)` action: called when a day cycle wraps (i.e. when `currentHour` rolls past 24)
- [ ] `currentHour` derivation: computed as `((Date.now() - dayStartTimestamp) / PLANET_DURATION_MS[planetSize]) * 24` — this yields a float 0–24 representing the current in-world hour
- [ ] Remove the `setCurrentMeasure` day-length wrap logic (`% dayLengthMeasures`) — measures no longer drive time of day
- [ ] Create or update a time-of-day tick in `OceanScene` (or a dedicated `timeClock.ts` system): a `setInterval` firing every second that reads `dayStartTimestamp` and `planetSize` from the store, computes `currentHour`, calls `useOceanStore.getState().setCurrentHour(newHour)`, and calls `setDayStartTimestamp(Date.now())` when a new day cycle begins (i.e. `newHour` wraps past 24). This interval is NOT musical timing — using `setInterval` here is acceptable per architecture rules.
- [ ] The time-of-day interval starts on app mount and runs regardless of tablet power state
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `dayStartTimestamp` is the wall-clock millisecond when the current in-world day started. On midnight wrap, update it to `Date.now()` to begin the next day cycle cleanly.
- `planetSize` must stay in `settings` (not top-level) to match existing `oceanStore` conventions.
- `currentHour` is a float (e.g. `6.5` = 6:30 AM). Existing systems that relied on an integer hour should use `Math.floor(currentHour)` where needed.
- The time-of-day `setInterval` is separate from `BeatClock`/`Tone.Transport`. Beat clock advancement is gated by `isPoweredOn` in `uiStore` and is paused/stopped by the transport controls. Time of day is never paused.
- On app load the time of day is midnight (`dayStartTimestamp = Date.now()`, `currentHour ≈ 0`). The first second tick will advance it very slightly from 0.
- `setCurrentMeasure` no longer handles any wrapping; it is called by the BeatClock subscriber and simply stores the value. All measure reset logic lives in transport actions (power off, restart).

## Acceptance Criteria
- [ ] `useOceanStore.getState().settings.planetSize` defaults to `'medium'`
- [ ] `useOceanStore.getState().dayStartTimestamp` is a recent `Date.now()` timestamp on app load
- [ ] Calling `setPlanetSize('small')` updates `settings.planetSize` to `'small'`; a full day cycle then takes 3 real minutes
- [ ] `currentHour` advances in real time — after 90 real seconds with `planetSize = 'small'`, `currentHour ≈ 12` (midday)
- [ ] `currentHour` does not advance when the transport is paused or powered off (it always advances — confirm the interval is independent of transport state)
- [ ] `setCurrentMeasure` no longer wraps using a day-length value
- [ ] `dayLengthMeasures` does not appear in the store type, state, or actions
- [ ] No regression in existing features
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/stores/oceanStore.ts`, `src/components/OceanScene.tsx` (time-of-day tick location)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."; "All timing: Tone.Transport / BeatClock (measure-based). No setTimeout/setInterval for musical timing." (Note: the time-of-day interval is not musical timing and is explicitly permitted.)

---

<!-- ============================================================ -->
<!-- ISSUE 0h: Create settingsStore.ts                            -->
<!-- ============================================================ -->

## [M8.0-0h] Create settingsStore.ts

## Feature Description
Create a new Zustand store at `src/stores/settingsStore.ts` to hold persistent user preferences: reduced motion, accessibility mode, saved theme, and language. This store is the backing state for the Settings Overlay (Milestone 6, Issue 21) and is persisted to `localStorage` across sessions.

Depends on: No other M0 issues (standalone store).

## Implementation Details
- [ ] Create `src/stores/settingsStore.ts` following the same pattern as `uiStore.ts` (Issue 0e)
- [ ] State shape:
  - `reducedMotion: boolean` (default: `false` — read from `window.matchMedia('(prefers-reduced-motion: reduce)').matches` on first load if no saved preference exists)
  - `accessibilityMode: boolean` (default: `false`)
  - `savedTheme: string` (default: `'dark'`)
  - `language: string` (default: `'en'`)
- [ ] Actions: `setPreference(key: keyof SettingsState, value: SettingsState[typeof key])`, `loadPreferences()`, `savePreferences()`
- [ ] `loadPreferences()`: reads from `localStorage` (key: `pelagos7.settings.v1`), merges into state; called on app init
- [ ] `savePreferences()`: serialises current state to `localStorage`; called automatically on state change via a Zustand `subscribe` listener
- [ ] All state is JSON-serializable (no DOM refs or Tone nodes)
- [ ] Export `useSettingsStore` hook
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)

## Technical Notes
- Read `window.matchMedia('(prefers-reduced-motion: reduce)').matches` to set the initial `reducedMotion` default, but only if `loadPreferences()` does not find a saved preference — a user override takes priority over the OS setting.
- Use a `localStorage` key with a version suffix (e.g. `pelagos7.settings.v1`) to allow future schema migrations without corrupting saved data.
- Do not store derived or computed values — store only the raw preference values.
- `language` is a placeholder for future i18n; no translation logic is required in this issue.

## Acceptance Criteria
- [ ] `useSettingsStore` is importable from `src/stores/settingsStore.ts`
- [ ] `useSettingsStore.getState().savedTheme` defaults to `'dark'`
- [ ] Calling `setPreference('savedTheme', 'light')` updates the store and persists to `localStorage`
- [ ] Calling `loadPreferences()` on a fresh load restores a previously saved preference set
- [ ] All state values are JSON-serializable
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in existing features

## Source Reference
- File: `src/stores/uiStore.ts` (Issue 0e — reference for store pattern)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0i: Create notificationStore.ts                        -->
<!-- ============================================================ -->

## [M8.0-0i] Create notificationStore.ts

## Feature Description
Create a new Zustand store at `src/stores/notificationStore.ts` to manage in-app notifications, alerts, and toast messages. This store provides the backing state for any system-generated feedback (e.g., "World Saved", "Robot Removed", audio engine errors). It is consumed by a notification renderer component added in Milestone 6.

Depends on: No other M0 issues (standalone store).

## Implementation Details
- [ ] Create `src/stores/notificationStore.ts` following the same pattern as `uiStore.ts`
- [ ] Define a `Notification` interface (inline or in `src/types/`):
  ```typescript
  interface Notification {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error';
    timestamp: number;
  }
  ```
- [ ] State shape:
  - `notifications: Notification[]` (default: `[]`)
- [ ] Actions:
  - `addNotification(notification: Omit<Notification, 'id' | 'timestamp'>)`: generates `id` (e.g. `crypto.randomUUID()`) and `timestamp` (`Date.now()`), appends to array; drops the oldest entry if `notifications.length >= 5` before appending
  - `removeNotification(id: string)`: filters the notification out of the array
  - `clearNotifications()`: sets `notifications` to `[]`
- [ ] All state is JSON-serializable
- [ ] Export `useNotificationStore` hook
- [ ] No architecture violations
- [ ] Code follows standards (imports ordered, explicit types)

## Technical Notes
- Auto-dismiss logic (removing a notification after N seconds) belongs in the consuming UI component, not the store. The store only holds state; the component drives timed removal by calling `removeNotification(id)` after a timeout.
- Limit the maximum number of simultaneous notifications to 5 to prevent runaway accumulation.
- Use `crypto.randomUUID()` for ID generation (available in all modern browsers; no library needed).

## Acceptance Criteria
- [ ] `useNotificationStore` is importable from `src/stores/notificationStore.ts`
- [ ] `addNotification({ message: 'Test', type: 'info' })` adds a notification with a generated `id` and `timestamp`
- [ ] `removeNotification(id)` removes the matching notification without affecting others
- [ ] `clearNotifications()` empties the array
- [ ] Maximum of 5 simultaneous notifications is enforced (oldest dropped when limit is reached)
- [ ] All state is JSON-serializable
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/stores/uiStore.ts` (reference for store pattern)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0j: Create sessionStore.ts                             -->
<!-- ============================================================ -->

## [M8.0-0j] Create sessionStore.ts

## Feature Description
Create a new Zustand store at `src/stores/sessionStore.ts` to track session-level state: the current session identifier, unsaved changes flag, and authentication state. This store is the backing state for session management logic in the Ocean Management Card (Milestone 2, Issue 7) and future session persistence features.

Depends on: No other M0 issues (standalone store).

## Implementation Details
- [ ] Create `src/stores/sessionStore.ts` following the same pattern as `uiStore.ts`
- [ ] State shape:
  - `sessionId: string | null` (default: `null`)
  - `unsavedChanges: boolean` (default: `false`)
  - `authState: 'unauthenticated' | 'authenticated'` (default: `'unauthenticated'`)
- [ ] Actions: `setSession(id: string | null)`, `setAuthState(state: SessionStore['authState'])`, `setUnsavedChanges(flag: boolean)`
- [ ] All state is JSON-serializable
- [ ] Export `useSessionStore` hook
- [ ] No architecture violations
- [ ] Code follows standards (imports ordered, explicit types)

## Technical Notes
- `sessionId` is a lightweight identifier for the current editing session. Generate it with `crypto.randomUUID()` when a world is loaded or created (in Issue 7). It does not imply server-side session management.
- `authState` is a placeholder field for future authentication. In v1 it will always be `'unauthenticated'`; no auth logic is required in this issue.
- `unsavedChanges` should be set to `true` whenever `updateRobot()`, `addRobot()`, or `removeRobot()` is called, and reset to `false` after a successful Save action in Issue 7. This can be done via a Zustand `subscribe` listener or explicit calls at the action call sites.

## Acceptance Criteria
- [ ] `useSessionStore` is importable from `src/stores/sessionStore.ts`
- [ ] `useSessionStore.getState().sessionId` defaults to `null`
- [ ] All state is JSON-serializable
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/stores/uiStore.ts` (reference for store pattern)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0e-delta: Add isPoweredOn to uiStore                  -->
<!-- ============================================================ -->

## [M8.0-0e-delta] Add isPoweredOn to uiStore

## Feature Description
`uiStore` was created in Issue 0e with `activeView`, `theme`, `language`, and `isFullscreen`. This delta adds the `isPoweredOn` boolean that drives the tablet power state introduced by the transport rewrite. It is a small, additive change to the existing store — no existing fields or actions are removed or modified.

**Current state (post Issue 0e):** `uiStore` has no concept of power state.  
**Target state:** `uiStore` exposes `isPoweredOn: boolean` (default `false`) and `setPowerOn()` / `setPowerOff()` actions.

Depends on: **Issue 0e** (uiStore must exist).

## Implementation Details
- [ ] Add `isPoweredOn: boolean` to the `uiStore` state shape with a default of `false`
- [ ] Add `setPowerOn()` action: sets `isPoweredOn` to `true`
- [ ] Add `setPowerOff()` action: sets `isPoweredOn` to `false`
- [ ] Export type updates if a named `UIState` interface exists
- [ ] No existing fields, actions, or defaults are changed
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `isPoweredOn` is the single gating flag read by `TransportBar` (Issue 2) and any other component that needs to know whether the tablet is active.
- Default `false` means the app starts in a powered-down state with all controls except the Power button disabled.
- Do not conflate "powered on" with "audio running" — `isPoweredOn` is a UI/world state flag. AudioEngine being initialized is a separate concern tracked inside AudioEngine itself.

## Acceptance Criteria
- [ ] `useUIStore.getState().isPoweredOn` defaults to `false`
- [ ] Calling `setPowerOn()` sets `isPoweredOn` to `true`
- [ ] Calling `setPowerOff()` sets `isPoweredOn` to `false`
- [ ] All previously passing tests for `uiStore` continue to pass
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing features

## Source Reference
- File: `src/stores/uiStore.ts`
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0g-delta: Replace dayLengthMeasures with real-clock   -->
<!--                 time-of-day and Planet Size                  -->
<!-- ============================================================ -->

## [M8.0-0g-delta] Replace dayLengthMeasures with Planet Size and real-clock time-of-day

## Feature Description
Issue 0g added `dayLengthMeasures` and `setDayLength()` to `oceanStore`, wiring time-of-day (`currentHour`) to the beat-clock measure count. This delta replaces that system: time of day is now driven by elapsed real wall-clock time, configured by a discrete **Planet Size** setting (Small / Medium / Large) that maps to real-world minutes per in-world day. Beat-clock measures are fully decoupled from time of day.

**Current state (post Issue 0g):**
- `oceanStore.settings.dayLengthMeasures: number` (default 96)
- `setDayLength(measures)` action
- `setCurrentMeasure` wraps at `% dayLengthMeasures` and derives `currentHour` from the measure count

**Target state:**
- `dayLengthMeasures` and `setDayLength` are removed
- `oceanStore.settings.planetSize: 'small' | 'medium' | 'large'` (default `'medium'`) + `setPlanetSize()` action
- `oceanStore.dayStartTimestamp: number` (default `Date.now()` at store init) + `setDayStartTimestamp()` action
- `currentHour` is computed from real elapsed wall-clock time, not measures
- `setCurrentMeasure` no longer wraps or derives `currentHour`
- A `setInterval`-based time-of-day tick (in `OceanScene` or a dedicated module) advances `currentHour` every second independently of the transport

Depends on: **Issue 0g** (the code being replaced must exist).

## Implementation Details
- [ ] **Remove from `oceanStore`:**
  - `settings.dayLengthMeasures`
  - `setDayLength(measures)` action
  - The `% dayLengthMeasures` wrap in `setCurrentMeasure`
  - The `currentHour` derivation inside `setCurrentMeasure`
- [ ] **Add to `oceanStore`:**
  - `settings.planetSize: 'small' | 'medium' | 'large'` (default: `'medium'`)
  - `setPlanetSize(size: 'small' | 'medium' | 'large')` action
  - Top-level `dayStartTimestamp: number` (default: `Date.now()` evaluated at store initialisation)
  - `setDayStartTimestamp(ts: number)` action
  - `setCurrentHour(hour: number)` action (updates `currentHour` directly, called by the time-of-day tick)
- [ ] **Add `PLANET_DURATION_MS` constant** in `src/constants/index.ts` or a new `src/constants/time.ts`:
  ```ts
  export const PLANET_DURATION_MS = {
    small:  3 * 60_000,
    medium: 6 * 60_000,
    large:  9 * 60_000,
  } as const;
  ```
- [ ] **Time-of-day tick** — add to `OceanScene.tsx` (or extract to `src/systems/timeClock.ts`):
  - A `setInterval` firing every 1000 ms
  - Each tick: reads `dayStartTimestamp` and `planetSize` from the store, computes `newHour = ((Date.now() - dayStartTimestamp) / PLANET_DURATION_MS[planetSize]) * 24`
  - If `newHour >= 24`: calls `setDayStartTimestamp(Date.now())` and sets `currentHour` to `newHour % 24`
  - Otherwise: calls `setCurrentHour(newHour)`
  - Interval is started on component mount and cleared on unmount (`clearInterval` in `useEffect` cleanup)
  - This interval is **not** musical timing — using `setInterval` here is explicitly permitted per architecture rules
- [ ] Remove any `App.tsx` reference to `% 96` or `% dayLengthMeasures` in the `subscribeToMeasure` callback (measures no longer wrap for time-of-day)
- [ ] Update all test fixtures that reference `dayLengthMeasures` or `setDayLength`
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `currentHour` is now a float (e.g. `6.5` = 6:30 AM). Downstream consumers that assumed an integer should use `Math.floor(currentHour)` where needed.
- The time-of-day tick runs regardless of tablet power state (`isPoweredOn`). Do not gate it on `isPoweredOn`.
- On app load `dayStartTimestamp = Date.now()` and `currentHour ≈ 0` (midnight). The first tick fires after ~1 s and advances it by a tiny fraction.
- `setCurrentMeasure` becomes a simple setter — it stores the value and does nothing else. Beat-clock wrapping (if still needed) is handled by AudioEngine/BeatClock logic, not the store.
- `lightnessMultiplier` or any other field derived from `currentHour` is unaffected — it will simply read the new float value instead of an integer.

## Acceptance Criteria
- [ ] `dayLengthMeasures` does not appear anywhere in `oceanStore.ts` (type, state, or action)
- [ ] `setDayLength` does not appear anywhere in the codebase
- [ ] `useOceanStore.getState().settings.planetSize` defaults to `'medium'`
- [ ] `useOceanStore.getState().dayStartTimestamp` is a recent `Date.now()` value on app load
- [ ] Calling `setPlanetSize('small')` causes a full day cycle to complete in 3 real minutes
- [ ] `currentHour` advances in real time independently of beat-clock state
- [ ] Pausing or stopping the transport does not pause `currentHour` advancement
- [ ] `setCurrentMeasure` no longer calculates or sets `currentHour`
- [ ] All existing tests pass after fixture updates
- [ ] App compiles with no TypeScript errors
- [ ] No regression in day/night visual behaviour

## Source Reference
- File: `src/stores/oceanStore.ts`, `src/components/OceanScene.tsx`, `src/constants/index.ts`, `src/App.tsx`
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."; "All timing: Tone.Transport / BeatClock (measure-based). No setTimeout/setInterval for musical timing." (Note: the time-of-day interval is world/visual timing, not musical timing — `setInterval` is explicitly permitted here.)
