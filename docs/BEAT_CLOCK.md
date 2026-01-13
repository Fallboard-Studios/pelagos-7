# BeatClock Guide

BeatClock is the authoritative timing system that wraps **Tone.Transport** and provides musical time management for all game systems.

## Purpose

BeatClock ensures all systems in Pelagos-7 operate on **musical time** (beats/measures) rather than wall-clock time (seconds). This keeps robot spawning, factory production, harmony changes, and all timed events synchronized to the music regardless of BPM changes.

## Implementation Strategy

**Primary:** Use `Tone.Transport` directly when audio is available
- Accurate musical timing built-in
- Native BPM and scheduling primitives
- Harmonizes audio and world events automatically

**Fallback:** Implement lightweight BeatClock using `gsap.ticker` for audio-less mode
- BPM → seconds conversion
- Same API as Transport-based approach
- Not recommended for production (audio should always be present)

## Core API

```typescript
interface BeatClock {
  // Current State
  getCurrentBeat(): number;  // Total beats (float) since start
  getCurrentMeasure(): { measure: number; beat: number };
  
  // Scheduling
  scheduleAtBeat(beatPosition: number, callback: () => void): string;  // returns schedule ID
  scheduleAfterBeats(beatCount: number, callback: () => void): string;
  scheduleRepeat(subdivision: string, callback: (time: number) => void): string;  // "8n", "4n", "1m", etc.
  
  // Tick Listeners (for non-audio systems)
  addTickListener(callback: (time: number) => void, subdivision: string): string;
  removeTickListener(id: string): void;
  
  // Cancellation
  cancelScheduled(id: string): void;
  clearScheduledRange(fromBeat: number, toBeat: number): void;
  
  // Conversion Utilities
  convertBeatsToSeconds(beats: number): number;
  convertSecondsToBeats(seconds: number): number;
  
  // Lifecycle
  start(): void;
  stop(): void;
  pause(): void;
  seek(measure: number, beat?: number): void;
  
  // Events
  onSeek(callback: (newPosition: { measure: number; beat: number }) => void): void;
}
```

## Usage Patterns

**Robot Spawning (measure-based):**
```typescript
// Spawn robot every 30 measures (factory production cycle)
BeatClock.scheduleRepeat('30m', (time) => {
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
BeatClock.addTickListener((time) => {
  checkAllCollisions();
}, '8n');
```

**Day/Night Transitions (96-measure cycle):**
```typescript
// Trigger visual effects at measure boundaries
BeatClock.scheduleAtBeat(measureToBeats(24), () => {
  transitionToEvening();
});
```

## Scheduling Reliability

**For Audio Events:**
- Schedule directly on Transport with MIN_LEAD lookahead (~40-80ms)
- Use the `time` parameter passed to callbacks (accurate Tone.js time)
- Never read `Transport.seconds` inside callbacks

**For Non-Audio Events (State Changes):**
- Use Transport callbacks when available
- OR maintain step registry: `Map<beatNumber, events[]>` for O(1) lookup
- Apply small lookahead for state preparation

## Integration with AudioEngine

```typescript
// BeatClock drives melody scheduling
BeatClock.scheduleRepeat('8n', (time) => {
  const currentStep = (stepCounter % 16) + 1;
  const events = melodyRegistry.get(currentStep) || [];
  
  events.forEach(event => {
    AudioEngine.scheduleNote({
      robotId: event.robotId,
      note: availableNotes[event.noteIndex],
      duration: event.length,
      time: time + MIN_LEAD,  // Apply lookahead
    });
  });
  
  stepCounter++;
});
```

## Integration with GSAP

**Option 1: Trigger timelines on beat events (Recommended)**
```typescript
// Discrete events (spawn animation, interaction burst)
BeatClock.scheduleAtBeat(spawnBeat, () => {
  const tl = gsap.timeline();
  tl.from(robotRef.current, { scale: 0, duration: 0.5 });
  setTimeline(robot.id, tl);
});
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
BeatClock.scheduleAtBeat(measureToBeats(10), handleEvent);
```

**Time-anchored events** (not recommended) shift their musical position:
```typescript
// Avoid this pattern - event drifts when BPM changes
setTimeout(() => handleEvent(), 5000);  // ❌ WRONG
```

## Pause/Seek Behavior

**On Pause:**
- Transport stops
- All scheduled events remain queued
- No callbacks fire until resume

**On Seek:**
- Fire `onSeek` events to all listeners
- Systems recompute pending events
- Do NOT fire all missed events in a flood (cap or reconcile)

**On HMR/Reload:**
- Cancel all previous schedules before re-registering
- Idempotent schedule registration (same ID replaces previous)

## Day/Night Mapping

```typescript
// 96 measures = 1 full day/night cycle
// 4 measures = 1 "hour equivalent"
const currentMeasure = BeatClock.getCurrentMeasure().measure;
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

**❌ WRONG: Using setTimeout**
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
