---
name: Feature
about: Milestone 5 — Global Audio FX Rack
title: '[M8.5] '
labels: feature
assignees: ''
---

<!-- ============================================================ -->
<!-- ISSUE 17: Build Universal FX Wrapper                         -->
<!-- ============================================================ -->

## [M8.5-17] Build Universal FX Wrapper (Global Bypass Toggle + Per-Effect Group Border)

## Feature Description
Build the structural shell for the FX Rack view: a top-level `FXRackView` that replaces the stub from Issue 4, and a reusable `FXEffectBlock` wrapper component that frames each individual effect module with a consistent border, label, and per-effect bypass toggle. A master global bypass toggle sits at the top of the rack.

Depends on: **Issue 0a** (`GlobalAudioSettings` type), **Issue 0b** (`globalAudio` state + `setGlobalAudio`), **Issue 0c** (AudioEngine bypass methods), **Issue 1** (design tokens), **Issue 4** (FXRack view slot exists).

## Implementation Details
- [ ] Create `src/components/views/FXRackView.tsx` — replaces the stub from Issue 4
- [ ] Create `src/components/ui/FXEffectBlock.tsx` and `FXEffectBlock.css` — reusable wrapper used by all four effect modules (Issues 18–20)
- [ ] **Global Bypass Toggle:**
  - Positioned at the top of `FXRackView`, spanning the full rack width
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
- [ ] `FXRackView` renders all four effect modules (Issues 18–20) wrapped in `FXEffectBlock`, arranged in a scrollable column or grid on mobile
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
- [ ] `FXRackView` renders as the active view when `uiStore.activeView === 'fx'`
- [ ] Global bypass toggle reads and writes `globalAudio.globalBypass`
- [ ] Enabling global bypass calls `AudioEngine.setGlobalBypass(true)` — audible: all effects cut out immediately
- [ ] `FXEffectBlock` renders label, bypass toggle, and children for each effect
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
<!-- ISSUE 18: Implement Reverb & Delay Modules                   -->
<!-- ============================================================ -->

## [M8.5-18] Implement Reverb & Delay Modules (Value Strips)

## Feature Description
Build the two time-based FX modules for the global rack: Reverb and Delay. Each renders inside an `FXEffectBlock` wrapper (Issue 17) and provides Value Strips (high-contrast horizontal or vertical fill bars, touch-optimized) for all controllable parameters. No rotary knobs or grippable controls — everything is a linear fill bar suited for the glass touchscreen. Changes call the corresponding `AudioEngine` setter and persist to `audioStore.globalAudio`.

Depends on: **Issue 17** (`FXEffectBlock` wrapper), **Issue 0a** (types), **Issue 0b** (state), **Issue 0c** (AudioEngine setters).

## Implementation Details
- [ ] Create `src/components/ui/fx/ReverbModule.tsx` and `ReverbModule.css`
- [ ] Create `src/components/ui/fx/DelayModule.tsx` and `DelayModule.css`

### Reverb Module (`globalAudio.reverb: ReverbSettings`)
- [ ] **Decay** Value Strip: range 0.1–10s, step 0.1s; display in seconds (e.g. `2.5 s`)
- [ ] **Pre-Delay** Value Strip: range 0–0.5s, step 0.01s; display in ms (e.g. `20 ms`)
- [ ] **Dampening** Value Strip: range 100–8000 Hz, step 100 Hz; display in Hz (e.g. `2000 Hz`)
- [ ] **Wet** Value Strip: range 0–1, step 0.01; display as percentage (e.g. `40%`)
- [ ] On any change: call `setGlobalAudio('reverb', { [param]: value })` AND `AudioEngine.setGlobalReverb({ [param]: value })`

### Delay Module (`globalAudio.delay: DelaySettings`)
- [ ] **Delay Time** Value Strip: range 0–1s, step 0.01s; display in ms (e.g. `250 ms`)
- [ ] **Feedback** Value Strip: range 0–0.95, step 0.01; display as percentage (e.g. `35%`)
- [ ] **Wet** Value Strip: range 0–1, step 0.01; display as percentage (e.g. `30%`)
- [ ] On any change: call `setGlobalAudio('delay', { [param]: value })` AND `AudioEngine.setGlobalDelay({ [param]: value })`

### Shared requirements
- [ ] Each module reads initial values from `useAudioStore((s) => s.globalAudio.<effect>)` on mount so Value Strips initialise at current state (not hardcoded defaults)
- [ ] All Value Strip controls are touch-optimized (minimum 44px touch target height/width)
- [ ] **Radix:** Each Value Strip uses `@radix-ui/react-slider` → `Slider.Root` + `Slider.Track` + `Slider.Range` + `Slider.Thumb`. Provides `role="slider"`, `aria-valuenow/min/max/valuetext`, keyboard arrow key support, and correct touch handling. Orient horizontally (`orientation="horizontal"`, the default) for Value Strips; the CSS controls the visual fill appearance.
- [ ] Each module is wrapped in `<FXEffectBlock label="REVERB" effectKey="reverb">` / `<FXEffectBlock label="DELAY" effectKey="delay">`
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **Reverb `decay` change:** `Tone.Reverb` regenerates its impulse response when `decay` changes (`await reverb.generate()` is called internally). This is asynchronous and may cause a brief audio gap — this is expected Tone.js behaviour. Do not block the UI waiting for this.
- **Delay time sync to BPM:** Optionally, the Delay Time slider could display a "sync to BPM" toggle that snaps `delayTime` to a musical subdivision (e.g. `4n` in seconds = `60 / bpm / 1`). This is optional polish — define the behaviour in the issue if implementing.
- **Slider component:** Consider extracting a shared `<ParamSlider label value min max step unit onChange />` primitive used by all four FX modules (and potentially ADSR). This avoids per-module slider boilerplate across Issues 18–20.
- **Dampening display:** Dampening is a filter frequency in Hz — a log-scale display or non-linear slider step would be more musically useful (doubling frequency = one octave), but a linear 100 Hz step is acceptable for an initial implementation.

## Acceptance Criteria
- [ ] Reverb module renders all four Value Strips with correct ranges and units
- [ ] Delay module renders all three Value Strips with correct ranges and units
- [ ] Moving any Value Strip updates both `audioStore.globalAudio` and the live AudioEngine effect
- [ ] Both modules initialise from current `audioStore.globalAudio` state (not hardcoded)
- [ ] Both modules respect their parent `FXEffectBlock` bypass toggle (dimmed and inert when bypassed)
- [ ] Global bypass makes both effects inaudible
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback

## Source Reference
- File: `src/engine/AudioEngine.ts` (`setGlobalReverb`, `setGlobalDelay`), `src/stores/audioStore.ts` (`globalAudio.reverb`, `globalAudio.delay`)
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 19: Implement Compression & EQ Modules                 -->
<!-- ============================================================ -->

## [M8.5-19] Implement Compression & EQ Modules (Value Strips)

## Feature Description
Build the dynamics and tonal shaping modules for the global rack: a Compressor and a 3-band EQ. Both render inside `FXEffectBlock` wrappers and provide Value Strips (high-contrast linear fill bars) for all controllable parameters. No rotary knobs or grippable controls.

Depends on: **Issue 17** (`FXEffectBlock`), **Issue 0a** (types), **Issue 0b** (state), **Issue 0c** (AudioEngine setters — `setGlobalCompressor`, `setGlobalEQ`).

## Implementation Details
- [ ] Create `src/components/ui/fx/CompressorModule.tsx` and `CompressorModule.css`
- [ ] Create `src/components/ui/fx/EQ3Module.tsx` and `EQ3Module.css`

### Compressor Module (`globalAudio.compressor: CompressorSettings`)
- [ ] **Threshold** Value Strip: range −60–0 dB, step 1 dB; display in dB (e.g. `−18 dB`)
- [ ] **Ratio** Value Strip: range 1–20, step 0.5; display as ratio (e.g. `6:1`)
- [ ] **Attack** Value Strip: range 0.001–1s, step 0.001s; display in ms (e.g. `3 ms`)
- [ ] **Release** Value Strip: range 0.01–1s, step 0.01s; display in ms (e.g. `150 ms`)
- [ ] **Knee** Value Strip: range 0–40 dB, step 1 dB; display in dB (e.g. `6 dB`)
- [ ] On any change: call `setGlobalAudio('compressor', { [param]: value })` AND `AudioEngine.setGlobalCompressor({ [param]: value })`
- [ ] Default values must match the previously hardcoded `_masterCompressor` values: threshold −18 dB, ratio 6, attack 0.003s, release 0.15s, knee 6 dB (verify against `AudioEngine.ts`)

### EQ3 Module (`globalAudio.eq3: EQ3Settings`)
- [ ] **Low gain** Value Strip: range −12–12 dB, step 0.5 dB; display in dB (e.g. `+3 dB`)
- [ ] **Mid gain** Value Strip: range −12–12 dB, step 0.5 dB; display in dB
- [ ] **High gain** Value Strip: range −12–12 dB, step 0.5 dB; display in dB
- [ ] On any change: call `setGlobalAudio('eq3', { [param]: value })` AND `AudioEngine.setGlobalEQ({ [param]: value })`

### Shared requirements
- [ ] Each module reads initial values from `useAudioStore((s) => s.globalAudio.<effect>)` on mount
- [ ] All Value Strip controls are touch-optimized (minimum 44px touch target)
- [ ] **Radix:** Each Value Strip uses `@radix-ui/react-slider` → `Slider.Root` + `Slider.Track` + `Slider.Range` + `Slider.Thumb`.
- [ ] Wrapped in `<FXEffectBlock label="COMP" effectKey="compressor">` / `<FXEffectBlock label="EQ" effectKey="eq3">`
- [ ] **Bypass note:** EQ3 and Compressor have no `wet` parameter — bypass is implemented in AudioEngine by routing around the node (via a pass-through gain swap). The `enabled` flag in each effect's settings is the bypass signal. When `enabled = false`, the block must call `AudioEngine.setEffectBypass('compressor'/'eq3', false)` via the parent `FXEffectBlock` — this is handled by the wrapper from Issue 17, not the module itself.
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **Compressor defaults must match existing hardcoded values** in `AudioEngine.ts` (currently: threshold −18, ratio 6, attack 0.003, release 0.15). The defaults in `GlobalAudioSettings` (Issue 0a) and in this module must be kept in sync. If they diverge, the compressor will change behaviour on first app load when the FX rack is introduced.
- **`Tone.EQ3` crossover frequencies:** `Tone.EQ3` uses fixed crossover points by default (low/mid at ~400 Hz, mid/high at ~2500 Hz). These are not exposed as UI parameters in this issue — the three gain sliders are sufficient for a simple global tone control.
- **Ratio display:** Ratio is a multiplier (1–20) displayed as `N:1`. Format in the display layer: `${value.toFixed(1)}:1`.
- **Attack/Release display threshold:** Show in ms for values < 1s (multiply by 1000, suffix `ms`). Compressor attack and release params are stored in seconds in `CompressorSettings`.

## Acceptance Criteria
- [ ] Compressor module renders all five Value Strips with correct ranges, units, and hardcoded-compatible defaults
- [ ] EQ module renders all three gain Value Strips
- [ ] Moving any Value Strip updates both `audioStore.globalAudio` and the live AudioEngine node
- [ ] Both modules initialise from current `audioStore.globalAudio` state
- [ ] Both modules respect their parent `FXEffectBlock` bypass toggle
- [ ] Bypassing the compressor removes dynamics processing but does not stop audio
- [ ] Bypassing the EQ returns the tone to flat (no gain on any band)
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback dynamics or tone

## Source Reference
- File: `src/engine/AudioEngine.ts` (`setGlobalCompressor`, `setGlobalEQ`, `_masterCompressor` hardcoded defaults), `src/types/globalAudio.ts`
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."

---

<!-- ============================================================ -->
<!-- ISSUE 20: Implement Filter & Chorus Modules                  -->
<!-- ============================================================ -->

## [M8.5-20] Implement Filter & Chorus Modules (Value Strips)

## Feature Description
Build the final two FX modules for the global rack: a dual-filter section (LPF and HPF) and a Chorus effect. Both render inside `FXEffectBlock` wrappers and use Value Strips (high-contrast linear fill bars) for all parameters. No rotary knobs or grippable controls.

Depends on: **Issue 17** (`FXEffectBlock`), **Issue 0a** (types), **Issue 0b** (state), **Issue 0c** (AudioEngine setters — `setGlobalFilterLPF`, `setGlobalFilterHPF`, `setGlobalChorus`).

## Implementation Details
- [ ] Create `src/components/ui/fx/FilterModule.tsx` and `FilterModule.css` — handles both LPF and HPF in one component
- [ ] Create `src/components/ui/fx/ChorusModule.tsx` and `ChorusModule.css`

### Filter Module (LPF + HPF as a paired block)
- [ ] Render both LPF and HPF controls within a single `<FXEffectBlock label="FILTER">` — they share a block because they are typically used together to define a bandpass window
- [ ] **LPF section** (`globalAudio.filterLPF: FilterSettings`):
  - **Frequency** Value Strip: range 200–20000 Hz, step 100 Hz; display in Hz (e.g. `8000 Hz`)
  - **Q (Resonance)** Value Strip: range 0.1–20, step 0.1; display to 1 decimal (e.g. `Q 1.0`)
  - On change: `setGlobalAudio('filterLPF', { [param]: value })` AND `AudioEngine.setGlobalFilterLPF({ [param]: value })`
- [ ] **HPF section** (`globalAudio.filterHPF: FilterSettings`):
  - **Frequency** Value Strip: range 20–4000 Hz, step 10 Hz; display in Hz (e.g. `80 Hz`)
  - **Q (Resonance)** Value Strip: range 0.1–20, step 0.1
  - On change: `setGlobalAudio('filterHPF', { [param]: value })` AND `AudioEngine.setGlobalFilterHPF({ [param]: value })`
- [ ] The `effectKey` for the shared block bypass can be a composite — either give the block two bypass toggles (one per filter), or a single `enabled` flag that bypasses both simultaneously. Document the approach chosen.

### Chorus Module (`globalAudio.chorus: ChorusSettings`)
- [ ] **Rate** Value Strip: range 0.1–10 Hz, step 0.1 Hz; display in Hz (e.g. `1.5 Hz`)
- [ ] **Depth** Value Strip: range 0–1, step 0.01; display as percentage (e.g. `50%`)
- [ ] **Delay Time** Value Strip: range 2–20 ms, step 0.5 ms; display in ms (e.g. `8 ms`)
- [ ] **Feedback** Value Strip: range 0–1, step 0.01; display as percentage (e.g. `20%`)
- [ ] **Wet** Value Strip: range 0–1, step 0.01; display as percentage (e.g. `30%`)
- [ ] On any change: `setGlobalAudio('chorus', { [param]: value })` AND `AudioEngine.setGlobalChorus({ [param]: value })`
- [ ] Wrapped in `<FXEffectBlock label="CHORUS" effectKey="chorus">`

### Shared requirements
- [ ] Each module reads initial values from `useAudioStore((s) => s.globalAudio.<effect>)` on mount
- [ ] All Value Strip controls are touch-optimized (minimum 44px touch target)
- [ ] **Radix:** Each Value Strip uses `@radix-ui/react-slider` → `Slider.Root` + `Slider.Track` + `Slider.Range` + `Slider.Thumb`.
- [ ] Use only design tokens from Issue 1 for all styles
- [ ] No architecture violations (audio/animation/state separation)
- [ ] Code follows standards (imports ordered, explicit types)
- [ ] Tested locally (no console errors)

## Technical Notes
- **LPF frequency default:** Set a sensible open default (e.g. 18000 Hz) so the LPF has no audible effect until the user drags it down. Similarly HPF should default to a low value (e.g. 30 Hz) so it is effectively open by default.
- **Filter interaction:** LPF and HPF are separate Tone.js `Filter` nodes in the chain (`_globalLPF` and `_globalHPF`). They are independent — users can set LPF < HPF, creating a notch/reject band. This edge case does not need special handling; the audio result (silence in that range) is musically valid, if unusual.
- **Chorus and `Tone.Chorus`:** Tone.js `Chorus` requires calling `chorus.start()` after instantiation to begin the LFO modulation — verify this is done in `AudioEngine.start()` during Issue 0c. If not, add it in this issue's AudioEngine fix-up checklist.
- **`Tone.Chorus` delay time units:** Tone.js `Chorus.delayTime` is in milliseconds (not seconds) — match the slider step (0.5 ms) to this. Confirm with the Tone.js API during implementation.
- **Q display:** Q (resonance) is a dimensionless ratio — display as `Q X.X` (e.g. `Q 1.0`, `Q 8.5`). Values above ~5 can cause self-oscillation on some signal content; a warning or visual indicator at Q > 10 would be good UX, but is optional.
- **Shared filter block bypass strategy:** Simplest approach is a single `enabled` on both (`filterLPF.enabled && filterHPF.enabled` combined) — or add a dedicated `filtersEnabled: boolean` to `GlobalAudioSettings`. Document and stick to one approach.

## Acceptance Criteria
- [ ] LPF and HPF sections each render frequency and Q Value Strips with correct ranges
- [ ] LPF and HPF Value Strips update both store and AudioEngine independently
- [ ] Filter block bypass silences both LPF and HPF effects simultaneously (or clarified two-toggle approach)
- [ ] Chorus module renders all five Value Strips with correct ranges and units
- [ ] Chorus Value Strip changes update both store and AudioEngine
- [ ] Chorus block bypass disables the chorus effect
- [ ] Both modules initialise from current `globalAudio` state
- [ ] `Tone.Chorus` LFO is running (audible modulation) after AudioEngine starts
- [ ] Global bypass makes all effects in the rack inaudible
- [ ] All four FX modules together complete the full `FXRackView`
- [ ] App compiles with no TypeScript errors
- [ ] App remains functional after merge
- [ ] No regression in audio playback

## Source Reference
- File: `src/engine/AudioEngine.ts` (`setGlobalFilterLPF`, `setGlobalFilterHPF`, `setGlobalChorus`), `src/types/globalAudio.ts`
- Copilot instructions: "All audio: AudioEngine only (singleton). No local Tone.js synths in components."
