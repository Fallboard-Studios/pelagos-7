# BeatClock Specification

Source of truth: [`src/engine/beatClock.ts`](../src/engine/beatClock.ts).

**Related docs:** [AUDIO_SYSTEM.md](AUDIO_SYSTEM.md) · [HARMONY_SYSTEM.md](HARMONY_SYSTEM.md) · [MELODY_SYSTEM.md](MELODY_SYSTEM.md)

## What It Is

`beatClock.ts` has **no Tone.js import** and exports **no `BeatClock` object** — it does not wrap or proxy `Tone.Transport`. It declares a minimal `TransportLike` interface and derives musical position by polling `transport.position` on whatever transport-like instance is handed to it. All API below is a **named function export**; there is no namespace to call methods on.

```typescript
import {
  initBeatClock, getCurrentBeat, getCurrentMeasure, getCurrentHour,
  subscribeToMeasure, scheduleRepeat, cancelSchedule, resetBeatClock,
} from '../engine/beatClock';
```

`AudioEngine.start()` is the only caller of `initBeatClock`, passing `Tone.getTransport()`. This keeps `beatClock.ts` itself framework-agnostic and testable without Tone.

## Constants

| Name | Value |
|---|---|
| `BEATS_PER_MEASURE` | `4` (4/4 time) |
| `MEASURES_PER_HOUR` | `4` |
| `DAY_CYCLE_MEASURES` (imported from `constants/index.ts`) | `96` (24 hours × 4 measures) |

## API

```typescript
initBeatClock(transport: TransportLike): void
```
Idempotent — no-ops if already initialized. Registers one internal `'16n'` tick against `transport`. Each tick parses `transport.position` (a `"measure:beat:sixteenth"` string, via the exported `parseTransportPosition`) into:
- `currentBeat = measure * 4 + beat + sixteenths / 4` (float, 0-based)
- `currentMeasure = measure` (int, 0-based)

and fires every measure listener once per measure change, with the value wrapped to `0..95`.

```typescript
getCurrentBeat(): number      // float, 0-based
getCurrentMeasure(): number   // int, 0-based
getCurrentHour(): number      // floor((currentMeasure % 96) / 4), clamped 0..23 — always derived, never stored
subscribeToMeasure(callback: (measure: number) => void): () => void  // returns an UNSUBSCRIBE function — capture and call it on cleanup
scheduleRepeat(interval: string, callback: () => void): string       // returns an opaque schedule ID
cancelSchedule(scheduleId: string): void
resetBeatClock(): void
```

- `scheduleRepeat` is safe to call before `initBeatClock` runs — it queues the request and registers it once a transport is available. The interval is also passed as the tick's `startTime`, so the first firing happens after one full interval elapses, not at transport time zero.
- There is no public one-shot helper (e.g. no `scheduleAtBeat`) — for one-shot beat-accurate callbacks, use the transport instance directly (`transport.scheduleOnce(...)`), obtained from wherever `AudioEngine` exposes it.
- `resetBeatClock()` clears the internal `'16n'` tick, clears every tracked schedule (`transport.clear` on each), clears **all** measure listeners, and nulls the transport reference. Called from `AudioEngine.killAll()`, not from `AudioEngine.stop()`. After a reset, `initBeatClock(transport)` must run again before any scheduling API is used, and every `subscribeToMeasure` caller must re-subscribe.
- No `pause`/`seek`/`start`/`stop` here — lifecycle is entirely owned by whatever transport was passed in.

## Usage

```typescript
// Recurring, measure-based (e.g. factory production cycle)
const scheduleId = scheduleRepeat('30m', () => spawnRobot());
cancelSchedule(scheduleId);

// Reading position
const hour = getCurrentHour(); // 0..23, derived on demand
```

Day/night derivation is always `floor(currentMeasure % 96 / 4)` — computed on demand, never persisted to state.

## Forbidden

- `setTimeout` / `setInterval` / `requestAnimationFrame` / `queueMicrotask` for anything music-timed — these drift from tempo and don't survive BPM changes.
- Reading `Transport.seconds` (or any fresh wall-clock read) inside a beat-based callback — use the callback's `time` argument (or `AudioEngine.now() + MIN_LEAD`) instead.
- Calling `AudioEngine.scheduleNote()` (or any audio scheduling) directly from a GSAP timeline callback — trigger a semantic handler instead; see [ANIMATION_SYSTEM.md](ANIMATION_SYSTEM.md).
- Treating `BeatClock` as an importable object — it doesn't exist. Use the named exports above.

## Integration Notes

- **GSAP:** trigger timelines from a scheduled beat-clock callback (discrete events), or drive an existing timeline's `timeScale(currentBPM / baseBPM)` for tempo-synced continuous loops. Never the reverse (GSAP calling into audio).
- **AudioEngine's own playback tick** (the `8n` step scheduler) is internal to `AudioEngine.ts`, not part of this module — see [AUDIO_SYSTEM.md](AUDIO_SYSTEM.md#playback-loop) for how it consumes `getAvailableNotes()`/`stepRegistry` each tick.
