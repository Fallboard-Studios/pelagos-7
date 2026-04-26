### Key Guarantees
# Audio System Guide

## Overview

Pelagos-7's audio system is built on **Tone.js** and follows a strict singleton architecture to ensure reliable musical timing and prevent common audio pitfalls.

**This document covers core concepts and patterns. For detailed system implementations, see:**
- [BeatClock Guide](BEAT_CLOCK.md) - Musical timing and scheduling
- [Harmony System Guide](HARMONY_SYSTEM.md) - Dynamic note palettes
- [Melody Generation Guide](MELODY_SYSTEM.md) - Procedural melody creation

## Tone.js Best Practices

- **Initialization (user gesture):** Always call `await Tone.start()` only from an explicit user gesture (for example, a Play button). Do not call `Tone.start()` during component mount, in `useEffect` without a gesture, or automatically at app boot.

- **Transport is authoritative:** Use `Tone.Transport` as the single source of musical time. Schedule musical events with `Transport.schedule`, `Transport.scheduleRepeat`, or `AudioEngine` helpers. Avoid `setTimeout`/`setInterval`/`requestAnimationFrame`/`queueMicrotask` for music-aligned scheduling.

- **Use the scheduled `time` argument:** Inside `Transport.schedule`/`scheduleRepeat` callbacks prefer the `time` parameter passed by Tone for accurate scheduling; do not rely on reading `Transport.seconds` inside those callbacks.

 - **Lookahead (MIN_LEAD):** Apply a configurable lookahead (probably between 50–100ms) when scheduling note playback so synths/samplers can prepare. The `AudioEngine` centralizes this logic — the implementation uses `MIN_LEAD = 0.1` (100ms) by default.

 - **Pool synths & enforce polyphony:** Create and reuse synths in `AudioEngine`. The implementation enforces a global polyphony budget with `MAX_POLYPHONY = 16` by default; pool sizing is derived from `settings.maxRobots` and clamped by this limit. Implement a clear voice-stealing or skipping policy.

- **No synths in components:** Never instantiate Tone instruments in React components or hooks; use `AudioEngine` APIs (e.g., `scheduleNote`, `getSynth`) instead.

- **Idempotent schedules & HMR:** Ensure scheduled callbacks are registered idempotently. On HMR or reload, cancel previous Transport schedules before re-registering to avoid duplicate callbacks.

- **Graceful error handling:** Detect and handle rejected or suspended AudioContexts; show a helpful UI message and retry `Tone.start()` only in response to a new user gesture.

- **Gate Dev diagnostics:** Put verbose timing or diagnostic logs behind a dev flag (e.g., `import.meta.env.DEV && DEV_TUNING`) so CI/headless runs remain quiet.

- **Documentation links:** Link to Tone.js timing docs and the project `AudioEngine` API in this file so contributors know the correct entry points for audio work.

## Overview

Pelagos-7's audio system is built on **Tone.js** and follows a strict singleton architecture to ensure reliable musical timing and prevent common audio pitfalls.

### Core Principles

**1. Single Global AudioEngine**
- Only ONE AudioEngine instance exists per application
- All Tone.js interactions happen exclusively through this singleton
- No components, hooks, or utilities directly import or use Tone.js
- AudioEngine manages synth pooling, scheduling, and Transport control


**2. Separation of Concerns**
- **AudioEngine**: Sound generation, scheduling, polyphony
- **audioStore**: Holds all global audio settings (FX, BPM, etc.) as a dedicated Zustand store. This keeps audio parameters separate from simulation/game state for better React performance and modularity.
- **localeStore**: Holds per-locale simulation state (robots, actors, currentMeasure, settings, etc.)
- **planetStore**: Holds planet-level state (currentHour, currentLocaleId, planet list)
- **uiStore**: Holds UI-only state (active view, theme, language, fullscreen, etc.)
- **GSAP**: Visual animation and motion
- **BeatClock/Transport**: Musical timing authority
- These systems communicate via semantic events, never direct coupling

**3. User Gesture Requirement**
- `Tone.start()` MUST be called from explicit user interaction (e.g., Play button)
- Cannot initialize audio in `useEffect`, component mount, or automatically
- Required for Web Audio API compliance across all browsers


### State Management Note

Global audio settings (such as FX parameters and BPM) are managed in `audioStore`. Per-locale simulation state (robots, actors, currentMeasure, settings) lives in `localeStore`, keyed by locale ID. Planet-level data (currentHour, active locale) lives in `planetStore`. UI state lives in `uiStore`. `oceanStore` no longer exists — do not recreate it.

### Architecture Diagram

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
│  │  Synth Pool (sized, MAX_POLYPHONY=16) │  │
│  │  - AMSynth (robot type A)   │  │
│  │  - FMSynth (robot type B)   │  │
│  │  - PolySynth (shared)       │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Scheduling System           │  │
│  │  - Transport.schedule()      │  │
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
  // Lifecycle
  start: async (): Promise<void>,
  stop: () => void,

  // Scheduling
  scheduleNote: (params: { robotId: string; note: string; duration?: string; time?: number; velocity?: number }) => void,

  // Voice reservation & pool management
  reserveVoice: (robotId: string, synthType: string, waveform?: string, adsr?: any) => boolean,
  releaseVoice: (robotId: string) => void,
  getVoiceForRobot: (robotId?: string) => Tone.PolySynth | null,

  // Melody Management
  registerRobotMelody: (robotId: string, melody: RobotMelodyEvent[]) => void,
  unregisterRobotMelody: (robotId: string) => void,

  // Synth access & metrics
  getSynth: (type?: string) => Tone.PolySynth | null,
  getPolyphonyStats: () => { voices: number; maxVoices: number; step: number },
  now: () => number,
}
```

### Key Guarantees

- **Singleton**: Only one AudioEngine exists, accessible globally
 **Polyphony Control**: Never more than the configured max voices (default `MAX_POLYPHONY = 16`)
 **Lookahead**: MIN_LEAD (≈50–100ms; implementation defaults to `MIN_LEAD = 0.1s`) applied automatically to scheduling
 **Idempotent**: Safe to call `start()` multiple times
 **Cleanup**: Proper disposal of synths and scheduled events on stop

### Musical Time Authority

**BeatClock wraps Tone.Transport** and serves as the single source of truth for musical time:
- All timing expressed in beats/measures, not seconds
- 1 beat = quarter note at current BPM
- 1 measure = 4 beats (4/4 time signature)
- 96 measures = 1 full day/night cycle

**Never use `setTimeout`, `setInterval`, `requestAnimationFrame`, or `queueMicrotask` for musical timing.**

**For complete BeatClock implementation details, see [BEAT_CLOCK.md](BEAT_CLOCK.md).**

## Harmony System

The Harmony System provides dynamic 8-note palettes that change every 4 measures (1 "hour equivalent"), allowing robot melodies to automatically adapt without regeneration.

**Key concepts:**
- Robots store note **indices (0-7)**, not pitch strings
- 24-hour cycle with unique palette per hour
- Melody remains immutable; only palette changes
- All updates via BeatClock/Transport (no setTimeout/setInterval/queueMicrotask)

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
- Global `MAX_POLYPHONY` limit (default `MAX_POLYPHONY = 16`); pool sizing is derived from `settings.maxRobots` and clamped to this limit
- Shared synth pool (PolySynth slots sized to robots vs. `MAX_POLYPHONY`)
- Fail-fast skipping when limit exceeded
- Transport-based voice release scheduling
- Centralized enforcement in AudioEngine

**Why it matters:**
- Prevents audio distortion and CPU spikes
- Maintains musical clarity
- Ensures stable performance across devices

**For complete implementation details, see [POLYPHONY_GUIDE.md](POLYPHONY_GUIDE.md).**

## Layered / Composite Voices and Visual Mapping

Pelagos-7 supports compact, spawn-time layered descriptors ("LayeredWave") that describe a small stack of timbral layers (oscillators or noise) and per-layer gains/detune/adsr. These descriptors are intentionally serializable and stored on the robot as a `visualAudioMap` so the visual system can deterministically derive appearance from audio without instantiating synths at render time.

Key points:
- A `LayeredWave` is a small JSON-like descriptor: `{ base: WaveformType, layers?: LayerDescriptor[] }`.
- At spawn time the `spawnSystem` may create 1–3 layered presets and compute a gain-weighted averaged ADSR and compact `shapeParams` used by robot visuals.
- The `AudioEngine` can create a runtime composite voice from a `LayeredWave` via `AudioEngine.createCompositeVoice()` and `AudioEngine.reserveVoice(robotId, layeredWave)`. Composite voices are routed into a per-robot sub-bus (panner -> gain -> filter -> master compressor) to avoid parameter bleed and allow safe per-robot control.
- Composite voices expose `triggerAttackRelease`, `set`, and `dispose` semantics similar to single synths so scheduling code uses the same high-level APIs.
- Because `visualAudioMap` is serializable and stored on spawn, visuals can be rendered identically in non-audio contexts (editor previews, snapshots) without requiring Tone.js objects.

Recommended usage:
- At spawn: generate and persist a compact `visualAudioMap` on the robot. This contains the `LayeredWave`, `averagedADSR`, `averagedGain`, `shapeParams`, and per-layer `layerVisuals`.
- At audio init: attempt `AudioEngine.reserveVoice(robotId, layeredWave)` to allocate an isolated composite voice. If reservation fails (pool exhausted), AudioEngine will gracefully fall back to shared pool voices.
- In components: prefer reading `visualAudioMap` (or the `robotVisualMapper`) for visual properties; do not instantiate synths in components.

See `src/types/layeredAudio.ts` and `src/systems/spawnSystem.ts` for the canonical descriptor shape and spawn-time averaging logic.

## Scheduling Patterns

Audio scheduling in Pelagos-7 uses Tone.js Transport for sample-accurate, musically-aligned timing.

**Core APIs:**
- `Transport.scheduleOnce(callback, time)` - One-shot event
- `Transport.scheduleRepeat(callback, interval)` - Recurring event
- `Transport.schedule(callback, time)` - Generic scheduling

**Lookahead:** Apply a short scheduling lead (probably 50–100ms) so Web Audio can prepare synths reliably; the implementation exposes `MIN_LEAD` (default 0.1s).

**Critical rule:** Always use the `time` parameter passed to Transport callbacks (sample-accurate), never `Tone.now()` inside callbacks.

**Key patterns:**
- Use step registry for O(1) melody lookups (no iteration over robots)
- Skip first 2 ticks after Transport start (prevent burst)
- Clear previous schedules before HMR re-registration
- Cancel with `transport.clear(tickId)` or `transport.cancel(0)` for all

## Common Patterns

Essential audio patterns. All examples use AudioEngine correctly.

### Schedule a Note

```typescript
import { AudioEngine } from '../engine/AudioEngine';
import { MIN_LEAD } from '../constants';

// Simple immediate trigger
AudioEngine.scheduleNote({
  robotId: 'robot-123',
  note: 'C4',
  duration: '4n',
  velocity: 0.6,
});

// With explicit time (use lookahead)
AudioEngine.scheduleNote({
  robotId: 'robot-123',
  note: 'E4',
  duration: '8n',
  time: Tone.now() + MIN_LEAD,
});
```

### Register Robot Melody

```typescript
import { AudioEngine } from '../engine/AudioEngine';
import { generateMelodyForRobot } from '../engine/melodyGenerator';

function setupRobotAudio(robot: Robot): void {
  // Generate and register melody
  robot.melody = generateMelodyForRobot({ events: 6, syncopationBias: 0.4 });
  AudioEngine.registerRobotMelody(robot.id, robot.melody);
}

function cleanupRobotAudio(robotId: string): void {
  AudioEngine.unregisterRobotMelody(robotId);
}
```

// Spawn-time audio notes
// On spawn, callers should optionally unregister any existing melody id, attempt a
// best-effort `AudioEngine.reserveVoice(robotId, synthType, waveform, adsr)` to give
// the robot an isolated synth slot (waveform/ADSR applied at reservation time), and
// then register the robot melody via `AudioEngine.registerRobotMelody(robot.id, robot.melody)`.
// `reserveVoice` may return false if the pool is exhausted; code should continue gracefully.


### React Component Cleanup

```typescript
import { useEffect } from 'react';
import { AudioEngine } from '../engine/AudioEngine';

function AudioComponent({ robotId }: { robotId: string }) {
  useEffect(() => {
    // Setup
    const melody = generateMelodyForRobot();
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

Quick reference of audio anti-patterns and their fixes.

### 1. Synth Outside AudioEngine

**❌ Forbidden:**
```typescript
function Robot() {
  const synth = new Tone.Synth().toDestination();
  synth.triggerAttackRelease('C4', '8n');
}
```

**Why:** Bypasses polyphony management, creates memory leaks, violates architecture.

**✅ Fix:**
```typescript
AudioEngine.scheduleNote({ robotId, note: 'C4', duration: '8n' });
```

---

### 2. Tone.js Import Outside Engine

**❌ Forbidden:**
```typescript
// In components/ or hooks/
import * as Tone from 'tone';
```

**Why:** Breaks audio isolation, makes testing impossible.

**✅ Fix:** Only import Tone in `src/engine/` files. Components use AudioEngine API.

---

### 3. setTimeout for Audio Timing

**❌ Forbidden:**
```typescript
setTimeout(() => {
  AudioEngine.scheduleNote({ robotId, note: 'C4' });
}, 1000);
```

**Why:** Not synchronized to musical time, drifts from BPM.

**✅ Fix:**
```typescript
// Schedule relative to musical time (1 measure = 4 beats)
BeatClock.scheduleRepeat('1m', () => {
  AudioEngine.scheduleNote({ robotId, note: 'C4' });
});
```

---

### 4. Audio in useEffect

**❌ Forbidden:**
```typescript
useEffect(() => {
  const synth = new Tone.Synth();
  synth.triggerAttackRelease('C4', '8n');
}, [trigger]);
```

**Why:** Uncontrolled timing, not beat-aligned, creates synths on every render.

**✅ Fix:** Use BeatClock scheduling, request notes from AudioEngine.

---

### 5. GSAP Timeline Triggering Audio

**❌ Forbidden:**
```typescript
timeline.call(() => AudioEngine.scheduleNote({ robotId, note: 'C4' }));
```

**Why:** Couples animation to audio, violates separation of concerns.

**✅ Fix:** Use semantic callbacks:
```typescript
timeline.to(ref.current, {
  x: 100,
  onComplete: () => onArrivalAt(robotId, position)  // semantic event
});

// In arrival handler (not timeline):
function onArrivalAt(robotId: string, position: Vec2) {
  updateRobotState(robotId, 'idle');
  AudioEngine.scheduleNote({ robotId, note: 'C4' });  // separate system
}
```

---

### 6. Storing Synth in State

**❌ Forbidden:**
```typescript
interface Robot {
  synth: Tone.PolySynth;  // not serializable!
}
```

**Why:** Can't save/load, memory leaks, architecture violation.

**✅ Fix:** Store only audio attributes:
```typescript
interface Robot {
  audio: {
    synthType: 'am' | 'fm' | 'poly';
    adsr: { attack: number; decay: number; sustain: number; release: number };
  };
}
```

---

### 7. Melody Regeneration on Harmony Change

**❌ Forbidden:**
```typescript
function onHarmonyChange(newNotes: string[]) {
  robots.forEach(robot => {
    robot.melody = generateNewMelody(newNotes);  // DON'T
  });
}
```

**Why:** Melodies use indices, not literal notes. Regenerating breaks musical identity.

**✅ Fix:** Melodies remain immutable. Harmony updates palette only:
```typescript
function onHarmonyChange(newNotes: string[]) {
  setAvailableNotes(newNotes);  // AudioEngine updates palette
  // Melodies automatically use new notes via indices
}
```

---

## Audit Checklist

Before committing audio code:

- [ ] No `new Tone.` outside `src/engine/`
- [ ] No `import * as Tone` outside `src/engine/`
- [ ] No `setTimeout`/`setInterval`/`queueMicrotask` for audio timing
- [ ] No synths/timelines in Zustand state
- [ ] No audio scheduling in GSAP timelines
- [ ] All timing uses BeatClock/Transport
- [ ] Melodies store indices, not pitch strings

## Troubleshooting

Common audio issues and their solutions.

## Robot Audio Lifecycle & Voice Cleanup

### Robot Audio Lifecycle

The audio lifecycle for each robot consists of:

1. **Spawn**: When a robot is created, generate and persist its `visualAudioMap` (see Layered/Composite Voices above). Attempt to reserve a dedicated synth voice for the robot using `AudioEngine.reserveVoice(robotId, layeredWave)`. If the pool is exhausted, fallback to a shared pool voice.
2. **Register Melody**: Register the robot's melody with `AudioEngine.registerRobotMelody(robot.id, robot.melody)`. Melodies store note indices, not literal pitches.
3. **Parameter Application**: At reservation, apply oscillator parameters (waveform, detune, phase, ADSR) from the robot's `visualAudioMap` or audio attributes. These parameters are set on the reserved synth/voice and are not stored in state.
4. **Update**: If a robot's audio parameters change (e.g., detune, phase, waveform), call `AudioEngine.updateVoiceParams(robotId, newParams)` to update the reserved synth. Do not mutate synths directly in components or state.
5. **Destroy/Remove**: When a robot is removed, call `AudioEngine.unregisterRobotMelody(robotId)` and `AudioEngine.releaseVoice(robotId)`. This ensures the reserved synth/voice is released, cleaned up, and made available for other robots. No synths or Tone.js objects should persist after robot removal.

### Synth/Voice Cleanup on Robot Destruction

- Always call `AudioEngine.releaseVoice(robotId)` when a robot is destroyed or removed. This releases the reserved synth/voice and decrements the active voice count.
- If the robot had a composite or custom voice, ensure any Tone.js objects (e.g., PolySynth, FMSynth) are disposed via their `.dispose()` method.
- Never store synths or voices in Zustand or React state. All synth management is handled by AudioEngine.
- If a robot is replaced or respawned with the same ID, always release the old voice before reserving a new one.

### Oscillator Parameter Application

- **At Reservation**: When reserving a voice for a robot, apply all oscillator parameters (waveform, detune, phase, ADSR) from the robot's `visualAudioMap` or audio attributes. This ensures the synth is configured before any notes are triggered.
- **On Update**: If a robot's audio parameters change during its lifetime, call `AudioEngine.updateVoiceParams(robotId, newParams)`. This updates the reserved synth's oscillator and envelope parameters in-place.
- **Never** mutate synths directly in components or outside AudioEngine. All parameter changes must go through AudioEngine APIs.

**Summary Table:**

| Event         | AudioEngine Call(s)                  | Effect                                  |
|-------------- |--------------------------------------|------------------------------------------|
| Spawn         | reserveVoice, registerRobotMelody     | Allocates synth, applies params, melody  |
| Update Params | updateVoiceParams                    | Updates synth oscillator/ADSR            |
| Destroy       | unregisterRobotMelody, releaseVoice   | Releases synth, cleans up Tone objects   |

See also: [POLYPHONY_GUIDE.md](POLYPHONY_GUIDE.md) for details on synth pooling and voice management.

### 1. No Sound / Suspended AudioContext

**Symptom:** Audio doesn't play after clicking Play button.

**Cause:** Browser autoplay policy requires user gesture.

**Fix:**
```typescript
// In Play button handler
const handlePlay = async () => {
  try {
    await AudioEngine.start();  // Calls Tone.start() internally
    setIsPlaying(true);
  } catch (err) {
    console.error('Audio failed to start:', err);
    alert('Audio initialization failed. Please try again.');
  }
};
```

**Check:** `Tone.context.state === 'running'`

---

### 2. Timing Drift / Notes Out of Sync

**Symptom:** Notes play at wrong times, drift from visual animation.

**Cause:** Using `setTimeout`, `queueMicrotask` or `Date.now()` instead of Transport timing.

**Fix:** Always use `Tone.Transport.schedule()` with lookahead:
```typescript
const MIN_LEAD = 0.05;  // 50ms lookahead
Tone.Transport.schedule((time) => {
  synth.triggerAttackRelease(note, duration, time + MIN_LEAD);
}, scheduledBeat);
```

---

### 3. Audio Crackling / Distortion

**Symptom:** Pops, clicks, or distortion during playback.

**Cause:** Too many simultaneous voices (polyphony exceeded).

**Fix:** Enforce polyphony limit in AudioEngine:
```typescript
const MAX_POLYPHONY = 16;
let activeVoices = 0;

function triggerWithCap(synth, note, duration, time) {
  if (activeVoices >= MAX_POLYPHONY) return;  // Skip note
  activeVoices++;
  synth.triggerAttackRelease(note, duration, time);
  // Schedule voice release on Transport for sample-accurate timing (avoid setTimeout/queueMicrotask)
  const durSec = Tone.Time(duration).toSeconds();
  const noteStart = time ?? AudioEngine.now();
  const releaseAt = noteStart + durSec + 0.04; // small buffer
  Tone.getTransport().scheduleOnce(() => {
    activeVoices = Math.max(0, activeVoices - 1);
  }, releaseAt);
}
```

---

### 4. Memory Leak / Performance Degradation

**Symptom:** App slows down over time, memory usage increases.

**Cause:** Synths not disposed, scheduled events not cleared.

**Fix:**
```typescript
// On robot removal
AudioEngine.unregisterRobotMelody(robotId);
Tone.Transport.clear(scheduledEventId);

// On component unmount
useEffect(() => {
  return () => {
    AudioEngine.cleanup();
  };
}, []);
```

---

### 5. HMR Duplicate Schedules

**Symptom:** In dev mode, notes play multiple times after hot reload.

**Cause:** Scheduled callbacks not cancelled before re-registration.

**Fix:**
```typescript
// Store schedule IDs
const scheduleIds = new Set<number>();

// Clear on HMR
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scheduleIds.forEach(id => Tone.Transport.clear(id));
    scheduleIds.clear();
  });
}
```

---

### 6. Wrong Notes After Harmony Change

**Symptom:** Robots play incorrect pitches after harmony updates.

**Cause:** Melody stores literal notes instead of indices.

**Fix:** Ensure melodies use indices:
```typescript
// ✅ Correct
interface MelodyEvent {
  noteIndex: number;  // 0-7, maps to availableNotes array
}

// ❌ Wrong
interface MelodyEvent {
  note: string;  // 'C4' - hardcoded pitch
}
```

---

### 7. Latency / Delayed Note Triggers

**Symptom:** Notes play noticeably after visual events.

**Cause:** Insufficient lookahead, or scheduling too close to playback time.

**Fix:** Increase `MIN_LEAD` (50-100ms for most systems):
```typescript
const MIN_LEAD = 0.08;  // 80ms lookahead
synth.triggerAttackRelease(note, duration, Tone.now() + MIN_LEAD);
```

---

## Debug Tools

**Transport state:**
```typescript
console.log('State:', Tone.Transport.state);        // running/paused/stopped
console.log('BPM:', Tone.Transport.bpm.value);
console.log('Position:', Tone.Transport.position);
```

**Active synths:**
```typescript
console.log('Polyphony:', AudioEngine.getActiveVoiceCount());
console.log('Registered robots:', AudioEngine.getRegisteredRobotIds());
```

**Timing diagnostics:**
```typescript
console.log('Current measure:', BeatClock.getCurrentMeasure());
console.log('Scheduled events:', BeatClock.getScheduledEvents());
```