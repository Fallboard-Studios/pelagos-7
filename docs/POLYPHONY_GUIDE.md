# Polyphony Management Guide

This guide is still useful because the engine has a real global voice cap, but the file should describe the current implementation in [src/engine/AudioEngine.ts](../src/engine/AudioEngine.ts), not the older conceptual model.

## Current Behavior

The current implementation uses a single global voice budget:

- `MAX_POLYPHONY = 16`
- `activeVoices` tracks currently active note windows
- `triggerWithCap()` returns `false` when the cap is reached, so notes are skipped gracefully rather than stealing voices
- each robot gets a reserved composite voice through `AudioEngine.reserveVoice()`
- `AudioEngine.releaseVoice()` removes that voice from the map and disposes its bus nodes

## Core Rules

1. **Global cap**: the engine enforces a single shared polyphony limit.
2. **Composite voices**: each robot uses a per-robot composite voice with its own bus nodes.
3. **Skip-based limiting**: when the cap is full, notes are rejected rather than forcing a voice swap.
4. **Transport-based release**: voice slots are freed when the scheduled note ends, using a transport-relative release delay.
5. **Centralized enforcement**: all note triggering and voice lifecycle logic lives in AudioEngine.

## How It Works

### Trigger path

`AudioEngine.scheduleNote()` delegates into `triggerWithCap()`. The trigger path:

1. checks `activeVoices >= MAX_POLYPHONY`
2. rejects the note if the cap is full
3. increments the active voice counter
4. verifies that the robot has a reserved composite voice
5. triggers the note and schedules its release

If anything fails during note triggering, the active voice counter is rolled back so the slot is not left permanently occupied.

### Reservation path

`AudioEngine.reserveVoice()` creates a composite voice and wires it to a per-robot bus chain:

- panner
- gain
- filter
- master compressor / destination

This keeps each robot's audio routing isolated while still sharing the global polyphony budget.

### Release path

`AudioEngine.releaseVoice()` disposes the composite voice and its bus nodes, then removes the robot from the composite voice map.

## Public APIs to Use

```typescript
AudioEngine.scheduleNote({ robotId, note, duration, time });
AudioEngine.reserveVoice(robotId, descriptor, phase, detune, pulseWidth);
AudioEngine.releaseVoice(robotId);
AudioEngine.reReserveVoice(robotId);
AudioEngine.getPolyphonyStats();
AudioEngine.getVoiceForRobot(robotId);
```

## Timing Notes

Release timing is not handled with `setTimeout` or `queueMicrotask`. Instead, the engine uses a transport-relative release delay derived from the scheduled note time and the note duration, with a small buffer added for cleanup. If transport scheduling fails, it falls back to an immediate release.

## What This Means for Contributors

- Do not create synths in components or hooks.
- Do not store synth instances or composite voices in Zustand or React state.
- Do not implement voice stealing unless the design explicitly requires it; the current engine uses skip-based limiting.
- If a robot is removed, release its voice so the composite voice map and runtime nodes are cleaned up.

## Debugging

Useful checks during development:

```typescript
console.log(AudioEngine.getPolyphonyStats());
console.log(AudioEngine.getVoiceForRobot(robotId));
```

The stats object reports the current active voice count, the global maximum, and the current melody step.

**✅ DO: Use shared synth pool**

```typescript
// GOOD: Shared pool
synth selection: use the robot's layered descriptor or waveform
```typescript
const synthKey = robot.audio.layeredWave?.base ?? robot.audio.waveform;
const synth = synthPool[synthKey];
```
synth.triggerAttackRelease(...);
```

## Testing

**Unit test examples** (see [CONTRIBUTION_GUIDE.md](CONTRIBUTION_GUIDE.md#testing) for full patterns):

```typescript
describe('Polyphony Management', () => {
  it('should reject notes when limit exceeded', () => {
    // Fill polyphony budget
    for (let i = 0; i < MAX_POLYPHONY; i++) {
      const result = triggerWithCap('C4', '1n');
      expect(result).toBe(true);
    }
    
    // Next note should be rejected
    const overflow = triggerWithCap('C4', '1n');
    expect(overflow).toBe(false);
  });
  
  it('should release voices after note duration', async () => {
    triggerWithCap('C4', '4n');  // activeVoices = 1
    
    await Tone.Transport.start();
    await new Promise(resolve => setTimeout(resolve, 1000));  // Wait for release
    
    expect(activeVoices).toBe(0);
  });
});
```

**Load testing:**

```typescript
// Stress test: Spawn many robots and trigger all melodies
async function stressTestPolyphony() {
  const robots = Array(20).fill(0).map(() => spawnRobot());
  
  // Trigger all melodies simultaneously
  robots.forEach(r => {
    r.melody.forEach(event => {
      scheduleNote({ robotId: r.id, note: 'C4', duration: event.length });
    });
  });
  
  // Monitor skip rate
  console.log('Polyphony Stats:', getPolyphonyStats());
}
```

## Integration with Other Systems

### Melody Playback

```typescript
BeatClock.scheduleRepeat('8n', (time) => {
  const entries = stepRegistry.get(currentStep) || [];
  
  entries.forEach(({ robotId, event }) => {
    const success = triggerWithCap(
      note,
      event.length,
      time + MIN_LEAD,
      velocity,
      // synth selection is derived from the robot's layeredWave/base waveform
      robot.audio.layeredWave?.base ?? robot.audio.waveform
    );
    
    if (!success && DEV_TUNING) {
      console.debug(`[AudioEngine] Skipped note for ${robotId} (polyphony limit)`);
    }
  });
});
```
