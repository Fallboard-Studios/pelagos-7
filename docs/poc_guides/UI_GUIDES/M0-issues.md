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
 - [ ] Create or update a global time-of-day tick in `src/App.tsx` (or a dedicated `src/systems/timeClock.ts`): a `setInterval` firing every second that reads `dayStartTimestamp` and `planetSize` from the store, computes `currentHour`, calls `useOceanStore.getState().setCurrentHour(newHour)`, and calls `setDayStartTimestamp(Date.now())` when a new day cycle begins (i.e. `newHour` wraps past 24). This interval is NOT musical timing — using `setInterval` here is acceptable per architecture rules.
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
 - [ ] `currentHour` advances even when the transport is paused or the tablet is powered off (confirm the interval is independent of transport/power state)
- [ ] `setCurrentMeasure` no longer wraps using a day-length value
- [ ] `dayLengthMeasures` does not appear in the store type, state, or actions
- [ ] No regression in existing features
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
 - File: `src/stores/oceanStore.ts`, `src/App.tsx` (time-of-day tick location)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."; "All timing: Tone.Transport / BeatClock (measure-based). No setTimeout/setInterval/queueMicrotask for musical timing." (Note: the time-of-day interval is not musical timing and is explicitly permitted.)

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
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."; "All timing: Tone.Transport / BeatClock (measure-based). No setTimeout/setInterval/queueMicrotask for musical timing." (Note: the time-of-day interval is world/visual timing, not musical timing — `setInterval` is explicitly permitted here.)

---

<!-- ============================================================ -->
<!-- ISSUE 0b-delta: Add mute state to audioStore                 -->
<!-- ============================================================ -->

## [M8.0-0b-delta] Add mute state to audioStore

## Feature Description
Add `isMuted` and `preMuteVolume` fields to the existing `audioStore`, plus `setMuted()` and `setPreMuteVolume()` actions. These are the state prerequisites for the Mute button in Issue 2d.

**Current state (post Issue 0b):** `audioStore` has `globalAudio`, `bpm`, `setBPM()`, `setGlobalAudio()` — no mute tracking.

**Target state:** `audioStore` additionally has `isMuted: boolean` (default `false`), `preMuteVolume: number` (default `1.0`), `setMuted(muted: boolean)`, and `setPreMuteVolume(volume: number)`.

Depends on: **Issue 0b** (audioStore must exist).

## Implementation Details
- [ ] Open `src/stores/audioStore.ts`
- [ ] Add `isMuted: boolean` to the state interface (default `false`)
- [ ] Add `preMuteVolume: number` to the state interface (default `1.0`)
- [ ] Add `setMuted(muted: boolean)` action: sets `isMuted` to the given value
- [ ] Add `setPreMuteVolume(volume: number)` action: sets `preMuteVolume` to the given value
- [ ] Update the store's initial state object with both new fields and defaults
- [ ] All new state is JSON-serializable (no Tone nodes or DOM refs)
- [ ] Update existing `audioStore` tests if fixtures require the new fields
- [ ] App compiles with no TypeScript errors

## Technical Notes
- `preMuteVolume` is set by the Mute button *before* calling `AudioEngine.setMasterVolume(0)` — it captures the pre-mute level so unmute can restore it exactly.
- `setMuted` only updates store state — it does NOT call `AudioEngine`. The audio effect is applied by the `TransportBar` component (Issue 2d).
- Keep all new fields JSON-serializable. Do not store Tone.js gain nodes here.

## Acceptance Criteria
- [ ] `audioStore.isMuted` initialises as `false`
- [ ] `audioStore.preMuteVolume` initialises as `1.0`
- [ ] `setMuted(true)` sets `isMuted` to `true`; `setMuted(false)` sets it to `false`
- [ ] `setPreMuteVolume(0.7)` sets `preMuteVolume` to `0.7`
- [ ] All existing `audioStore` tests continue to pass
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing audio behaviour

## Source Reference
- File: `src/stores/audioStore.ts`, `src/stores/audioStore.test.ts`
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0c-delta: Add transport methods to AudioEngine         -->
<!-- ============================================================ -->

## [M8.0-0c-delta] Add transport methods to AudioEngine

## Feature Description
Add `killAll()`, `pause()`, `resume()`, `setMasterVolume(volume)`, and `getMasterVolume()` to `AudioEngine`. These are the audio-side prerequisites for the Transport Bar buttons in Issues 2a–2d.

**Current state (post Issue 0c):** `AudioEngine` manages synth pools, the global FX chain, and voice scheduling — but has no explicit stop-all, pause/resume, or master-volume controls exposed as public methods.

**Target state:** `AudioEngine` additionally exposes the five public methods listed below.

Depends on: **Issue 0c** (AudioEngine global FX chain must exist).

## Implementation Details
- [ ] Open `src/engine/AudioEngine.ts`
- [ ] Add `killAll()`: cancels all scheduled `Tone.Transport` events (`Tone.Transport.cancel()`), stops all active voices (releases all synths in the pool), calls `Tone.Transport.stop()`, and resets transport position to 0
- [ ] Add `pause()`: calls `Tone.Transport.pause()` — suspends transport without resetting position; all active notes are silenced by the transport halt
- [ ] Add `resume()`: calls `Tone.Transport.start()` to resume from the current transport position
- [ ] Add `setMasterVolume(volume: number)`: sets the master gain node's value to `volume`; clamp to [0, 1] before applying
- [ ] Add `getMasterVolume(): number`: returns the current master gain node's value
- [ ] All five methods are public on the `AudioEngine` singleton class
- [ ] No new Tone nodes are created — these methods operate on existing infrastructure (`Tone.Transport` and the existing master gain node)
- [ ] Update `AudioEngine.test.ts` if the class interface is tested

## Technical Notes
- `killAll()` is the "hard stop" — called by both the Power Off confirmation (Issue 2a) and the Restart button (Issue 2b). After `killAll()`, the transport sits at position 0 and must be explicitly restarted via `AudioEngine.start()`.
- `pause()` / `resume()` are soft — they preserve transport position and do not reset voice pool state. Called by the Pause button (Issue 2c).
- `getMasterVolume()` is used by the Mute button (Issue 2d) to snapshot the pre-mute level before calling `setMasterVolume(0)`.
- If `AudioEngine` already has an equivalent method from a prior issue, verify its behaviour matches this spec and alias if needed — do not duplicate logic.

## Acceptance Criteria
- [ ] `AudioEngine.killAll()` stops all audio and resets transport to 0
- [ ] `AudioEngine.pause()` pauses transport without resetting position
- [ ] `AudioEngine.resume()` resumes from the paused position
- [ ] `AudioEngine.setMasterVolume(0)` silences audio without stopping the transport
- [ ] `AudioEngine.setMasterVolume(1)` restores full volume
- [ ] `AudioEngine.getMasterVolume()` returns the current master gain value
- [ ] All existing `AudioEngine` tests continue to pass
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing audio behaviour

## Source Reference
- File: `src/engine/AudioEngine.ts`, `src/engine/AudioEngine.test.ts`
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."; "All timing: Tone.Transport / BeatClock (measure-based)."

---

<!-- ============================================================ -->
<!-- ISSUE 0k: Install Radix UI Primitives                        -->
<!-- ============================================================ -->

## [M8.0-0k] Install Radix UI Primitives

## Feature Description
Install a curated set of unstyled `@radix-ui/*` primitive packages as the shared foundation for all interactive UI components across Milestones 1–6. Radix handles ARIA roles, focus management, roving tabindex, keyboard contracts, and screen-reader semantics. The project's own design tokens own all visual styling — Radix primitives are intentionally unstyled.

**Decision rationale:** Accessibility is a stated requirement (focus/keyboard navigation, reduced-motion). Radix provides correct accessible behaviour for each primitive type out of the box, removing the need to hand-roll ARIA patterns for every control.

Depends on: No other M0 issues (pure dependency install).

## Implementation Details
- [ ] Run the following install command:
  ```
  npm install @radix-ui/react-toolbar @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tabs @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-slider @radix-ui/react-switch @radix-ui/react-separator @radix-ui/react-tooltip @radix-ui/react-visually-hidden @radix-ui/react-dropdown-menu
  ```
- [ ] Confirm all packages appear in `dependencies` in `package.json`
- [ ] Update `TransportBar.tsx` to use `@radix-ui/react-toolbar`:
  - Replace `<div role="toolbar" aria-label="...">` with `<Toolbar.Root aria-label="...">`
  - Replace each `<button className="transport-bar__btn ...">` with `<Toolbar.Button className="transport-bar__btn ...">`
  - Existing CSS classes remain unchanged — Radix is unstyled and passes them through
  - Add `<Toolbar.Separator />` between the button group and the displays
- [ ] Do NOT install `@radix-ui/themes` — the project uses its own design tokens
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)

## Technical Notes
- All Radix packages are unstyled; they render semantic HTML with correct ARIA attributes. CSS classes added to Radix components are applied to the rendered DOM element exactly as if applied to a native element.
- Radix `Toolbar.Root` provides roving tabindex keyboard navigation between `Toolbar.Button` children for free — Tab enters the toolbar; arrow keys move between buttons; Tab exits.
- `Toolbar.Button` forwards the `disabled` attribute to the DOM element and adds `data-disabled` as a Radix convention. Add a `[data-disabled]` selector alias in `TransportBar.css` alongside the existing `:disabled` selector.
- `@radix-ui/react-toggle-group` will be used to upgrade Pause and Mute buttons (Issues 2c, 2d) to stateful toggles. `@radix-ui/react-dialog` will be used for confirmation modals (Issue 2a). See each issue's Radix notes for the specific primitive mapping.
- Peer dependency is `react >= 17` — satisfied by the project's React 19.

## Acceptance Criteria
- [ ] All listed packages appear in `package.json` `dependencies`
- [ ] `TransportBar` uses `Toolbar.Root` and `Toolbar.Button` from `@radix-ui/react-toolbar`
- [ ] Arrow keys move focus between transport buttons when the toolbar is focused
- [ ] Disabled Restart/Pause/Mute buttons have both `:disabled` and `[data-disabled]` CSS handled
- [ ] `npm run build:types` reports zero TypeScript errors
- [ ] Dev server renders TransportBar with no visual regressions
- [ ] App remains functional after merge

## Source Reference
- File: `src/components/ui/TransportBar.tsx`, `src/components/ui/TransportBar.css`, `package.json`
- Copilot instructions: "All interactive UI (transport, navigation, controls) lives inside GlassViewport only — never in the decorative SleeveContainer."

---

<!-- ============================================================ -->
<!-- ISSUE 0l-1: Define Planet and Locale TypeScript types       -->
<!-- ============================================================ -->

## [M8.0-0l-1] Define `Planet` and `Locale` TypeScript types

## Feature Description
Create the serialisable TypeScript interfaces for `Planet` and `Locale` in `src/types/`. These types are the single source of truth that `planetStore`, `localeStore`, and all downstream components will import. All fields must be JSON-serializable (no Tone nodes, GSAP timelines, or DOM refs).

Depends on: No other M0 issues (pure type definitions).

## Implementation Details
- [ ] Create `src/types/planet.ts`:
  ```ts
  export type PlanetSize = 'small' | 'medium' | 'large';

  export interface Planet {
    id: string;
    name: string;
    size: PlanetSize;
    /** Ordered list of locale IDs belonging to this planet */
    locales: string[];
    /** ID of the currently active locale, if any */
    currentLocaleId?: string;
    /** Wall-clock ms when the current in-world day started */
    dayStartTimestamp: number;
    /** Derived in-world hour (float 0–24); updated by time-of-day tick, not stored across sessions */
    currentHour: number;
  }
  ```
- [ ] Create `src/types/locale.ts`:
  ```ts
  import type { Robot } from './Robot';
  import type { Actor } from './Actor';

  export interface LocaleSettings {
    bpm: number;
    maxRobots: number;
    minRobots: number;
  }

  export interface Locale {
    id: string;
    planetId: string;
    name: string;
    /** Longitude/latitude used by computeLocalTime */
    coordinates: { x: number; y: number };
    robots: Robot[];
    actors: Actor[];
    settings: LocaleSettings;
    /** Current transport measure (0–95) */
    currentMeasure: number;
  }
  ```
- [ ] Export both types from `src/types/index.ts`
- [ ] No runtime code, no Tone/GSAP dependencies
- [ ] Code follows standards (imports ordered, explicit types)

## Acceptance Criteria
- [ ] `Planet`, `PlanetSize`, `Locale`, `LocaleSettings` are importable from `src/types/index.ts`
- [ ] All fields are JSON-serializable primitives, arrays, or plain objects
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing features

## Source Reference
- File: `src/types/Robot.ts` (reference for serializable type conventions)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0l-2: Create time constants and computeLocalTime util -->
<!-- ============================================================ -->

## [M8.0-0l-2] Create `src/constants/time.ts` with `PLANET_DURATION_MS` and `computeLocalTime`

## Feature Description
Create a constants/utilities file for planet time calculations. `PLANET_DURATION_MS` maps each `PlanetSize` to real-world milliseconds per in-world day. `computeLocalTime` converts a planet-wide `currentHour` plus a locale's longitude into a locale-local hour. These are pure functions with no side effects.

Depends on: **Issue 0l-1** (`PlanetSize` type must exist).

## Implementation Details
- [ ] Create `src/constants/time.ts`:
  ```ts
  import type { PlanetSize } from '../types/planet';

  /** Real-world milliseconds per in-world day, keyed by planet size */
  export const PLANET_DURATION_MS: Record<PlanetSize, number> = {
    small:  3 * 60_000,
    medium: 6 * 60_000,
    large:  9 * 60_000,
  } as const;

  /**
   * Compute a locale's local hour given the planet's current hour and the
   * locale's longitude. Each 15° of longitude = 1 hour offset.
   * @param planetHour  Float 0–24 representing planet-wide in-world time
   * @param longitudeX  Locale longitude in degrees (–180 to 180)
   * @returns           Float local hour (0–24, wraps)
   */
  export function computeLocalTime(planetHour: number, longitudeX: number): number {
    const offsetHours = longitudeX / 15;
    return ((planetHour + offsetHours) % 24 + 24) % 24;
  }
  ```
- [ ] Export `PLANET_DURATION_MS` and `computeLocalTime` from `src/constants/index.ts` (or re-export from the new file)
- [ ] No side effects, no Tone/GSAP, no DOM access
- [ ] Code follows standards (imports ordered, explicit types)

## Acceptance Criteria
- [ ] `PLANET_DURATION_MS` correctly maps `'small'` → 180 000 ms, `'medium'` → 360 000 ms, `'large'` → 540 000 ms
- [ ] `computeLocalTime(6, 90)` returns `12` (6 h + 6 h offset for 90°E longitude)
- [ ] `computeLocalTime(1, -180)` wraps correctly (no negative result)
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing features

## Source Reference
- File: `src/constants/index.ts` (existing constants pattern)

---

<!-- ============================================================ -->
<!-- ISSUE 0l-3: Implement planetStore.ts                        -->
<!-- ============================================================ -->

## [M8.0-0l-3] Implement `src/stores/planetStore.ts`

## Feature Description
Create the `usePlanetStore` Zustand store. The store is seeded with a single default `Pelagos` planet on initialisation. It owns all planet-level fields (`size`, `dayStartTimestamp`, `currentHour`, `locales`, `currentLocaleId`) that `oceanStore` previously duplicated. All state is JSON-serializable.

Depends on: **Issue 0l-1** (Planet / PlanetSize types), **Issue 0l-2** (PLANET_DURATION_MS).

## Implementation Details
- [ ] Create `src/stores/planetStore.ts`:
  - State shape:
    ```ts
    interface PlanetState {
      planets: Planet[];
      addPlanet: (planet: Planet) => void;
      removePlanet: (planetId: string) => void;
      setPlanetSize: (planetId: string, size: PlanetSize) => void;
      setDayStartTimestamp: (planetId: string, ts: number) => void;
      setCurrentHour: (planetId: string, hour: number) => void;
      setCurrentLocale: (planetId: string, localeId: string) => void;
    }
    ```
  - `DEFAULT_PELAGOS` constant:
    ```ts
    const DEFAULT_LOCALE_ID = 'pelagos-default';
    const DEFAULT_PELAGOS: Planet = {
      id: 'pelagos',
      name: 'Pelagos',
      size: 'medium',
      locales: [DEFAULT_LOCALE_ID],
      currentLocaleId: DEFAULT_LOCALE_ID,
      dayStartTimestamp: Date.now(),
      currentHour: 0,
    };
    ```
  - Initial state: `planets: [DEFAULT_PELAGOS]`
  - `setPlanetSize`: updates the target planet's `size`; does **not** reset `dayStartTimestamp` (the day continues from wherever it is)
  - `setDayStartTimestamp`: updates `dayStartTimestamp` for the named planet, called by the time-of-day tick when a day wraps
  - `setCurrentHour`: updates `currentHour` for the named planet, called every second by the time-of-day tick
  - All mutations are shallow-immutable (use spread, not mutation)
- [ ] Export `usePlanetStore` and `DEFAULT_LOCALE_ID` constant (used by `localeStore` as the seed)
- [ ] All state is JSON-serializable; no Tone nodes, GSAP timelines, or DOM refs
- [ ] Code follows standards (imports ordered, explicit types)

## Acceptance Criteria
- [ ] `usePlanetStore.getState().planets[0].id` is `'pelagos'` on init
- [ ] `usePlanetStore.getState().planets[0].size` is `'medium'` on init
- [ ] `setPlanetSize('pelagos', 'small')` changes only `size` for that planet
- [ ] `setCurrentHour('pelagos', 12.5)` updates `currentHour` to `12.5`
- [ ] `addPlanet` / `removePlanet` correctly append/filter the planets array
- [ ] All state is JSON-serializable
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing features

## Source Reference
- File: `src/stores/oceanStore.ts` (reference for Zustand store pattern)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0l-4: Implement localeStore.ts                        -->
<!-- ============================================================ -->

## [M8.0-0l-4] Implement `src/stores/localeStore.ts`

## Feature Description
Create the `useLocaleStore` Zustand store. The store is seeded with a default `Pelagos` locale on initialisation. It owns all per-world fields (`robots[]`, `actors[]`, `settings`, `currentMeasure`) that `oceanStore` previously held. `locales` is a map keyed by locale ID for O(1) access. All state is JSON-serializable.

Depends on: **Issue 0l-1** (Locale / LocaleSettings types), **Issue 0l-3** (`DEFAULT_LOCALE_ID` export).

## Implementation Details
- [ ] Create `src/stores/localeStore.ts`:
  - State shape:
    ```ts
    interface LocaleState {
      locales: Record<string, Locale>;
      addLocale: (locale: Locale) => void;
      removeLocale: (localeId: string) => void;
      setLocaleData: (localeId: string, partial: Partial<Omit<Locale, 'id' | 'planetId'>>) => void;
      addRobotToLocale: (localeId: string, robot: Robot) => void;
      removeRobotFromLocale: (localeId: string, robotId: string) => void;
      updateRobotInLocale: (localeId: string, robotId: string, updates: Partial<Robot>) => void;
    }
    ```
  - `DEFAULT_LOCALE` constant (uses `DEFAULT_LOCALE_ID` imported from `planetStore`):
    ```ts
    const DEFAULT_LOCALE: Locale = {
      id: DEFAULT_LOCALE_ID,
      planetId: 'pelagos',
      name: 'Pelagos Ocean',
      coordinates: { x: 0, y: 0 },
      robots: [],
      actors: [],
      settings: { bpm: 240, maxRobots: 12, minRobots: 2 },
      currentMeasure: 0,
    };
    ```
  - Initial state: `locales: { [DEFAULT_LOCALE_ID]: DEFAULT_LOCALE }`
  - `setLocaleData`: shallow-merges `partial` into the target locale's top-level fields (does not deep-merge nested objects; supply a complete replacement for nested fields)
  - `addRobotToLocale` / `removeRobotFromLocale` / `updateRobotInLocale`: fine-grained robot mutations scoped to one locale, following the same immutable pattern as `oceanStore`'s `addRobot` / `removeRobot` / `updateRobot`
  - All mutations are shallow-immutable (use spread, not mutation)
- [ ] Export `useLocaleStore`
- [ ] All state is JSON-serializable; no Tone nodes, GSAP timelines, or DOM refs
- [ ] Code follows standards (imports ordered, explicit types)

## Acceptance Criteria
- [ ] `useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].planetId` is `'pelagos'` on init
- [ ] `useLocaleStore.getState().locales[DEFAULT_LOCALE_ID].robots` is `[]` on init
- [ ] `addLocale` / `removeLocale` correctly add/delete entries from the map
- [ ] `addRobotToLocale` appends a robot; `removeRobotFromLocale` filters it out; `updateRobotInLocale` applies a partial patch
- [ ] All state is JSON-serializable
- [ ] App compiles with no TypeScript errors
- [ ] No regression in existing features

## Source Reference
- File: `src/stores/oceanStore.ts` (reference for robot mutation pattern)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0l-5: uiStore addition + oceanStore field cleanup     -->
<!-- ============================================================ -->

## [M8.0-0l-5] Add `activeLocaleLocalTime` to `uiStore` and strip duplicate fields from `oceanStore`

## Feature Description
Two housekeeping tasks that must happen together to avoid type conflicts after the new stores are live:

1. Add `activeLocaleLocalTime` (and its setter) to `uiStore` — this is the resolved local time for the currently-displayed locale, pushed every second by `PlanetView`'s time-tick and read by `TransportBar` for display.
2. Strip fields from `oceanStore` that are now owned by `planetStore` or `localeStore`, eliminating duplication. `oceanStore` is retained as a transient runtime store for audio/playback state only.

Depends on: **Issue 0l-3** (planetStore), **Issue 0l-4** (localeStore).

## Implementation Details

### `uiStore` addition
- [ ] Add `activeLocaleLocalTime: number | null` to `uiStore` state (default: `null`)
- [ ] Add `setActiveLocaleLocalTime(t: number | null)` action: sets `activeLocaleLocalTime` to the given value
- [ ] No other `uiStore` fields are modified

### `oceanStore` field removal
Remove the following fields and actions from `oceanStore`, as they are now owned by the new stores:
- [ ] `robots: Robot[]` and all robot actions (`addRobot`, `removeRobot`, `updateRobot`, `getRobotById`) — owned by `localeStore`
- [ ] `actors: Actor[]` and all actor actions (`setActors`, `addActor`, `getActorById`) — owned by `localeStore`
- [ ] `settings.planetSize` and `setPlanetSize()` — owned by `planetStore`
- [ ] `dayStartTimestamp` and `setDayStartTimestamp()` — owned by `planetStore`
- [ ] `currentHour`, `planetHour`, `planetMinute`, `setCurrentHour()`, `setPlanetTime()` — owned by `planetStore`
- [ ] `currentMeasure` and `setCurrentMeasure()` — owned by `localeStore`
- [ ] `lightnessMultiplier` — derived from `planetStore.currentHour`; remove from store; compute inline where needed
- [ ] `settings.bpm`, `settings.maxRobots`, `settings.minRobots` — these become `localeStore.settings`; remove from `oceanStore.settings`

Remaining `oceanStore` fields after cleanup (transient audio/playback runtime state only):
- `selectedRobotId` / `selectRobot()`
- `totalInteractions` / `incrementInteractions()`

Update all call sites throughout `src/` that reference removed fields to use the new stores. Any `App.tsx` or `OceanScene.tsx` code that reads these fields must be updated to read from `usePlanetStore` or `useLocaleStore` instead.

## Technical Notes
- Do a thorough `grep` for `useOceanStore` usages before removing fields — update every consumer.
- Systems (`spawnSystem`, `collisionSystem`, `idleSystem`, etc.) that currently read `robots` from `oceanStore` must be updated to accept a `localeId` or read directly from `useLocaleStore`.
- If updating all consumers is too large for one PR, fields may be **deprecated** (typed as `never` with a comment) and removed in a follow-up — but all new code must use the new stores.

## Acceptance Criteria
- [ ] `useUIStore.getState().activeLocaleLocalTime` defaults to `null`
- [ ] `setActiveLocaleLocalTime(6.5)` sets it to `6.5`
- [ ] `oceanStore` no longer defines `robots`, `actors`, `currentMeasure`, `currentHour`, `planetSize`, `dayStartTimestamp`, or `lightnessMultiplier`
- [ ] No TypeScript errors after removal — all consumers updated
- [ ] `npm test` passes with no failures
- [ ] App remains functional after merge
- [ ] No regression in robot spawn, audio playback, or day/night rendering

## Source Reference
- File: `src/stores/uiStore.ts`, `src/stores/oceanStore.ts`
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

---

<!-- ============================================================ -->
<!-- ISSUE 0l-6: Unit tests for planetStore and localeStore      -->
<!-- ============================================================ -->

## [M8.0-0l-6] Add unit tests for `planetStore` and `localeStore`

## Feature Description
Write vitest unit tests for the two new stores, verifying initialisation, all actions, and field-ownership invariants (no field left without an owner, no field duplicated across stores). Tests follow the same pattern as `oceanStore.test.ts` and `audioStore.test.ts`.

Depends on: **Issue 0l-3** (planetStore), **Issue 0l-4** (localeStore), **Issue 0l-5** (oceanStore cleanup complete).

## Implementation Details
- [ ] Create `src/stores/planetStore.test.ts`:
  - Verify `planets[0].id === 'pelagos'` on init
  - Verify `planets[0].size === 'medium'` on init
  - `setPlanetSize('pelagos', 'small')` → `size === 'small'`; other fields unchanged
  - `setCurrentHour('pelagos', 14)` → `currentHour === 14`
  - `setDayStartTimestamp('pelagos', 9999)` → `dayStartTimestamp === 9999`
  - `setCurrentLocale('pelagos', 'other-locale')` → `currentLocaleId === 'other-locale'`
  - `addPlanet(newPlanet)` → `planets.length === 2`
  - `removePlanet('pelagos')` → `planets.length === 0`
- [ ] Create `src/stores/localeStore.test.ts`:
  - Verify default locale exists and `planetId === 'pelagos'` on init
  - Verify `robots` and `actors` are empty arrays on init
  - `addRobotToLocale(localeId, robot)` → robot appears in locale robots
  - `removeRobotFromLocale(localeId, robotId)` → robot removed
  - `updateRobotInLocale(localeId, robotId, { name: 'X' })` → robot name updated
  - `addLocale(newLocale)` → locale appears in map
  - `removeLocale(localeId)` → locale removed from map
  - `setLocaleData(localeId, { currentMeasure: 42 })` → `currentMeasure === 42`
- [ ] All tests use `beforeEach` to reset store state to avoid cross-test contamination (reset via re-creating the store or calling `getState()` resets if Zustand supports them)
- [ ] Tests run via `npm test` with no failures

## Acceptance Criteria
- [ ] `src/stores/planetStore.test.ts` exists and all tests pass
- [ ] `src/stores/localeStore.test.ts` exists and all tests pass
- [ ] `npm test` passes with no failures across the whole test suite
- [ ] No regression in existing tests

## Source Reference
- File: `src/stores/oceanStore.test.ts`, `src/stores/audioStore.test.ts` (reference for test pattern)
- Copilot instructions: "State: Zustand only; store JSON-serializable data only."

