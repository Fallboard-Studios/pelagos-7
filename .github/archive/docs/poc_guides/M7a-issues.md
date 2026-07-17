---
name: Feature
about: New feature or enhancement
title: '[M7.1] LayeredWave & Visual Types'
labels: audio, visual, enhancement
assignees: ''
---

## Feature Description
Add typed data model for layered audio and the canonical visual mapping used by robots. Define `LayeredWave`, `LayerVisual`, and `ShapeParams` and extend `AudioAttributes` so spawn-time data includes a compact `visualAudioMap`.

## Implementation Details
- Types in `src/types/`: add `LayeredWave`, `LayerVisual`, `ShapeParams` and extend `AudioAttributes`.
- `LayeredWave` should allow `base: WaveformType`, optional `layers: Array<{ type: WaveformType|'noise', gain?: number, detune?: number, adsr?: ADSTRaw }>`.

## Technical Notes
- Keep types serializable and small; visual mapping is derived at spawn-time and stored on the robot object.

## Acceptance Criteria
- [ ] Types added in `src/types/` and TypeScript compiles.
- [ ] Spawned robots include `visualAudioMap` in their audio attributes.

---

---
name: Feature
about: New feature or enhancement
title: '[M7.2] Composite Voice Factory in AudioEngine'
labels: audio, enhancement
assignees: ''
---

## Feature Description
Implement a composite voice factory in `AudioEngine` that constructs a single reserved voice containing multiple oscillators and optional `NoiseSynth`, mixed via per-voice `Gain` nodes.

## Implementation Details
- Add a factory in `src/engine/AudioEngine.ts` to create composite voices with multiple `Oscillator` nodes, per-layer gain, and an optional `NoiseSynth` layer.
- Expose `triggerAttackRelease(note, dur, time, velocity)` and `set(params)` on the composite voice.

## Technical Notes
- Composite voices should be routed into the existing audio graph via a per-voice output node so effects/panning behave like single voices.

## Acceptance Criteria
- [ ] New factory exists and is covered by unit tests that assert the proper construction of oscillators and nodes.

---

---
name: Feature
about: New feature or enhancement
title: '[M7.3] reserveVoice API & Per-Robot Sub-Bus'
labels: audio, enhancement
assignees: ''
---

## Feature Description
Extend `AudioEngine.reserveVoice()` to accept a `LayeredWave` descriptor and ensure reserved composite voices route into a per-robot sub-bus (Gain → Filter → Effects).

## Implementation Details
- Update `reserveVoice()` signature and allocation path to accept layered descriptors.
- Create or reuse a per-robot sub-bus where each reserved voice routes; ensure effect sends and panners attach to the sub-bus.

## Acceptance Criteria
- [ ] `reserveVoice()` accepts layered descriptors and instantiates composite voices.
- [ ] Tests verify no global parameter bleed (i.e., changes affect only the reserved robot voice/sub-bus).

---

---
name: Feature
about: New feature or enhancement
title: '[M7.4] Spawn Presets + ADSR Normalization & Averaging'
labels: audio, enhancement
assignees: ''
---

## Feature Description
Update `spawnSystem.generateAudioAttributes()` to produce layered presets (max 3 layers by default), normalize ADSR with predefined maxima, and compute gain-weighted averaged ADSR values used for visuals.

## Implementation Details
- Defaults: max layers = 3; ADSR maxima: attack=2s, decay=2s, release=5s.
- Normalize per-layer ADSR to 0..1 using maxima, compute weighted average by layer gain for attack/decay/sustain/release, and map averaged results into `ShapeParams`.

## Acceptance Criteria
- [ ] Spawned robots include layered presets and `visualAudioMap` with averaged ADSR.
- [ ] Unit tests verify the averaging formulas and normalization.

---

---
name: Feature
about: New feature or enhancement
title: '[M7.5] Visual Audio Mapper Adapter'
labels: visual, enhancement
assignees: ''
---

## Feature Description
Add `robotVisualMapper` that converts `visualAudioMap` → `bodyShapeProps`, `greebleProps`, and `lightsProps` with canonical mapping rules and body-type fallbacks.

## Implementation Details
- Implement `src/components/robot/robotVisualMapper.ts` that produces component-friendly props from the canonical map.
- Provide clear fallbacks so all body types can consume the same output safely.

## Acceptance Criteria
- [ ] Adapter exists and has unit tests demonstrating mapping behavior across representative inputs.

---

---
name: Feature
about: New feature or enhancement
title: '[M7.6] Robot Components — Accept Audio-Derived Props'
labels: visual, enhancement
assignees: ''
---

## Feature Description
Update robot body components (`RobotBody`, `RobotOrganic`, etc.) to accept `bodyShapeProps`, `greebleProps`, and `lightsProps`, and animate shape using averaged ADSR-derived `ShapeParams`.

## Implementation Details
- Update component props and implement animation hooks (GSAP or existing helpers) to animate shape transitions using `ShapeParams`.
- Keep per-body fallbacks so bodies without certain features degrade gracefully.

## Acceptance Criteria
- [ ] Components accept new props and render without console errors.
- [ ] Snapshot or render smoke tests for each body type with sample props pass.

---

---
name: Feature
about: New feature or enhancement
title: '[M7.7] AudioVisual Inspector UI'
labels: debug, enhancement
assignees: ''
---

## Feature Description
Create an inspector UI at `src/components/debug/AudioVisualInspector.tsx` to preview layered-wave presets, toggle layers, edit gains, and preview the averaged ADSR and resulting body shape.

## Implementation Details
- Inspector mounts in the debug area and exposes controls for up to 3 layers, layer gain, and presets. Preview pane shows a live `visualAudioMap` → `Robot` render.

## Acceptance Criteria
- [ ] Inspector mounts with no console errors and updates preview when controls change.

---

---
name: Feature
about: New feature or enhancement
title: '[M7.8] Tests & Documentation'
labels: test, docs
assignees: ''
---

## Feature Description
Add unit tests for types, spawn normalization, composite voice behavior, and mapping rules. Update `docs/AUDIO_SYSTEM.md` and `docs/ROBOT_DESIGN.md` with usage examples, defaults, and guardrails.

## Implementation Details
- Add tests under `src/engine/` and `src/systems/` as appropriate; include render smoke tests for robot components.
- Update docs with defaults: noise enabled, max layers=3, ADSR maxima = 2/2/5.

## Acceptance Criteria
- [ ] New tests run locally via `vitest` and pass.
- [ ] Documentation updated with mapping rules and examples.

---

---
name: Feature
about: New feature or enhancement
title: '[M7.9] Performance Guidance & Pool Limits'
labels: perf, docs
assignees: ''
---

## Feature Description
Document recommended max layers and synth-pool guidance. Add a perf smoke test to spawn many layered robots and observe CPU/memory impact.

## Implementation Details
- Provide guidance in docs; add a script or test harness to spawn up to `MAX_POLYPHONY` robots with layered voices to observe performance characteristics.

## Acceptance Criteria
- [ ] Docs updated with recommended defaults and pool sizing guidance.
- [ ] Perf smoke test added that can be run locally.
