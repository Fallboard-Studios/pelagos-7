# Robot Visual Design Guide

## Overview

Robots are single unified SVG entities whose visual appearance (shape, color, detail) is derived entirely from `audioAttributes` — never stored separately. This keeps `Robot` fully serializable for Zustand while visuals stay a pure function of audio data, computed at render time in [robotVisualHelpers.ts](../src/components/robot/robotVisualHelpers.ts) and [robotVisualMapper.ts](../src/components/robot/robotVisualMapper.ts).

**Related references:**
- [Audio System Guide](AUDIO_SYSTEM.md) — AudioEngine, layered voices, `visualAudioMap`
- [Animation System Guide](ANIMATION_SYSTEM.md) — GSAP timeline patterns for robot motion

## Shape Components

Four SVG variants live in `src/components/robot/`: `RobotSleek.tsx`, `RobotAngular.tsx`, `RobotOrganic.tsx`, `RobotIndustrial.tsx`. Selection is by oscillator `waveform` via `selectRobotShape()`:

| Waveform | Shape |
|---|---|
| `sine` | RobotSleek |
| `square` | RobotAngular |
| `triangle` | RobotOrganic |
| `sawtooth` | RobotIndustrial |
| `pulse` / unknown | RobotSleek (default) |

## Color Mapping

`generateColors(adsr, waveform)` in `robotVisualHelpers.ts` computes HSL colors directly — there is no static color-palette table:

- **Hue**: each waveform has a `BASE_HUE` (sine 210°, square 24°, triangle 280°, sawtooth 140°, pulse 60°), offset by `hueOffset(adsr)` — a small deterministic shift from the decay/release and attack/sustain ratios. Secondary/accent hues are +14°/−22° from primary.
- **Saturation**: from `adsr.attack` — faster attack → higher saturation (30–100%).
- **Luminance**: from `adsr.sustain` — higher sustain → higher luminance (20–72%).

## Shape Parameters

Two complementary sources feed body geometry, composed together in `RobotBody.tsx`:

1. **Spawn-time (`audioAttributes.visualAudioMap.shapeParams`)** — computed once in `spawnSystem.ts` from the gain-weighted, normalized average of a robot's oscillator layers' ADSR envelopes: `scale ≈ 0.25 + (1 − attack) × 0.75`, `roundness ≈ sustain`, `detail ≈ release` (all 0..1). This is the preferred source, converted to component props via `mapVisualAudioToProps()`.
2. **Live (`shapeParamsFromAudio()`)** — derives `torsoAspect`, `appendageLength`, and `scaleBias` from `octaveRange`, `filterFreq`, and waveform/ADSR, plus `MicroVariants` (`stripes`/`smooth`/`spikes`) keyed off waveform and fast-attack envelopes.

## Greebles & Lights

- **Greeble count**: prefers `mapped.greebleProps.count` (≈ `detail × 6`, from `visualAudioMap`); falls back to `calculateGreebleCount(filterFreq, detailLevel, waveform, adsr)`, which weights filter-derived detail (60%), explicit detail (25%), and sustain (15%), with a small bonus for sawtooth/square waveforms. Capped at 16.
- **Light intensity**: blends `averagedGain × 0.6 + detail × 0.4`; light hue derives from scale (`200 − scale × 120`).

## Data Flow

`audioAttributes` (`adsr`, `waveform`, `filterFreq`, `layers`, `visualAudioMap`) is fully serializable and lives on `Robot` in Zustand (see [src/types/Robot.ts](../src/types/Robot.ts)). Visual props are recomputed from this data at render time — never construct Tone.js objects, and never store computed shape/color props back in state.

`AudioVisualInspector.tsx` (`src/components/debug/`) exposes the live mapping for debugging.

## Forbidden Patterns

- Storing computed colors, shape props, or greeble counts in Zustand — recompute from `audioAttributes` at render time.
- Adding a static/fixed color palette — colors must stay derived from ADSR + waveform.
- Constructing Tone.js objects for visual-only purposes.
