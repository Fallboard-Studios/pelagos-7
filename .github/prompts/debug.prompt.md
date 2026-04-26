---
name: debug
description: Diagnostic workflows for common runtime problems (audio | memory)
agent: agent
tools:
  - read_file
  - grep_search
---

Modeled on the previous domain-specific debug prompts, this single `debug` prompt supports `mode=audio` or `mode=memory`.

What is failing? ${input:symptom:notes out of sync} (mode: ${input:mode:audio|memory})

Mode: audio — common checks
- Is `AudioEngine.start()` invoked from a user gesture? Is `Tone.context.state === 'running'`?
- Are all musical events scheduled via `BeatClock` / `Tone.Transport` (no setTimeout/queueMicrotask)?
- Is MIN_LEAD applied for lookahead?
- Are melodies indexed (0..7) and `getAvailableNotes()` used at playback time?
- Is MAX_POLYPHONY enforced?

Diagnostic steps (audio):
1. Inspect `src/engine/AudioEngine.ts` and `src/engine/BeatClock.ts`
2. Search for forbidden patterns (Tone imports outside engine, setTimeout for audio, audio in GSAP callbacks)
3. Verify scheduling uses `time` argument and lookahead
4. Report findings and fixes (code locations + suggested patch)

Mode: memory — common checks
- GSAP timelines not killed on unmount
- Scheduled Tone/Transport events not cancelled on cleanup
- Store subscriptions/unsubscribed listeners
- Timelines stored in state or in Zustand (forbidden)
- Melody registry / step registry cleanup

Diagnostic steps (memory):
1. Inspect components and store actions where robots spawn/despawn
2. Check `useEffect` cleanup functions for timeline.kill(), unsubscribe(), unregisterRobotMelody()
3. Check `timelineMap` usage (set/remove)
4. Measure expected fixes and locations

Output: provide a prioritized list of findings (severity + file + line hint) and recommended fixes.

Examples (common fixes):
- Add `tl.kill()` and `removeTimeline(robotId)` in cleanup
- Call `AudioEngine.unregisterRobotMelody(robotId)` on unmount
- Cancel `BeatClock`/Transport scheduled events when component removed

Show me file(s) to inspect and I'll run the checks.