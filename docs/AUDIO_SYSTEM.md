# Audio System Guide

## Overview

This guide documents the current Pelagos-7 audio architecture and the conventions enforced by the engine implementation in [src/engine/AudioEngine.ts](../src/engine/AudioEngine.ts). It focuses on the shared scheduling, timing, polyphony, and melody patterns used across the app.

**Related references:**
- [BeatClock Guide](BEAT_CLOCK.md) - Musical timing and scheduling
- [Harmony System Guide](HARMONY_SYSTEM.md) - Dynamic note palettes
- [Melody Generation Guide](MELODY_SYSTEM.md) - Procedural melody creation
- [LFO Modulation](#lfo-modulation) - Audio-rate parameter modulation for robot and global-chain targets (below, no separate file yet)

## Core Audio Rules

The audio system is intentionally narrow: one shared `AudioEngine`, one transport-driven clock, and serializable robot descriptors.

- Initialize audio only from an explicit user gesture with `AudioEngine.start()`/`Tone.start()`.
- Treat the transport-backed BeatClock path as the authoritative clock for musical time; use `BeatClock` and `AudioEngine` for musical scheduling and avoid timers for music-aligned work.
- Use the shared `MIN_LEAD` (default `0.1s`) so notes are prepared ahead of playback.
- Keep voice creation, polyphony enforcement, and note scheduling inside `AudioEngine`; never create Tone objects in components or hooks.
- Keep only serializable data in Zustand state; store runtime-only objects such as voices, synth instances, and timelines outside state.
- Keep melodies index-based so harmony updates can change the pitch palette without regenerating the melody itself.

### Architecture snapshot

```
User Click Play
    ↓
AudioEngine.start()
    ↓
Tone.start() + Transport.start()
    ↓
┌─────────────────────────────────────┐
│         AudioEngine                 │
│  ┌──────────────────────────────┐  │
│  │  Composite Voices (MAX_POLYPHONY=16) │  │
│  │  - Per-robot isolated sub-bus│  │
│  │  - OscillatorLayer[] descriptor │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Scheduling System           │  │
│  │  - BeatClock/Transport ticks │  │
│  │  - MIN_LEAD lookahead        │  │
│  │  - Polyphony enforcement     │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Melody Registry             │  │
│  │  stepRegistry: Map<stepNumber, MelodyEventEntry[]> │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
         ↓              ↓
    BeatClock      HarmonySystem
    (timing)       (note palettes)
```

### AudioEngine API

`AudioEngine` is a plain object (no class). The methods below are the full export surface — roughly half of these were previously undocumented.

```typescript
export const AudioEngine = {
  // Lifecycle
  start: async (): Promise<void>,       // idempotent — no-ops if already initialized
  stop: () => void,                     // stops transport, clears playback tick; does NOT reset position or beat clock
  killAll: () => void,                  // full reset: cancels transport, resets position/counters, calls resetBeatClock()
  pause: () => void,
  resume: () => void,
  setBPM: (bpm: number) => void,        // no-op if not initialized
  now: () => number,

  // Scheduling
  scheduleNote: (params: { robotId: string; note: string; duration: NoteDuration; time?: number; velocity?: number }) => void,

  // Voice management
  reserveVoice: (robotId: string, descriptor: OscillatorLayer[] | { base?: WaveformType; layers?: OscillatorLayer[] }, phase?: number, detune?: number, pulseWidth?: number) => boolean,
  releaseVoice: (robotId: string) => void,
  reReserveVoice: (robotId: string) => boolean,
  updateVoiceLayerParams: (robotId: string, layers: OscillatorLayer[]) => void,
  createCompositeVoice: (descriptor: OscillatorLayer[] | { base?: WaveformType; layers?: OscillatorLayer[] }) => CompositeVoice,
  getVoiceForRobot: (robotId?: string) => CompositeVoice | null,

  // Melody registry
  registerRobotMelody: (robotId: string, melody: RobotMelodyEvent[]) => void,
  unregisterRobotMelody: (robotId: string) => void,
  getRegisteredMelody: (robotId: string) => RobotMelodyEvent[],   // test helper
  processMelodyStep: (currentStep: number, time: number) => void, // test helper
  getPolyphonyStats: () => { voices: number; maxVoices: number; step: number },

  // Global FX control (all no-ops if the underlying Tone node wasn't constructed, e.g. headless tests)
  setMasterVolume: (volume: number) => void,   // clamped [0,1]
  getMasterVolume: () => number,
  setGlobalReverb: (params: Partial<ReverbSettings>) => void,
  setGlobalDelay: (params: Partial<DelaySettings>) => void,
  setGlobalChorus: (params: Partial<ChorusSettings>) => void,
  setGlobalFilterLPF: (params: Partial<FilterSettings>) => void,
  setGlobalFilterHPF: (params: Partial<FilterSettings>) => void,
  setGlobalEQ: (params: Partial<EQ3Settings>) => void,
  setGlobalCompressor: (params: Partial<CompressorSettings>) => void,
  setGlobalBypass: (bypass: boolean) => void,             // routes compressor straight to destination when true
  setEffectBypass: (effect: 'reverb'|'delay'|'chorus'|'eq3'|'lpf'|'hpf'|'compressor', enabled: boolean) => void,
}
```

Note: `note` is resolved to a validated pitch string (`/^[A-Ga-g][b#]{0,2}\d+$/`) before triggering — an invalid note is warned-and-skipped, not thrown.

### Key Guarantees

- **Singleton**: The exported `AudioEngine` object is the shared entry point for audio work in the app.
- **Polyphony Control**: The engine caps active voices at `MAX_POLYPHONY = 16` and skips additional notes when the cap is reached.
- **Lookahead**: Scheduling uses the shared `MIN_LEAD` constant (default `0.1s`) so notes are prepared ahead of playback time.
- **Idempotence**: `AudioEngine.start()` exits early once initialization has completed, so repeated calls do not duplicate setup.
- **Cleanup**: `AudioEngine.stop()` stops the transport and clears the playback tick; `AudioEngine.killAll()` performs the full reset by cancelling transport events, releasing voices, and resetting beat-clock state.

### Musical Time Authority

`beatClock.ts` does not wrap or proxy Tone.Transport — it has no Tone import at all. It polls `transport.position` off whatever transport-like instance `AudioEngine.start()` hands it via `initBeatClock(transport)`, and there is no `BeatClock` object to import; every function below is a **named export** from `beatClock.ts`. It serves as the single source of truth for musical time:
- All timing expressed in beats/measures, not seconds
- 1 beat = quarter note at current BPM
- 1 measure = 4 beats (4/4 time signature)
- 96 measures = 1 full day/night cycle

**Never use `setTimeout`, `setInterval`, `requestAnimationFrame`, or `queueMicrotask` for musical timing.**

**For complete BeatClock implementation details, see [BEAT_CLOCK.md](BEAT_CLOCK.md).**

## Harmony System

The Harmony System provides dynamic 8-note palettes that change as the world clock advances, using the beat clock to derive the current hour from measure position (4 measures per hour-equivalent). This allows robot melodies to adapt without regenerating the melody events themselves.

**Key concepts:**
- Robots store note **indices (0-7)**, not pitch strings
- Palette updates are derived from the current hour and applied through the transport-driven cycle
- Melody events remain immutable; only the palette changes
- Updates are driven by BeatClock/Transport rather than timers

**For complete Harmony System implementation details, see [HARMONY_SYSTEM.md](HARMONY_SYSTEM.md).**

## Melody Generation

Melody generation creates unique, procedurally-generated patterns for each robot at spawn time using index-based notation (0-7) that automatically adapts to harmony changes.

**Key concepts:**
- 16-step grid (1-measure loop, 16th-note quantized)
- Weighted index distribution (lower indices more common)
- Syncopation control (on-beat vs. off-beat preference)
- Step registry for O(1) playback lookup
- Melodies generated once at spawn, immutable after

**For complete Melody Generation implementation details, see [MELODY_SYSTEM.md](MELODY_SYSTEM.md).**

## Polyphony Management

Polyphony management controls the maximum number of simultaneous audio voices to prevent audio distortion, CPU overload, and maintain musical clarity.

**Key principles:**
- Global `MAX_POLYPHONY` limit (default `MAX_POLYPHONY = 16`)
- Per-robot isolated composite voice (each robot owns its own sub-bus)
- Fail-fast skipping when limit exceeded
- Transport-based voice release scheduling
- Centralized enforcement in AudioEngine

**Why it matters:**
- Prevents audio distortion and CPU spikes
- Maintains musical clarity
- Ensures stable performance across devices

**For complete implementation details, see [POLYPHONY_GUIDE.md](POLYPHONY_GUIDE.md).**

## Layered / Composite Voices and Visual Mapping

Pelagos-7 uses serializable audio descriptors at spawn time so visuals and audio can share the same data without constructing Tone objects during render. The canonical descriptor is now the robot's `audioAttributes.layers` array, and the compact visual mapping is stored in `audioAttributes.visualAudioMap`.

Key points:
- Each layer is an `OscillatorLayer` with `type`, `gain`, `detune`, `phase`, and optional `adsr`/`pulseWidth` fields.
- Spawn-time logic in `src/systems/spawnSystem.ts` creates layered presets, computes averaged ADSR/gain values, and derives compact `shapeParams` for robot visuals.
- `AudioEngine.reserveVoice()` consumes those layers to create a runtime composite voice and route it through a per-robot sub-bus (panner → gain → filter → master compressor).
- Composite voices expose `triggerAttackRelease`, `set`, and `dispose` semantics so scheduling code can use a single high-level API.
- Because the mapping is stored on the robot as serializable data, visuals can be rendered in non-audio contexts without requiring Tone.js objects.

Recommended usage:
- At spawn: persist the generated `audioAttributes.layers` and the compact `audioAttributes.visualAudioMap` on the robot.
- At audio init: call `AudioEngine.reserveVoice(robotId, layers, phase, detune, pulseWidth)` to allocate an isolated composite voice. Reservation returns `false` only if voice creation fails; polyphony enforcement happens later when notes are triggered via `AudioEngine.scheduleNote()`.
- In components: prefer reading `audioAttributes.visualAudioMap` for visual properties; do not instantiate synths in components.

## Signal Graph

Two graphs compose: a **per-robot bus** (built per `reserveVoice` call) feeding a **global FX chain** (built once in `loadInstruments`, called from `start()`).

```
Per robot:  composite.output → panner → busGain → busFilter → ─┐
Global:                                                        │
  master compressor ←────────────────────────────────────────── ┘
      → EQ3 → LPF → HPF → Chorus → Delay → Reverb → masterGain → Destination
```

Control the global chain via `AudioEngine.setGlobal*`/`setEffectBypass`/`setGlobalBypass` (see API above). None of this FX surface was previously documented here.

## LFO Modulation

Audio-rate parameter modulation for both robot voices and the global FX chain, built in `src/engine/lfoEngine.ts`. LFOs are lazily instantiated per `(target, robotId?)` pair — nothing is constructed until a setter or `connectLfoTarget` first touches that pair — and every LFO's rate is a free-running Hz value; only start/stop are transport-gated, never the rate itself (`Tone.LFO.sync()` is deliberately never called — per its own doc comment it also ties frequency to the transport's BPM, which would violate that).

### Target ids

22 targets total, defined in `src/types/lfo.ts`, each traced to a reference grid:

- **`RobotLfoTargetId`** (13, from [ROBOT_DATA_GRID.md](reference/ROBOT_DATA_GRID.md)'s `Has LFO` column): `'volume'`, and `'layer{0,1,2}.{gain,detune,phase,pulseWidth}'`.
- **`GlobalLfoTargetId`** (9, from [GLOBAL_CHAIN_GRID.md](reference/GLOBAL_CHAIN_GRID.md)'s `LFO?` column): `'eq3.low'`, `'eq3.mid'`, `'eq3.high'`, `'lpf.frequency'`, `'lpf.Q'`, `'hpf.frequency'`, `'hpf.Q'`, `'chorus.delayTime'`, `'delay.delayTime'`. Uses the `'lpf'`/`'hpf'` short form `AudioEngine.setEffectBypass` already uses, not `GlobalAudioSettings`' `filterLPF`/`filterHPF` field names.

`LfoSettings` is `{ shape: 'triangle' | 'sine' | 'square' | 'sawtooth'; rate: number; depth: number }` — rate `0.1–10 Hz`, depth `0–100%` (`LFO_RATE_MIN/MAX`, `LFO_DEPTH_MIN/MAX` in `types/lfo.ts`).

### lfoEngine API

`lfoEngine` is a plain object (no class, matching `AudioEngine`'s own shape), exported from `src/engine/lfoEngine.ts`. Every function takes an optional `robotId?: string` — required in practice for robot-scoped targets (omitting it is a no-op/`false`, never a throw), irrelevant for global-chain targets.

```typescript
export const lfoEngine = {
  getLfoSettings: (target: RobotLfoTargetId | GlobalLfoTargetId, robotId?: string) => LfoSettings,
  setLfoRate: (target, hz: number, robotId?: string) => void,     // clamped to [0.1, 10]
  setLfoDepth: (target, percent: number, robotId?: string) => void, // clamped to [0, 100]
  setLfoShape: (target, shape: LfoShape, robotId?: string) => void,
  start: (target, robotId?: string) => void,  // no-ops unless a node already exists AND the transport is running
  stop: (target, robotId?: string) => void,   // always safe — idempotent if already stopped or never created
  connectLfoTarget: (target, robotId?: string) => boolean,
  disconnectLfoTarget: (target, robotId?: string) => void,
}
```

- **`getLfoSettings`** never constructs a node. Falls back to `DEFAULT_LFO_SETTINGS[target]` (`src/data/lfoConfig.ts` — inert: `{ shape: 'sine', rate: LFO_RATE_MIN, depth: LFO_DEPTH_MIN }` for every target) until a setter has run for that instance.
- **`setLfoRate`/`setLfoDepth`/`setLfoShape`** lazily construct the underlying `Tone.LFO` on first call (via `new Tone.LFO(settings.rate)`), then update both the persisted `LfoSettings` and the live node — `depth` maps onto `Tone.LFO.amplitude` (a `0–1` normalRange Param; Tone.LFO has no `depth` property of its own).
- **Instance keying:** robot-scoped targets are keyed `` `${robotId}:${target}` ``, global-chain targets by the bare target id — so robot A and robot B each get their own independent `layer0.gain` LFO, never a shared one.
- **`connectLfoTarget`** resolves the live Signal via `AudioEngine.getRobotModulationTarget(robotId, target)` / `AudioEngine.getGlobalModulationTarget(target)`, then — critically — sets the LFO's `min`/`max` to the target's *real* value range before calling `.connect()`. `Tone.LFO` defaults to `min: 0, max: 1` regardless of what it's connected to; left unset, modulating e.g. an EQ band (±12 dB) or detune (±50 cents) by only 0–1 units is functionally inaudible. Robot fields resolve from a small `ROBOT_LFO_FIELD_RANGE` table (gain `0–2`, detune `±50` cents, pulseWidth `0–1`, volume `0–1`); global targets reuse `GLOBAL_AUDIO_SEED_RANGES` (below), translating `lpf.`/`hpf.` target ids to that table's `filterLPF.`/`filterHPF.` keys.
- **`disconnectLfoTarget`** reverses `connectLfoTarget` — disconnects the live node, or cancels the phase-polling schedule (below). Safe to call on a target that was never connected.

### Two Tone.js divergences (not every target is truly `.connect()`-able)

Both verified directly against Tone.js's own source/type declarations, not assumed from the reference grids:

1. **Phase has no live Signal at all.** `Tone.Oscillator.phase` is a plain get/set number, not a `Signal`/`Param`. `connectLfoTarget('layerN.phase', robotId)` instead starts a **manual-polling fallback**: `scheduleRepeat('16n', …)` (from `beatClock.ts` — Transport-driven, never a raw JS timer) recomputes a waveform value every tick from the target's current `LfoSettings` and reapplies it via `AudioEngine.updateVoiceLayerParams(robotId, [...])`. It modulates around a fixed `PHASE_CENTER_DEGREES = 180` (the midpoint of the 0–360° range `ROBOT_DATA_GRID.md` documents for Phase), not the layer's own live phase value — reading a robot's current `audioAttributes` from inside `lfoEngine.ts` would mean reaching into `useLocaleStore` directly, which stays `AudioEngine`/store territory. A deliberate Phase-0 engine-scope simplification.
2. **pulseWidth only has a Signal for `'pulse'`-type layers.** `Tone.PulseOscillator.width` is a real `Signal`, but `'square'` has no adjustable width in Tone.js at all — a structural limitation, not a bug. `AudioEngine.getRobotModulationTarget` already returns `null` for that case, so `connectLfoTarget` simply no-ops and returns `false`, never throws.

A related, non-robot case: `getGlobalModulationTarget('chorus.delayTime')` also always returns `null` — `Tone.Chorus.delayTime` is a plain get/set number (Chorus already runs its own internal LFO on delayTime), so no connectable Signal exists there either.

### Seeding

- **Robot-level `LfoSettings`** are generated once at spawn time in `src/systems/spawnSystem.ts`'s `generateRobotLfoSettings(noiseMap, offset)`, stored on `Robot.lfoSettings: Record<RobotLfoTargetId, LfoSettings>`, the same way the rest of a robot's `AudioAttributes` are generated — one `getSeededVal` call per field, dataIds dot-namespaced as `robot.lfo.<target>.<field>`. When a robot's audio personality is copied (spawnSystem's ~30% copy chance), `lfoSettings` is copied wholesale from the source robot, not regenerated.
- **Global-chain effect *values*** (the parameters an LFO would modulate — EQ dB, filter Hz, etc., not the LFO settings themselves) are seed-generated per planet in `src/utils/globalAudioSeed.ts`'s `generateGlobalAudioSettings(planetId, planetName)`, sampling the **planet** noise map directly (a first — previously the planet map was only ever used to derive locale maps). Ranges and log/linear scale per field live in `src/data/globalAudioSeedRanges.ts`'s `GLOBAL_AUDIO_SEED_RANGES`. Wired into `audioStore` automatically on planet load/change via a `usePlanetStore.subscribe()` in `audioStore.ts` — no call site has to remember to re-seed. All 7 global effects' `enabled` is currently forced `true` (not seeded) so the whole chain stays audible while this is still Phase 0/1 engine work.
- **Global-chain `LfoSettings`** (shape/rate/depth, plus whether each target starts active) are seed-generated per planet in `src/utils/globalAudioSeed.ts`'s `generateGlobalLfoSettings(planetId, planetName)`, sampling the same planet noise map `generateGlobalAudioSettings` uses, dataIds dot-namespaced as `globalLfo.<target>.<field>`. Unlike `GLOBAL_AUDIO_SEED_RANGES`, every target shares one global rate/depth range (`LFO_RATE_MIN/MAX`, `LFO_DEPTH_MIN/MAX`) rather than a per-field table, since `GLOBAL_CHAIN_GRID.md`'s `LFO?` column is a flat flag, not per-field bounds. `active` is seeded too — unlike the robot-level precedent above, where connected/active is purely a runtime UI concern never part of the generated data — using an `activeT >= 0.8` threshold (~20% chance per target, chosen so a typical planet seeds roughly 1–2 already-active LFOs out of 9, not several at once). Wired into `audioStore` via the same planet-sync subscription as `generateGlobalAudioSettings`, but deliberately **data-only** at that point (`regenerateGlobalLfoFromSeed` never calls `lfoEngine`) — planet-sync runs before any user gesture, and `lfoEngine`'s setters unconditionally construct a real `Tone.LFO` node on first use. `AudioEngine.start()` is what actually primes `lfoEngine` from this seeded state and connects+starts every already-active target, since that's the one point guaranteed to run after `Tone.start()` has succeeded.

### Dev-only audible check

`src/engine/lfoDebug.ts` exposes `window.__lfoDebug.audition()` / `.stop()`, gated by `if (DEV_TUNING && typeof window !== 'undefined')` — genuinely stripped from production builds (verified by grepping the built bundle, not just runtime-guarded). `audition()` connects+starts a robot's `layer0.detune` and the global `eq3.low` band with clearly audible rate/depth values, for manual confirmation from the browser console during development. Not real UI — imported once from `main.tsx` purely for its registration side effect, never referenced by any component or store.

## Note Resolution Pipeline

`scheduleNote(params)` does more than forward to the transport — three real behaviors run on every note, none previously documented:

1. **Velocity.** If `params.velocity` is omitted, velocity is derived via `computeNoteVelocitySeeded()`: it samples a per-locale seeded noise map plus a per-robot counter (mod 97, for a long non-repeating period) and, with probability `VELOCITY_VARIANCE_RATE` (0.15), applies a signed offset up to `± VELOCITY_VARIANCE_AMOUNT` (0.25) to the robot's `masterVolume`. Result is always clamped to `[VELOCITY_MIN, 1]` (floor `0.05` — never fully silent). Falls back to a plain clamp of `masterVolume` if no noise map exists for the active locale.
2. **`audioMode` policy** (read fresh from the store each call, not cached): `mute` drops the note; if any robot in the locale is `solo`, all non-solo robots are suppressed; if any robot is `highlight`, non-highlighted robots have velocity multiplied by `0.5` (~-6dB). `triggerWithCap` re-checks mute/solo as a safety net in case a caller bypasses `scheduleNote`.
3. **Panning.** Every reserved voice's pan is recomputed once per `16n` playback tick (not per note) via `calculatePanFromPosition(x) = (x / WORLD_WIDTH) - 0.5`, giving a range of `[-0.5, +0.5]` (intentionally narrower than full stereo width, to keep the mix centered). `x` comes from the robot's **live GSAP-animated transform** (`getRef('robot-' + robotId)`), falling back to the robot's stored `position.x` if the ref/transform isn't available.

## Scheduling Patterns

Audio scheduling in Pelagos-7 is driven by the transport-backed BeatClock and AudioEngine for sample-accurate, musically-aligned timing.

**Core APIs:**
- `scheduleRepeat()` / `cancelSchedule()` — named exports from `beatClock.ts` (not a `BeatClock.` namespace) — app-facing recurring musical work
- `AudioEngine.scheduleNote()` - note playback entry point
- `Transport.scheduleOnce()` / `scheduleRepeat()` remain engine internals; app code should generally avoid calling them directly

**Lookahead:** Apply the shared `MIN_LEAD` scheduling lead so Web Audio can prepare synths before the attack; the implementation defaults to `0.1s` (100ms).

**Critical rule:** When a beat-based callback runs, use the callback time or `AudioEngine.now()` for scheduling. App code should normally stay on the `BeatClock`/`AudioEngine` path rather than reaching for `Tone.Transport` directly.

**Key patterns:**
- Use the step registry for O(1) melody lookups rather than iterating over robots each tick
- Keep playback state in AudioEngine and let the transport-driven beat clock drive the shared step scheduler
- Clear previous schedules before HMR re-registration
- Cancel beat-clock schedules with `cancelSchedule()` when they are no longer needed

## Common Patterns

The examples below show the current engine-facing patterns for scheduling, melody registration, and cleanup.

### Schedule a Note

```typescript
import { AudioEngine } from '../engine/AudioEngine';
import { scheduleRepeat, cancelSchedule } from '../engine/beatClock';
import { MIN_LEAD } from '../constants';

// Simple immediate trigger
AudioEngine.scheduleNote({
  robotId: 'robot-123',
  note: 'C4',
  duration: '4n',
  velocity: 0.6,
});

// App-facing recurring scheduling uses BeatClock rather than direct Tone.Transport calls.
const scheduleId = scheduleRepeat('4n', () => {
  AudioEngine.scheduleNote({
    robotId: 'robot-123',
    note: 'E4',
    duration: '8n',
    time: AudioEngine.now() + MIN_LEAD,
  });
});

// Later, when the schedule is no longer needed:
cancelSchedule(scheduleId);
```

### Register Robot Melody

```typescript
import { AudioEngine } from '../engine/AudioEngine';
import { generateMelodyForRobot } from '../engine/melodyGenerator';

function setupRobotAudio(robot: Robot): void {
  // Generate and register melody
  robot.melody = generateMelodyForRobot({
    onsetCount: 6,
    octaveMin: 2,
    octaveMax: 5,
    rhythmicDensity: 6,
    rhythmicMotifLength: 8,
    noteVariance: 2,
  });
  AudioEngine.registerRobotMelody(robot.id, robot.melody);
}

function cleanupRobotAudio(robotId: string): void {
  AudioEngine.unregisterRobotMelody(robotId);
}
```

// Spawn-time audio notes
// On spawn, unregister any previous melody entry for the robot, reserve a composite
// voice with the robot's layers/phase/detune values when available, and then register
// the melody with AudioEngine. If polyphony is full, the reservation is skipped but the
// robot remains registered for later playback.


### React Component Cleanup

```typescript
import { useEffect } from 'react';
import { AudioEngine } from '../engine/AudioEngine';

function AudioComponent({ robotId }: { robotId: string }) {
  useEffect(() => {
    // Setup
    const melody = generateMelodyForRobot({
      onsetCount: 6,
      octaveMin: 2,
      octaveMax: 5,
    });
    AudioEngine.registerRobotMelody(robotId, melody);
    
    // Cleanup
    return () => {
      AudioEngine.unregisterRobotMelody(robotId);
    };
  }, [robotId]);
  
  return null;
}
```

## Forbidden Patterns

The main anti-patterns to avoid are:

1. Creating synths or importing Tone directly outside `src/engine/`.
2. Using `setTimeout`/`setInterval`/`requestAnimationFrame` for music timing.
3. Triggering audio from GSAP timelines or React effects instead of semantic events.
4. Storing synth instances or other non-serializable audio objects in Zustand or component state.

When in doubt, route the behavior through `AudioEngine` and keep the data serializable.

## Audit Checklist

Before committing audio code:

- [ ] No `new Tone.` or `import * as Tone` outside `src/engine/`
- [ ] No timers are used for audio timing
- [ ] No synths or timelines are kept in state
- [ ] All scheduling uses BeatClock/Transport
- [ ] Melodies store indices, not pitch strings

## Lifecycle Summary

Each robot follows a compact lifecycle:

1. **Spawn**: persist `audioAttributes.layers` and `audioAttributes.visualAudioMap`, then reserve a composite voice for the robot.
2. **Register**: register the melody with `AudioEngine`.
3. **Update**: change layer parameters through `AudioEngine.updateVoiceLayerParams()` or `AudioEngine.reReserveVoice()`.
4. **Cleanup**: unregister the melody and release the voice when the robot is removed.

## Quick Troubleshooting

- If audio does not start, verify that `AudioEngine.start()` was triggered by a user gesture and that `Tone.context.state` is `'running'`.
- If notes drift, use the beat-based scheduler and pass the scheduled time or `AudioEngine.now() + MIN_LEAD` into `AudioEngine.scheduleNote()`.
- If playback becomes crackly, keep polyphony capped in `AudioEngine`; do not add ad hoc voice counters in components or utilities.
- If schedules multiply on hot reload, cancel them with `cancelSchedule()` before re-registering.

## Debug Tools

```typescript
import { getCurrentMeasure, getCurrentBeat, getCurrentHour } from '../engine/beatClock';

console.log('Transport state:', Tone.Transport.state);
console.log('BPM:', Tone.Transport.bpm.value);
console.log('Position:', Tone.Transport.position);
console.log('Polyphony:', AudioEngine.getPolyphonyStats());
console.log('Voice for robot:', AudioEngine.getVoiceForRobot(robotId));
console.log('Current measure:', getCurrentMeasure());
console.log('Current beat:', getCurrentBeat());
console.log('Current hour:', getCurrentHour());
```