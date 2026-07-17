---
name: Feature
about: Milestone 5 — Audio Rig Console Tab
title: '[M8.5] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 17: Build Audio Rig Console Tab Shell                  -->
<!-- ============================================================ -->

## [M8.5-17] Build Audio Rig Console Tab Shell + Audio Rig Navigation

## Feature Description
Build the `AudioRigTab` shell that renders when `activeConsoleTab === 'audioRig'`. Inside, a set of Audio Rig sub-tabs (Audio Meta | Reverb | Compression | Delay | Filters | Chorus | EQ) routes to the individual sub-tab components built in Issues 19–25.

Depends on: **Issues 3–4** (Console panel must exist), **Issues 0a–0c** (globalAudio types, state, and AudioEngine FX chain), **Issue 0k** (Radix installed), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/console/AudioRigTab.tsx` and `AudioRigTab.css`
- [ ] Renders when `activeConsoleTab === 'audioRig'` (controlled by `ConsolePanel`, Issue 4)
- [ ] **Audio Rig Navigation:** Radix sub-tabs inside the console content area
  - Sub-tabs: `Audio Meta` | `Reverb` | `Compression` | `Delay` | `Filters` | `Chorus` | `EQ`
  - **Radix:** `@radix-ui/react-tabs` → `Tabs.Root` + `Tabs.List` + `Tabs.Trigger` + `Tabs.Content` (nested inside the outer Console `Tabs.Root` from Issue 4)
  - Sub-tab state is local to this component (not Zustand)
- [ ] **Audio Rig Console:** the panel content area below the sub-tabs rendering the active sub-tab component
  - `Audio Meta` content: `<AudioMetaTab />` (Issue 19)
  - `Reverb` content: `<ReverbTab />` (Issue 20)
  - `Compression` content: `<CompressionTab />` (Issue 21)
  - `Delay` content: `<DelayTab />` (Issue 22)
  - `Filters` content: `<FiltersTab />` (Issue 23)
  - `Chorus` content: `<ChorusTab />` (Issue 24)
  - `EQ` content: `<EQTab />` (Issue 25)
- [ ] Default open sub-tab on mount: `Audio Meta`
- [ ] All sub-tab triggers meet minimum 44×44px touch target size
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- Nested Radix `Tabs.Root` works correctly as long as each instance has its own `value` namespace — the outer Console tabs (Issue 4) and the inner Audio Rig tabs are independent `Tabs.Root` instances with no shared state.
- Sub-tab state does NOT belong in `uiStore` — keeping it local to `AudioRigTab` avoids persisting ephemeral navigation.

## Acceptance Criteria
- [ ] `AudioRigTab` renders when `activeConsoleTab === 'audioRig'`
- [ ] Seven sub-tab triggers (Audio Meta, Reverb, Compression, Delay, Filters, Chorus, EQ) render and are clickable
- [ ] Clicking each sub-tab trigger shows its corresponding content panel
- [ ] Default sub-tab on mount is `Audio Meta`
- [ ] Sub-tab state is local (not in Zustand)
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in OceanScene or other Console tabs

## Source Reference
- File: `src/components/console/AudioRigTab.tsx` (new)
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 18: Build Universal FX Effect Block (Reusable Wrapper) -->
<!-- ============================================================ -->

## [M8.5-18] Build Universal FX Effect Block (Reusable Wrapper)

## Feature Description
Build the reusable `FXEffectBlock` wrapper component that frames each individual effect sub-tab with a consistent border, label, and per-effect bypass toggle. A master global bypass toggle sits at the top of the Audio Rig tab (rendered by `AudioRigTab`, Issue 17).

Depends on: **Issue 0a** (`GlobalAudioSettings` type), **Issue 0b** (`globalAudio` state + `setGlobalAudio`), **Issue 0c** (AudioEngine bypass methods), **Issue 1** (design tokens), **Issue 17** (`AudioRigTab` shell exists).

## Implementation Details
- [ ] Create `src/components/ui/FXEffectBlock.tsx` and `FXEffectBlock.css` — reusable wrapper used by all effect sub-tabs (Issues 20–25)
- [ ] **Global Bypass Toggle** (rendered by `AudioRigTab`, Issue 17, at the top of the tab):
  - Reads `useAudioStore((s) => s.globalAudio.globalBypass)`
  - On toggle: calls `useAudioStore.getState().setGlobalAudio('globalBypass' as any, ...)` — or a dedicated `setGlobalBypass(enabled)` action if added to audioStore
  - Simultaneously calls `AudioEngine.setGlobalBypass(enabled)`
  - Visual state: clearly indicates "BYPASSED" vs. "ACTIVE" (e.g., LED indicator + label)
  - **Radix:** Use `@radix-ui/react-switch` → `Switch.Root` + `Switch.Thumb` for the global bypass toggle. Provides `role="switch"`, `aria-checked`, and keyboard activation.
- [ ] **`FXEffectBlock` component props:**
  - `label: string` — effect name displayed in the block header (e.g. `"REVERB"`)
  - `effectKey: keyof GlobalAudioSettings` — used to read `globalAudio[effectKey].enabled` and write via `setGlobalAudio`
  - `children: React.ReactNode` — the effect-specific controls rendered inside
- [ ] **Per-effect bypass toggle** inside `FXEffectBlock`:
  - Reads `useAudioStore((s) => s.globalAudio[effectKey].enabled)`
  - On toggle: calls `setGlobalAudio(effectKey, { enabled: !current })` AND `AudioEngine.setEffectBypass(effectKey, !current)`
  - When `enabled = false`: block visually dims its children with reduced opacity; label shows a "BYPASSED" badge
  - **Radix:** Use `@radix-ui/react-switch` → `Switch.Root` + `Switch.Thumb` for each per-effect bypass toggle.
- [ ] Each block has a `1×--unit` height header (label + bypass toggle) and expands vertically based on children
- [ ] `AudioRigTab` renders all effect sub-tabs (Issues 20–25) wrapped in `FXEffectBlock`, arranged in a scrollable column within the sub-tab content area
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- `globalBypass` in `GlobalAudioSettings` is a top-level boolean, not nested under an effect key — `setGlobalAudio` may need a special case or a dedicated `setGlobalBypass` action in audioStore. Decide at implementation time; document the choice.
- When `globalBypass` is true: all AudioEngine effect nodes are short-circuited. The per-effect `enabled` states are preserved in the store — they reflect what the rack settings would be when bypass is lifted.
- The `FXEffectBlock` dimming when `enabled = false` should use CSS `opacity` and `pointer-events: none` on the children wrapper so the bypass toggle itself remains interactive.
- The global bypass LED and per-effect bypass toggles are the only interactive elements that must remain fully operable at all times (even when bypassed).

## Acceptance Criteria
- [ ] `FXEffectBlock` renders label, bypass toggle, and children for each effect
- [ ] Global bypass toggle reads and writes `globalAudio.globalBypass`; enabling it calls `AudioEngine.setGlobalBypass(true)` — audible: all effects cut out immediately
- [ ] Per-effect bypass toggle dims children and calls `AudioEngine.setEffectBypass(key, enabled)`
- [ ] Bypassed blocks remain visually labelled and the bypass toggle stays clickable
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback

## Source Reference
- File: `src/stores/audioStore.ts` (`globalAudio`, `setGlobalAudio`), `src/engine/AudioEngine.ts` (`setGlobalBypass`, `setEffectBypass`), `src/types/globalAudio.ts`
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 19: Audio Meta Sub-Tab                                 -->
<!-- ============================================================ -->

## [M8.5-19] Audio Meta Sub-Tab

## Feature Description
Build the `AudioMetaTab` content panel that renders inside `AudioRigTab` when the Audio Meta sub-tab is active. It provides global transport control (BPM) and a read-only volume/level display (VU indicator).

Renders inside: **Audio Rig Console** (`AudioRigTab`, Issue 17) when Audio Meta sub-tab is active.
Depends on: **Issue 0b** (`audioStore.setBPM`, `audioStore.bpm`), **Issues 0a–0c** (audio state + AudioEngine), **Issue 17** (Audio Rig shell), **Issue 18** (`FXEffectBlock`), **Issue 1** (design tokens).

## Implementation Details
- [ ] Create `src/components/console/AudioMetaTab.tsx` and `AudioMetaTab.css`
- [ ] **BPM Dual Speed Stepper:**
  - Two decrement buttons (−1, −5) and two increment buttons (+5, +1) flanking a numeric BPM readout
  - Reads `useAudioStore((s) => s.bpm)` for current value; range 40–240 BPM
  - On change: calls `useAudioStore.getState().setBPM(newBpm)` which updates both the store and `Tone.Transport.bpm.value` simultaneously
  - All step buttons meet minimum 44×44px touch target
- [ ] **Volume VU Indicator:**
  - Read-only display showing master output level — derived from `audioStore` master volume or a Tone.js meter node
  - Visual representation: a segmented bar or gradient fill indicating signal level
  - Non-interactive (no user input); updates at regular intervals (e.g., every ~100ms via a Tone.js `Meter` or `Analyser` node)
  - When `globalBypass` is true, the indicator should reflect the bypassed (dry) signal level
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- The BPM readout should update reactively when `audioStore.bpm` changes from any source (e.g., the Session Settings World Options section in Issue 8). Both controls write to the same store field and stay in sync automatically.
- For the VU Indicator, use a `Tone.Meter` node inserted after `AudioEngine._masterCompressor` (or at the end of the effect chain) to read output levels. Avoid `requestAnimationFrame` — use a `setInterval` polled at ~100ms and driven by a React `useEffect` that cleans up on unmount.
- This issue supersedes the old standalone VU indicator that was previously planned as Issue 9.

## Acceptance Criteria
- [ ] BPM Dual Speed Stepper displays and updates BPM in range 40–240; step buttons are ±1 and ±5
- [ ] BPM change calls `setBPM()` and is reflected in `Tone.Transport.bpm.value`
- [ ] VU Indicator displays a read-only level display that updates at ~100ms intervals
- [ ] VU Indicator is non-interactive (no click/drag handlers)
- [ ] All controls meet 44×44px minimum touch target size (where interactive)
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/stores/audioStore.ts` (`setBPM`, `bpm`), `src/engine/AudioEngine.ts` (meter node), `src/components/console/AudioMetaTab.tsx` (new)
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 20: Reverb Sub-Tab                                     -->
<!-- ============================================================ -->

## [M8.5-20] Reverb Sub-Tab

## Feature Description
Build the Reverb sub-tab content panel that renders inside `AudioRigTab` when the Reverb sub-tab is active. It renders inside an `FXEffectBlock` wrapper and provides Value Strips for all Reverb parameters.

Renders inside: **Audio Rig Console** (`AudioRigTab`, Issue 17) when Reverb sub-tab is active. Wrapped in `FXEffectBlock` (Issue 18).
Depends on: **Issue 18** (`FXEffectBlock`), **Issue 0a** (types), **Issue 0b** (state), **Issue 0c** (`AudioEngine.setGlobalReverb`).

## Implementation Details
- [ ] Create `src/components/console/fx/ReverbTab.tsx` and `ReverbTab.css`
- [ ] Wrapped in `<FXEffectBlock label="REVERB" effectKey="reverb">`
- [ ] **Decay** Value Strip: range 0.1–10s, step 0.1s; display in seconds (e.g. `2.5 s`)
- [ ] **Pre-Delay** Value Strip: range 0–0.5s, step 0.01s; display in ms (e.g. `20 ms`)
- [ ] **Dampening** Value Strip: range 100–8000 Hz, step 100 Hz; display in Hz (e.g. `2000 Hz`)
- [ ] **Wet** Value Strip: range 0–1, step 0.01; display as percentage (e.g. `40%`)
- [ ] On any change: call `setGlobalAudio('reverb', { [param]: value })` AND `AudioEngine.setGlobalReverb({ [param]: value })`
- [ ] Each module reads initial values from `useAudioStore((s) => s.globalAudio.reverb)` on mount
- [ ] All Value Strip controls are touch-optimized (minimum 44px touch target)
- [ ] **Radix:** Each Value Strip uses `@radix-ui/react-slider` → `Slider.Root` + `Slider.Track` + `Slider.Range` + `Slider.Thumb`
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **Reverb `decay` change:** `Tone.Reverb` regenerates its impulse response when `decay` changes (`await reverb.generate()` is called internally). This is asynchronous and may cause a brief audio gap — this is expected Tone.js behaviour. Do not block the UI waiting for this.

## Acceptance Criteria
- [ ] Reverb sub-tab renders when Reverb sub-tab is active in `AudioRigTab`
- [ ] All four Value Strips render with correct ranges and units
- [ ] Moving any Value Strip updates both `audioStore.globalAudio.reverb` and the live AudioEngine effect
- [ ] Module initialises from current `audioStore.globalAudio.reverb` state (not hardcoded)
- [ ] Respects parent `FXEffectBlock` bypass toggle (dimmed and inert when bypassed)
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/engine/AudioEngine.ts` (`setGlobalReverb`), `src/stores/audioStore.ts` (`globalAudio.reverb`)
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 21: Compression Sub-Tab                                -->
<!-- ============================================================ -->

## [M8.5-21] Build Compression Sub-Tab

## Feature Description
Build the `CompressionTab` component that renders inside the Audio Rig's nested Radix tabs. The tab provides Value Strips (high-contrast linear fill bars, touch-optimized) for the global compressor's controllable parameters. No rotary knobs — everything is a linear fill bar. Changes call the corresponding `AudioEngine` setter and persist to `audioStore.globalAudio`.

Depends on: **Issue 18** (`FXEffectBlock` wrapper), **Issue 0a** (types), **Issue 0b** (state), **Issue 0c** (`AudioEngine.setGlobalCompressor`).

## Implementation Details
- [ ] Create `src/components/console/fx/CompressionTab.tsx` and `CompressionTab.css`
- [ ] Wrap content in `<FXEffectBlock label="COMP" effectKey="compressor">`

### Compressor Value Strips (`globalAudio.compressor: CompressorSettings`)
- [ ] **Threshold** Value Strip: range −60–0 dB, step 1 dB; display in dB (e.g. `−18 dB`)
- [ ] **Ratio** Value Strip: range 1–20, step 0.5; display as ratio (e.g. `6:1`)
- [ ] **Attack** Value Strip: range 0.001–1s, step 0.001s; display in ms (e.g. `3 ms`)
- [ ] **Release** Value Strip: range 0.01–1s, step 0.01s; display in ms (e.g. `150 ms`)
- [ ] **Knee** Value Strip: range 0–40 dB, step 1 dB; display in dB (e.g. `6 dB`)
- [ ] On any change: call `setGlobalAudio('compressor', { [param]: value })` AND `AudioEngine.setGlobalCompressor({ [param]: value })`
- [ ] Default values must match the previously hardcoded `_masterCompressor` values: threshold −18 dB, ratio 6, attack 0.003s, release 0.15s, knee 6 dB (verify against `AudioEngine.ts`)

### Shared requirements
- [ ] Reads initial values from `useAudioStore((s) => s.globalAudio.compressor)` on mount
- [ ] All Value Strip controls are touch-optimized (minimum 44px touch target)
- [ ] **Radix:** Each Value Strip uses `@radix-ui/react-slider` → `Slider.Root` + `Slider.Track` + `Slider.Range` + `Slider.Thumb`
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **Compressor defaults must match existing hardcoded values** in `AudioEngine.ts` (currently: threshold −18, ratio 6, attack 0.003, release 0.15). The defaults in `GlobalAudioSettings` and in this component must be kept in sync. If they diverge, the compressor will change behaviour on first app load.
- **Ratio display:** Format as `${value.toFixed(1)}:1`.
- **Attack/Release display:** Show in ms for values < 1s (multiply by 1000, suffix `ms`). Params are stored in seconds.
- **Bypass note:** Compressor has no `wet` parameter — bypass routes around the node. The `enabled` flag is the bypass signal, handled by the parent `FXEffectBlock`.

## Acceptance Criteria
- [ ] Component renders all five Value Strips with correct ranges, units, and hardcoded-compatible defaults
- [ ] Moving any Value Strip updates both `audioStore.globalAudio.compressor` and the live AudioEngine node
- [ ] Component initialises from current `audioStore.globalAudio.compressor` state
- [ ] Respects parent `FXEffectBlock` bypass toggle (dimmed and inert when bypassed)
- [ ] Bypassing the compressor removes dynamics processing but does not stop audio
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/engine/AudioEngine.ts` (`setGlobalCompressor`, `_masterCompressor` hardcoded defaults), `src/stores/audioStore.ts` (`globalAudio.compressor`)
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 22: Delay Sub-Tab                                      -->
<!-- ============================================================ -->

## [M8.5-22] Build Delay Sub-Tab

## Feature Description
Build the `DelayTab` component that renders inside the Audio Rig's nested Radix tabs. The tab provides Value Strips for the global delay's controllable parameters.

Depends on: **Issue 18** (`FXEffectBlock` wrapper), **Issue 0a** (types), **Issue 0b** (state), **Issue 0c** (`AudioEngine.setGlobalDelay`).

## Implementation Details
- [ ] Create `src/components/console/fx/DelayTab.tsx` and `DelayTab.css`
- [ ] Wrap content in `<FXEffectBlock label="DELAY" effectKey="delay">`

### Delay Value Strips (`globalAudio.delay: DelaySettings`)
- [ ] **Delay Time** Value Strip: range 0–1s, step 0.01s; display in ms (e.g. `250 ms`)
- [ ] **Feedback** Value Strip: range 0–0.95, step 0.01; display as percentage (e.g. `35%`)
- [ ] **Wet** Value Strip: range 0–1, step 0.01; display as percentage (e.g. `30%`)
- [ ] On any change: call `setGlobalAudio('delay', { [param]: value })` AND `AudioEngine.setGlobalDelay({ [param]: value })`

### Shared requirements
- [ ] Reads initial values from `useAudioStore((s) => s.globalAudio.delay)` on mount
- [ ] All Value Strip controls are touch-optimized (minimum 44px touch target)
- [ ] **Radix:** Each Value Strip uses `@radix-ui/react-slider` → `Slider.Root` + `Slider.Track` + `Slider.Range` + `Slider.Thumb`
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **Delay time sync to BPM:** Optionally, the Delay Time slider could display a "sync to BPM" toggle snapping `delayTime` to a musical subdivision (e.g. `4n` = `60 / bpm`). Optional polish — document if implementing.

## Acceptance Criteria
- [ ] Component renders all three Value Strips with correct ranges and units
- [ ] Moving any Value Strip updates both `audioStore.globalAudio.delay` and the live AudioEngine effect
- [ ] Component initialises from current `audioStore.globalAudio.delay` state
- [ ] Respects parent `FXEffectBlock` bypass toggle
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/engine/AudioEngine.ts` (`setGlobalDelay`), `src/stores/audioStore.ts` (`globalAudio.delay`)
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 23: Filters Sub-Tab                                    -->
<!-- ============================================================ -->

## [M8.5-23] Build Filters Sub-Tab

## Feature Description
Build the `FiltersTab` component that renders inside the Audio Rig's nested Radix tabs. The tab provides two `FXEffectBlock` sections (HPF + LPF), each with individual bypass toggles and Value Strips for frequency and Q.

Depends on: **Issue 18** (`FXEffectBlock` wrapper), **Issue 0a** (types), **Issue 0b** (state), **Issue 0c** (`AudioEngine.setGlobalFilterLPF`, `AudioEngine.setGlobalFilterHPF`).

## Implementation Details
- [ ] Create `src/components/console/fx/FiltersTab.tsx` and `FiltersTab.css`
- [ ] Render both HPF and LPF sections: `<FXEffectBlock label="HPF" effectKey="filterHPF">` + `<FXEffectBlock label="LPF" effectKey="filterLPF">`

### HPF Section (`globalAudio.filterHPF: FilterSettings`)
- [ ] **Frequency** Value Strip: range 20–4000 Hz, step 10 Hz; display in Hz (e.g. `80 Hz`)
- [ ] **Q (Resonance)** Value Strip: range 0.1–20, step 0.1; display as `Q X.X` (e.g. `Q 1.0`)
- [ ] On change: `setGlobalAudio('filterHPF', { [param]: value })` AND `AudioEngine.setGlobalFilterHPF({ [param]: value })`

### LPF Section (`globalAudio.filterLPF: FilterSettings`)
- [ ] **Frequency** Value Strip: range 200–20000 Hz, step 100 Hz; display in Hz (e.g. `8000 Hz`)
- [ ] **Q (Resonance)** Value Strip: range 0.1–20, step 0.1; display as `Q X.X`
- [ ] On change: `setGlobalAudio('filterLPF', { [param]: value })` AND `AudioEngine.setGlobalFilterLPF({ [param]: value })`

### Shared requirements
- [ ] Each section reads initial values from `useAudioStore` on mount
- [ ] Individual bypass toggles per filter block (via parent `FXEffectBlock`)
- [ ] All Value Strip controls are touch-optimized (minimum 44px touch target)
- [ ] **Radix:** Each Value Strip uses `@radix-ui/react-slider` → `Slider.Root` + `Slider.Track` + `Slider.Range` + `Slider.Thumb`
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **Filter defaults:** LPF defaults to a sensibly open value (e.g. 18000 Hz) — no audible effect until user drags it down. HPF defaults low (e.g. 30 Hz) — effectively open by default.
- **Filter interaction:** LPF and HPF are separate Tone.js `Filter` nodes (`_globalLPF` and `_globalHPF`). Setting LPF < HPF creates a notch band — this is valid and needs no special handling.
- **Q display:** Format as `Q X.X`. Values above ~5 can cause self-oscillation — a visual indicator at Q > 10 is optional polish.

## Acceptance Criteria
- [ ] HPF and LPF sections each render frequency and Q Value Strips with correct ranges
- [ ] HPF and LPF Value Strips update both store and AudioEngine independently
- [ ] Each filter block has its own bypass toggle
- [ ] Both sections initialise from current `globalAudio` state
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/engine/AudioEngine.ts` (`setGlobalFilterLPF`, `setGlobalFilterHPF`), `src/types/globalAudio.ts`
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 24: Chorus Sub-Tab                                     -->
<!-- ============================================================ -->

## [M8.5-24] Build Chorus Sub-Tab

## Feature Description
Build the `ChorusTab` component that renders inside the Audio Rig's nested Radix tabs. The tab provides Value Strips for the global chorus's controllable parameters.

Depends on: **Issue 18** (`FXEffectBlock` wrapper), **Issue 0a** (types), **Issue 0b** (state), **Issue 0c** (`AudioEngine.setGlobalChorus`).

## Implementation Details
- [ ] Create `src/components/console/fx/ChorusTab.tsx` and `ChorusTab.css`
- [ ] Wrap content in `<FXEffectBlock label="CHORUS" effectKey="chorus">`

### Chorus Value Strips (`globalAudio.chorus: ChorusSettings`)
- [ ] **Rate** Value Strip: range 0.1–10 Hz, step 0.1 Hz; display in Hz (e.g. `1.5 Hz`)
- [ ] **Depth** Value Strip: range 0–1, step 0.01; display as percentage (e.g. `50%`)
- [ ] **Delay Time** Value Strip: range 2–20 ms, step 0.5 ms; display in ms (e.g. `8 ms`)
- [ ] **Feedback** Value Strip: range 0–1, step 0.01; display as percentage (e.g. `20%`)
- [ ] **Wet** Value Strip: range 0–1, step 0.01; display as percentage (e.g. `30%`)
- [ ] On any change: `setGlobalAudio('chorus', { [param]: value })` AND `AudioEngine.setGlobalChorus({ [param]: value })`

### Shared requirements
- [ ] Reads initial values from `useAudioStore((s) => s.globalAudio.chorus)` on mount
- [ ] All Value Strip controls are touch-optimized (minimum 44px touch target)
- [ ] **Radix:** Each Value Strip uses `@radix-ui/react-slider` → `Slider.Root` + `Slider.Track` + `Slider.Range` + `Slider.Thumb`
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **`Tone.Chorus` requires `chorus.start()`** after instantiation to begin LFO modulation — verify this is done in `AudioEngine.start()` during Issue 0c. If not, add it in this issue's fix-up checklist.
- **`Tone.Chorus` delay time units:** `Chorus.delayTime` is in milliseconds — match the slider step (0.5 ms) to this. Confirm with the Tone.js API during implementation.

## Acceptance Criteria
- [ ] Component renders all five Value Strips with correct ranges and units
- [ ] Moving any Value Strip updates both `audioStore.globalAudio.chorus` and the live AudioEngine effect
- [ ] Component initialises from current `audioStore.globalAudio.chorus` state
- [ ] Respects parent `FXEffectBlock` bypass toggle
- [ ] `Tone.Chorus` LFO is running (audible modulation) after AudioEngine starts
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/engine/AudioEngine.ts` (`setGlobalChorus`), `src/stores/audioStore.ts` (`globalAudio.chorus`)
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 25: EQ Sub-Tab                                         -->
<!-- ============================================================ -->

## [M8.5-25] Build EQ Sub-Tab

## Feature Description
Build the `EQTab` component that renders inside the Audio Rig's nested Radix tabs. The tab provides Value Strips for the 3-band global EQ's gain parameters.

Depends on: **Issue 18** (`FXEffectBlock` wrapper), **Issue 0a** (types), **Issue 0b** (state), **Issue 0c** (`AudioEngine.setGlobalEQ`).

## Implementation Details
- [ ] Create `src/components/console/fx/EQTab.tsx` and `EQTab.css`
- [ ] Wrap content in `<FXEffectBlock label="EQ" effectKey="eq3">`

### EQ3 Value Strips (`globalAudio.eq3: EQ3Settings`)
- [ ] **Low gain** Value Strip: range −12–12 dB, step 0.5 dB; display in dB (e.g. `+3 dB`)
- [ ] **Mid gain** Value Strip: range −12–12 dB, step 0.5 dB; display in dB
- [ ] **High gain** Value Strip: range −12–12 dB, step 0.5 dB; display in dB
- [ ] On any change: call `setGlobalAudio('eq3', { [param]: value })` AND `AudioEngine.setGlobalEQ({ [param]: value })`

### Shared requirements
- [ ] Reads initial values from `useAudioStore((s) => s.globalAudio.eq3)` on mount
- [ ] All Value Strip controls are touch-optimized (minimum 44px touch target)
- [ ] **Radix:** Each Value Strip uses `@radix-ui/react-slider` → `Slider.Root` + `Slider.Track` + `Slider.Range` + `Slider.Thumb`
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **`Tone.EQ3` crossover frequencies:** Fixed by default (low/mid at ~400 Hz, mid/high at ~2500 Hz). These are not exposed as UI parameters — the three gain sliders are sufficient for a simple global tone control.
- **Bypass note:** EQ3 has no `wet` parameter — bypass routes around the node. Handled by the parent `FXEffectBlock`. Bypassing the EQ returns the tone to flat.

## Acceptance Criteria
- [ ] Component renders all three gain Value Strips with correct ranges and units
- [ ] Moving any Value Strip updates both `audioStore.globalAudio.eq3` and the live AudioEngine node
- [ ] Component initialises from current `audioStore.globalAudio.eq3` state
- [ ] Respects parent `FXEffectBlock` bypass toggle
- [ ] Bypassing the EQ returns the tone to flat
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge

## Source Reference
- File: `src/engine/AudioEngine.ts` (`setGlobalEQ`), `src/stores/audioStore.ts` (`globalAudio.eq3`)
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."
