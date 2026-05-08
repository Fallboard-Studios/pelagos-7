# BeatClock Guide

BeatClock is the authoritative timing system that wraps **Tone.Transport** and provides musical time management for all game systems.

## Purpose

BeatClock ensures all systems in Pelagos-7 operate on **musical time** (beats/measures) rather than wall-clock time (seconds). This keeps robot spawning, factory production, harmony changes, and all timed events synchronized to the music regardless of BPM changes.

## Implementation Strategy

**Primary:** Use `Tone.Transport` directly when audio is available. Note: the runtime `beatClock.ts` implementation does NOT import Tone — it expects a transport-like instance to be provided by `AudioEngine` via `initBeatClock(transport)`.

**Fallback / TODO:** The docs previously described a `gsap.ticker` fallback. The current implementation does not include that fallback; a ticker-based fallback is TODO and should mirror the Transport API where required.

## Core API (implemented)

The runtime `beatClock.ts` exposes a small transport-backed API. It requires the host to provide a transport instance via `initBeatClock(transport)` (this avoids importing Tone inside the module). Implemented functions:

```typescript
// Initialize with a transport-like instance (called from AudioEngine)
initBeatClock(transport: TransportLike): void;

// Subscribe to measure changes (fires once per measure; measure is wrapped 0..95)
subscribeToMeasure(callback: (measure: number) => void): void;

// Queryors
getCurrentBeat(): number;       // float, 0-based (measure*4 + beat + sixteenths/4)
getCurrentMeasure(): number;    // integer, 0-based
getCurrentHour(): number;       // derived hour 0..23 from measures

// Scheduling
scheduleRepeat(interval: string, callback: () => void): string; // returns scheduleId
cancelSchedule(scheduleId: string): void;

// Lifecycle
resetBeatClock(): void;

// Convenience / stubs
scheduleAtBeat(beat: number, callback: () => void): string; // deprecated helper — prefer Transport.scheduleOnce or BeatClock.scheduleRepeat
```

Notes:
- `scheduleRepeat` persists requested schedules when a transport is not yet available; these pending schedules are registered automatically when `initBeatClock` runs.
- `scheduleAtBeat` is deprecated in this documentation; implement one-shot scheduling with `Transport.scheduleOnce` or `BeatClock.scheduleRepeat` instead.
- `resetBeatClock()` clears the transport reference, all pending/registered schedules, position counters (`currentBeat`, `currentMeasure`), and **all measure listeners**. After a reset, callers that used `subscribeToMeasure` must re-subscribe, and `initBeatClock(transport)` must be called again before any scheduling APIs are used.

## Usage Patterns

**Robot Spawning (measure-based):**
```typescript
// Spawn robot every 30 measures (factory production cycle)
BeatClock.scheduleRepeat('30m', () => {
  spawnRobot();
});
```

**Harmony Updates (4-measure cycle):**
```typescript
// Update harmony palette every 4 measures
BeatClock.scheduleRepeat('4m', (time) => {
  const newHour = Math.floor((currentMeasure % 96) / 4);
  updateHarmonyPalette(newHour);
});
```

**Collision Checks (8th-note granularity):**
```typescript
// Check collisions every 8th note
BeatClock.scheduleRepeat('8n', () => {
  checkAllCollisions();
});
```

**Day/Night Transitions (96-measure cycle):**
**Day/Night Transitions (96-measure cycle):**

Trigger visual effects at measure boundaries. Use `Transport.scheduleOnce` or
`Transport.schedule` for one-shot events when a precise beat position is required.

❌ WRONG (time-anchored):
```ts
setTimeout(() => handleEvent(), 5000); // ❌ WRONG (also avoid queueMicrotask for timing)
```

✅ CORRECT (musical, one-shot):
```ts
Transport.scheduleOnce(handleEvent, '10m'); // schedule at measure 10 (beat string)
```

## Scheduling Reliability
// setTimeout(() => handleEvent(), 5000);  // ❌ WRONG (avoid queueMicrotask too)
**For Audio Events:**
- The implemented `beatClock` ticks on `'16n'` (16th-note) and computes `currentBeat` as `measure*4 + beat + sixteenths/4` (a float, 0-based). Use `scheduleRepeat` to register musical intervals.
- Schedule directly on Transport with a short lookahead (the project uses `MIN_LEAD`, default ~0.1s) and prefer the `time` parameter when available.
- Never read `Transport.seconds` inside callbacks.

**For Non-Audio Events (State Changes):**
- Use Transport callbacks when available
- OR maintain step registry: `Map<beatNumber, events[]>` for O(1) lookup
- Apply small lookahead for state preparation

**Integration with AudioEngine**

The codebase uses a step registry and `AudioEngine` for melody scheduling. Example (conceptual):

```typescript
// Melody playback driven by an 8th-note repeat
BeatClock.scheduleRepeat('8n', (/* time */) => {
  // `AudioEngine` applies its own MIN_LEAD when scheduling notes
  const currentStep = (stepCounter % 16) + 1;
  const events = stepRegistry.get(currentStep) || [];

  events.forEach(({ robotId, event }) => {
    const note = availableNotes[event.noteIndex] + (event.octave ?? 4);
    AudioEngine.scheduleNote({ robotId, note, duration: event.length });
  });

  stepCounter++;
});
```

## Integration with GSAP

**Option 1: Trigger timelines on beat events (Recommended)**
```typescript
// Discrete events (spawn animation, interaction burst)
// Use Transport.scheduleOnce or call into your semantic handlers from a repeating tick.
Transport.scheduleOnce(() => {
  const tl = gsap.timeline();
  tl.from(robotRef.current, { scale: 0, duration: 0.5 });
  setTimeline(robot.id, tl);
}, spawnBeat /* e.g. '12m' or transport time */);
```

**Option 2: Drive timeline speed via BPM**
```typescript
// Continuous animations that sync to tempo
const baseBPM = 60;
const currentBPM = 80;
timeline.timeScale(currentBPM / baseBPM);  // 1.33x speed
```

Use **Option 1** for discrete events, **Option 2** for continuous loops that should speed/slow with tempo changes.

## Tempo Changes

**Beat-anchored events** remain at their musical position when BPM changes:
```typescript
// This event will always fire at measure 10, regardless of BPM
// Use Transport.scheduleOnce for one-shot beat-accurate callbacks
Transport.scheduleOnce(handleEvent, '10m');
```

**Time-anchored events** (not recommended) shift their musical position:
```typescript
// Avoid this pattern - event drifts when BPM changes
setTimeout(() => handleEvent(), 5000);  // ❌ WRONG (avoid queueMicrotask too)
```

## Pause/Seek Behavior

The current `beatClock.ts` implementation does not implement explicit `pause`, `seek`, or `start/stop` lifecycle helpers — those are managed by the provided transport (e.g., `Tone.Transport`). On HMR/reload the module attempts to register pending schedules idempotently; callers should clear existing transport schedules before re-registering to avoid duplicates.

## Day/Night Mapping

```typescript
// 96 measures = 1 full day/night cycle
// 4 measures = 1 "hour equivalent"
const currentMeasure = BeatClock.getCurrentMeasure();
const derivedHour = Math.floor((currentMeasure % 96) / 4);  // 0..23
```

**Important:** Hour is **derived**, never stored. All game logic uses measures.

## Debug Overlay

Provide dev-mode overlay showing:
- Current measure and beat: `M: 42, B: 3.7`
- Current BPM: `70 BPM`
- Pending schedules: `[spawn@M:45, harmony@M:44]`
- Active tick listeners count: `3 listeners`

Gate with `import.meta.env.DEV && DEV_TUNING` flag.

## Common Pitfalls

**❌ WRONG: Using setTimeout/queueMicrotask**
```typescript
setInterval(() => spawnRobot(), 5000);  // Drifts from music
```

**✅ CORRECT: Using BeatClock**
```typescript
BeatClock.scheduleRepeat('30m', () => spawnRobot());
```

---

**❌ WRONG: Reading Transport.seconds in callback**
```typescript
BeatClock.scheduleRepeat('8n', () => {
  const now = Tone.Transport.seconds;  // Inaccurate!
  scheduleNote(now);
});
```

**✅ CORRECT: Using time parameter**
```typescript
BeatClock.scheduleRepeat('8n', (time) => {
  scheduleNote(time + MIN_LEAD);  // Accurate Tone.js time
});
```

---

**❌ WRONG: Calling AudioEngine from GSAP**
```typescript
timeline.call(() => AudioEngine.scheduleNote(...));  // Coupling!
```

**✅ CORRECT: Semantic callbacks only**
```typescript
timeline.to(ref.current, {
  x: 100,
  onComplete: () => onRobotArrived(robot.id),  // Semantic event
});
```

## Performance Notes

- Keep tick listener callbacks fast (< 1ms)
- Use step registry for melody scheduling (O(1) lookup)
- Batch state updates when processing multiple events
- Avoid creating closures in hot paths
