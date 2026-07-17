# Audio System Guide

## Overview

This guide documents the current Pelagos-7 audio architecture and the conventions enforced by the engine implementation in [src/engine/AudioEngine.ts](../src/engine/AudioEngine.ts). It focuses on the shared scheduling, timing, polyphony, and melody patterns used across the app.

**Related references:**
- [BeatClock Guide](BEAT_CLOCK.md) - Musical timing and scheduling
- [Harmony System Guide](HARMONY_SYSTEM.md) - Dynamic note palettes
- [Melody Generation Guide](MELODY_SYSTEM.md) - Procedural melody creation

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

```typescript
export const AudioEngine = {
  start: async (): Promise<void>,
  stop: () => void,
  scheduleNote: (params: { robotId: string; note: string; duration?: string; time?: number; velocity?: number }) => void,
  reserveVoice: (robotId: string, descriptor: OscillatorLayer[] | { base?: WaveformType; layers?: OscillatorLayer[] }, phase?: number, detune?: number, pulseWidth?: number) => boolean,
  releaseVoice: (robotId: string) => void,
  reReserveVoice: (robotId: string) => boolean,
  updateVoiceLayerParams: (robotId: string, layers: OscillatorLayer[]) => void,
  createCompositeVoice: (descriptor: OscillatorLayer[] | { base?: WaveformType; layers?: OscillatorLayer[] }) => CompositeVoice,
  registerRobotMelody: (robotId: string, melody: RobotMelodyEvent[]) => void,
  unregisterRobotMelody: (robotId: string) => void,
  getPolyphonyStats: () => { voices: number; maxVoices: number; step: number },
  now: () => number,
}
```

### Key Guarantees

- **Singleton**: The exported `AudioEngine` object is the shared entry point for audio work in the app.
- **Polyphony Control**: The engine caps active voices at `MAX_POLYPHONY = 16` and skips additional notes when the cap is reached.
- **Lookahead**: Scheduling uses the shared `MIN_LEAD` constant (default `0.1s`) so notes are prepared ahead of playback time.
- **Idempotence**: `AudioEngine.start()` exits early once initialization has completed, so repeated calls do not duplicate setup.
- **Cleanup**: `AudioEngine.stop()` stops the transport and clears the playback tick; `AudioEngine.killAll()` performs the full reset by cancelling transport events, releasing voices, and resetting beat-clock state.

### Musical Time Authority

**BeatClock wraps Tone.Transport** and serves as the single source of truth for musical time:
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
- 16-step grid (2-measure loop, 8th-note quantized)
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

## Scheduling Patterns

Audio scheduling in Pelagos-7 is driven by the transport-backed BeatClock and AudioEngine for sample-accurate, musically-aligned timing.

**Core APIs:**
- `BeatClock.scheduleRepeat()` / `cancelSchedule()` - app-facing recurring musical work
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
console.log('Transport state:', Tone.Transport.state);
console.log('BPM:', Tone.Transport.bpm.value);
console.log('Position:', Tone.Transport.position);
console.log('Polyphony:', AudioEngine.getPolyphonyStats());
console.log('Voice for robot:', AudioEngine.getVoiceForRobot(robotId));
console.log('Current measure:', BeatClock.getCurrentMeasure());
console.log('Current beat:', BeatClock.getCurrentBeat());
console.log('Current hour:', BeatClock.getCurrentHour());
```