# Polyphony Management Specification

Source of truth: [`src/engine/AudioEngine.ts`](../src/engine/AudioEngine.ts).

**Related docs:** [AUDIO_SYSTEM.md](AUDIO_SYSTEM.md) · [BEAT_CLOCK.md](BEAT_CLOCK.md)

## Current Behavior

- `MAX_POLYPHONY = 16` — a single global cap on simultaneously **triggered** notes.
- `activeVoices` — module-scoped counter tracking currently active note windows.
- `triggerWithCap()` returns `false` and skips the note when the cap is reached — notes are dropped, never steal an existing voice.
- Each robot gets its own **reserved composite voice** via `AudioEngine.reserveVoice()`. Reservation is **not** capped by `MAX_POLYPHONY` — a robot can hold a reserved voice indefinitely without ever triggering a note; only the act of triggering counts against the cap.
- `AudioEngine.releaseVoice()` disposes a robot's composite voice and bus nodes and removes it from the internal map.

## Core Rules

1. **Global cap**: one shared polyphony limit across all robots (`MAX_POLYPHONY`).
2. **Composite voices**: each robot has its own composite voice with dedicated bus nodes (`panner → gain → filter → master compressor/destination`) — there is no shared or pooled synth keyed by waveform type.
3. **Skip-based limiting**: when the cap is full, the note is rejected outright; no existing voice is stolen or reassigned.
4. **Transport-based release**: voice slots free up on a transport-relative schedule tied to the note's actual end time, not a wall-clock timer.
5. **Centralized enforcement**: all triggering and voice-lifecycle logic lives in `AudioEngine`.

## Trigger Path

`AudioEngine.scheduleNote()` resolves velocity and `audioMode` policy (see [AUDIO_SYSTEM.md](AUDIO_SYSTEM.md)'s Note Resolution Pipeline) before delegating to `triggerWithCap(params: NoteParams): boolean`, which:

1. Rejects immediately if `activeVoices >= MAX_POLYPHONY`.
2. Re-checks `audioMode` (mute / solo) as a safety net, in case a caller bypassed `scheduleNote`.
3. Increments `activeVoices`.
4. Verifies the robot has a reserved composite voice — rejects (rolling back the counter) if not.
5. Validates the resolved note string against `/^[A-Ga-g][b#]{0,2}\d+$/` — rejects (rolling back) on an invalid note.
6. Applies the current pan value, triggers the composite voice, and schedules its release.

If any step after the increment fails, `activeVoices` is rolled back so the slot isn't left permanently occupied.

## Reservation Path

`AudioEngine.reserveVoice()` builds a composite voice and wires it into a per-robot bus: `panner → gain → filter → master compressor` (or straight to destination if no compressor exists). This keeps each robot's routing isolated while all robots still share the same global polyphony budget. Reservation is independent of the trigger-time cap — it only reports failure if voice construction itself throws (see [AUDIO_SYSTEM.md](AUDIO_SYSTEM.md) for the exact failure contract).

## Release Path

`AudioEngine.releaseVoice()` disposes the composite voice's internal synths/gains, disconnects and disposes the per-robot bus nodes, and removes the robot from the composite-voice map.

## Public APIs

```typescript
AudioEngine.scheduleNote({ robotId, note, duration, time, velocity }); // void — see Timing/Trigger Path
AudioEngine.reserveVoice(robotId, descriptor, phase, detune, pulseWidth); // boolean
AudioEngine.releaseVoice(robotId);
AudioEngine.reReserveVoice(robotId); // boolean
AudioEngine.getPolyphonyStats(); // { voices: number; maxVoices: number; step: number }
AudioEngine.getVoiceForRobot(robotId);
```

## Timing

Voice release is **not** handled with `setTimeout`/`queueMicrotask`. `scheduleVoiceRelease` computes a transport-relative delay (`(scheduledTime - Tone.now()) + noteDurationSeconds + 0.04s` cleanup buffer) and schedules the counter decrement via `transport.scheduleOnce('+delay', ...)`. If transport scheduling itself throws, it falls back to an immediate decrement so the slot is never left permanently occupied.

## For Contributors

- Never create synths in components or hooks — all synth construction lives in `AudioEngine`.
- Never store synth instances or composite voices in Zustand or React state.
- Don't implement voice stealing — the engine is skip-based by design; only add stealing if a design explicitly calls for it.
- Release a robot's voice (`releaseVoice`) when it's removed, so the composite-voice map and its Tone nodes don't leak.

## Debugging

```typescript
console.log(AudioEngine.getPolyphonyStats()); // { voices, maxVoices, step }
console.log(AudioEngine.getVoiceForRobot(robotId));
```

## Integration: Melody Playback

`AudioEngine`'s internal playback tick (16 steps per measure — see [AUDIO_SYSTEM.md](AUDIO_SYSTEM.md)) calls `scheduleNote()` for every registered event at the current step. `scheduleNote` returns `void` — polyphony rejection is silent from the caller's perspective; `triggerWithCap`'s `boolean` result isn't surfaced there. To observe skip rate, poll `AudioEngine.getPolyphonyStats()` rather than expecting a per-call success/failure signal.

## Testing

See `src/engine/AudioEngine.test.ts` for real coverage (polyphony-cap rejection, voice reservation/release, `audioMode` enforcement). Example pattern using the real API:

```typescript
it('rejects notes once the cap is reached', () => {
  for (let i = 0; i < MAX_POLYPHONY; i++) {
    AudioEngine.reserveVoice(`r${i}`, layers);
    AudioEngine.scheduleNote({ robotId: `r${i}`, note: 'C4', duration: '4n' });
  }
  // Cap enforcement isn't directly observable via scheduleNote's return value (void);
  // assert via the stats snapshot instead.
  expect(AudioEngine.getPolyphonyStats().voices).toBeLessThanOrEqual(MAX_POLYPHONY);
});
```
